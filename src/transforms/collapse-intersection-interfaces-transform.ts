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
    ): ts.TransformerFactory<ts.SourceFile> {
    return function collapseIntersectionInterfacesTransformFactory(context: ts.TransformationContext) {
        return function collapseIntersectionInterfacesTransform(sourceFile: ts.SourceFile) {
            const visited = ts.visitEachChild(sourceFile, visitor, context);
            ts.addEmitHelpers(visited, context.readEmitHelpers());

            return visited;

            function visitor(node: ts.Node) {
                if (ts.isTypeAliasDeclaration(node)) {
                    return visitTypeAliasDeclaration(node);
                }

                return node;
            }

            function visitTypeAliasDeclaration(node: ts.TypeAliasDeclaration) {
                if (
                    ts.isIntersectionTypeNode(node.type)
                    && node.type.types.every(ts.isTypeLiteralNode)
                ) {
                    // We need cast `node.type.types` to `ts.NodeArray<ts.TypeLiteralNode>`
                    // because TypeScript can't figure out `node.type.types.every(ts.isTypeLiteralNode)`
                    const allMembers = (node.type.types as ts.NodeArray<ts.TypeLiteralNode>)
                        .map((type) => type.members)
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

