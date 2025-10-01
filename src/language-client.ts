import { type ChildProcess, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
    createMessageConnection,
    type DefinitionParams,
    DefinitionRequest,
    DidOpenTextDocumentNotification,
    type DocumentSymbol,
    type DocumentSymbolParams,
    DocumentSymbolRequest,
    ExitNotification,
    type InitializeParams,
    InitializeRequest,
    type Location,
    type Position as LSPPosition,
    type Range as LSPRange,
    type MessageConnection,
    ShutdownRequest,
    StreamMessageReader,
    StreamMessageWriter,
    SymbolKind,
    type TextDocumentItem,
    type TypeHierarchyItem,
    TypeHierarchyPrepareRequest,
    TypeHierarchySupertypesRequest
} from 'vscode-languageserver-protocol/node';
import type { Logger } from './logger';
import { ServerManager } from './server-manager';
import type { Position, Supertype, SupportedLanguage, SymbolInfo } from './types';
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
        private logger: Logger
    ) {
        this.serverManager = new ServerManager(logger);
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
            this.logger.error('Failed to spawn process', err.message);
        });

        this.serverProcess.on('exit', (code, signal) => {
            if (code !== 0 && code !== null && code !== 143) {
                this.logger.error(`LSP server exited unexpectedly`, `code ${code}, signal ${signal}`);
            }
        });

        if (!this.serverProcess.stdout || !this.serverProcess.stdin) {
            throw new Error('Failed to start LSP server');
        }

        // Always capture stderr to see errors
        this.serverProcess.stderr?.on('data', (data) => {
            const message = data.toString().trim();
            if (message) {
                this.logger.debug(`[LSP stderr]: ${message}`);
            }
        });

        // Create message connection
        const reader = new StreamMessageReader(this.serverProcess.stdout);
        const writer = new StreamMessageWriter(this.serverProcess.stdin);
        this.connection = createMessageConnection(reader, writer);

        // Handle connection errors
        this.connection.onError((error) => {
            this.logger.error('LSP connection error', String(error));
        });

        this.connection.onClose(() => {
            this.logger.info('LSP connection closed');
            process.exit(0);
        });

        // Start listening
        this.connection.listen();

        // Initialize the LSP server
        try {
            await this.initialize();
        } catch (error) {
            this.logger.error(
                'Failed to initialize LSP server',
                error instanceof Error ? error.message : String(error)
            );
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
            workspaceFolders: [
                {
                    uri: `file://${this.workspaceRoot}`,
                    name: 'workspace'
                }
            ]
        };

        const result = await this.connection.sendRequest(InitializeRequest.type, initParams);
        this.serverCapabilities = result.capabilities;

        this.logger.debug(`Server capabilities: ${JSON.stringify(result.capabilities, null, 2)}`);

        await this.connection.sendNotification('initialized', {});

        this.initialized = true;
    }

    async stop(): Promise<void> {
        if (this.connection && this.initialized) {
            try {
                await this.connection.sendRequest(ShutdownRequest.type);
                await this.connection.sendNotification(ExitNotification.type);
            } catch (error) {
                this.logger.debug(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        if (this.serverProcess) {
            this.serverProcess.kill();
        }
    }

    async analyzeDirectory(): Promise<SymbolInfo[]> {
        if (!this.connection || !this.initialized) {
            throw new Error('Client not initialized');
        }

        const symbols: SymbolInfo[] = [];
        const files = this.getSourceFiles();

        this.logger.info(`Found ${files.length} ${this.language} files to analyze`);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            this.logger.file(file, 'analyzing');
            this.logger.progress(i + 1, files.length);

            try {
                const fileSymbols = await this.analyzeFile(file);
                symbols.push(...fileSymbols);
                this.logger.file(file, 'done');
            } catch (error) {
                this.logger.file(file, 'error');
                this.logger.error(`Error analyzing ${file}`, error instanceof Error ? error.message : String(error));
            }
        }

        this.logger.clearLine();
        this.logger.success(`Analysis complete: found ${symbols.length} symbols`);
        return symbols;
    }

    private async analyzeFile(filePath: string): Promise<SymbolInfo[]> {
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

        await this.connection.sendNotification(DidOpenTextDocumentNotification.type, {
            textDocument
        });

        // Request document symbols
        const params: DocumentSymbolParams = {
            textDocument: {
                uri
            }
        };

        // Add timeout to prevent hanging
        const symbolsPromise = this.connection.sendRequest(DocumentSymbolRequest.type, params) as Promise<
            DocumentSymbol[]
        >;

        const timeoutPromise = new Promise<DocumentSymbol[]>((_, reject) => {
            setTimeout(() => reject(new Error('Document symbol request timed out after 10s')), 10000);
        });

        const symbols = await Promise.race([symbolsPromise, timeoutPromise]);

        // Debug logging for C#
        if (this.language === 'csharp') {
            console.log(
                `[DEBUG] Document symbols response for ${filePath}:`,
                symbols === null
                    ? 'null'
                    : symbols === undefined
                      ? 'undefined'
                      : Array.isArray(symbols)
                        ? `array of ${symbols.length}`
                        : typeof symbols
            );
        }

        if (!symbols || (Array.isArray(symbols) && symbols.length === 0)) {
            return [];
        }

        return await this.extractSymbols(symbols, filePath, lines);
    }

    private async extractSymbols(symbols: DocumentSymbol[], filePath: string, lines: string[]): Promise<SymbolInfo[]> {
        const allSymbols: SymbolInfo[] = [];

        for (const symbol of symbols) {
            // Extract preview - for multi-line declarations, get all lines
            let preview = '';

            // For type symbols, we want to capture the full declaration including extends/implements
            if (this.isTypeSymbol(symbol)) {
                let startLine = symbol.selectionRange.start.line;

                // For C++, look backwards for template declaration
                if (this.language === 'cpp' || this.language === 'c') {
                    // Look up to 10 lines back for a template declaration
                    // Templates might have comments or attributes between them and the class
                    for (let i = Math.max(0, startLine - 10); i < startLine; i++) {
                        const line = lines[i].trim();
                        // Skip empty lines and comments
                        if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
                            continue;
                        }
                        // Check if this is a template declaration
                        if (line.startsWith('template') && line.includes('<')) {
                            // Verify there's no other class/struct between the template and our symbol
                            let hasIntermediateDeclaration = false;
                            for (let j = i + 1; j < startLine; j++) {
                                const intermediateLine = lines[j].trim();
                                if (intermediateLine.match(/^\s*(class|struct|union)\s+\w+/)) {
                                    hasIntermediateDeclaration = true;
                                    break;
                                }
                            }
                            if (!hasIntermediateDeclaration) {
                                startLine = i;
                                break;
                            }
                        }
                    }
                }

                const previewLines = [];
                let braceFound = false;

                // Start from the declaration line and continue until we find the opening brace
                for (let i = startLine; i < lines.length && !braceFound; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        // Remove comments before checking for brace
                        const lineWithoutComments = line
                            .replace(/\/\*[\s\S]*?\*\//g, ' ') // Remove block comments
                            .replace(/\/\/.*$/g, ''); // Remove line comments

                        // Check if this line contains the opening brace
                        const braceIndex = lineWithoutComments.indexOf('{');
                        if (braceIndex >= 0) {
                            // Include everything up to the brace
                            previewLines.push(lineWithoutComments.substring(0, braceIndex).trim());
                            braceFound = true;
                        } else {
                            // Use the line without comments
                            if (lineWithoutComments.trim()) {
                                previewLines.push(lineWithoutComments.trim());
                            }
                        }
                    }
                }

                preview = previewLines.filter((l) => l).join(' ');
            } else {
                // For non-type symbols, just use the selection line
                preview = lines[symbol.selectionRange.start.line]?.trim() || '';
            }

            // For C/C++, check if this is a forward declaration or friend declaration
            const isForwardDeclaration = preview.match(/^\s*(class|struct)\s+\w+\s*;\s*$/);
            const isFriendDeclaration = preview.includes('friend class') || preview.includes('friend struct');

            // Skip forward declarations and friend declarations for C/C++
            if ((this.language === 'cpp' || this.language === 'c') && (isForwardDeclaration || isFriendDeclaration)) {
                continue;
            }

            // Extract ALL symbols, not just types
            const symbolInfo: SymbolInfo = {
                name: this.cleanSymbolName(symbol.name),
                kind: this.getSymbolKindName(symbol.kind),
                file: filePath,
                range: {
                    start: {
                        line: symbol.selectionRange.start.line,
                        character: 0
                    },
                    end: this.convertPosition(symbol.range.end)
                },
                preview,
                documentation: this.extractDocumentation(lines, symbol.selectionRange.start.line),
                typeParameters:
                    this.isTypeSymbol(symbol) || this.isTypeScriptTypeAlias(symbol, preview)
                        ? this.extractTypeParameters(preview)
                        : undefined,
                supertypes: await this.getSupertypesWithFallback(symbol, filePath, preview),
                children: symbol.children ? await this.extractSymbols(symbol.children, filePath, lines) : undefined
            };

            // For C/C++ header files, try to find the definition in .cpp files
            if (
                (this.language === 'cpp' || this.language === 'c') &&
                (filePath.endsWith('.h') || filePath.endsWith('.hpp')) &&
                (symbol.kind === SymbolKind.Method || symbol.kind === SymbolKind.Function)
            ) {
                symbolInfo.definition = await this.getDefinition(filePath, symbol.selectionRange.start);
            }

            allSymbols.push(symbolInfo);
        }

        // Post-process C/C++ anonymous structs with typedef names
        if (this.language === 'c' || this.language === 'cpp') {
            return this.mergeAnonymousStructsWithTypedefs(allSymbols);
        }

        return allSymbols;
    }

    private getPreviewLines(lines: string[], range: LSPRange): string[] {
        const startLine = range.start.line;
        const previewStart = Math.max(0, startLine - 2);
        const previewEnd = Math.min(lines.length, startLine + 3);

        return lines.slice(previewStart, previewEnd);
    }

    private async getDefinition(
        filePath: string,
        position: LSPPosition
    ): Promise<SymbolInfo['definition'] | undefined> {
        if (!this.connection) {
            return undefined;
        }

        try {
            const params: DefinitionParams = {
                textDocument: {
                    uri: `file://${filePath}`
                },
                position
            };

            const response = await this.connection.sendRequest(DefinitionRequest.type, params);

            if (!response) {
                return undefined;
            }

            // Response can be Location | Location[] | LocationLink[]
            const locations = Array.isArray(response) ? response : [response];

            if (locations.length === 0) {
                return undefined;
            }

            // Take the first location
            const location = locations[0] as Location;

            // Convert file URI to path
            const definitionFile = location.uri.replace('file://', '');

            // Skip if it's the same file (not a real definition, just the declaration)
            if (definitionFile === filePath) {
                return undefined;
            }

            // Read the definition file to get preview
            try {
                const content = readFileSync(definitionFile, 'utf-8');
                const lines = content.split('\n');
                const preview = lines[location.range.start.line]?.trim();

                return {
                    file: definitionFile,
                    range: {
                        start: this.convertPosition(location.range.start),
                        end: this.convertPosition(location.range.end)
                    },
                    preview
                };
            } catch (_error) {
                // If we can't read the file, still return the location without preview
                return {
                    file: definitionFile,
                    range: {
                        start: this.convertPosition(location.range.start),
                        end: this.convertPosition(location.range.end)
                    }
                };
            }
        } catch (error) {
            this.logger.debug(`Failed to get definition: ${error}`);
            return undefined;
        }
    }

    private extractDocumentation(lines: string[], symbolStartLine: number): string | undefined {
        if (symbolStartLine <= 0) return undefined;

        let currentLine = symbolStartLine - 1;
        this.logger.debug(`Extracting documentation for symbol at line ${symbolStartLine}`);

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
            if (
                (this.language === 'cpp' || this.language === 'c') &&
                (line.startsWith('///') || line.startsWith('//!'))
            ) {
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

        return cleaned
            .filter((line) => line.length > 0)
            .join('\n')
            .trim();
    }

    private cleanXmlDocumentation(docLines: string[]): string {
        // Clean C# XML documentation
        const cleaned = docLines.map((line) => {
            let trimmed = line.trim();

            // Remove /// prefix
            if (trimmed.startsWith('///')) {
                trimmed = trimmed.substring(3).trim();
            }

            return trimmed;
        });

        return cleaned
            .filter((line) => line.length > 0)
            .join('\n')
            .trim();
    }

    private cleanSlashDocumentation(docLines: string[]): string {
        // Clean // style documentation
        const cleaned = docLines.map((line) => {
            let trimmed = line.trim();

            // Remove /// or //! prefix
            if (trimmed.startsWith('///')) {
                trimmed = trimmed.substring(3).trim();
            } else if (trimmed.startsWith('//!')) {
                trimmed = trimmed.substring(3).trim();
            }

            return trimmed;
        });

        return cleaned
            .filter((line) => line.length > 0)
            .join('\n')
            .trim();
    }

    private mergeAnonymousStructsWithTypedefs(symbols: SymbolInfo[]): SymbolInfo[] {
        const result: SymbolInfo[] = [];
        const toSkip = new Set<number>();

        for (let i = 0; i < symbols.length; i++) {
            if (toSkip.has(i)) continue;

            const current = symbols[i];

            // Check if this is an anonymous struct/union/enum OR a named struct/union with a typedef
            if (i + 1 < symbols.length) {
                const next = symbols[i + 1];

                // Check if the next symbol is within the range of the current struct/union
                // and is on the same ending line (typical for typedef)
                if (
                    next.range.start.line >= current.range.start.line &&
                    next.range.end.line <= current.range.end.line &&
                    next.kind === 'class' && // typedef names are often reported as 'class' kind
                    current.kind === 'class' &&
                    (current.name.includes('(anonymous') || current.name === next.name) // anonymous or same name
                ) {
                    // Merge: keep the struct definition with its children but skip the duplicate typedef
                    const merged: SymbolInfo = {
                        ...current,
                        name: next.name // Use typedef name for anonymous structs
                        // Keep the struct's full range and children
                    };
                    result.push(merged);
                    toSkip.add(i + 1); // Skip the typedef name entry
                    continue;
                }
            }

            // If this symbol has children, recursively process them
            if (current.children) {
                current.children = this.mergeAnonymousStructsWithTypedefs(current.children);
            }

            result.push(current);
        }

        return result;
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

            const items = (await this.connection.sendRequest(TypeHierarchyPrepareRequest.type, prepareParams)) as
                | TypeHierarchyItem[]
                | null;

            if (!items || items.length === 0) {
                return undefined;
            }

            // Get supertypes for the first item
            const supertypesParams = {
                item: items[0]
            };

            const supertypes = (await this.connection.sendRequest(
                TypeHierarchySupertypesRequest.type,
                supertypesParams
            )) as TypeHierarchyItem[] | null;

            if (!supertypes || supertypes.length === 0) {
                return undefined;
            }

            // Extract just the names
            return supertypes.map((item) => item.name);
        } catch (error) {
            this.logger.debug(`Error getting supertypes: ${error}`);
            return undefined;
        }
    }

    private convertPosition(lspPosition: LSPPosition): Position {
        return {
            line: lspPosition.line,
            character: lspPosition.character
        };
    }

    private async getSupertypesWithFallback(
        symbol: DocumentSymbol,
        filePath: string,
        preview: string
    ): Promise<Supertype[] | undefined> {
        if (!this.isTypeSymbol(symbol)) {
            return undefined;
        }

        const lspSupertypes = await this.getSupertypes(filePath, symbol.selectionRange.start);

        // Parse LSP supertypes into Supertype objects
        const parsedLspSupertypes = lspSupertypes?.map((type) => this.parseTypeArguments(type));

        // Parse supertypes from preview for all languages
        const parsedSupertypes = this.parseSupertypesFromPreview(preview);

        // Decide which to use based on language and quality of results
        switch (this.language) {
            case 'java':
                // Java LSP often returns malformed or incomplete supertypes
                // Always prefer parsed supertypes for Java as they preserve correct type arguments
                return parsedSupertypes || parsedLspSupertypes;

            case 'typescript':
                // TypeScript LSP often doesn't provide supertypes
                return parsedSupertypes || parsedLspSupertypes;

            case 'cpp':
            case 'c':
                // C++ LSP provides supertypes but strips type arguments
                // Prefer parsed supertypes if they contain type arguments
                if (parsedSupertypes?.some((t) => t.typeArguments && t.typeArguments.length > 0)) {
                    return parsedSupertypes;
                }
                return parsedLspSupertypes || parsedSupertypes;

            case 'haxe':
                // Haxe LSP doesn't provide supertypes
                return parsedSupertypes || parsedLspSupertypes;

            case 'dart':
                // Dart LSP provides supertypes but includes generics and 'Object'
                if (parsedLspSupertypes) {
                    // Remove 'Object' as it's implicit
                    return parsedLspSupertypes.filter((t) => t.name !== 'Object');
                }
                return parsedSupertypes;

            case 'csharp':
                // C# LSP usually provides good supertypes
                return parsedLspSupertypes || parsedSupertypes;

            default:
                // For unknown languages, prefer LSP results but fall back to parsing
                return parsedLspSupertypes || parsedSupertypes;
        }
    }

    private stripGenericParameters(type: string): string {
        // Remove everything after the first < to strip generic parameters
        const genericIndex = type.indexOf('<');
        if (genericIndex > 0) {
            return type.substring(0, genericIndex).trim();
        }
        return type.trim();
    }

    private extractTypeParameters(declaration: string): string[] | undefined {
        // Extract type parameters from a class/interface declaration
        // e.g., "class Foo<T, U extends Bar>" -> ["T", "U"]

        // Handle C++ template syntax specially
        if (this.language === 'cpp' || this.language === 'c') {
            // For C++, look for template<...> before the class/struct
            const templateMatch = declaration.match(/template\s*<([^>]+)>\s*(?:class|struct)/);
            if (templateMatch) {
                const typeParamsStr = templateMatch[1];
                const typeParams: string[] = [];
                let current = '';
                let depth = 0;

                for (const char of typeParamsStr) {
                    if (char === '<') depth++;
                    else if (char === '>') depth--;

                    if (char === ',' && depth === 0) {
                        const param = this.extractCppTemplateParam(current.trim());
                        if (param) typeParams.push(param);
                        current = '';
                    } else {
                        current += char;
                    }
                }

                // Don't forget the last parameter
                const lastParam = this.extractCppTemplateParam(current.trim());
                if (lastParam) typeParams.push(lastParam);

                return typeParams.length > 0 ? typeParams : undefined;
            }
            return undefined; // C++ classes without template<> don't have type params
        }

        // For other languages, look for generics after the type name
        // Handle TypeScript type aliases specially
        let typeNameMatch = declaration.match(/(?:class|interface|struct)\s+(\w+)/);
        if (!typeNameMatch && this.language === 'typescript') {
            // Try to match TypeScript type alias: type Name<T> = ...
            typeNameMatch = declaration.match(/type\s+(\w+)/);
        }
        if (!typeNameMatch) return undefined;

        const typeName = typeNameMatch[1];
        const afterTypeName = declaration.indexOf(typeName) + typeName.length;

        // Look for opening < right after the type name
        if (
            declaration[afterTypeName] !== '<' &&
            (afterTypeName + 1 >= declaration.length || declaration[afterTypeName + 1] !== '<')
        ) {
            // Try with whitespace
            const nextNonWhitespace = declaration.substring(afterTypeName).search(/\S/);
            if (nextNonWhitespace === -1 || declaration[afterTypeName + nextNonWhitespace] !== '<') {
                return undefined;
            }
        }

        // Find the matching closing > by tracking depth
        let depth = 0;
        let genericStart = -1;
        let genericEnd = -1;

        for (let i = afterTypeName; i < declaration.length; i++) {
            if (declaration[i] === '<') {
                if (depth === 0 && genericStart === -1) {
                    genericStart = i;
                }
                depth++;
            } else if (declaration[i] === '>') {
                depth--;
                if (depth === 0 && genericStart !== -1) {
                    genericEnd = i;
                    break;
                }
            }
        }

        if (genericStart === -1 || genericEnd === -1) return undefined;

        const typeParamsStr = declaration.substring(genericStart + 1, genericEnd);
        const typeParams: string[] = [];
        let current = '';
        depth = 0;

        for (const char of typeParamsStr) {
            if (char === '<') depth++;
            else if (char === '>') depth--;

            if (char === ',' && depth === 0) {
                const param = current.trim();
                // Extract just the parameter name (e.g., "T extends Foo" -> "T")
                const paramName = param.split(/[\s:=]/)[0].trim();
                if (paramName && paramName !== 'typename' && paramName !== 'class') {
                    typeParams.push(paramName);
                }
                current = '';
            } else {
                current += char;
            }
        }

        // Don't forget the last parameter
        const lastParam = current.trim();
        if (lastParam) {
            const paramName = lastParam.split(/[\s:=]/)[0].trim();
            if (paramName && paramName !== 'typename' && paramName !== 'class') {
                typeParams.push(paramName);
            }
        }

        return typeParams.length > 0 ? typeParams : undefined;
    }

    private extractCppTemplateParam(param: string): string | null {
        // Extract C++ template parameter name
        // e.g., "typename T", "class T", "int N", "typename T = void"

        // Remove default values
        const withoutDefault = param.split('=')[0].trim();

        // Extract the parameter name
        const parts = withoutDefault.split(/\s+/);
        if (parts.length === 0) return null;

        // Last part is usually the name
        const name = parts[parts.length - 1];

        // Skip typename/class keywords if they're the only part
        if (name === 'typename' || name === 'class') {
            return null;
        }

        return name;
    }

    private parseTypeArguments(typeWithGenerics: string): { name: string; typeArguments?: string[] } {
        // Parse a type with its generic arguments
        // e.g., "Foo<T, Bar<X>>" -> { name: "Foo", typeArguments: ["T", "Bar<X>"] }
        const genericIndex = typeWithGenerics.indexOf('<');

        if (genericIndex === -1) {
            return { name: typeWithGenerics.trim() };
        }

        const name = typeWithGenerics.substring(0, genericIndex).trim();
        const argsStr = typeWithGenerics.substring(genericIndex + 1, typeWithGenerics.lastIndexOf('>'));

        // Split by comma but respect nested generics
        const typeArguments: string[] = [];
        let current = '';
        let depth = 0;

        for (const char of argsStr) {
            if (char === '<') depth++;
            else if (char === '>') depth--;

            if (char === ',' && depth === 0) {
                const arg = current.trim();
                if (arg) typeArguments.push(arg);
                current = '';
            } else {
                current += char;
            }
        }

        // Don't forget the last argument
        const lastArg = current.trim();
        if (lastArg) typeArguments.push(lastArg);

        return { name, typeArguments: typeArguments.length > 0 ? typeArguments : undefined };
    }

    private parseSupertypesFromPreview(preview: string): Supertype[] | undefined {
        if (!preview) {
            return undefined;
        }

        switch (this.language) {
            case 'java':
                return this.parseJavaSupertypesFromPreview(preview);
            case 'typescript':
                return this.parseTypeScriptSupertypesFromPreview(preview);
            case 'cpp':
            case 'c':
                return this.parseCppSupertypesFromPreview(preview);
            case 'haxe':
                return this.parseHaxeSupertypesFromPreview(preview);
            case 'dart':
                return this.parseDartSupertypesFromPreview(preview);
            case 'csharp':
                return this.parseCSharpSupertypesFromPreview(preview);
            default:
                return undefined;
        }
    }

    private parseJavaSupertypesFromPreview(preview: string): Supertype[] | undefined {
        const supertypes: Supertype[] = [];

        // First remove comments from the preview
        const cleanedPreview = preview
            // Remove block comments
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            // Remove line comments - everything from // to end of line
            .replace(/\/\/.*$/gm, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();

        // First remove the class/interface declaration part to avoid confusion
        // We need to handle nested generics properly
        let afterTypeParams = cleanedPreview;

        // Remove class/interface declaration with proper generic handling
        const declMatch = cleanedPreview.match(/^.*?(?:class|interface)\s+\w+/);
        if (declMatch) {
            let pos = declMatch[0].length;
            let angleDepth = 0;

            // Skip over generic parameters of the class/interface itself
            if (pos < cleanedPreview.length && cleanedPreview[pos] === '<') {
                while (pos < cleanedPreview.length) {
                    if (cleanedPreview[pos] === '<') angleDepth++;
                    else if (cleanedPreview[pos] === '>') angleDepth--;
                    pos++;
                    if (angleDepth === 0) break;
                }
            }

            afterTypeParams = cleanedPreview.substring(pos).trim();
        }

        // Extract extends clause
        const extendsMatch = afterTypeParams.match(/\bextends\s+([^{]+?)(?:\s+implements|\s*{|$)/);
        if (extendsMatch) {
            const extendsClause = extendsMatch[1].trim();
            // Handle generic types properly - we need to track angle bracket depth
            const types = this.splitTypeList(extendsClause);
            for (const type of types) {
                // Clean the type: remove annotations but preserve generics
                const cleanType = type.replace(/@\w+(\.\w+)*\s*/g, '').trim();
                if (cleanType && cleanType !== 'extends' && cleanType !== 'implements') {
                    supertypes.push(this.parseTypeArguments(cleanType));
                }
            }
        }

        // Extract implements clause
        const implementsMatch = afterTypeParams.match(/\bimplements\s+([^{]+?)(?:\s*{|$)/);
        if (implementsMatch) {
            const implementsClause = implementsMatch[1].trim();
            // Handle generic types properly
            const types = this.splitTypeList(implementsClause);
            for (const type of types) {
                // Clean the type: remove annotations but preserve generics
                const cleanType = type.replace(/@\w+(\.\w+)*\s*/g, '').trim();
                if (cleanType && cleanType !== 'extends' && cleanType !== 'implements') {
                    supertypes.push(this.parseTypeArguments(cleanType));
                }
            }
        }

        return supertypes.length > 0 ? supertypes : undefined;
    }

    private cleanJavaType(type: string): string {
        // Remove Java annotations (@Something)
        const cleaned = type.replace(/@\w+(\.\w+)*\s*/g, '').trim();

        // Strip generic parameters using the existing method
        return this.stripGenericParameters(cleaned);
    }

    private splitTypeList(typeList: string): string[] {
        const types: string[] = [];
        let current = '';
        let angleDepth = 0;

        for (let i = 0; i < typeList.length; i++) {
            const char = typeList[i];
            if (char === '<') {
                angleDepth++;
                current += char;
            } else if (char === '>') {
                angleDepth--;
                current += char;
            } else if (char === ',' && angleDepth === 0) {
                if (current.trim()) {
                    types.push(current.trim());
                }
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            types.push(current.trim());
        }

        return types;
    }

    private parseTypeScriptSupertypesFromPreview(preview: string): Supertype[] | undefined {
        const supertypes: Supertype[] = [];

        // First remove comments from the preview
        const cleanedPreview = preview
            // Remove block comments
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            // Remove line comments - everything from // to end of line
            .replace(/\/\/.*$/gm, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();

        // Remove class/interface declaration
        const afterDecl = cleanedPreview.replace(/^.*?(?:class|interface)\s+\w+(?:<[^>]*>)?\s*/, '');

        // Extract extends clause
        const extendsMatch = afterDecl.match(/\bextends\s+([^{]+?)(?:\s+implements|\s*{|$)/);
        if (extendsMatch) {
            const types = this.splitTypeList(extendsMatch[1].trim());
            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        // Extract implements clause
        const implementsMatch = afterDecl.match(/\bimplements\s+([^{]+?)(?:\s*{|$)/);
        if (implementsMatch) {
            const types = this.splitTypeList(implementsMatch[1].trim());
            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        return supertypes.length > 0 ? supertypes : undefined;
    }

    private parseCppSupertypesFromPreview(preview: string): Supertype[] | undefined {
        const supertypes: Supertype[] = [];

        // C++ uses : for inheritance
        const inheritanceMatch = preview.match(/:\s*(.*?)(?:\s*{|$)/);
        if (inheritanceMatch) {
            const inheritanceClause = inheritanceMatch[1];
            // Split by comma but respect angle brackets
            const types = this.splitTypeList(inheritanceClause);

            for (const type of types) {
                // Remove access specifiers (public, private, protected)
                const cleanedType = type.replace(/^\s*(public|private|protected)\s+/, '').trim();
                if (cleanedType) {
                    supertypes.push(this.parseTypeArguments(cleanedType));
                }
            }
        }

        return supertypes.length > 0 ? supertypes : undefined;
    }

    private parseHaxeSupertypesFromPreview(preview: string): Supertype[] | undefined {
        const supertypes: Supertype[] = [];

        // Remove comments first
        const cleanedPreview = preview
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            .replace(/\/\/.*$/gm, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Haxe uses extends for single inheritance (classes can extend one class, interfaces can extend multiple interfaces)
        const extendsMatch = cleanedPreview.match(/\bextends\s+([^{]+?)(?:\s+implements|\s*{|$)/);
        if (extendsMatch) {
            const extendsClause = extendsMatch[1].trim();
            // For interfaces, there can be comma-separated extends
            const types = this.splitTypeList(extendsClause);
            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        // Haxe uses implements for interfaces (comma-separated list)
        const implementsMatch = cleanedPreview.match(/\bimplements\s+([^{]+?)(?:\s*{|$)/);
        if (implementsMatch) {
            const implementsClause = implementsMatch[1].trim();
            const types = this.splitTypeList(implementsClause);
            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        return supertypes.length > 0 ? supertypes : undefined;
    }

    private parseDartSupertypesFromPreview(preview: string): Supertype[] | undefined {
        const supertypes: Supertype[] = [];

        // Remove class declaration
        const afterDecl = preview.replace(/^.*?class\s+\w+(?:<[^>]*>)?\s*/, '');

        // Extract extends clause
        const extendsMatch = afterDecl.match(/\bextends\s+(\w+(?:<[^>]*>)?)/);
        if (extendsMatch) {
            supertypes.push(this.parseTypeArguments(extendsMatch[1]));
        }

        // Extract with clause (mixins)
        const withMatch = afterDecl.match(/\bwith\s+([^{]+?)(?:\s+implements|\s*{|$)/);
        if (withMatch) {
            const types = this.splitTypeList(withMatch[1].trim());
            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        // Extract implements clause
        const implementsMatch = afterDecl.match(/\bimplements\s+([^{]+?)(?:\s*{|$)/);
        if (implementsMatch) {
            const types = this.splitTypeList(implementsMatch[1].trim());
            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        return supertypes.length > 0 ? supertypes : undefined;
    }

    private parseCSharpSupertypesFromPreview(preview: string): Supertype[] | undefined {
        const supertypes: Supertype[] = [];

        // C# uses : for inheritance
        const inheritanceMatch = preview.match(/:\s*(.*?)(?:\s+where|\s*{|$)/);
        if (inheritanceMatch) {
            const inheritanceClause = inheritanceMatch[1];
            const types = this.splitTypeList(inheritanceClause);

            for (const type of types) {
                if (type.trim()) {
                    supertypes.push(this.parseTypeArguments(type.trim()));
                }
            }
        }

        return supertypes.length > 0 ? supertypes : undefined;
    }

    private cleanSymbolName(name: string): string {
        // For Java, strip generic type parameters from class/interface names
        if (this.language === 'java') {
            // Remove everything after the first < for type definitions
            const genericIndex = name.indexOf('<');
            if (genericIndex > 0) {
                return name.substring(0, genericIndex);
            }
        }
        return name;
    }

    private isTypeSymbol(symbol: DocumentSymbol): boolean {
        const typeKinds: SymbolKind[] = [SymbolKind.Class, SymbolKind.Interface, SymbolKind.Enum, SymbolKind.Struct];
        return typeKinds.includes(symbol.kind);
    }

    private isTypeScriptTypeAlias(symbol: DocumentSymbol, preview: string): boolean {
        // TypeScript reports type aliases as Variable
        return (
            this.language === 'typescript' &&
            symbol.kind === SymbolKind.Variable &&
            preview.includes('type ') &&
            preview.includes('=')
        );
    }

    private getSymbolKindName(kind: SymbolKind): string {
        switch (kind) {
            case SymbolKind.File:
                return 'file';
            case SymbolKind.Module:
                return 'module';
            case SymbolKind.Namespace:
                return 'namespace';
            case SymbolKind.Package:
                return 'package';
            case SymbolKind.Class:
                return 'class';
            case SymbolKind.Method:
                return 'method';
            case SymbolKind.Property:
                return 'property';
            case SymbolKind.Field:
                return 'field';
            case SymbolKind.Constructor:
                return 'constructor';
            case SymbolKind.Enum:
                return 'enum';
            case SymbolKind.Interface:
                return 'interface';
            case SymbolKind.Function:
                return 'function';
            case SymbolKind.Variable:
                return 'variable';
            case SymbolKind.Constant:
                return 'constant';
            case SymbolKind.String:
                return 'string';
            case SymbolKind.Number:
                return 'number';
            case SymbolKind.Boolean:
                return 'boolean';
            case SymbolKind.Array:
                return 'array';
            case SymbolKind.Object:
                return 'object';
            case SymbolKind.Key:
                return 'key';
            case SymbolKind.Null:
                return 'null';
            case SymbolKind.EnumMember:
                return 'enumMember';
            case SymbolKind.Struct:
                return 'struct';
            case SymbolKind.Event:
                return 'event';
            case SymbolKind.Operator:
                return 'operator';
            case SymbolKind.TypeParameter:
                return 'typeParameter';
            default: {
                // This ensures we handle all cases - TypeScript will error if we miss one
                const _exhaustive: never = kind;
                return `unknown-${kind}`;
            }
        }
    }

    private getLanguageId(): string {
        const languageMap: { [key in SupportedLanguage]: string } = {
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            csharp: 'csharp',
            haxe: 'haxe',
            typescript: 'typescript',
            dart: 'dart',
            rust: 'rust'
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
            dart: ['.dart'],
            typescript: ['.ts', '.tsx'],
            rust: ['.rs']
        };

        const extensions = extensionMap[this.language];
        return getAllFiles(this.workspaceRoot, extensions);
    }
}
