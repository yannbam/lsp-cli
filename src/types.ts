export type SupportedLanguage = 'java' | 'cpp' | 'c' | 'csharp' | 'haxe' | 'typescript' | 'dart';

export interface Position {
    line: number;
    character: number;
}

export interface Range {
    start: Position;
    end: Position;
}

export interface Supertype {
    name: string;
    typeArguments?: string[];
}

export interface SymbolInfo {
    name: string;
    kind: string;
    file: string;
    range: Range;
    preview: string;
    documentation?: string;
    typeParameters?: string[];
    supertypes?: Supertype[];
    children?: SymbolInfo[];
    definition?: {
        file: string;
        range: Range;
        preview?: string;
    };
}

export interface ToolchainCheckResult {
    installed: boolean;
    message: string;
}

export interface ProjectFileCheckResult {
    found: boolean;
    message: string;
    files?: string[];
}

export interface ServerConfig {
    downloadUrl: string;
    command: string[];
    installScript?: (targetDir: string) => Promise<void>;
}
