import * as ts from 'typescript';
import * as _ from 'lodash';

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
                if (ts.isIntersectionTypeNode(node.type)) {
                    return ts.createTypeAliasDeclaration(
                        [],
                        [],
                        node.name.text,
                        [],
                        visitIntersectionTypeNode(node.type),
                    );
                }

                return node;
            }

            function visitIntersectionTypeNode(node: ts.IntersectionTypeNode) {
                // Only intersection of type literals can be colapsed.
                // We are currently ignoring intersections such as `{foo: string} & {bar: string} & TypeRef`
                // TODO: handle mix of type references and multiple literal types
                if (!node.types.every(typeNode => ts.isTypeLiteralNode(typeNode))) {
                    return node;
                }

                // We need cast `node.type.types` to `ts.NodeArray<ts.TypeLiteralNode>`
                // because TypeScript can't figure out `node.type.types.every(ts.isTypeLiteralNode)`
                const types = node.types as ts.NodeArray<ts.TypeLiteralNode>;

                // Build a map of member names to all of types found in intersectioning type literals
                // For instance {foo: string, bar: number} & { foo: number } will result in a map like this:
                // Map {
                //   'foo' => Set { 'string', 'number' },
                //   'bar' => Set { 'number' }
                // }
                const membersMap = new Map<string | symbol, Set<ts.TypeNode>>();

                // A sepecial member of type literal nodes is index signitures which don't have a name
                // We use this symbol to track it in our members map
                const INDEX_SIGNITUTRE_MEMBER = Symbol('Index signiture member');

                // Keep a reference of first index signiture member parameters. (ignore rest)
                let indexMemberParameter: ts.NodeArray<ts.ParameterDeclaration> | null = null;

                // Iterate through all of type literal nodes members and add them to the members map
                types.forEach(typeNode => {
                    typeNode.members.forEach(member => {
                        if (ts.isIndexSignatureDeclaration(member)) {
                            if (member.type !== undefined) {
                                if (membersMap.has(INDEX_SIGNITUTRE_MEMBER)) {
                                    membersMap.get(INDEX_SIGNITUTRE_MEMBER)!.add(member.type);
                                } else {
                                    indexMemberParameter = member.parameters;
                                    membersMap.set(INDEX_SIGNITUTRE_MEMBER, new Set([member.type]));
                                }
                            }
                        } else if (ts.isPropertySignature(member)) {
                            if (member.type !== undefined) {
                                let memberName = member.name.getText(sourceFile);

                                // For unknown reasons, member.name.getText() is returning nothing in some cases
                                // This is probably because previous transformers did something with the AST that
                                // index of text string of member identifier is lost
                                // TODO: investigate
                                if (!memberName) {
                                    memberName = (member.name as any).escapedText;
                                }

                                if (membersMap.has(memberName)) {
                                    membersMap.get(memberName)!.add(member.type);
                                } else {
                                    membersMap.set(memberName, new Set([member.type]));
                                }
                            }
                        }
                    });
                });

                // Result type literal members list
                const finalMembers: Array<ts.PropertySignature | ts.IndexSignatureDeclaration> = [];

                // Put together the map into a type literal that has member per each map entery and type of that
                // member is a union of all types in vlues for that member name in members map
                // if a member has only one type, create a simple type literal for it
                for (const [name, types] of membersMap.entries()) {
                    if (typeof name === 'symbol') {
                        continue;
                    }
                    // if for this name there is only one type found use the first type, otherwise make a union of all types
                    let resultType = types.size === 1 ? Array.from(types)[0] : createUnionType(Array.from(types));

                    finalMembers.push(ts.createPropertySignature([], name, undefined, resultType, undefined));
                }

                // Handle index signiture member
                if (membersMap.has(INDEX_SIGNITUTRE_MEMBER)) {
                    const indexTypes = Array.from(membersMap.get(INDEX_SIGNITUTRE_MEMBER)!);
                    let indexType = indexTypes[0];
                    if (indexTypes.length > 1) {
                        indexType = createUnionType(indexTypes);
                    }
                    const indexSigniture = ts.createIndexSignature([], [], indexMemberParameter!, indexType);
                    finalMembers.push(indexSigniture);
                }

                // Generate one single type literal node
                return ts.createTypeLiteralNode(finalMembers);
            }

            /**
             * Create a union type from multiple type nodes
             * @param types
             */
            function createUnionType(types: ts.TypeNode[]) {
                // first dedupe literal types
                // TODO: this only works if all types are primitive types like string or number
                const uniqueTypes = _.uniqBy(types, type => type.kind);
                return ts.createUnionOrIntersectionTypeNode(ts.SyntaxKind.UnionType, uniqueTypes);
            }
        };
    };
}
