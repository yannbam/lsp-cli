import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { SymbolInfo } from '../src/types';

export interface ExtractedSymbols {
    language: string;
    directory: string;
    symbols: SymbolInfo[];
}

export function runLSPCLI(directory: string, language: string, outputFile: string): void {
    // Clear parso cache before Python tests to prevent cache poisoning
    if (language === 'python') {
        const parsoCachePath = join(homedir(), '.cache', 'parso');
        try {
            execSync(`rm -rf "${parsoCachePath}"`, { stdio: 'pipe' });
        } catch (_error) {
            // Cache directory might not exist, which is fine
        }
    }

    const cliPath = join(process.cwd(), 'src', 'index.ts');
    execSync(`npx tsx "${cliPath}" "${directory}" ${language} "${outputFile}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
    });
}

export function readOutput(outputFile: string): ExtractedSymbols {
    const content = readFileSync(outputFile, 'utf-8');
    return JSON.parse(content);
}

export function findSymbol(symbols: SymbolInfo[], name: string, kind?: string): SymbolInfo | undefined {
    for (const symbol of symbols) {
        if (symbol.name === name && (!kind || symbol.kind === kind)) {
            return symbol;
        }
        if (symbol.children) {
            const found = findSymbol(symbol.children, name, kind);
            if (found) return found;
        }
    }
    return undefined;
}

export function findSymbolsByKind(symbols: SymbolInfo[], kind: string): SymbolInfo[] {
    const results: SymbolInfo[] = [];

    for (const symbol of symbols) {
        if (symbol.kind === kind) {
            results.push(symbol);
        }
        if (symbol.children) {
            results.push(...findSymbolsByKind(symbol.children, kind));
        }
    }

    return results;
}

export function getSymbolPath(symbol: SymbolInfo): string[] {
    const path: string[] = [symbol.name];
    const _current = symbol;

    // This would need parent tracking to work properly
    // For now, just return the name
    return path;
}
