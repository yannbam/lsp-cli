import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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

function extractLanguageSpecificDocs(content: string, language: string): string {
    const sections: string[] = [];
    const lines = content.split('\n');

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Handle main sections
        if (line.startsWith('## ')) {
            if (line === '## Language-Specific Symbol Kinds') {
                // Add the section header
                sections.push('');
                sections.push(line);
                sections.push('');
                i++;

                // Look for our language subsection
                while (i < lines.length && !lines[i].startsWith('## ')) {
                    if (lines[i].startsWith('### ')) {
                        const langName = lines[i].substring(4).trim().toLowerCase();
                        const isOurLanguage =
                            langName === language ||
                            (language === 'cpp' && langName === 'c++') ||
                            (language === 'csharp' && langName === 'c#') ||
                            (language === 'typescript' && langName.includes('typescript'));

                        if (isOurLanguage) {
                            // Found our language - include it
                            sections.push(lines[i]);
                            i++;
                            // Include content until next ### or ##
                            while (i < lines.length && !lines[i].startsWith('##') && !lines[i].startsWith('### ')) {
                                sections.push(lines[i]);
                                i++;
                            }
                            i--;
                            break;
                        }
                    }
                    i++;
                }
            } else {
                // Include all non-language-specific sections
                sections.push('');
                sections.push(line);
                i++;
                // Include content until next ##
                while (i < lines.length && !lines[i].startsWith('## ')) {
                    sections.push(lines[i]);
                    i++;
                }
                i--;
            }
        }
        i++;
    }

    return sections.join('\n').trim();
}

function getLanguageDocumentation(language: string): string {
    // Try multiple locations for llms.md
    const possiblePaths = [
        join(process.cwd(), 'llms.md'),
        join(dirname(process.argv[1]), '..', 'llms.md'),
        join(__dirname, '..', 'llms.md')
    ];

    for (const llmsPath of possiblePaths) {
        if (existsSync(llmsPath)) {
            const content = readFileSync(llmsPath, 'utf-8');
            return extractLanguageSpecificDocs(content, language);
        }
    }

    return `Error: Could not find llms.md documentation file`;
}

program
    .name('lsp-cli')
    .description('Extract type information from codebases using LSP servers')
    .version('1.0.0')
    .argument('<directory-or-language>', 'Directory to analyze or language for documentation')
    .argument('[language]', 'Language (java, cpp, c, csharp, haxe, typescript)')
    .argument('[output-file]', 'Output file')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(
        async (
            directoryOrLanguage: string,
            language?: string,
            outputFile?: string,
            options?: { verbose?: boolean }
        ) => {
            const supportedLanguages: SupportedLanguage[] = ['java', 'cpp', 'c', 'csharp', 'haxe', 'typescript'];

            // Check if first argument is a language (documentation mode)
            if (supportedLanguages.includes(directoryOrLanguage as SupportedLanguage) && !language && !outputFile) {
                // Documentation mode: lsp-cli <language>
                const lang = directoryOrLanguage as SupportedLanguage;
                const docs = getLanguageDocumentation(lang);
                console.log(docs);
                return;
            }

            // Regular analysis mode
            const directory = directoryOrLanguage;
            if (!language || !outputFile) {
                console.error('Error: Missing required arguments for analysis mode');
                console.error('Usage: lsp-cli <directory> <language> <output-file>');
                console.error('   or: lsp-cli <language> (for documentation)');
                process.exit(1);
            }
            const logger = new Logger({ verbose: options?.verbose });

            try {
                const dir = resolve(directory);

                if (!existsSync(dir)) {
                    logger.error(`Directory '${dir}' does not exist`);
                    process.exit(1);
                }

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
