import * as ts from 'typescript';
import * as _ from 'lodash';

import * as helpers from '../helpers';

/**
 * Remove default export variable assignment
 *
 * @example
 * Before:
 * export default const foo: string = 'str';
 *
 * After
 * const foo: string = 'str';
 * export default foo;
 */
export function removeDefaultExportVariableAssignmentTransformFactoryFactory(
    typeChecker: ts.TypeChecker,
): ts.TransformerFactory<ts.SourceFile> {
    return function removeDefaultExportVariableAssignmentTransformFactory(context: ts.TransformationContext) {
        return function removeDefaultExportVariableAssignmentTransform(sourceFile: ts.SourceFile) {
            const visited = visitSourceFile(sourceFile, typeChecker);
            ts.addEmitHelpers(visited, context.readEmitHelpers());
            return visited;
        };
    };
}

function visitSourceFile(sourceFile: ts.SourceFile, typeChecker: ts.TypeChecker) {
    let statements = _.toArray(sourceFile.statements);
    const newStatements = [];

    let index = 0;
    while (index < statements.length) {
        const statement = statements[index];
        const nextStatement = statements[index + 1];
        let statementText;
        try {
            statementText = statement.getText();
        } catch {}

        if (
            nextStatement &&
            ts.isExportAssignment(statement) &&
            statementText === 'export default' &&
            ts.isVariableStatement(nextStatement)
        ) {
            // push variable declaration
            newStatements.push(nextStatement);

            // push export default for variable declaration
            const identifer = ts.createIdentifier(
                nextStatement.declarationList.declarations[0] &&
                    nextStatement.declarationList.declarations[0].name.getText(),
            );
            const defaultExport = ts.createExportDefault(identifer);
            newStatements.push(defaultExport);

            // skip next statement because we pushed nextStatement already
            index++;
        } else {
            newStatements.push(statement);
        }
        index++;
    }
    return ts.updateSourceFileNode(sourceFile, newStatements);
}
