import { exec } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ServerConfig, SupportedLanguage } from './types';
import { downloadFile, extractArchive } from './utils';

const execAsync = promisify(exec);

export class ServerManager {
    private baseDir: string;

    constructor() {
        this.baseDir = join(homedir(), '.lsp-cli', 'servers');
        mkdirSync(this.baseDir, { recursive: true });
    }

    async ensureServer(language: SupportedLanguage): Promise<string> {
        const serverDir = join(this.baseDir, language);
        const config = this.getServerConfig(language);

        if (this.isServerInstalled(language)) {
            return serverDir;
        }

        console.log(`Installing ${language} LSP server...`);
        mkdirSync(serverDir, { recursive: true });

        if (config.installScript) {
            await config.installScript(serverDir);
        } else {
            await this.downloadAndExtract(config.downloadUrl, serverDir);
        }

        return serverDir;
    }

    private isServerInstalled(language: SupportedLanguage): boolean {
        const serverDir = join(this.baseDir, language);

        switch (language) {
            case 'java':
                return existsSync(
                    join(serverDir, 'plugins', 'org.eclipse.equinox.launcher_1.6.700.v20231214-2017.jar')
                );
            case 'cpp':
            case 'c':
                return existsSync(join(serverDir, 'clangd'));
            case 'csharp':
                return existsSync(join(serverDir, 'OmniSharp'));
            case 'haxe':
                return existsSync(join(serverDir, 'node_modules', '@vshaxe', 'language-server'));
            case 'typescript':
                return existsSync(join(serverDir, 'node_modules', '.bin', 'typescript-language-server'));
            default:
                return false;
        }
    }

    private getServerConfig(language: SupportedLanguage): ServerConfig {
        const { platform, arch } = process;

        switch (language) {
            case 'java':
                return {
                    downloadUrl:
                        'https://download.eclipse.org/jdtls/milestones/1.31.0/jdt-language-server-1.31.0-202401111522.tar.gz',
                    command: ['java']
                };

            case 'cpp':
            case 'c': {
                const clangdVersion = '17.0.3';
                let clangdUrl = '';
                if (platform === 'darwin') {
                    clangdUrl = `https://github.com/clangd/clangd/releases/download/${clangdVersion}/clangd-mac-${clangdVersion}.zip`;
                } else if (platform === 'linux') {
                    clangdUrl = `https://github.com/clangd/clangd/releases/download/${clangdVersion}/clangd-linux-${clangdVersion}.zip`;
                } else if (platform === 'win32') {
                    clangdUrl = `https://github.com/clangd/clangd/releases/download/${clangdVersion}/clangd-windows-${clangdVersion}.zip`;
                }
                return {
                    downloadUrl: clangdUrl,
                    command: ['clangd']
                };
            }

            case 'csharp': {
                let omnisharpUrl = '';
                if (platform === 'darwin') {
                    omnisharpUrl =
                        arch === 'arm64'
                            ? 'https://github.com/OmniSharp/omnisharp-roslyn/releases/download/v1.39.11/omnisharp-osx-arm64-net6.0.tar.gz'
                            : 'https://github.com/OmniSharp/omnisharp-roslyn/releases/download/v1.39.11/omnisharp-osx-x64-net6.0.tar.gz';
                } else if (platform === 'linux') {
                    omnisharpUrl =
                        'https://github.com/OmniSharp/omnisharp-roslyn/releases/download/v1.39.11/omnisharp-linux-x64-net6.0.tar.gz';
                } else if (platform === 'win32') {
                    omnisharpUrl =
                        'https://github.com/OmniSharp/omnisharp-roslyn/releases/download/v1.39.11/omnisharp-win-x64-net6.0.zip';
                }
                return {
                    downloadUrl: omnisharpUrl,
                    command: ['OmniSharp']
                };
            }

            case 'haxe':
                return {
                    downloadUrl: '',
                    command: ['haxe-language-server'],
                    installScript: async (targetDir: string) => {
                        await execAsync(`npm install --prefix ${targetDir} @vshaxe/language-server`);
                    }
                };

            case 'typescript':
                return {
                    downloadUrl: '',
                    command: ['typescript-language-server'],
                    installScript: async (targetDir: string) => {
                        await execAsync(`npm install --prefix ${targetDir} typescript-language-server typescript`);
                    }
                };

            default:
                throw new Error(`Unsupported language: ${language}`);
        }
    }

    private async downloadAndExtract(url: string, targetDir: string): Promise<void> {
        const filename = url.split('/').pop()!;
        const downloadPath = join(targetDir, filename);

        await downloadFile(url, downloadPath);
        await extractArchive(downloadPath, targetDir);

        // Handle clangd directory renaming
        const clangdVersionedDir = readdirSync(targetDir).find((name) => name.startsWith('clangd_'));
        if (clangdVersionedDir) {
            const oldPath = join(targetDir, clangdVersionedDir);
            const newPath = join(targetDir, 'clangd');
            if (existsSync(oldPath) && !existsSync(newPath)) {
                await execAsync(`mv "${oldPath}" "${newPath}"`);
            }
        }

        // Make executables... executable
        if (process.platform !== 'win32') {
            // Check for executables in various locations
            const executablePaths = [
                join(targetDir, 'clangd', 'bin', 'clangd'),
                join(targetDir, 'OmniSharp'),
                join(targetDir, 'clangd') // In case it's directly in the directory
            ];

            for (const path of executablePaths) {
                if (existsSync(path)) {
                    await execAsync(`chmod +x "${path}"`);
                }
            }
        }
    }

    getServerCommand(language: SupportedLanguage): string[] {
        const serverDir = join(this.baseDir, language);
        const { platform } = process;

        switch (language) {
            case 'java': {
                const launcher = join(serverDir, 'plugins', 'org.eclipse.equinox.launcher_1.6.700.v20231214-2017.jar');
                const config =
                    platform === 'win32' ? 'config_win' : platform === 'darwin' ? 'config_mac' : 'config_linux';
                return [
                    'java',
                    '-Declipse.application=org.eclipse.jdt.ls.core.id1',
                    '-Dosgi.bundles.defaultStartLevel=4',
                    '-Declipse.product=org.eclipse.jdt.ls.core.product',
                    '-Dlog.level=ALL',
                    '-Xmx1G',
                    '--add-modules=ALL-SYSTEM',
                    '--add-opens',
                    'java.base/java.util=ALL-UNNAMED',
                    '--add-opens',
                    'java.base/java.lang=ALL-UNNAMED',
                    '-jar',
                    launcher,
                    '-configuration',
                    join(serverDir, config),
                    '-data',
                    join(serverDir, 'workspace')
                ];
            }

            case 'cpp':
            case 'c':
                return [join(serverDir, 'clangd', 'bin', 'clangd')];

            case 'csharp':
                return [join(serverDir, 'OmniSharp'), '-lsp'];

            case 'haxe':
                return ['node', join(serverDir, 'node_modules', '@vshaxe', 'language-server', 'bin', 'server.js')];

            case 'typescript':
                return [join(serverDir, 'node_modules', '.bin', 'typescript-language-server'), '--stdio'];

            default:
                throw new Error(`Unsupported language: ${language}`);
        }
    }
}
