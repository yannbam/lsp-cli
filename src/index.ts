import { Command } from 'commander';
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { LanguageClient } from './language-client';
import { ServerManager } from './server-manager';
import type { SupportedLanguage } from './types';
import { checkProjectFiles, checkToolchain } from './utils';

const program = new Command();

process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	process.exit(1);
});

program
	.name('lsp-cli')
	.description('Extract type information from codebases using LSP servers')
	.version('1.0.0')
	.argument('<directory>', 'Directory to analyze')
	.argument('<language>', 'Language (java, cpp, c, csharp, haxe, typescript)')
	.argument('<output-file>', 'Output file')
	.option('-v, --verbose', 'Enable verbose logging')
	.action(async (directory: string, language: string, outputFile: string, options: { verbose?: boolean }) => {
		try {
			const dir = resolve(directory);

			if (!existsSync(dir)) {
				console.error(`Error: Directory '${dir}' does not exist`);
				process.exit(1);
			}

			const supportedLanguages: SupportedLanguage[] = ['java', 'cpp', 'c', 'csharp', 'haxe', 'typescript'];
			if (!supportedLanguages.includes(language as SupportedLanguage)) {
				console.error(`Error: Unsupported language '${language}'`);
				console.error(`Supported languages: ${supportedLanguages.join(', ')}`);
				process.exit(1);
			}

			const lang = language as SupportedLanguage;

			// Check toolchain
			const toolchainResult = await checkToolchain(lang);
			if (!toolchainResult.installed) {
				console.error(`Error: Required toolchain not found for ${lang}`);
				console.error(toolchainResult.message);
				process.exit(1);
			}

			// Check project files
			const projectFileResult = await checkProjectFiles(dir, lang);
			if (!projectFileResult.found) {
				console.warn(`Warning: No project configuration found for ${lang}`);
				console.warn(projectFileResult.message);
				console.warn('Results may be incomplete or inaccurate');
			}

			// Install/check LSP server
			const serverManager = new ServerManager();
			console.log(`Checking LSP server for ${lang}...`);
			const serverPath = await serverManager.ensureServer(lang);
			console.log(`LSP server ready at: ${serverPath}`);

			// Start LSP client and analyze
			const client = new LanguageClient(lang, serverPath, dir, options.verbose);
			console.log(`Analyzing ${dir}...`);

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

			console.log(`Writing output to: ${outputFile}`);
			writeFileSync(outputFile, jsonOutput);
			console.log(`Output written to: ${outputFile} (${jsonOutput.length} bytes)`);
		} catch (error) {
			console.error('Error:', error);
			console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
			process.exit(1);
		}
	});

program.parse();
