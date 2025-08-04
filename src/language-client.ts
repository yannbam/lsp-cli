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
import type { Position, SupportedLanguage, SymbolInfo } from './types';
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
            // For C/C++, check if this is a forward declaration or friend declaration
            const preview = lines[symbol.selectionRange.start.line]?.trim() || '';
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
                comments: this.shouldExtractComments(symbol.kind)
                    ? this.extractInlineComments(lines, symbol.selectionRange.start.line, symbol.range.end.line)
                    : undefined,
                supertypes: this.isTypeSymbol(symbol)
                    ? await this.getSupertypes(filePath, symbol.selectionRange.start)
                    : undefined,
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

    /**
     * Checks if a given position in a line is inside a string literal.
     * Handles single quotes, double quotes, template literals, and escaped quotes.
     */
    private isInsideStringLiteral(line: string, position: number): boolean {
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inTemplateQuote = false;
        let inRawString = false;
        let _rawStringDelimiter = '';

        for (let i = 0; i < position; i++) {
            const char = line[i];
            const prevChar = i > 0 ? line[i - 1] : '';

            // Skip escaped characters
            if (prevChar === '\\') {
                continue;
            }

            const nextChar = i + 1 < line.length ? line[i + 1] : '';

            // Handle C++ raw strings R"delimiter(content)delimiter"
            if (!inSingleQuote && !inDoubleQuote && !inTemplateQuote && !inRawString) {
                // Check for start of raw string: R"
                if (char === 'R' && nextChar === '"' && (i === 0 || !/[a-zA-Z0-9_]/.test(prevChar))) {
                    // Find the delimiter
                    let delimiterEnd = i + 2;
                    while (delimiterEnd < line.length && line[delimiterEnd] !== '(') {
                        delimiterEnd++;
                    }
                    if (delimiterEnd < line.length) {
                        _rawStringDelimiter = line.substring(i + 2, delimiterEnd);
                        inRawString = true;
                        i = delimiterEnd; // Skip to after the opening (
                        continue;
                    }
                }
            }

            // Handle end of raw string
            if (inRawString) {
                // Check for end pattern: )delimiter"
                if (char === ')' && line.substring(i + 1).startsWith(`${_rawStringDelimiter}"`)) {
                    inRawString = false;
                    i += _rawStringDelimiter.length + 1; // Skip past )delimiter"
                }
                continue;
            }

            // Toggle quote states for regular strings
            if (char === "'" && !inDoubleQuote && !inTemplateQuote && !inRawString) {
                inSingleQuote = !inSingleQuote;
            } else if (char === '"' && !inSingleQuote && !inTemplateQuote && !inRawString) {
                inDoubleQuote = !inDoubleQuote;
            } else if (char === '`' && !inSingleQuote && !inDoubleQuote && !inRawString) {
                inTemplateQuote = !inTemplateQuote;
            }
        }

        return inSingleQuote || inDoubleQuote || inTemplateQuote || inRawString;
    }

    /**
     * Extracts all inline comments from within a symbol's range.
     * Groups consecutive comment-only lines together, keeps end-of-line comments separate.
     * This captures the developer's thinking and intentions within the function body.
     */
    private extractInlineComments(lines: string[], startLine: number, endLine: number): string[] | undefined {
        const comments: string[] = [];
        let currentCommentBlock: string[] = [];
        let inBlockComment = false;
        let blockCommentContent = '';

        const finalizeCurrentBlock = () => {
            if (currentCommentBlock.length > 0) {
                comments.push(currentCommentBlock.join('\n'));
                currentCommentBlock = [];
            }
        };

        for (let lineNum = startLine; lineNum <= endLine && lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const trimmedLine = line.trim();

            // Skip empty lines
            if (trimmedLine === '') continue;

            // Handle ongoing block comments
            if (inBlockComment) {
                const blockEndIndex = line.indexOf('*/');
                if (blockEndIndex !== -1) {
                    // End of block comment found
                    blockCommentContent += line.substring(0, blockEndIndex);
                    const cleanContent = this.cleanInlineBlockComment(blockCommentContent);
                    if (cleanContent) {
                        currentCommentBlock.push(cleanContent);
                    }
                    blockCommentContent = '';
                    inBlockComment = false;

                    // Continue processing the rest of the line after */
                    const remainingLine = line.substring(blockEndIndex + 2);
                    if (remainingLine.trim()) {
                        const remainingComments = this.extractInlineComments([remainingLine], 0, 0);
                        if (remainingComments) {
                            // If remaining line has more content, finalize current block and add remaining
                            finalizeCurrentBlock();
                            comments.push(...remainingComments);
                        }
                    }
                } else {
                    // Still inside block comment
                    blockCommentContent += `${line}\n`;
                }
                continue;
            }

            // Check if this is a comment-only line or has code + comment
            const lineCommentIndex = line.indexOf('//');
            const blockStartIndex = line.indexOf('/*');

            let hasCode = false;
            let commentContent = '';

            // Determine if line has code before comments
            if (lineCommentIndex !== -1 && !this.isInsideStringLiteral(line, lineCommentIndex)) {
                // Check if it's a documentation comment
                const docCheck = line.substring(lineCommentIndex, lineCommentIndex + 3);
                if (docCheck === '///' || docCheck === '//!') {
                    continue; // Skip documentation comments
                }

                const beforeComment = line.substring(0, lineCommentIndex).trim();
                hasCode = beforeComment.length > 0;
                commentContent = line.substring(lineCommentIndex + 2).trim();
            } else if (blockStartIndex !== -1 && !this.isInsideStringLiteral(line, blockStartIndex)) {
                // Check if it's a documentation comment
                const docCheck = line.substring(blockStartIndex, blockStartIndex + 3);
                if (docCheck === '/**' || docCheck === '/*!') {
                    continue; // Skip documentation comments
                }

                const beforeComment = line.substring(0, blockStartIndex).trim();
                hasCode = beforeComment.length > 0;

                const blockEndIndex = line.indexOf('*/', blockStartIndex + 2);
                if (blockEndIndex !== -1) {
                    // Single-line block comment
                    commentContent = line.substring(blockStartIndex + 2, blockEndIndex).trim();
                } else {
                    // Multi-line block comment starts
                    inBlockComment = true;
                    blockCommentContent = `${line.substring(blockStartIndex + 2)}\n`;
                    continue;
                }
            } else {
                // No comments on this line, just finalize any current block
                finalizeCurrentBlock();
                continue;
            }

            if (commentContent) {
                if (hasCode) {
                    // End-of-line comment: finalize current block and add as separate comment
                    finalizeCurrentBlock();
                    comments.push(commentContent);
                } else {
                    // Comment-only line: add to current block
                    currentCommentBlock.push(commentContent);
                }
            }
        }

        // Finalize any remaining comment block
        finalizeCurrentBlock();

        return comments.length > 0 ? comments : undefined;
    }

    /**
     * Cleans content from inline block comments.
     */

    /**
     * Determines if comments should be extracted for this symbol kind.
     * Comments are valuable for functions, methods, constructors - anything with executable code.
     */
    private shouldExtractComments(symbolKind: SymbolKind): boolean {
        return (
            symbolKind === SymbolKind.Function ||
            symbolKind === SymbolKind.Method ||
            symbolKind === SymbolKind.Constructor
        );
    }

    private cleanInlineBlockComment(content: string): string {
        return content
            .split('\n')
            .map((line) => line.trim())
            .map((line) => line.replace(/^\*+\s*/, '')) // Remove leading asterisks
            .filter((line) => line.length > 0)
            .join('\n')
            .trim();
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
            typescript: ['.ts', '.tsx', '.js'],
            rust: ['.rs']
        };

        const extensions = extensionMap[this.language];
        return getAllFiles(this.workspaceRoot, extensions);
    }
}
