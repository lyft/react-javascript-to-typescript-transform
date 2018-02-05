import * as ts from 'typescript';
import * as _ from 'lodash';

import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * Transform react stateless components
 *
 * @example
 * Before:
 * const Hello = ({ message }) => {
 *   return <div>hello {message}</div>
 * }
 * // Or:
 * // const Hello = ({ message }) => <div>hello {message}</div>
 *
 * Hello.propTypes = {
 *   message: React.PropTypes.string,
 * }
 *
 * After:
 * Type HelloProps = {
 *   message: string;
 * }
 *
 * const Hello: React.SFC<HelloProps> = ({ message }) => {
 *   return <div>hello {message}</div>
 * }
 *
 * Hello.propTypes = {
 *   message: React.PropTypes.string,
 * }
 */
export function reactStatelessFunctionMakePropsTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactStatelessFunctionMakePropsTransformFactory(context: ts.TransformationContext) {
        return function reactStatelessFunctionMakePropsTransform(sourceFile: ts.SourceFile) {
            const visited = visitSourceFile(sourceFile, typeChecker);
            ts.addEmitHelpers(visited, context.readEmitHelpers());
            return visited;
        };
    };
}

function visitSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    // Look for propType assignment statements
    const propTypeAssignments = sourceFile.statements.filter(statement =>
        helpers.isReactPropTypeAssignmentStatement(statement),
    ) as ts.ExpressionStatement[];

    let newSourceFile = sourceFile;
    for (const propTypeAssignment of propTypeAssignments) {
        const componentName = helpers.getComponentName(propTypeAssignment, newSourceFile);

        const funcComponent = (_.find(newSourceFile.statements, s => {
            return (
                (ts.isFunctionDeclaration(s) && s.name !== undefined && s.name.getText() === componentName) ||
                (ts.isVariableStatement(s) && s.declarationList.declarations[0].name.getText() === componentName)
            );
        }) as {}) as ts.FunctionDeclaration | ts.VariableStatement; // Type weirdness

        if (funcComponent) {
            newSourceFile = visitReactStatelessComponent(funcComponent, propTypeAssignment, newSourceFile);
        }
    }

    return newSourceFile;
}

function visitReactStatelessComponent(
    component: ts.FunctionDeclaration | ts.VariableStatement,
    propTypesExpressionStatement: ts.ExpressionStatement,
    sourceFile: ts.SourceFile,
) {
    let arrowFuncComponent = helpers.convertReactStatelessFunctionToArrowFunction(component);
    let componentName = arrowFuncComponent.declarationList.declarations[0].name.getText();
    let componentInitializer = arrowFuncComponent.declarationList.declarations[0].initializer;

    const propType = getPropTypesFromTypeAssignment(propTypesExpressionStatement);
    const shouldMakePropTypeDeclaration = propType.members.length > 0;
    const propTypeName = `${componentName}Props`;
    const propTypeDeclaration = ts.createTypeAliasDeclaration([], [], propTypeName, [], propType);
    const propTypeRef = ts.createTypeReferenceNode(propTypeName, []);

    let componentType = ts.createTypeReferenceNode(ts.createQualifiedName(ts.createIdentifier('React'), 'SFC'), [
        shouldMakePropTypeDeclaration ? propTypeRef : propType,
    ]);

    // replace component with ts stateless component
    const typedComponent = ts.createVariableStatement(
        arrowFuncComponent.modifiers,
        ts.createVariableDeclarationList(
            [ts.createVariableDeclaration(componentName, componentType, componentInitializer)],
            arrowFuncComponent.declarationList.flags,
        ),
    );

    let statements = shouldMakePropTypeDeclaration
        ? helpers.insertBefore(sourceFile.statements, component, [propTypeDeclaration])
        : sourceFile.statements;

    statements = helpers.replaceItem(statements, component, typedComponent);
    return ts.updateSourceFileNode(sourceFile, statements);
}

function getPropTypesFromTypeAssignment(propTypesExpressionStatement: ts.ExpressionStatement) {
    if (
        propTypesExpressionStatement !== undefined &&
        ts.isBinaryExpression(propTypesExpressionStatement.expression) &&
        ts.isObjectLiteralExpression(propTypesExpressionStatement.expression.right)
    ) {
        return helpers.buildInterfaceFromPropTypeObjectLiteral(propTypesExpressionStatement.expression.right);
    }

    return ts.createTypeLiteralNode([]);
}
