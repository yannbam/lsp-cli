# Rust Implementation Insights for Python Support

**Session Date**: 2025-01-04  
**Implemented**: Complete Rust support for lsp-cli  
**Next**: Python support implementation

## Summary

Successfully implemented full Rust support in lsp-cli using rust-analyzer LSP server. All core components were updated following the established architectural patterns. The implementation was tested and works correctly, extracting Rust symbols with proper hierarchical structure.

## Key Implementation Insights for Python

### 1. Architectural Pattern Validation

The lsp-cli architecture proved to be well-designed for extensibility. Adding Rust support required updating **exactly 5 files** with consistent patterns:

- `src/types.ts` - Add language to type union
- `src/utils.ts` - Add toolchain detection + project file recognition  
- `src/server-manager.ts` - Add LSP server configuration + installation + commands
- `src/language-client.ts` - Add language ID + file extensions
- `src/index.ts` - Add to CLI validation + help text

**Python Recommendation**: Follow this exact same pattern. The architecture scales perfectly.

### 2. LSP Server Integration Patterns

#### Pattern A: System-Wide Installation (Used for Rust)
- **When**: LSP server already installed system-wide
- **Implementation**: Empty `downloadUrl`, simple wrapper script via `installScript`
- **Detection**: Check for wrapper script existence
- **Command**: Point to wrapper script path

#### Pattern B: Download + Extract (Used for Java, C++)
- **When**: Need to download pre-built binaries
- **Implementation**: Provide `downloadUrl`, complex installation logic
- **Detection**: Check for specific binary files
- **Command**: Full path to extracted executable

#### Pattern C: npm/Build Installation (Used for TypeScript, Haxe)
- **When**: LSP server available via package manager or needs building
- **Implementation**: Empty `downloadUrl`, `installScript` handles installation
- **Detection**: Check for installed package structure
- **Command**: Use package executable path

**Python Recommendation**: 
- **Pylsp**: Use Pattern C - install via pip in a virtual environment
- **Pyright**: Use Pattern C - install via npm (already have npm infrastructure)

### 3. Toolchain Detection Strategy

Rust implementation checks for **both** `rustc` and `cargo` in sequence:

```typescript
case 'rust':
    try {
        await execAsync('rustc --version');
        await execAsync('cargo --version');
        return { installed: true, message: 'Rust toolchain found (rustc + cargo)' };
    } catch {
        return { 
            installed: false, 
            message: 'Rust toolchain incomplete. Both rustc and cargo are required.\nInstall from https://rustup.rs/' 
        };
    }
```

**Python Recommendation**: Check for `python3` (or `python`) and `pip`:

```typescript
case 'python':
    try {
        await execAsync('python3 --version');
        await execAsync('pip3 --version');
        return { installed: true, message: 'Python toolchain found (python3 + pip3)' };
    } catch {
        // Fallback to 'python' and 'pip'
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
```

### 4. Project File Detection

Rust uses simple single-file detection:
```typescript
rust: ['Cargo.toml']
```

**Python Recommendation**: Use multiple common project indicators:
```typescript
python: ['requirements.txt', 'pyproject.toml', 'setup.py', 'setup.cfg', 'Pipfile', 'environment.yml']
```

Suggestion message should guide users to create `requirements.txt` or `pyproject.toml`.

### 5. LSP Server Choice Recommendations

#### For Python LSP Server Selection:

**Option 1: Pylsp (Recommended)**
- **Pros**: Pure Python, feature-complete, actively maintained
- **Cons**: May be slower than Pyright
- **Installation**: `pip install python-lsp-server[all]`
- **Command**: `['pylsp']`

**Option 2: Pyright**  
- **Pros**: Excellent type checking, fast, Microsoft-backed
- **Cons**: npm dependency (but we already have npm)
- **Installation**: `npm install pyright`
- **Command**: `['pyright-langserver', '--stdio']`

**Recommendation**: Start with **Pylsp** for consistency with Python ecosystem, but document Pyright as future enhancement.

### 6. File Extensions and Language ID

Rust implementation:
```typescript
rust: ['.rs']  // Simple, single extension
```

**Python Recommendation**:
```typescript
python: ['.py', '.pyi']  // .py + .pyi (stub files)
```

Language ID should be `'python'` (standard LSP identifier).

### 7. Installation Script Patterns

#### Virtual Environment Approach (Recommended for Python):
```typescript
installScript: async (targetDir: string) => {
    // Create virtual environment
    await execAsync(`python3 -m venv ${targetDir}/venv`);
    
    // Install pylsp in virtual environment
    const pipPath = join(targetDir, 'venv', 'bin', 'pip');
    await execAsync(`${pipPath} install python-lsp-server[all]`);
    
    // Create wrapper script
    const wrapperScript = `#!/bin/sh
source ${targetDir}/venv/bin/activate
exec pylsp "$@"
`;
    const wrapperPath = join(targetDir, 'pylsp');
    await execAsync(`echo '${wrapperScript}' > ${wrapperPath} && chmod +x ${wrapperPath}`);
}
```

### 8. Testing Insights

**Test Project Structure**: Our Rust test created:
- `Cargo.toml` (project file) 
- `src/main.rs` with diverse constructs (struct, impl, trait, functions)
- Rich symbol hierarchy with documentation

**Python Test Project Should Include**:
- `requirements.txt` or `pyproject.toml`
- `src/main.py` or similar with:
  - Classes with methods and properties
  - Functions with docstrings  
  - Type hints (for better LSP analysis)
  - Import statements

### 9. Error Handling Patterns

The Rust implementation handles the case where rust-analyzer might not be available gracefully. The wrapper script approach allows the system to fail gracefully if the underlying LSP server isn't found.

**Python Consideration**: Virtual environment approach provides isolation and clear error messages when pylsp installation fails.

### 10. Performance Observations

rust-analyzer integration was **fast and efficient**:
- Server startup: ~1-2 seconds
- Symbol extraction: Nearly instantaneous for small projects
- Clean shutdown: No hanging processes

**Python Expectation**: Pylsp should perform similarly for small-to-medium projects.

## Recommended Python Implementation Sequence

1. **Types** - Add `'python'` to `SupportedLanguage`
2. **Utils** - Add Python toolchain detection (python3 + pip3) and project files  
3. **ServerManager** - Configure pylsp with virtual environment installation
4. **LanguageClient** - Add `.py/.pyi` extensions and `'python'` language ID
5. **CLI** - Update help text and validation
6. **Test** - Create Python test project and verify extraction

## Architecture Validation

The Rust implementation **confirmed**:
- ✅ LSP server abstraction works perfectly
- ✅ Symbol extraction is language-agnostic  
- ✅ Hierarchical output structure handles any LSP server
- ✅ Installation patterns are flexible and extensible
- ✅ Error handling is consistent across languages

**Python implementation should be straightforward following these established patterns.**

---

*This document provides insights from successful Rust implementation to guide Python support development.*