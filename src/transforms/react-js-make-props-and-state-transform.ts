import * as ts from 'typescript';
import * as _ from 'lodash';
import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * Get transform for transforming React code originally written in JS which does not have
 * props and state generic types
 * This transform will remove React component static "propTypes" member during transform
 */
export function reactJSMakePropsAndStateInterfaceTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactJSMakePropsAndStateInterfaceTransformFactory(context: ts.TransformationContext) {
        return function reactJSMakePropsAndStateInterfaceTransform(sourceFile: ts.SourceFile) {
            const visited = ts.visitEachChild(sourceFile, visitor, context);
            ts.addEmitHelpers(visited, context.readEmitHelpers());

            return visited;

            function visitor(node: ts.Node) {
                if (ts.isClassDeclaration(node)) {
                    return visitClassDeclaration(node, sourceFile, typeChecker);
                }

                return node;
            }
        }
    }
}

function visitClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker
) {
    if (!helpers.isReactComponent(classDeclaration, typeChecker)) {
        return classDeclaration;
    }

    if (!classDeclaration.heritageClauses || !classDeclaration.heritageClauses.length) {
        return classDeclaration;
    }

    const firstHeritageClause = classDeclaration.heritageClauses[0];

    const newFirstHeritageClauseTypes = helpers.replaceItem(
        firstHeritageClause.types,
        firstHeritageClause.types[0],
        ts.updateExpressionWithTypeArguments(
            firstHeritageClause.types[0],
            [
                getPropsTypeOfReactComponentClass(classDeclaration, sourceFile),
                getStateTypeOfReactComponentClass(classDeclaration, typeChecker),
            ],
            firstHeritageClause.types[0].expression,
        ),
    );

    const newHeritageClauses = helpers.replaceItem(
        classDeclaration.heritageClauses,
        firstHeritageClause,
        ts.updateHeritageClause(firstHeritageClause, newFirstHeritageClauseTypes),
    );

    return ts.updateClassDeclaration(
        classDeclaration,
        classDeclaration.decorators,
        classDeclaration.modifiers,
        classDeclaration.name,
        classDeclaration.typeParameters,
        newHeritageClauses,
        classDeclaration.members,
    );
}

function getPropsTypeOfReactComponentClass(
    classDeclaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
): ts.TypeNode {
    const staticPropTypesMember = _.find(classDeclaration.members, (member) => {
        return ts.isPropertyDeclaration(member) &&
            helpers.hasStaticModifier(member) &&
            helpers.isPropTypesMember(member, sourceFile);
    });

    if (
        staticPropTypesMember !== undefined
        && ts.isPropertyDeclaration(staticPropTypesMember) // check to satisfy type checker
        && staticPropTypesMember.initializer
        && ts.isObjectLiteralExpression(staticPropTypesMember.initializer)
    ) {
        return buildInterfaceFromPropTypeObjectLiteral(staticPropTypesMember.initializer)
    }

    const staticPropTypesGetterMember = _.find(classDeclaration.members, (member) => {
        return ts.isGetAccessorDeclaration(member) &&
            helpers.hasStaticModifier(member) &&
            helpers.isPropTypesMember(member, sourceFile);
    });

    if (
        staticPropTypesGetterMember !== undefined
        && ts.isGetAccessorDeclaration(staticPropTypesGetterMember) // check to satisfy typechecker
    ) {
        const returnStatement = _.find(
            staticPropTypesGetterMember.body.statements,
            (statement) => ts.isReturnStatement(statement),
        );
        if (
            returnStatement !== undefined
            && ts.isReturnStatement(returnStatement) // check to satisfy typechecker
            && returnStatement.expression
            && ts.isObjectLiteralExpression(returnStatement.expression)
        ) {
            return buildInterfaceFromPropTypeObjectLiteral(
                returnStatement.expression
            )
        }
    }

    return ts.createTypeLiteralNode([]);
}

function getStateTypeOfReactComponentClass(
    classDeclaration: ts.ClassDeclaration,
    typeChecker: ts.TypeChecker,
): ts.TypeNode {
    const initialState = getInitialStateFromClassDeclaration(classDeclaration, typeChecker);
    const initialStateIsVoid = initialState.kind === ts.SyntaxKind.VoidKeyword;
    const collectedStateTypes = getStateLookingForSetStateCalls(classDeclaration, typeChecker);
    if (!collectedStateTypes.length && initialStateIsVoid) {
        return ts.createTypeLiteralNode([]);
    }
    if (!initialStateIsVoid) {
        collectedStateTypes.push(initialState)
    }

    return ts.createUnionOrIntersectionTypeNode(ts.SyntaxKind.IntersectionType, collectedStateTypes);
}

/**
 * Get initial state of a React component looking for state value initially set
 * @param classDeclaration
 * @param typeChecker
 */
function getInitialStateFromClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
    typeChecker: ts.TypeChecker,
): ts.TypeNode {
    // initial state class member

    const initialStateMember = _.find(classDeclaration.members, (member) => {
        try {
            return ts.isPropertyDeclaration(member) &&
                member.name &&
                member.name.getText() === 'state';
        } catch(e) {
            return false;
        }
    });

    if (initialStateMember
        && ts.isPropertyDeclaration(initialStateMember)
        && initialStateMember.initializer
    ) {
        const type = typeChecker.getTypeAtLocation(initialStateMember.initializer)!

        return typeChecker.typeToTypeNode(type);
    }

    // Initial state in constructor
    const constructor = _.find(
        classDeclaration.members,
        (member) => member.kind === ts.SyntaxKind.Constructor,
    ) as ts.ConstructorDeclaration | undefined;

    if (constructor && constructor.body) {
        for (const statement of constructor.body.statements) {
            if (
                ts.isExpressionStatement(statement) &&
                ts.isBinaryExpression(statement.expression) &&
                statement.expression.left.getText() === 'this.state'
            ) {
                return typeChecker.typeToTypeNode(
                    typeChecker.getTypeAtLocation(statement.expression.right)
                );
            }
        }
    }

    // No initial state, fall back to void
    return ts.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
}

/**
 * Look for setState() function calls to collect the state interface in a React class component
 * @param classDeclaration
 * @param typeChecker
 */
function getStateLookingForSetStateCalls(
    classDeclaration: ts.ClassDeclaration,
    typeChecker: ts.TypeChecker,
): ts.TypeNode[] {
    const typeNodes: ts.TypeNode[] = [];
    for (const member of classDeclaration.members) {
        if (member && ts.isMethodDeclaration(member) && member.body) {
            lookForSetState(member.body)
        }
    }

    return typeNodes;

    function lookForSetState(node: ts.Node) {
        ts.forEachChild(node, lookForSetState)
        if (
            ts.isExpressionStatement(node) &&
            ts.isCallExpression(node.expression) &&
            node.expression.expression.getText().match(/setState/)
        ) {
            const type = typeChecker.getTypeAtLocation(node.expression.arguments[0])
            typeNodes.push(typeChecker.typeToTypeNode(type));
        }
    }
}

/**
 * Build props interface from propTypes object
 * @example
 * {
 *   foo: React.PropTypes.string.isRequired
 * }
 *
 * becomes
 * {
 *  foo: string;
 * }
 * @param objectLiteral
 */
function buildInterfaceFromPropTypeObjectLiteral(objectLiteral: ts.ObjectLiteralExpression) {
    const members = objectLiteral.properties
        // We only need to process PropertyAssignment:
        // {
        //    a: 123     // PropertyAssignment
        // }
        //
        // filter out:
        // {
        //   a() {},     // MethodDeclaration
        //   b,          // ShorthandPropertyAssignment
        //   ...c,       // SpreadAssignment
        //   get d() {}, // AccessorDeclaration
        // }
        .filter(ts.isPropertyAssignment)
        .filter(property => {
            return (
                // Ignore children, React types have it
                property.name.getText() !== 'children' &&
                ts.isPropertyAccessExpression(property.initializer)
            )
        })
        .map(propertyAssignment => {
            const name = propertyAssignment.name.getText();
            // We have guarantee this in the previous `filter`
            const initializer = propertyAssignment.initializer as ts.PropertyAccessExpression
            const typeValue = getTypeFromReactPropTypeExpression(initializer);
            const isOptional = isPropTypeOptional(initializer);

            return ts.createPropertySignature(
                [],
                name,
                isOptional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,
                typeValue,
                undefined,
            );
        });

        return ts.createTypeLiteralNode(members)
}

/**
 * Turns React.PropTypes.* into TypeScript type value
 *
 * @param node React propTypes value
 */
function getTypeFromReactPropTypeExpression(node: ts.PropertyAccessExpression) {
    const text = node.getText().replace(/React\.PropTypes\./, '');
    let result = null;
    if (/string/.test(text)) {
        result = ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    } else if (/any/.test(text)) {
        result = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    } else if (/array/.test(text)) {
        result = ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword));
    } else if (/bool/.test(text)) {
        result = ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
    } else if (/number/.test(text)) {
        result = ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    } else if (/object/.test(text)) {
        result = ts.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
    } else if (/node/.test(text)) {
        result = ts.createTypeReferenceNode('React.ReactNode', []);
    } else if (/element/.test(text)) {
        result = ts.createTypeReferenceNode('JSX.Element', []);
    } else if (/func/.test(text)) {
        const arrayOfAny = ts.createParameter(
            [],
            [],
            ts.createToken(ts.SyntaxKind.DotDotDotToken),
            'args',
            undefined,
            ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)),
            undefined,
        );
        result = ts.createFunctionTypeNode(
            [],
            [arrayOfAny],
            ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        );
    } else {
        result = ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
    }
    return result;
}

/**
 * Decide if node is optional
 * @param node React propTypes member node
 */
function isPropTypeOptional(node: ts.PropertyAccessExpression) {
    const text = node.getText().replace(/React\.PropTypes\./, '');
    return !/\.isRequired/.test(text)
}
