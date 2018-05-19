import * as ts from 'typescript';
import * as prettier from 'prettier';

import { compile } from './compiler';
import { reactJSMakePropsAndStateInterfaceTransformFactoryFactory } from './transforms/react-js-make-props-and-state-transform';
import { reactRemovePropTypesAssignmentTransformFactoryFactory } from './transforms/react-remove-prop-types-assignment-transform';
import { reactMovePropTypesToClassTransformFactoryFactory } from './transforms/react-move-prop-types-to-class-transform';
import { collapseIntersectionInterfacesTransformFactoryFactory } from './transforms/collapse-intersection-interfaces-transform';
import { reactRemoveStaticPropTypesMemberTransformFactoryFactory } from './transforms/react-remove-static-prop-types-member-transform';
import { reactStatelessFunctionMakePropsTransformFactoryFactory } from './transforms/react-stateless-function-make-props-transform';
import { reactRemovePropTypesImportTransformFactoryFactory } from './transforms/react-remove-prop-types-import';
import { removeDefaultExportVariableAssignmentTransformFactoryFactory } from './transforms/remove-default-export-variable-assignment-transform';

export {
    reactMovePropTypesToClassTransformFactoryFactory,
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
    reactStatelessFunctionMakePropsTransformFactoryFactory,
    collapseIntersectionInterfacesTransformFactoryFactory,
    reactRemovePropTypesAssignmentTransformFactoryFactory,
    reactRemoveStaticPropTypesMemberTransformFactoryFactory,
    reactRemovePropTypesImportTransformFactoryFactory,
    removeDefaultExportVariableAssignmentTransformFactoryFactory,
    compile,
};

export const allTransforms = [
    reactMovePropTypesToClassTransformFactoryFactory,
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
    reactStatelessFunctionMakePropsTransformFactoryFactory,
    removeDefaultExportVariableAssignmentTransformFactoryFactory,
    collapseIntersectionInterfacesTransformFactoryFactory,
    reactRemovePropTypesAssignmentTransformFactoryFactory,
    reactRemoveStaticPropTypesMemberTransformFactoryFactory,
    reactRemovePropTypesImportTransformFactoryFactory,
];

export type TransformFactoryFactory = (typeChecker: ts.TypeChecker) => ts.TransformerFactory<ts.SourceFile>;

/**
 * Run React JavaScript to TypeScript transform for file at `filePath`
 * @param filePath
 */
export function run(filePath: string, prettierOptions: prettier.Options = {}): string {
    return compile(filePath, allTransforms, prettierOptions);
}
