import { spawn, ChildProcess } from 'child_process';
import { join, relative } from 'path';
import { readFileSync } from 'fs';
import {
  createMessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
  MessageConnection,
  InitializeRequest,
  InitializeParams,
  DocumentSymbolRequest,
  DocumentSymbolParams,
  DocumentSymbol,
  SymbolKind,
  Range as LSPRange,
  Position as LSPPosition,
  DidOpenTextDocumentNotification,
  TextDocumentItem,
  ShutdownRequest,
  ExitNotification,
  TypeHierarchyPrepareRequest,
  TypeHierarchySupertypesRequest,
  TypeHierarchyItem
} from 'vscode-languageserver-protocol/node';
import { SupportedLanguage, TypeInfo, Range } from './types';
import { ServerManager } from './server-manager';
import { getAllFiles } from './utils';

export class LanguageClient {
  private connection?: MessageConnection;
  private serverProcess?: ChildProcess;
  private serverManager: ServerManager;
  private initialized = false;
  private serverCapabilities: any = {};

  constructor(
    private language: SupportedLanguage,
    private serverPath: string,
    private workspaceRoot: string,
    private verbose: boolean = false
  ) {
    this.serverManager = new ServerManager();
  }

  async start(): Promise<void> {
    const command = this.serverManager.getServerCommand(this.language);
    
    // Start the LSP server process
    this.serverProcess = spawn(command[0], command.slice(1), {
      cwd: this.workspaceRoot,
      env: {
        ...process.env,
        // Java LSP needs workspace
        ...(this.language === 'java' && { 
          WORKSPACE: this.workspaceRoot 
        })
      }
    });

    this.serverProcess.on('error', (err) => {
      console.error('Failed to spawn process:', err);
    });

    this.serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null && code !== 143) {
        console.error(`LSP server exited unexpectedly with code ${code} and signal ${signal}`);
      }
    });

    if (!this.serverProcess.stdout || !this.serverProcess.stdin) {
      throw new Error('Failed to start LSP server');
    }

    // Always capture stderr to see errors
    this.serverProcess.stderr?.on('data', (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[LSP stderr]: ${message}`);
      }
    });

    // Create message connection
    const reader = new StreamMessageReader(this.serverProcess.stdout);
    const writer = new StreamMessageWriter(this.serverProcess.stdin);
    this.connection = createMessageConnection(reader, writer);
    
    // Handle connection errors
    this.connection.onError((error) => {
      console.error('LSP connection error:', error);
    });
    
    this.connection.onClose(() => {
      console.log('LSP connection closed');
    });

    // Start listening
    this.connection.listen();

    // Initialize the LSP server
    try {
      await this.initialize();
    } catch (error) {
      console.error('Failed to initialize LSP server:', error);
      throw error;
    }
  }

  private async initialize(): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not established');
    }

    const initParams: InitializeParams = {
      processId: process.pid,
      rootUri: `file://${this.workspaceRoot}`,
      rootPath: this.workspaceRoot,
      capabilities: {
        textDocument: {
          documentSymbol: {
            hierarchicalDocumentSymbolSupport: true
          }
        }
      },
      workspaceFolders: [{
        uri: `file://${this.workspaceRoot}`,
        name: 'workspace'
      }]
    };

    const result = await this.connection.sendRequest(InitializeRequest.type, initParams);
    this.serverCapabilities = result.capabilities;
    
    if (this.verbose) {
      console.log('Server capabilities:', JSON.stringify(result.capabilities, null, 2));
    }

    await this.connection.sendNotification('initialized', {});
    
    // Wait for the server to be ready - some servers need time after initialized
    // This is especially true for Java LSP which needs to index the project
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    this.initialized = true;
  }

  async stop(): Promise<void> {
    if (this.connection && this.initialized) {
      try {
        await this.connection.sendRequest(ShutdownRequest.type);
        await this.connection.sendNotification(ExitNotification.type);
      } catch (error) {
        if (this.verbose) {
          console.error('Error during shutdown:', error);
        }
      }
    }
    
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
  }

  async analyzeDirectory(): Promise<TypeInfo[]> {
    if (!this.connection || !this.initialized) {
      throw new Error('Client not initialized');
    }

    const types: TypeInfo[] = [];
    const files = this.getSourceFiles();
    
    console.log(`Found ${files.length} ${this.language} files to analyze`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.round((i + 1) / files.length * 100);
      
      if (this.verbose) {
        console.log(`[${i + 1}/${files.length}] Analyzing: ${file}`);
      } else if (i % 10 === 0 || i === files.length - 1) {
        console.log(`Progress: ${progress}% (${i + 1}/${files.length} files)`);
      }

      try {
        const fileTypes = await this.analyzeFile(file);
        types.push(...fileTypes);
      } catch (error) {
        console.error(`Error analyzing ${file}:`, error);
      }
    }

    console.log(`Analysis complete: found ${types.length} types`);
    return types;
  }

  private async analyzeFile(filePath: string): Promise<TypeInfo[]> {
    if (!this.connection) {
      throw new Error('Connection not established');
    }

    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const uri = `file://${filePath}`;
    
    // Open the document
    const textDocument: TextDocumentItem = {
      uri,
      languageId: this.getLanguageId(),
      version: 1,
      text: content
    };

    await this.connection.sendNotification(
      DidOpenTextDocumentNotification.type,
      {
        textDocument
      }
    );

    // Request document symbols
    const params: DocumentSymbolParams = {
      textDocument: {
        uri
      }
    };

    // Add timeout to prevent hanging
    const symbolsPromise = this.connection.sendRequest(
      DocumentSymbolRequest.type,
      params
    ) as Promise<DocumentSymbol[]>;
    
    const timeoutPromise = new Promise<DocumentSymbol[]>((_, reject) => {
      setTimeout(() => reject(new Error('Document symbol request timed out after 10s')), 10000);
    });
    
    const symbols = await Promise.race([symbolsPromise, timeoutPromise]);

    if (!symbols) {
      return [];
    }

    return await this.extractTypes(symbols, filePath, lines);
  }

  private async extractTypes(
    symbols: DocumentSymbol[],
    filePath: string,
    lines: string[]
  ): Promise<TypeInfo[]> {
    const types: TypeInfo[] = [];

    for (const symbol of symbols) {
      if (this.isTypeSymbol(symbol)) {
        const typeInfo: TypeInfo = {
          name: symbol.name,
          kind: this.getSymbolKindName(symbol.kind),
          file: filePath,
          range: {
            start: {
              line: symbol.selectionRange.start.line,
              character: 0
            },
            end: this.convertPosition(symbol.range.end)
          },
          preview: lines[symbol.selectionRange.start.line]?.trim() || '',
          documentation: this.extractDocumentation(lines, symbol.selectionRange.start.line),
          supertypes: await this.getSupertypes(filePath, symbol.selectionRange.start),
          members: symbol.children ? this.extractMembers(symbol.children, lines) : undefined
        };
        types.push(typeInfo);
      }

      // Also check nested types
      if (symbol.children) {
        types.push(...await this.extractTypes(symbol.children, filePath, lines));
      }
    }

    return types;
  }

  private extractMembers(
    symbols: DocumentSymbol[],
    lines: string[]
  ): TypeInfo[] {
    return symbols
      .filter(s => this.isMemberSymbol(s))
      .map(symbol => ({
        name: symbol.name,
        kind: this.getSymbolKindName(symbol.kind),
        file: '', // Members don't need file path
        range: {
          start: {
            line: symbol.selectionRange.start.line,
            character: 0
          },
          end: this.convertPosition(symbol.range.end)
        },
        preview: lines[symbol.selectionRange.start.line]?.trim() || '',
        documentation: this.extractDocumentation(lines, symbol.selectionRange.start.line),
        supertypes: undefined // Members don't have supertypes
      }));
  }

  private getPreviewLines(lines: string[], range: LSPRange): string[] {
    const startLine = range.start.line;
    const previewStart = Math.max(0, startLine - 2);
    const previewEnd = Math.min(lines.length, startLine + 3);
    
    return lines.slice(previewStart, previewEnd);
  }

  private extractDocumentation(lines: string[], symbolStartLine: number): string | undefined {
    if (symbolStartLine <= 0) return undefined;

    let currentLine = symbolStartLine - 1;
    if (this.verbose) {
      console.log(`Extracting documentation for symbol at line ${symbolStartLine}`);
    }
    
    // Scan upwards, skipping empty lines and annotations
    while (currentLine >= 0) {
      const line = lines[currentLine].trim();
      
      // Skip empty lines
      if (line === '') {
        currentLine--;
        continue;
      }
      
      // Skip annotations for Java (@Override, @Deprecated, etc)
      if (this.language === 'java' && line.startsWith('@')) {
        currentLine--;
        continue;
      }
      
      // Skip attributes for C# ([Obsolete], [Serializable], etc)
      if (this.language === 'csharp' && line.startsWith('[') && line.endsWith(']')) {
        currentLine--;
        continue;
      }
      
      // Check for documentation comments
      
      // C# XML documentation (///)
      if (this.language === 'csharp' && line.startsWith('///')) {
        const xmlDocLines: string[] = [];
        let checkLine = currentLine;
        
        while (checkLine >= 0 && lines[checkLine].trim().startsWith('///')) {
          xmlDocLines.unshift(lines[checkLine]);
          checkLine--;
        }
        
        return this.cleanXmlDocumentation(xmlDocLines);
      }
      
      // Block documentation /** */ or /*! */
      if (line.endsWith('*/')) {
        const docEndLine = currentLine;
        let checkLine = currentLine;
        
        // Find the start of the documentation comment
        while (checkLine >= 0) {
          const checkLineContent = lines[checkLine].trim();
          if (checkLineContent.startsWith('/**') || checkLineContent.startsWith('/*!')) {
            const docLines = lines.slice(checkLine, docEndLine + 1);
            return this.cleanBlockDocumentation(docLines);
          }
          checkLine--;
          
          // Don't go too far back
          if (docEndLine - checkLine > 50) break;
        }
      }
      
      // C/C++ style documentation (/// or //!)
      if ((this.language === 'cpp' || this.language === 'c') && 
          (line.startsWith('///') || line.startsWith('//!'))) {
        const slashDocLines: string[] = [];
        let checkLine = currentLine;
        
        while (checkLine >= 0) {
          const checkLineContent = lines[checkLine].trim();
          if (checkLineContent.startsWith('///') || checkLineContent.startsWith('//!')) {
            slashDocLines.unshift(lines[checkLine]);
            checkLine--;
          } else {
            break;
          }
        }
        
        return this.cleanSlashDocumentation(slashDocLines);
      }
      
      // If we hit anything else (not empty line, not annotation, not doc comment), stop
      break;
    }

    return undefined;
  }

  private cleanBlockDocumentation(docLines: string[]): string {
    // Remove /** and */ and clean up * prefixes
    const cleaned = docLines.map((line, index) => {
      let trimmed = line.trim();
      
      // Remove opening /** or /*!
      if (index === 0 && (trimmed.startsWith('/**') || trimmed.startsWith('/*!'))) {
        trimmed = trimmed.substring(3).trim();
      }
      
      // Remove closing */
      if (index === docLines.length - 1 && trimmed.endsWith('*/')) {
        trimmed = trimmed.substring(0, trimmed.length - 2).trim();
      }
      
      // Remove leading * and space
      if (trimmed.startsWith('*') && !trimmed.startsWith('**')) {
        trimmed = trimmed.substring(1).trim();
      }
      
      return trimmed;
    });

    return cleaned.filter(line => line.length > 0).join('\n').trim();
  }

  private cleanXmlDocumentation(docLines: string[]): string {
    // Clean C# XML documentation
    const cleaned = docLines.map(line => {
      let trimmed = line.trim();
      
      // Remove /// prefix
      if (trimmed.startsWith('///')) {
        trimmed = trimmed.substring(3).trim();
      }
      
      return trimmed;
    });

    return cleaned.filter(line => line.length > 0).join('\n').trim();
  }

  private cleanSlashDocumentation(docLines: string[]): string {
    // Clean // style documentation
    const cleaned = docLines.map(line => {
      let trimmed = line.trim();
      
      // Remove /// or //! prefix
      if (trimmed.startsWith('///')) {
        trimmed = trimmed.substring(3).trim();
      } else if (trimmed.startsWith('//!')) {
        trimmed = trimmed.substring(3).trim();
      }
      
      return trimmed;
    });

    return cleaned.filter(line => line.length > 0).join('\n').trim();
  }

  private async getSupertypes(filePath: string, position: LSPPosition): Promise<string[] | undefined> {
    // Only try type hierarchy if the server supports it
    if (!this.serverCapabilities.typeHierarchyProvider || !this.connection) {
      return undefined;
    }

    try {
      // Prepare type hierarchy at the position
      const prepareParams = {
        textDocument: { uri: `file://${filePath}` },
        position: position
      };

      const items = await this.connection.sendRequest(
        TypeHierarchyPrepareRequest.type,
        prepareParams
      ) as TypeHierarchyItem[] | null;

      if (!items || items.length === 0) {
        return undefined;
      }

      // Get supertypes for the first item
      const supertypesParams = {
        item: items[0]
      };

      const supertypes = await this.connection.sendRequest(
        TypeHierarchySupertypesRequest.type,
        supertypesParams
      ) as TypeHierarchyItem[] | null;

      if (!supertypes || supertypes.length === 0) {
        return undefined;
      }

      // Extract just the names
      return supertypes.map(item => item.name);
    } catch (error) {
      if (this.verbose) {
        console.error('Error getting supertypes:', error);
      }
      return undefined;
    }
  }

  private convertRange(lspRange: LSPRange): Range {
    return {
      start: this.convertPosition(lspRange.start),
      end: this.convertPosition(lspRange.end)
    };
  }
  
  private convertPosition(lspPosition: LSPPosition): Position {
    return {
      line: lspPosition.line,
      character: lspPosition.character
    };
  }

  private isTypeSymbol(symbol: DocumentSymbol): boolean {
    const typeKinds = [
      SymbolKind.Class,
      SymbolKind.Interface,
      SymbolKind.Enum,
      SymbolKind.Struct
    ];
    return typeKinds.includes(symbol.kind);
  }

  private isMemberSymbol(symbol: DocumentSymbol): boolean {
    const memberKinds = [
      SymbolKind.Method,
      SymbolKind.Function,
      SymbolKind.Field,
      SymbolKind.Property,
      SymbolKind.Constructor,
      SymbolKind.Constant,
      SymbolKind.Variable
    ];
    return memberKinds.includes(symbol.kind);
  }

  private getSymbolKindName(kind: SymbolKind): string {
    const kindMap: { [key: number]: string } = {
      [SymbolKind.Class]: 'class',
      [SymbolKind.Interface]: 'interface',
      [SymbolKind.Enum]: 'enum',
      [SymbolKind.Struct]: 'struct',
      [SymbolKind.Method]: 'method',
      [SymbolKind.Function]: 'function',
      [SymbolKind.Field]: 'field',
      [SymbolKind.Property]: 'property',
      [SymbolKind.Constructor]: 'constructor',
      [SymbolKind.Constant]: 'constant',
      [SymbolKind.Variable]: 'variable'
    };
    return kindMap[kind] || 'unknown';
  }

  private getLanguageId(): string {
    const languageMap: { [key in SupportedLanguage]: string } = {
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      csharp: 'csharp',
      haxe: 'haxe',
      typescript: 'typescript'
    };
    return languageMap[this.language];
  }

  private getSourceFiles(): string[] {
    const extensionMap: { [key in SupportedLanguage]: string[] } = {
      java: ['.java'],
      cpp: ['.cpp', '.cxx', '.cc', '.hpp', '.hxx', '.hh', '.h'],
      c: ['.c', '.h'],
      csharp: ['.cs'],
      haxe: ['.hx'],
      typescript: ['.ts', '.tsx']
    };

    const extensions = extensionMap[this.language];
    return getAllFiles(this.workspaceRoot, extensions);
  }
}