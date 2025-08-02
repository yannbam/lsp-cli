


Based on my analysis of the lsp-cli codebase, here are the exact parts that would need to be changed to add Python and Rust support:

## 1) Code Changes Required

### Type Definitions
You need to update the `SupportedLanguage` type to include 'python' and 'rust': [1](#0-0) 

### Server Manager Configuration
The `ServerManager` class requires updates in several methods:

**Server Configuration**: Add new cases in `getServerConfig()` for Python and Rust LSP servers, including download URLs and command configurations: [2](#0-1) 

**Installation Detection**: Update `isServerInstalled()` to detect when Python and Rust LSP servers are properly installed: [3](#0-2) 

**Server Commands**: Add command construction logic in `getServerCommand()` for launching Python and Rust LSP servers: [4](#0-3) 

### Language Client Updates
**File Extensions**: Update the `getSourceFiles()` method to include Python (`.py`) and Rust (`.rs`) file extensions: [5](#0-4) 

**Language IDs**: Add Python and Rust language identifiers in `getLanguageId()`: [6](#0-5) 

**Supertype Parsing**: If needed, add language-specific supertype parsing methods following the existing pattern: [7](#0-6) 

### Toolchain and Project Detection
**Toolchain Verification**: Add Python and Rust toolchain detection in `checkToolchain()`: [8](#0-7) 

**Project Files**: Update `checkProjectFiles()` to recognize Python (`requirements.txt`, `pyproject.toml`, `setup.py`) and Rust (`Cargo.toml`) project files: [9](#0-8) 

### CLI Interface
Update the CLI argument validation and help text to include the new languages: [10](#0-9) 

## 2) Available LSP Servers and Requirements

### Python LSP Servers
**Pylsp (Python LSP Server)**: A mature, feature-complete LSP server that supports all standard LSP features including document symbols and type hierarchy. It can be installed via pip and works well with the existing architecture.

**Pyright**: Microsoft's Python language server with excellent type checking capabilities. It's distributed as an npm package and provides comprehensive LSP support.

### Rust LSP Server
**rust-analyzer**: The official Rust LSP server with excellent symbol extraction, type hierarchy support, and comprehensive language features. It can be downloaded as a binary or installed via rustup.

### LSP Server Requirements
For any LSP server to work with lsp-cli, it must fulfill these requirements based on the language client implementation:

1. **Standard LSP Protocol Compliance**: Support for `initialize`, `initialized`, `shutdown`, and `exit` requests: [11](#0-10) 

2. **Document Symbol Support**: Must respond to `textDocument/documentSymbol` requests with hierarchical symbol information: [12](#0-11) 

3. **Text Document Notifications**: Support for `textDocument/didOpen` notifications: [13](#0-12) 

4. **Optional Type Hierarchy**: While not required, support for `typeHierarchy/prepare` and `typeHierarchy/supertypes` requests enhances the output quality: [14](#0-13) 

The existing architecture is designed to be language-agnostic and relies on standard LSP protocol features, so any compliant LSP server should work with minimal modifications to the symbol extraction logic.

## Notes

The lsp-cli architecture is well-designed for extensibility. The main changes involve configuration and file type mappings rather than core logic modifications. Both Python and Rust have mature, actively maintained LSP servers that fully support the required LSP features. The existing fallback mechanisms for supertype parsing will handle any language-specific nuances automatically.
