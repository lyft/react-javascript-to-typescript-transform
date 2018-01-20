import * as ts from 'typescript';
import * as chalk from 'chalk';

import { TransformFactoryFactory } from '.';

/**
 * Compile and return result TypeScript
 * @param filePath Path to file to compile
 */
export function compile(filePath: string, factoryFactories: TransformFactoryFactory[]) {
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
    return printer.printNode(ts.EmitHint.SourceFile, result.transformed[0], sourceFiles[0]);
}
