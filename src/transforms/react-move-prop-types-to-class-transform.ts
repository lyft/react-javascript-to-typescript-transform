import * as ts from 'typescript';
import * as _ from 'lodash';

import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * Move Component.propTypes statements into class as a static member of the class
 * if React component is defined using a class
 *
 * Note: This transform assumes React component declaration and propTypes assignment statement
 * are both on root of the source file
 *
 * @example
 * Before:
 * class SomeComponent extends React.Component<{foo: number;}, {bar: string;}> {}
 * SomeComponent.propTypes = { foo: React.PropTypes.string }
 *
 * After
 * class SomeComponent extends React.Component<{foo: number;}, {bar: string;}> {
 *   static propTypes = { foo: React.PropTypes.string }
 * }
 *
 * @todo
 * This is not supporting multiple statements for a single class yet
 * ```
 * class SomeComponent extends React.Component<{foo: number;}, {bar: string;}> {}
 * SomeComponent.propTypes = { foo: React.PropTypes.string }
 * SomeComponent.propTypes.bar = React.PropTypes.number;
 * ```
 */
export function reactMovePropTypesToClassTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactMovePropTypesToClassTransformFactory(context: ts.TransformationContext) {
        return function reactMovePropTypesToClassTransform(sourceFile: ts.SourceFile) {
            return visitSourceFile(sourceFile, typeChecker);
        };
    };
}

/**
 * Make the move from propType statement to static member
 * @param sourceFile
 * @param typeChecker
 */
function visitSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    let statements = sourceFile.statements;

    // Look for propType assignment statements
    const propTypeAssignments = statements.filter(statement =>
        helpers.isReactPropTypeAssignmentStatement(statement),
    ) as ts.ExpressionStatement[];

    for (const propTypeAssignment of propTypeAssignments) {
        // Look for the class declarations with the same name
        const componentName = helpers.getComponentName(propTypeAssignment, sourceFile);

        const classStatement = (_.find(
            statements,
            statement =>
                ts.isClassDeclaration(statement) &&
                statement.name !== undefined &&
                statement.name.getText(sourceFile) === componentName,
        ) as {}) as ts.ClassDeclaration; // Type weirdness

        // && helpers.isBinaryExpression(propTypeAssignment.expression) is redundant to satisfy the type checker
        if (classStatement && ts.isBinaryExpression(propTypeAssignment.expression)) {
            const newClassStatement = addStaticMemberToClass(
                classStatement,
                'propTypes',
                propTypeAssignment.expression.right,
            );
            statements = ts.createNodeArray(
                helpers.replaceItem(sourceFile.statements, classStatement, newClassStatement),
            );
        }
    }

    return ts.updateSourceFileNode(sourceFile, statements);
}

/**
 * Insert a new static member into a class
 * @param classDeclaration
 * @param name
 * @param value
 */
function addStaticMemberToClass(classDeclaration: ts.ClassDeclaration, name: string, value: ts.Expression) {
    const staticModifier = ts.createToken(ts.SyntaxKind.StaticKeyword);
    const propertyDeclaration = ts.createProperty([], [staticModifier], name, undefined, undefined, value);
    return ts.updateClassDeclaration(
        classDeclaration,
        classDeclaration.decorators,
        classDeclaration.modifiers,
        classDeclaration.name,
        classDeclaration.typeParameters,
        ts.createNodeArray(classDeclaration.heritageClauses),
        ts.createNodeArray([propertyDeclaration, ...classDeclaration.members]),
    );
}
