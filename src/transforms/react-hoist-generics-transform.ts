import * as ts from 'typescript';
import * as _ from 'lodash';

import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * Hoist generics to top of a class declarations in a React component
 *
 * @example
 * Before:
 * class SomeComponent extends React.Component<{foo: number;}, {bar: string;}> {}
 *
 * After
 * type SomeComponentProps = {foo: number;};
 * type SomeComponentState = {bar: string;};
 * class SomeComponent extends React.Component<SomeComponentProps, SomeComponentState> {}
 */
export function reactHoistGenericsTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactHoistGenericsTransformFactory(context: ts.TransformationContext) {
        return function reactHoistGenericsTransform(node: ts.SourceFile) {
            return visitSourceFile(node);
        };
    };

    function visitSourceFile(sourceFile: ts.SourceFile) {

        for (const statement of sourceFile.statements) {
            if (ts.isClassDeclaration(statement) && helpers.isReactComponent(statement, typeChecker)) {
                return hoist(statement, sourceFile);
            }
        }

        return sourceFile;
    }
}

/**
 * Hoist props and state generic types
 * @param reactClass
 * @param sourceFile
 */
function hoist(reactClass: ts.ClassDeclaration, sourceFile: ts.SourceFile) {
    if (!reactClass.heritageClauses) {
        return sourceFile;
    }
    const className = reactClass && reactClass.name && reactClass.name.getText(sourceFile);
    const reactHeritageClauses = _.find(reactClass.heritageClauses, helpers.isReactHeritageClause);

    if (reactHeritageClauses === undefined || !reactHeritageClauses.types == undefined) {
        return sourceFile;
    }
    const [reactType] = reactHeritageClauses.types;
    if (reactType.typeArguments === undefined || reactType.typeArguments.length < 2) {
        return sourceFile;
    }

    const [propType, stateType] = reactType.typeArguments;
    const propTypeName = `${className}Props`;
    const stateTypeName = `${className}State`;
    const propTypeDeclaration = ts.createTypeAliasDeclaration([], [], propTypeName, [], propType);
    const stateTypeDeclaration = ts.createTypeAliasDeclaration([], [], stateTypeName, [], stateType);
    const propTypeRef = ts.createTypeReferenceNode(propTypeName, []);
    const stateTypeRef = ts.createTypeReferenceNode(stateTypeName, []);
    const newClassStatement = insertTypeRefs(reactClass, propTypeRef, stateTypeRef);

    let statements = helpers.insertBefore(sourceFile.statements, reactClass, propTypeDeclaration)
    statements = helpers.insertAfter(statements, propTypeDeclaration, stateTypeDeclaration);
    statements = helpers.replaceItem(statements, reactClass, newClassStatement);

    return ts.updateSourceFileNode(sourceFile, statements);
}

/**
 * Replace props and state types in a React component with type references
 *
 * @example
 * input
 * ```
 * class MyComp extends React.Component<{}, {}> {}
 * ```
 *
 * output
 * ```
 * class MyComp extends React.Component<IFoo, IBar> {}
 * ```
 *
 * @param reactClassDeclaration A React class declaration
 * @param propTypeRef React Props type reference
 * @param stateTypeRef React State type reference
 */
function insertTypeRefs(
    reactClassDeclaration: ts.ClassDeclaration,
    propTypeRef: ts.TypeReferenceNode,
    stateTypeRef: ts.TypeReferenceNode,
) {
    if (reactClassDeclaration.heritageClauses === undefined) {
        return reactClassDeclaration;
    }
    const reactHeritageClause = _.find(reactClassDeclaration.heritageClauses, helpers.isReactHeritageClause);

    if (reactHeritageClause === undefined) {
        return reactClassDeclaration;
    }

    const [reactExpression] = reactHeritageClause.types;
    const newReactExpression = ts.updateExpressionWithTypeArguments(
        reactExpression,
        [propTypeRef, stateTypeRef],
        reactExpression.expression,
    );
    const newHeritageClauses = ts.updateHeritageClause(reactHeritageClause, [newReactExpression]);

    return ts.updateClassDeclaration(
        reactClassDeclaration,
        reactClassDeclaration.decorators,
        reactClassDeclaration.modifiers,
        reactClassDeclaration.name,
        reactClassDeclaration.typeParameters,
        helpers.replaceItem(reactClassDeclaration.heritageClauses, reactHeritageClause, newHeritageClauses),
        reactClassDeclaration.members,
    );
}
