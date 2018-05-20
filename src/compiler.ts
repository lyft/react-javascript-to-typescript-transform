import * as os from 'os';
import * as fs from 'fs';
import * as ts from 'typescript';
import chalk from 'chalk';
import * as _ from 'lodash';
import * as prettier from 'prettier';
import * as detectIndent from 'detect-indent';

import { TransformFactoryFactory } from '.';

export interface CompilationOptions {
    ignorePrettierErrors: boolean;
}

const DEFAULT_COMPILATION_OPTIONS: CompilationOptions = {
    ignorePrettierErrors: false,
};

export { DEFAULT_COMPILATION_OPTIONS };

/**
 * Compile and return result TypeScript
 * @param filePath Path to file to compile
 */
export function compile(
    filePath: string,
    factoryFactories: TransformFactoryFactory[],
    incomingPrettierOptions: prettier.Options = {},
    compilationOptions: CompilationOptions = DEFAULT_COMPILATION_OPTIONS,
) {
    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2017,
        module: ts.ModuleKind.ES2015,
    };

    const program = ts.createProgram([filePath], compilerOptions);
    // `program.getSourceFiles()` will include those imported files,
    // like: `import * as a from './file-a'`.
    // We should only transform current file.
    const sourceFiles = program.getSourceFiles().filter(sf => sf.fileName === filePath);
    const typeChecker = program.getTypeChecker();

    const result = ts.transform(
        sourceFiles,
        factoryFactories.map(factoryFactory => factoryFactory(typeChecker), compilerOptions),
    );

    if (result.diagnostics && result.diagnostics.length) {
        console.log(
            chalk.yellow(`
        ======================= Diagnostics for ${filePath} =======================
        `),
        );
        for (const diag of result.diagnostics) {
            if (diag.file && diag.start) {
                const pos = diag.file.getLineAndCharacterOfPosition(diag.start);
                console.log(`(${pos.line}, ${pos.character}) ${diag.messageText}`);
            }
        }
    }

    const printer = ts.createPrinter();

    // TODO: fix the index 0 access... What if program have multiple source files?
    const printed = printer.printNode(ts.EmitHint.SourceFile, result.transformed[0], sourceFiles[0]);

    const inputSource = fs.readFileSync(filePath, 'utf-8');
    const prettierOptions = getPrettierOptions(filePath, inputSource, incomingPrettierOptions);

    try {
        return prettier.format(printed, prettierOptions);
    } catch (prettierError) {
        if (compilationOptions.ignorePrettierErrors) {
            console.warn(`Prettier failed for ${filePath} (ignorePrettierErrors is on):`);
            console.warn(prettierError);
            return printed;
        }
        throw prettierError;
    }
}

/**
 * Get Prettier options based on style of a JavaScript
 * @param filePath Path to source file
 * @param source Body of a JavaScript
 * @param options Existing prettier option
 */
export function getPrettierOptions(filePath: string, source: string, options: prettier.Options): prettier.Options {
    const resolvedOptions = prettier.resolveConfig.sync(filePath);
    if (resolvedOptions) {
        _.defaults(resolvedOptions, options);
        return resolvedOptions;
    }
    const { amount: indentAmount, type: indentType } = detectIndent(source);
    const sourceWidth = getCodeWidth(source, 80);
    const semi = getUseOfSemi(source);
    const quotations = getQuotation(source);

    _.defaults(Object.assign({}, options), {
        tabWidth: indentAmount,
        useTabs: indentType && indentType === 'tab',
        printWidth: sourceWidth,
        semi,
        singleQuote: quotations === 'single',
    });

    return options;
}

/**
 * Given body of a source file, return its code width
 * @param source
 */
function getCodeWidth(source: string, defaultWidth: number): number {
    return source.split(os.EOL).reduce((result, line) => Math.max(result, line.length), defaultWidth);
}

/**
 * Detect if a source file is using semicolon
 * @todo: use an actual parser. This is not a proper implementation
 * @param source
 * @return true if code is using semicolons
 */
function getUseOfSemi(source: string): boolean {
    return source.indexOf(';') !== -1;
}

/**
 * Detect if a source file is using single quotes or double quotes
 * @todo use an actual parser. This is not a proper implementation
 * @param source
 */
function getQuotation(source: string): 'single' | 'double' {
    const numberOfSingleQuotes = (source.match(/\'/g) || []).length;
    const numberOfDoubleQuotes = (source.match(/\"/g) || []).length;
    if (numberOfSingleQuotes > numberOfDoubleQuotes) {
        return 'single';
    }
    return 'double';
}
