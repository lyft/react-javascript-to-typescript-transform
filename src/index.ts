import * as ts from 'typescript';

import { compile } from './compiler';
import { reactJSMakePropsAndStateInterfaceTransformFactoryFactory } from './transforms/react-js-make-props-and-state-transform';
import { reactRemovePropTypesAssignmentTransformFactoryFactory } from './transforms/react-remove-prop-types-assignment-transform';
import { reactMovePropTypesToClassTransformFactoryFactory } from './transforms/react-move-prop-types-to-class-transform';
import { collapseIntersectionInterfacesTransformFactoryFactory } from './transforms/collapse-intersection-interfaces-transform';
import { reactRemoveStaticPropTypesMemberTransformFactoryFactory } from './transforms/react-remove-static-prop-types-member-transform';
import { reactStatelessFunctionMakePropsTransformFactoryFactory } from './transforms/react-stateless-function-make-props-transform';
import { reactRemovePropTypesImportTransformFactoryFactory } from './transforms/react-remove-prop-types-import';

export {
    reactMovePropTypesToClassTransformFactoryFactory,
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
    reactStatelessFunctionMakePropsTransformFactoryFactory,
    collapseIntersectionInterfacesTransformFactoryFactory,
    reactRemovePropTypesAssignmentTransformFactoryFactory,
    reactRemoveStaticPropTypesMemberTransformFactoryFactory,
    reactRemovePropTypesImportTransformFactoryFactory,
    compile,
};

export const allTransforms = [
    reactMovePropTypesToClassTransformFactoryFactory,
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
    reactStatelessFunctionMakePropsTransformFactoryFactory,
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
export function run(filePath: string): string {
    return compile(filePath, allTransforms);
}
