import { exec } from 'node:child_process';
import { createWriteStream, existsSync, readdirSync, type Stats, statSync } from 'node:fs';
import { get } from 'node:https';
import { extname, join } from 'node:path';
import { promisify } from 'node:util';
import * as tar from 'tar';

const StreamZip = require('node-stream-zip');

import type { ProjectFileCheckResult, SupportedLanguage, ToolchainCheckResult } from './types';

const execAsync = promisify(exec);

export async function checkToolchain(language: SupportedLanguage): Promise<ToolchainCheckResult> {
    const platform = process.platform;

    try {
        switch (language) {
            case 'java':
                await execAsync('java --version');
                return { installed: true, message: 'Java found' };

            case 'cpp':
            case 'c':
                try {
                    await execAsync('clang --version');
                    return { installed: true, message: 'Clang found' };
                } catch {
                    try {
                        await execAsync('gcc --version');
                        return { installed: true, message: 'GCC found' };
                    } catch {
                        let installMsg = 'Install a C/C++ compiler:\n';
                        if (platform === 'darwin') {
                            installMsg += '  macOS: xcode-select --install';
                        } else if (platform === 'linux') {
                            installMsg += '  Ubuntu/Debian: sudo apt install build-essential\n';
                            installMsg += '  RHEL/Fedora: sudo yum install gcc gcc-c++';
                        } else {
                            installMsg += '  Windows: Install MinGW or Visual Studio';
                        }
                        return { installed: false, message: installMsg };
                    }
                }

            case 'csharp':
                await execAsync('dotnet --version');
                return { installed: true, message: '.NET SDK found' };

            case 'haxe':
                await execAsync('haxe --version');
                return { installed: true, message: 'Haxe found' };

            case 'typescript':
                await execAsync('node --version');
                return { installed: true, message: 'Node.js found' };

            case 'dart':
                await execAsync('dart --version');
                return { installed: true, message: 'Dart SDK found' };

            case 'rust':
                try {
                    await execAsync('rustc --version');
                    await execAsync('cargo --version');
                    return { installed: true, message: 'Rust toolchain found (rustc + cargo)' };
                } catch {
                    return {
                        installed: false,
                        message:
                            'Rust toolchain incomplete. Both rustc and cargo are required.\nInstall from https://rustup.rs/'
                    };
                }

            case 'python':
                try {
                    await execAsync('python3 --version');
                    await execAsync('pip3 --version');
                    return { installed: true, message: 'Python toolchain found (python3 + pip3)' };
                } catch {
                    try {
                        await execAsync('python --version');
                        await execAsync('pip --version');
                        return { installed: true, message: 'Python toolchain found (python + pip)' };
                    } catch {
                        return {
                            installed: false,
                            message: 'Python toolchain not found. Install Python 3.7+ with pip.'
                        };
                    }
                }

            default:
                return { installed: false, message: `Unknown language: ${language}` };
        }
    } catch (_error) {
        const installInstructions: { [key in SupportedLanguage]: string } = {
            java: 'Install Java:\n  Download from https://adoptium.net or use your package manager',
            cpp: 'Install C++ compiler (see above)',
            c: 'Install C compiler (see above)',
            csharp: 'Install .NET SDK:\n  Download from https://dotnet.microsoft.com',
            haxe: 'Install Haxe:\n  Download from https://haxe.org or use your package manager',
            typescript: 'Install Node.js:\n  Download from https://nodejs.org',
            dart: 'Install Dart SDK:\n  Download from https://dart.dev/get-dart',
            rust: 'Install Rust:\n  Download from https://rustup.rs/ (includes rustc + cargo)',
            python: 'Install Python:\n  Download from https://python.org or use your package manager'
        };

        return {
            installed: false,
            message: installInstructions[language] || 'Toolchain not found'
        };
    }
}

export async function checkProjectFiles(
    directory: string,
    language: SupportedLanguage
): Promise<ProjectFileCheckResult> {
    const projectFiles: { [key in SupportedLanguage]: string[] } = {
        java: ['pom.xml', 'build.gradle', 'build.gradle.kts', '.classpath'],
        cpp: ['compile_commands.json', '.clangd', 'CMakeLists.txt'],
        c: ['compile_commands.json', '.clangd', 'Makefile'],
        csharp: ['.csproj', '.sln'],
        haxe: ['build.hxml', 'haxe.json'],
        typescript: ['tsconfig.json', 'jsconfig.json'],
        dart: ['pubspec.yaml', 'analysis_options.yaml'],
        rust: ['Cargo.toml'],
        python: ['requirements.txt', 'pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile', 'environment.yml']
    };

    const required = projectFiles[language];
    const found: string[] = [];

    for (const file of required) {
        if (existsSync(join(directory, file))) {
            found.push(file);
        }
    }

    if (found.length > 0) {
        return {
            found: true,
            message: `Found project files: ${found.join(', ')}`,
            files: found
        };
    }

    const suggestions: { [key in SupportedLanguage]: string } = {
        java: 'No Java project files found. Create a pom.xml (Maven) or build.gradle (Gradle) file.',
        cpp: 'No C++ project files found. Generate compile_commands.json using:\n  CMake: cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON\n  Bear: bear -- make\n  Or create a .clangd file',
        c: 'No C project files found. Generate compile_commands.json or create a Makefile.',
        csharp: 'No C# project files found. Create a .csproj file or use: dotnet new console',
        haxe: 'No Haxe project files found. Create a build.hxml file.',
        typescript: 'No TypeScript config found. Create tsconfig.json using: npx tsc --init',
        dart: 'No Dart project files found. Create a pubspec.yaml file or use: dart create .',
        rust: 'No Rust project files found. Create a Cargo.toml file or use: cargo init',
        python: 'No Python project files found. Create a requirements.txt or pyproject.toml file.'
    };

    return {
        found: false,
        message: suggestions[language],
        files: []
    };
}

export function getAllFiles(directory: string, extensions: string[]): string[] {
    const files: string[] = [];

    function scanDirectory(dir: string) {
        const entries = readdirSync(dir);

        for (const entry of entries) {
            const fullPath = join(dir, entry);

            let stat: Stats;
            try {
                stat = statSync(fullPath);
            } catch (_error) {
                // Skip files that can't be stat'd (e.g., unresolved symlinks)
                continue;
            }

            if (stat.isDirectory()) {
                // Skip common directories
                if (!['node_modules', '.git', 'target', 'build', 'dist', 'bin', 'obj'].includes(entry)) {
                    scanDirectory(fullPath);
                }
            } else if (stat.isFile()) {
                const ext = extname(entry).toLowerCase();
                if (extensions.includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }

    scanDirectory(directory);
    return files;
}

export async function downloadFile(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = createWriteStream(destination);

        get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                downloadFile(response.headers.location!, destination).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                resolve();
            });

            file.on('error', (err) => {
                file.close();
                reject(err);
            });
        }).on('error', reject);
    });
}

export async function extractArchive(archivePath: string, destination: string): Promise<void> {
    const ext = extname(archivePath).toLowerCase();

    if (ext === '.zip') {
        const zip = new StreamZip.async({ file: archivePath });
        await zip.extract(null, destination);
        await zip.close();
    } else if (ext === '.gz' || ext === '.tgz') {
        await tar.extract({
            file: archivePath,
            cwd: destination
        });
    } else {
        throw new Error(`Unsupported archive format: ${ext}`);
    }
}
