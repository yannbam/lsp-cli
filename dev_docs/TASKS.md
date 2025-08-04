# Development Tasks

## Python Support Tasks

### ✅ Completed (Current Session)
- [x] **Core Implementation**: Added Python to all 5 core files following established patterns
- [x] **Symbol Extraction Fix**: Resolved critical SymbolInformation vs DocumentSymbol format compatibility issue
- [x] **Basic Testing**: Verified end-to-end functionality with simple test case (17 symbols extracted successfully)
- [x] **Documentation**: Updated README.md with Python support details

### 🚧 In Progress / High Priority

#### **P1: Comprehensive Test Fixtures**
- [ ] **Create Python test fixtures** following the Rust pattern (7+ files, diverse constructs)
  - [ ] Basic Python constructs (classes, functions, variables)
  - [ ] Advanced Python features (decorators, context managers, async/await)
  - [ ] Type hints and generics (`List[T]`, `Dict[K, V]`, `Optional`, `Union`)
  - [ ] Magic methods (`__init__`, `__str__`, `__call__`, etc.)
  - [ ] Property decorators (`@property`, `@staticmethod`, `@classmethod`)
  - [ ] Inheritance and multiple inheritance
  - [ ] Import patterns and module structure
  - [ ] Exception classes and error handling constructs
  - [ ] Docstring variations (Google, NumPy, Sphinx styles)
- [ ] **Test project structure** with proper Python project files
  - [ ] `requirements.txt` with real dependencies
  - [ ] `pyproject.toml` with build configuration
  - [ ] `setup.py`, `setup.cfg` combinations
  - [ ] `.gitignore` for Python artifacts (`__pycache__/`, `*.pyc`, etc.)
- [ ] **Verify symbol extraction accuracy** across all test cases
- [ ] **Document test results** and any limitations discovered

#### **P1: Edge Case Testing & Validation**
- [ ] **Test with different Python versions** (3.7, 3.8, 3.9, 3.10+)
- [ ] **Test with different pylsp configurations** and plugin combinations
- [ ] **Test large codebases** (performance and memory usage)
- [ ] **Test virtual environment scenarios** (venv detection, isolated dependencies)
- [ ] **Error handling validation** (malformed Python files, syntax errors)
- [ ] **Cross-platform testing** (Windows, macOS, Linux)

### 🔍 Medium Priority

#### **P2: Feature Enhancements**
- [ ] **Hierarchical symbol support investigation**
  - Research if pylsp can be configured to return DocumentSymbol format
  - Implement capability negotiation for hierarchical symbols if possible
  - Document why SymbolInformation format is used and its implications
- [ ] **Python-specific symbol improvements**
  - [ ] Better property detection (distinguish `@property` from regular methods)
  - [ ] Async function identification (`async def` vs `def`)
  - [ ] Class variable vs instance variable distinction
  - [ ] Lambda function detection and handling
- [ ] **Documentation extraction enhancements**
  - [ ] Support for different docstring formats (Google, NumPy, Sphinx)
  - [ ] Type hint integration with documentation
  - [ ] Cross-reference resolution for imported types

#### **P2: Integration Improvements**  
- [ ] **Virtual environment auto-detection**
  - Detect and configure pylsp to use project-specific virtual environments
  - Support for conda environments, pipenv, poetry
- [ ] **Python project type detection**
  - Django project detection and specialized handling
  - Flask application structure recognition
  - Package vs script distinction
- [ ] **Dependency analysis integration**
  - Parse requirements.txt/pyproject.toml for context
  - Include third-party library symbols when relevant

### 🧪 Low Priority / Future Enhancements

#### **P3: Advanced Features**
- [ ] **Jupyter Notebook support** (`.ipynb` files)
- [ ] **Python stub file analysis** (`.pyi` files in depth)
- [ ] **Cython support** (`.pyx` files)
- [ ] **Python 2 compatibility** (if needed for legacy codebases)

---

## Rust Support Tasks

### 🔍 **P1: Status Verification** 
- [ ] **Audit current Rust implementation**
  - [ ] Verify end-to-end functionality with existing test fixtures
  - [ ] Test rust-analyzer integration and symbol extraction
  - [ ] Validate toolchain detection (rustc + cargo)
  - [ ] Check project file detection (Cargo.toml)
  - [ ] Test with different Rust project types (binary, library, workspace)
- [ ] **Identify any gaps or issues** in current implementation
- [ ] **Document Rust implementation status** and any needed fixes

### 🚧 **P2: Potential Improvements** (based on implementation review)
- [ ] **Test fixture completeness review**
  - Verify the 7-file, 99-symbol test fixture covers all major Rust constructs
  - Add any missing edge cases discovered during Python implementation
- [ ] **Cross-platform testing** for Rust support
- [ ] **Performance validation** with large Rust codebases
- [ ] **rust-analyzer configuration optimization**
  - Investigate if default configuration is optimal
  - Document any recommended rust-analyzer settings

---

## Cross-Language Tasks

### 🔧 **P2: Architecture & Code Quality**
- [ ] **Clean up TypeScript warnings**
  - Remove unused private class members flagged by linter
  - Address remaining diagnostic issues
- [ ] **Symbol extraction architecture review**
  - Consider generalizing the SymbolInformation vs DocumentSymbol handling
  - Investigate if other LSP servers have similar format variations
  - Document LSP server compatibility patterns for future language additions

### 📚 **P3: Documentation & Examples**
- [ ] **Create comprehensive usage examples**
  - Example commands for each supported language
  - Integration examples with other tools
  - Performance optimization tips
- [ ] **LLM consumption documentation** (`--llm` flag usage)
- [ ] **Troubleshooting guide** for common issues per language

### 🧪 **P3: Testing Infrastructure**
- [ ] **Automated testing setup** for all language integrations
- [ ] **CI/CD pipeline** to validate language support across platforms
- [ ] **Performance benchmarking** across all supported languages

---

## Notes

### Implementation Priorities
1. **Python test fixtures** - Critical for production readiness
2. **Rust status verification** - Ensure recent implementation is solid
3. **Cross-platform testing** - Validate both new languages work everywhere
4. **Edge case testing** - Discover and fix any remaining compatibility issues

### Development Strategy
- **Complete Python test fixtures first** (highest impact, follows established Rust pattern)
- **Verify Rust implementation** before considering it fully complete
- **Focus on real-world usage patterns** rather than theoretical edge cases
- **Document all findings** for future Claude instances

### Success Criteria
- ✅ Both Python and Rust extract symbols accurately from diverse, real-world codebases
- ✅ Cross-platform compatibility verified on all major OS
- ✅ Performance acceptable for typical development workflows
- ✅ Clear documentation enables easy adoption by users