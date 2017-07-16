import * as ts from 'typescript';
import * as kinds from './isKind';

export * from './isKind';

/**
 * If a class declaration a react class?
 * @param classDeclaration
 * @param typeChecker
 */
export function isReactComponent(classDeclaration: ts.ClassDeclaration, typeChecker: ts.TypeChecker): boolean {
    // Only classes that extend React.Component
    if (!classDeclaration.heritageClauses) {
        return false;
    }
    if (classDeclaration.heritageClauses.length !== 1) {
        return false;
    }

    const firstHeritageClauses = classDeclaration.heritageClauses[0];

    if (firstHeritageClauses.token !== ts.SyntaxKind.ExtendsKeyword) {
        return false;
    }

    const expressionWithTypeArguments = firstHeritageClauses.types[0];

    if (!expressionWithTypeArguments) {
        return false;
    }

    // Try type checker and fallback to node text
    const type = typeChecker.getTypeAtLocation(expressionWithTypeArguments);
    let typeSymbol = type && type.symbol && type.symbol.name;
    if (!typeSymbol) {
        typeSymbol = expressionWithTypeArguments.expression.getText();
    }

    if (!/React\.Component|Component/.test(typeSymbol)) {
        return false;
    }

    return true;
}

/**
 * Determine if a ts.HeritageClause is React HeritageClause
 *
 * @example `extends React.Component<{}, {}>` is a React HeritageClause
 *
 * @todo: this is lazy. Use the typeChecker instead
 * @param clause
 */
export function isReactHeritageClause(clause: ts.HeritageClause) {
    return clause.token === ts.SyntaxKind.ExtendsKeyword &&
        clause.types.length === 1 &&
        kinds.isExpressionWithTypeArguments(clause.types[0]) &&
        /Component/.test(clause.types[0].expression.getText());
}

/**
 * Return true if a statement is a React propType assignment statement
 * @example
 * SomeComponent.propTypes = { foo: React.PropTypes.string };
 * @param statement
 */
export function isReactPropTypeAssignmentStatement(statement: ts.Statement): statement is ts.ExpressionStatement {
    return kinds.isExpressionStatement(statement)
        && kinds.isBinaryExpression(statement.expression)
        && statement.expression.operatorToken.kind === ts.SyntaxKind.FirstAssignment
        && kinds.isPropertyAccessExpression(statement.expression.left)
        && /\.propTypes$|\.propTypes\..+$/.test(statement.expression.left.getText())
}

/**
 * Does class member have a "static" member?
 * @param classMember
 */
export function hasStaticModifier(classMember: ts.ClassElement) {
    if (!classMember.modifiers) {
        return false;
    }
    const staticModifier = find(classMember.modifiers, (modifier) => {
        return modifier.kind == ts.SyntaxKind.StaticKeyword;
    });
    return staticModifier !== undefined;
}

/**
 * Is class member a React "propTypes" member?
 * @param classMember
 * @param sourceFile
 */
export function isPropTypesMember(classMember: ts.ClassElement, sourceFile: ts.SourceFile) {
    try {
         return classMember.name !== undefined && classMember.name.getFullText(sourceFile) !== 'propTypes'
    } catch (e) {
        return false;
    }
}

// TODO: replace following functions with Lodash?
// ---------------------------------------------------------------------------------------------------------

/**
 * Find an item in a collection with a matcher
 * @param collection
 * @param matcher
 */
export function find<T>(collection: T[], matcher: (item: T) => boolean): T | undefined {
    for (const item of collection) {
        if (matcher(item)) { return item; }
    }

    return undefined;
}

/**
 * Look in a collection and see if collection has a specific item
 * @param collection
 * @param matcher
 */
export function has<T>(collection: T[], matcher: (item: T) => boolean): boolean {
    if (!collection || !collection.length) {
        return false;
    }

    for (const item of collection) {
        if (matcher(item)) { return true; }
    }

    return false;
}

/**
 * Insert an item in middle of an array after a specific item
 * @param collection
 * @param afterItem
 * @param newItem
 */
export function insertAfter<T>(collection: T[], afterItem: T, newItem: T) {
    const index = collection.indexOf(afterItem) + 1;

    return collection.slice(0, index).concat(newItem).concat(collection.slice(index));
}

/**
 * Insert an item in middle of an array before a specific item
 * @param collection
 * @param beforeItem
 * @param newItem
 */
export function insertBefore<T>(collection: T[], beforeItem: T, newItem: T) {
    const index = collection.indexOf(beforeItem);

    return collection.slice(0, index).concat(newItem).concat(collection.slice(index));
}

/**
 * Replace an item in a collection with another item
 * @param collection
 * @param item
 * @param newItem
 */
export function replaceItem<T>(collection: T[], item: T, newItem: T) {
    const index = collection.indexOf(item);

    return collection.slice(0, index).concat(newItem).concat(collection.slice(index + 1));
}

/**
 * Remove an item from a collection
 * @param collection
 * @param item
 * @param newItem
 */
export function removeItem<T>(collection: T[], item: T) {
    const index = collection.indexOf(item);

    return collection.slice(0, index).concat(collection.slice(index + 1));
}
