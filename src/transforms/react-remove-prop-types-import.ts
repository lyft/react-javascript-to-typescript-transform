import * as ts from 'typescript';
import * as _ from 'lodash';

import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.SourceFile>;

/**
 * Remove `import PropTypes from 'prop-types'` or
 * `import { PropTypes } from 'react'`
 *
 * @example
 * Before:
 * import PropTypes from 'prop-types'
 * import React, { PropTypes } from 'react'
 *
 * After:
 * import React from 'react'
 */
export function reactRemovePropTypesImportTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactRemovePropTypesImportTransformFactory(context: ts.TransformationContext) {
        return function reactRemovePropTypesImportTransform(sourceFile: ts.SourceFile) {
            return ts.updateSourceFileNode(
                sourceFile,
                sourceFile.statements
                    .filter(s => {
                        return !(
                            ts.isImportDeclaration(s) &&
                            ts.isStringLiteral(s.moduleSpecifier) &&
                            s.moduleSpecifier.text === 'prop-types'
                        );
                    })
                    .map(updateReactImportIfNeeded),
            );
        };
    };
}

function updateReactImportIfNeeded(statement: ts.Statement) {
    if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== 'react' ||
        !statement.importClause ||
        !statement.importClause.namedBindings ||
        !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
        return statement;
    }

    const namedBindings = statement.importClause.namedBindings;
    const newNamedBindingElements = namedBindings.elements.filter(elm => elm.name.text !== 'PropTypes');

    if (newNamedBindingElements.length === namedBindings.elements.length) {
        // Means it has no 'PropTypes' named import
        return statement;
    }

    const newImportClause = ts.updateImportClause(
        statement.importClause,
        statement.importClause.name,
        newNamedBindingElements.length === 0
            ? undefined
            : ts.updateNamedImports(namedBindings, newNamedBindingElements),
    );

    return ts.updateImportDeclaration(
        statement,
        statement.decorators,
        statement.modifiers,
        newImportClause,
        statement.moduleSpecifier,
    );
}
