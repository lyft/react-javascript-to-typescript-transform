import * as ts from 'typescript';

import * as helpers from '../helpers';

/**
 * Collapse unnecessary intersections between type literals
 *
 * @example
 * Before:
 * type Foo = {foo: string;} & {bar: number;}
 *
 * After
 * type Foo = {foo: string; bar: number;}
 */
export function collapseIntersectionInterfacesTransformFactoryFactory(
        typeChecker: ts.TypeChecker,
    ): ts.TransformerFactory<ts.Node> {
    return function collapseIntersectionInterfacesTransformFactory(context: ts.TransformationContext) {
        return function collapseIntersectionInterfacesTransform(sourceFile: ts.SourceFile) {
            const visited = ts.visitEachChild(sourceFile, visitor, context);
            ts.addEmitHelpers(visited, context.readEmitHelpers());

            return visited;

            function visitor(node: ts.Node) {
                if (helpers.isTypeAliasDeclaration(node)) {
                    return visitTypeAliasDeclaration(node);
                }

                return node;
            }

            function visitTypeAliasDeclaration(node: ts.TypeAliasDeclaration) {
                if (
                    helpers.isIntersectionTypeNode(node.type)
                    && node.type.types.every((type) => helpers.isTypeLiteralNode(type))
                ) {
                    const allMembers = node.type.types
                        .map((type: ts.TypeLiteralNode) => type.members)
                        .reduce((all, members) => ts.createNodeArray(all.concat(members)), ts.createNodeArray([]));

                    return ts.createTypeAliasDeclaration(
                        [],
                        [],
                        node.name.text,
                        [],
                        ts.createTypeLiteralNode(allMembers),
                    );
                }

                return node;
            }
        }
    }
}

