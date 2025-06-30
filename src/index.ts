import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Command } from 'commander';
import { LanguageClient } from './language-client';
import { Logger } from './logger';
import { ServerManager } from './server-manager';
import type { SupportedLanguage } from './types';
import { checkProjectFiles, checkToolchain } from './utils';

const program = new Command();

process.on('unhandledRejection', (reason, _promise) => {
    const logger = new Logger();
    logger.error('Unhandled Rejection', `${reason}`);
    process.exit(1);
});

program
    .name('lsp-cli')
    .description('Extract type information from codebases using LSP servers')
    .version('1.0.0')
    .option('--llm', 'Copy llms.md documentation to current directory')
    .argument('[directory]', 'Directory to analyze')
    .argument('[language]', 'Language (java, cpp, c, csharp, haxe, typescript)')
    .argument('[output-file]', 'Output file')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(
        async (
            directory?: string,
            language?: string,
            outputFile?: string,
            options?: { verbose?: boolean; llm?: boolean }
        ) => {
            // Handle --llm flag
            if (options?.llm) {
                const logger = new Logger();
                try {
                    // Find llms.md in the same directory as the script
                    const scriptDir = dirname(process.argv[1]);
                    const sourcePath = join(scriptDir, 'llms.md');
                    const destPath = join(process.cwd(), 'llms.md');

                    if (!existsSync(sourcePath)) {
                        logger.error('Could not find llms.md in distribution');
                        process.exit(1);
                    }

                    if (existsSync(destPath)) {
                        logger.warn('llms.md already exists in current directory');
                        process.exit(1);
                    }

                    copyFileSync(sourcePath, destPath);
                    logger.success('Copied llms.md to current directory');
                    process.exit(0);
                } catch (error) {
                    logger.error('Failed to copy llms.md', error instanceof Error ? error.message : String(error));
                    process.exit(1);
                }
            }

            // Regular analysis mode - all arguments required
            if (!directory || !language || !outputFile) {
                console.error('Error: Missing required arguments');
                console.error('Usage: lsp-cli <directory> <language> <output-file>');
                console.error('   or: lsp-cli --llm');
                process.exit(1);
            }
            const logger = new Logger({ verbose: options?.verbose });

            try {
                const dir = resolve(directory);

                if (!existsSync(dir)) {
                    logger.error(`Directory '${dir}' does not exist`);
                    process.exit(1);
                }

                const supportedLanguages: SupportedLanguage[] = ['java', 'cpp', 'c', 'csharp', 'haxe', 'typescript'];
                if (!supportedLanguages.includes(language as SupportedLanguage)) {
                    logger.error(
                        `Unsupported language '${language}'`,
                        `Supported languages: ${supportedLanguages.join(', ')}`
                    );
                    process.exit(1);
                }

                const lang = language as SupportedLanguage;

                // Check toolchain
                const toolchainResult = await checkToolchain(lang);
                if (!toolchainResult.installed) {
                    logger.error(`Required toolchain not found for ${lang}`, toolchainResult.message);
                    process.exit(1);
                }

                // Check project files
                const projectFileResult = await checkProjectFiles(dir, lang);
                if (!projectFileResult.found) {
                    logger.warn(`No project configuration found for ${lang}`);
                    logger.warn(projectFileResult.message);
                    logger.warn('Results may be incomplete or inaccurate');
                }

                // Install/check LSP server
                const serverManager = new ServerManager(logger);
                logger.serverStatus(lang, 'checking');
                const serverPath = await serverManager.ensureServer(lang);
                logger.serverStatus(lang, 'ready', serverPath);

                // Start LSP client and analyze
                const client = new LanguageClient(lang, serverPath, dir, logger);
                logger.section(`Analyzing ${dir}`);

                await client.start();
                const symbols = await client.analyzeDirectory();
                await client.stop();

                // Output JSON
                const output = {
                    language: lang,
                    directory: dir,
                    symbols
                };

                const jsonOutput = JSON.stringify(output, null, 2);

                logger.info(`Writing output to: ${outputFile}`);
                writeFileSync(outputFile, jsonOutput);

                logger.success(`Analysis complete!`);
                logger.summary('Results', [
                    { label: 'Language', value: lang, color: 'blue' },
                    { label: 'Symbols found', value: symbols.length, color: 'green' },
                    { label: 'Output file', value: outputFile },
                    { label: 'File size', value: `${(jsonOutput.length / 1024).toFixed(1)} KB` }
                ]);
            } catch (error) {
                logger.error('Analysis failed', error instanceof Error ? error.message : String(error));
                if (options?.verbose && error instanceof Error && error.stack) {
                    logger.debug(error.stack);
                }
                process.exit(1);
            }
        }
    );

program.parse();
