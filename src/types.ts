export type SupportedLanguage = 'java' | 'cpp' | 'c' | 'csharp' | 'haxe' | 'typescript';

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface SymbolInfo {
  name: string;
  kind: string;
  file: string;
  range: Range;
  preview: string;
  documentation?: string;
  supertypes?: string[];
  children?: SymbolInfo[];
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