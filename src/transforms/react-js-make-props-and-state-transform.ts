import * as ts from 'typescript';

import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.Node>;

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
                if (helpers.isClassDeclaration(node)) {
                    return visitClassDeclaration(node);
                }

                return node;
            }

            function visitClassDeclaration(classDeclaration: ts.ClassDeclaration) {
                if (!helpers.isReactComponent(classDeclaration, typeChecker)) {
                    return classDeclaration;
                }

                if (!classDeclaration.heritageClauses || !classDeclaration.heritageClauses.length) {
                    return classDeclaration;
                }

                const firstHeritageClauses = classDeclaration.heritageClauses[0];
                const expressionWithTypeArguments = firstHeritageClauses.types[0];

                firstHeritageClauses.types[0] = ts.updateExpressionWithTypeArguments(
                    expressionWithTypeArguments,
                    [
                        getPropsTypeOfReactComponentClass(classDeclaration),
                        getStateTypeOfReactComponentClass(classDeclaration),
                    ],
                    expressionWithTypeArguments.expression,
                )

                return ts.updateClassDeclaration(
                    classDeclaration,
                    classDeclaration.decorators,
                    classDeclaration.modifiers,
                    classDeclaration.name,
                    classDeclaration.typeParameters,
                    classDeclaration.heritageClauses,
                    classDeclaration.members,
                );

                function getPropsTypeOfReactComponentClass(classDeclaration: ts.ClassDeclaration): ts.TypeNode {
                    const staticPropTypesMember = helpers.find(classDeclaration.members, (member) => {
                        return helpers.isPropertyDeclaration(member) &&
                            helpers.hasStaticModifier(member) &&
                            helpers.isPropTypesMember(member, sourceFile);
                    });

                    if (
                        staticPropTypesMember !== undefined
                        && helpers.isPropertyDeclaration(staticPropTypesMember) // check to satisfy type checker
                        && staticPropTypesMember.initializer
                        && helpers.isObjectLiteralExpression(staticPropTypesMember.initializer)
                    ) {
                        return buildInterfaceFromPropTypeObjectLiteral(staticPropTypesMember.initializer)
                    }

                    const staticPropTypesGetterMember = helpers.find(classDeclaration.members, (member) => {
                        return helpers.isGetAccessorDeclaration(member) &&
                            helpers.hasStaticModifier(member) &&
                            helpers.isPropTypesMember(member, sourceFile);
                    });

                    if (
                        staticPropTypesGetterMember !== undefined
                        && helpers.isGetAccessorDeclaration(staticPropTypesGetterMember) // check to satisfy typechecker
                    ) {
                        const returnStatement = helpers.find(
                            staticPropTypesGetterMember.body.statements,
                            (statement) => helpers.isReturnStatement(statement),
                        );
                        if (
                            returnStatement !== undefined
                            && helpers.isReturnStatement(returnStatement) // check to satisfy typechecker
                            && returnStatement.expression
                            && helpers.isObjectLiteralExpression(returnStatement.expression)
                        ) {
                            return buildInterfaceFromPropTypeObjectLiteral(
                                returnStatement.expression
                            )
                        }
                    }

                    return ts.createTypeLiteralNode([]);
                }

                function getStateTypeOfReactComponentClass(classDeclaration: ts.ClassDeclaration): ts.TypeNode {
                    const initialState = getInitialStateFromClassDeclaration(classDeclaration, typeChecker);
                    const initialStateIsVoid = initialState.kind === ts.SyntaxKind.VoidKeyword;
                    const collectedStateTypes = getStateLookingForSetStateCalls(classDeclaration, typeChecker);
                    if (!collectedStateTypes.length && initialStateIsVoid) {
                        return initialState;
                    }
                    if (!initialStateIsVoid) {
                        collectedStateTypes.push(initialState)
                    }

                    return ts.createUnionOrIntersectionTypeNode(ts.SyntaxKind.IntersectionType, collectedStateTypes);
                }
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

                const initialStateMember = helpers.find(classDeclaration.members, (member) => {
                    try {
                        return helpers.isPropertyDeclaration(member) &&
                            member.name &&
                            member.name.getText() === 'state';
                    } catch(e) {
                        return false;
                    }
                });

                if (initialStateMember
                    && helpers.isPropertyDeclaration(initialStateMember)
                    && initialStateMember.initializer
                ) {
                    const type = typeChecker.getTypeAtLocation(initialStateMember.initializer)!

                    return typeChecker.typeToTypeNode(type);
                }

                // Initial state in constructor
                const constructor = helpers.find(
                    classDeclaration.members,
                    (member) => member.kind === ts.SyntaxKind.Constructor,
                ) as ts.ConstructorDeclaration | undefined;

                if (constructor && constructor.body) {
                    for (const statement of constructor.body.statements) {
                        if (
                            helpers.isExpressionStatement(statement) &&
                            helpers.isBinaryExpression(statement.expression) &&
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
                    if (member && helpers.isMethodDeclaration(member) && member.body) {
                        lookForSetState(member.body)
                    }
                }

                return typeNodes;

                function lookForSetState(node: ts.Node) {
                    ts.forEachChild(node, lookForSetState)
                    if (
                        helpers.isExpressionStatement(node) &&
                        helpers.isCallExpression(node.expression) &&
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
                const resultObjectLiteral = objectLiteral.properties.reduce(
                    (result, propertyAssignment: ts.PropertyAssignment) => {
                        const name = propertyAssignment.name.getText();
                        if (!helpers.isPropertyAccessExpression(propertyAssignment.initializer)) {
                            console.warn('Bad value for propType', name, 'at', propertyAssignment.getStart());
                            return result;
                        }
                        const typeValue = getTypeFromReactPropTypeExpression(propertyAssignment.initializer)
                        const propertySignature = ts.createPropertySignature(name, undefined, typeValue, undefined);
                        result.members.push(propertySignature)
                        return result;
                }, ts.createTypeLiteralNode([]));


                return resultObjectLiteral;
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
                    result = ts.createUnionOrIntersectionTypeNode(
                        ts.SyntaxKind.UnionType, [
                            ts.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                            ts.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                            ts.createTypeReferenceNode('JSX.Element', [])
                        ]
                    )
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

                if (!/\.isRequired/.test(text)) {
                    return makeTypeNodeOptional(result);
                } else {
                    return result;
                }

                function makeTypeNodeOptional(node: ts.TypeNode) {
                    return ts.createUnionOrIntersectionTypeNode(ts.SyntaxKind.UnionType, [
                        node,
                        ts.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword)
                    ]);
                }
            }
        };
    };
};
