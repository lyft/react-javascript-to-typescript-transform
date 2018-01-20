import * as ts from 'typescript';

import { compile } from './compiler';
import {
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
} from './transforms/react-js-make-props-and-state-transform';
import {
    reactHoistGenericsTransformFactoryFactory,
} from './transforms/react-hoist-generics-transform';
import {
    reactRemovePropTypesAssignmentTransformFactoryFactory,
} from './transforms/react-remove-prop-types-assignment-transform';
import {
    reactMovePropTypesToClassTransformFactoryFactory,
} from './transforms/react-move-prop-types-to-class-transform';
import {
    collapseIntersectionInterfacesTransformFactoryFactory,
} from './transforms/collapse-intersection-interfaces-transform';
import {
    reactRemoveStaticPropTypesMemberTransformFactoryFactory,
} from './transforms/react-remove-static-prop-types-member-transform';

export {
    reactMovePropTypesToClassTransformFactoryFactory,
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
    reactHoistGenericsTransformFactoryFactory,
    collapseIntersectionInterfacesTransformFactoryFactory,
    reactRemovePropTypesAssignmentTransformFactoryFactory,
    reactRemoveStaticPropTypesMemberTransformFactoryFactory,
    compile,
};

export const allTransforms = [
    reactMovePropTypesToClassTransformFactoryFactory,
    reactJSMakePropsAndStateInterfaceTransformFactoryFactory,
    reactHoistGenericsTransformFactoryFactory,
    collapseIntersectionInterfacesTransformFactoryFactory,
    reactRemovePropTypesAssignmentTransformFactoryFactory,
    reactRemoveStaticPropTypesMemberTransformFactoryFactory,
];

export type TransformFactoryFactory = (typeChecker: ts.TypeChecker) => ts.TransformerFactory<ts.SourceFile>;

/**
 * Run React JavaScript to TypeScript transform for file at `filePath`
 * @param filePath
 */
export function run(filePath: string): string {
    return compile(filePath, allTransforms);
}
