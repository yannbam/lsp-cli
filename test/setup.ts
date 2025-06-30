import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const TEST_REPO_DIR = join(process.cwd(), '.test-repos', 'spine-runtimes');
export const LSP_SERVER_DIR = join(homedir(), '.lsp-cli', 'servers');

export const LANGUAGE_DIRS = {
    java: 'spine-libgdx',
    cpp: 'spine-cpp',
    c: 'spine-c',
    csharp: 'spine-csharp',
    haxe: 'spine-haxe',
    typescript: 'spine-ts'
} as const;

export async function setupTestRepo(): Promise<void> {
    if (existsSync(TEST_REPO_DIR)) {
        console.log('Test repository already exists, skipping clone');
        return;
    }

    console.log('Cloning spine-runtimes repository (shallow)...');

    // Create parent directory
    const parentDir = join(process.cwd(), '.test-repos');
    execSync(`mkdir -p "${parentDir}"`);

    // Clone specific directories only from 4.2-beta branch
    const sparseCheckoutDirs = Object.values(LANGUAGE_DIRS);

    execSync(
        `
    cd "${parentDir}" &&
    git clone --filter=blob:none --sparse https://github.com/EsotericSoftware/spine-runtimes.git &&
    cd spine-runtimes &&
    git sparse-checkout init --cone &&
    git sparse-checkout set ${sparseCheckoutDirs.join(' ')} &&
    git checkout 4.3-beta
  `,
        { stdio: 'inherit' }
    );
}

export function cleanupLSPServers(): void {
    if (existsSync(LSP_SERVER_DIR)) {
        console.log('Cleaning up LSP servers...');
        rmSync(LSP_SERVER_DIR, { recursive: true, force: true });
    }
}

export function getTestProjectPath(language: keyof typeof LANGUAGE_DIRS): string {
    return join(TEST_REPO_DIR, LANGUAGE_DIRS[language]);
}
