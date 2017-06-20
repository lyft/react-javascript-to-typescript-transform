#!/usr/bin/env node

import * as program from 'commander';
import * as glob from 'glob';
import * as fs from 'fs';
import * as path from 'path';

import { run } from '.';

program
    .version('1.0.0')
    .usage('[options] <filename or glob>')
    .command('* <glob>')
    .action((globPattern) => {
        if (!globPattern) {
            throw new Error('You must provide a file name or glob pattern to transform');
        }
        const files = glob.sync(globPattern, {});
        for (const file of files) {
            const filePath = path.resolve(file);
            const newPath = filePath.replace(/\.jsx?$/, '.tsx');

            try {
                fs.renameSync(filePath, newPath);
                const result = run(newPath);
                fs.writeFileSync(newPath, result);
            } catch(error) {
                console.warn(`Failed to convert ${file}`);
                console.warn(error);
            }
        }
    });

program.parse(process.argv);
