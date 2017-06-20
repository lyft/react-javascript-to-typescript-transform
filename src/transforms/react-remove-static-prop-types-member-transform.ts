import * as ts from 'typescript';

import * as helpers from '../helpers';

export type Factory = ts.TransformerFactory<ts.Node>;

/**
 * Remove static propTypes
 *
 * @example
 * Before:
 * class SomeComponent extends React.Component<{foo: number;}, {bar: string;}> {
 *   static propTypes = {
 *      foo: React.PropTypes.number.isRequired,
 *   }
 * }
 *
 * After:
 * class SomeComponent extends React.Component<{foo: number;}, {bar: string;}> {}
 */
export function reactRemoveStaticPropTypesMemberTransformFactoryFactory(typeChecker: ts.TypeChecker): Factory {
    return function reactRemoveStaticPropTypesMemberTransformFactory(context: ts.TransformationContext) {
        return function reactRemoveStaticPropTypesMemberTransform(sourceFile: ts.SourceFile) {
            return ts.visitEachChild(sourceFile, visitor, context);

            function visitor(node: ts.Node) {
                if (helpers.isClassDeclaration(node) && helpers.isReactComponent(node, typeChecker)) {
                    return ts.updateClassDeclaration(
                        node,
                        node.decorators,
                        node.modifiers,
                        node.name,
                        node.typeParameters,
                        ts.createNodeArray(node.heritageClauses),
                        node.members.filter((member) => {
                            if (
                                helpers.isPropertyDeclaration(member)
                                && helpers.hasStaticModifier(member)
                                && helpers.isPropTypesMember(member, sourceFile)
                            ) {
                                return false;
                            }

                            // propTypes getter
                            if (
                                helpers.isGetAccessorDeclaration(member)
                                && helpers.hasStaticModifier(member)
                                && helpers.isPropTypesMember(member, sourceFile)
                            ) {
                                return false;
                            }
                            return true;
                        }),
                    )
                }
                return node;
            }
        }
    }
}
