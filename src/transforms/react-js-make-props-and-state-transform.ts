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
            const visited = visitSourceFile(sourceFile, typeChecker);
            ts.addEmitHelpers(visited, context.readEmitHelpers());

            return visited;
        };
    };
}

function visitSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    let newSourceFile = sourceFile;
    for (const statement of sourceFile.statements) {
        if (ts.isClassDeclaration(statement) && helpers.isReactComponent(statement, typeChecker)) {
            newSourceFile = visitReactClassDeclaration(statement, newSourceFile, typeChecker);
        }
    }

    return newSourceFile;
}

function visitReactClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
    sourceFile: ts.SourceFile,
    typeChecker: ts.TypeChecker,
) {
    if (!classDeclaration.heritageClauses || !classDeclaration.heritageClauses.length) {
        return sourceFile;
    }
    const className = classDeclaration && classDeclaration.name && classDeclaration.name.getText(sourceFile);
    const propType = getPropsTypeOfReactComponentClass(classDeclaration, sourceFile);
    const stateType = getStateTypeOfReactComponentClass(classDeclaration, typeChecker);
    const shouldMakePropTypeDeclaration = propType.members.length > 0;
    const shouldMakeStateTypeDeclaration = !isStateTypeMemberEmpty(stateType);
    const propTypeName = `${className}Props`;
    const stateTypeName = `${className}State`;
    const propTypeDeclaration = ts.createTypeAliasDeclaration([], [], propTypeName, [], propType);
    const stateTypeDeclaration = ts.createTypeAliasDeclaration([], [], stateTypeName, [], stateType);
    const propTypeRef = ts.createTypeReferenceNode(propTypeName, []);
    const stateTypeRef = ts.createTypeReferenceNode(stateTypeName, []);

    const newClassDeclaration = getNewReactClassDeclaration(
        classDeclaration,
        shouldMakePropTypeDeclaration ? propTypeRef : propType,
        shouldMakeStateTypeDeclaration ? stateTypeRef : stateType,
    );

    const allTypeDeclarations = [];
    if (shouldMakePropTypeDeclaration) allTypeDeclarations.push(propTypeDeclaration);
    if (shouldMakeStateTypeDeclaration) allTypeDeclarations.push(stateTypeDeclaration);

    let statements = helpers.insertBefore(sourceFile.statements, classDeclaration, allTypeDeclarations);
    statements = helpers.replaceItem(statements, classDeclaration, newClassDeclaration);
    return ts.updateSourceFileNode(sourceFile, statements);
}

function getNewReactClassDeclaration(
    classDeclaration: ts.ClassDeclaration,
    propTypeRef: ts.TypeNode,
    stateTypeRef: ts.TypeNode,
) {
    if (!classDeclaration.heritageClauses || !classDeclaration.heritageClauses.length) {
        return classDeclaration;
    }

    const firstHeritageClause = classDeclaration.heritageClauses[0];

    const newFirstHeritageClauseTypes = helpers.replaceItem(
        firstHeritageClause.types,
        firstHeritageClause.types[0],
        ts.updateExpressionWithTypeArguments(
            firstHeritageClause.types[0],
            [propTypeRef, stateTypeRef],
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
): ts.TypeLiteralNode {
    const staticPropTypesMember = _.find(classDeclaration.members, member => {
        return (
            ts.isPropertyDeclaration(member) &&
            helpers.hasStaticModifier(member) &&
            helpers.isPropTypesMember(member, sourceFile)
        );
    });

    if (
        staticPropTypesMember !== undefined &&
        ts.isPropertyDeclaration(staticPropTypesMember) && // check to satisfy type checker
        staticPropTypesMember.initializer &&
        ts.isObjectLiteralExpression(staticPropTypesMember.initializer)
    ) {
        return helpers.buildInterfaceFromPropTypeObjectLiteral(staticPropTypesMember.initializer);
    }

    const staticPropTypesGetterMember = _.find(classDeclaration.members, member => {
        return (
            ts.isGetAccessorDeclaration(member) &&
            helpers.hasStaticModifier(member) &&
            helpers.isPropTypesMember(member, sourceFile)
        );
    });

    if (
        staticPropTypesGetterMember !== undefined &&
        ts.isGetAccessorDeclaration(staticPropTypesGetterMember) // check to satisfy typechecker
    ) {
        const returnStatement = _.find(staticPropTypesGetterMember.body!.statements, statement =>
            ts.isReturnStatement(statement),
        );
        if (
            returnStatement !== undefined &&
            ts.isReturnStatement(returnStatement) && // check to satisfy typechecker
            returnStatement.expression &&
            ts.isObjectLiteralExpression(returnStatement.expression)
        ) {
            return helpers.buildInterfaceFromPropTypeObjectLiteral(returnStatement.expression);
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
        collectedStateTypes.push(initialState);
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

    const initialStateMember = _.find(classDeclaration.members, member => {
        try {
            return ts.isPropertyDeclaration(member) && member.name && member.name.getText() === 'state';
        } catch (e) {
            return false;
        }
    });

    if (initialStateMember && ts.isPropertyDeclaration(initialStateMember) && initialStateMember.initializer) {
        const type = typeChecker.getTypeAtLocation(initialStateMember.initializer)!;

        return typeChecker.typeToTypeNode(type);
    }

    // Initial state in constructor
    const constructor = _.find(classDeclaration.members, member => member.kind === ts.SyntaxKind.Constructor) as
        | ts.ConstructorDeclaration
        | undefined;

    if (constructor && constructor.body) {
        for (const statement of constructor.body.statements) {
            if (
                ts.isExpressionStatement(statement) &&
                ts.isBinaryExpression(statement.expression) &&
                statement.expression.left.getText() === 'this.state'
            ) {
                return typeChecker.typeToTypeNode(typeChecker.getTypeAtLocation(statement.expression.right));
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
            lookForSetState(member.body);
        }
    }

    return typeNodes;

    function lookForSetState(node: ts.Node) {
        ts.forEachChild(node, lookForSetState);
        if (
            ts.isExpressionStatement(node) &&
            ts.isCallExpression(node.expression) &&
            node.expression.expression.getText().match(/setState/)
        ) {
            const type = typeChecker.getTypeAtLocation(node.expression.arguments[0]);
            typeNodes.push(typeChecker.typeToTypeNode(type));
        }
    }
}

function isStateTypeMemberEmpty(stateType: ts.TypeNode): boolean {
    // Only need to handle TypeLiteralNode & IntersectionTypeNode
    if (ts.isTypeLiteralNode(stateType)) {
        return stateType.members.length === 0;
    }

    if (!ts.isIntersectionTypeNode(stateType)) {
        return true;
    }

    return stateType.types.every(isStateTypeMemberEmpty);
}
