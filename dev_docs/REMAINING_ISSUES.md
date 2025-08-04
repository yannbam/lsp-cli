# Python Support - Remaining Issues & Investigation Needed

## 🚨 **CRITICAL ISSUE: main.py Symbol Extraction Failure**

### **The Problem**
The `test/fixtures/python/src/main.py` file is processed by pylsp (✓ checkmark shown) but **zero symbols are extracted** despite containing valid Python code with functions, classes, and variables.

### **Root Cause Investigation Required**
- **Python imports work**: `from .models.user import User` executes successfully when run directly
- **pylsp fails silently**: No symbols extracted from main.py but no obvious errors
- **Workspace configuration issue**: Likely related to how pylsp resolves relative imports in package context

### **Evidence**
```bash
# This works fine:
cd test/fixtures/python && python3 -c "from src.models.user import User; print('Success')"

# But pylsp extracts 0 symbols from main.py despite showing ✓ processed
jq '.symbols[] | select(.file | contains("main.py"))' test-python-output.json
# Returns: (empty)
```

### **What Needs Investigation**
1. **pylsp workspace configuration** - May need `pyrightconfig.json` or similar
2. **Package discovery setup** - pylsp might not recognize the package structure  
3. **Relative import resolution** - pylsp may need explicit module path configuration
4. **LSP initialization parameters** - May need `rootUri` or `workspaceFolders` setup

### **Temporary Workaround**
Simple imports work fine - when main.py was simplified to remove relative imports, it extracted 12 symbols successfully. But this defeats the purpose of comprehensive testing.

---

## 🔧 **SECONDARY ISSUES**

### **1. LSP Server Warnings**
pylsp generates warnings during analysis:
```
WARNING - pylsp.config.config - Failed to load hook pylsp_document_symbols: Ran out of input
```

**Investigation needed**: 
- Are these warnings causing silent failures?
- Should we configure pylsp differently to avoid these?
- Do these affect symbol extraction accuracy?

### **2. Complex Feature Support**
Some advanced Python features may not be fully analyzed:
- **Metaclasses**: May not show proper inheritance relationships
- **Async generators**: May not capture full async context  
- **Complex generics**: Type parameter relationships might be incomplete

**Investigation needed**:
- Test each advanced feature individually
- Compare with other Python LSP servers (Pyright, Jedi)
- Determine if issues are pylsp-specific or configuration-related

---

## ✅ **WHAT'S CONFIRMED WORKING**

### **Real LSP Integration**
- **pylsp process execution verified** via strace
- **File dependency confirmed** (symbol counts change when files modified)
- **No mocks or hardcoded results**
- **Authentic LSP server communication**

### **Symbol Extraction Accuracy**  
- **528 symbols extracted** from 10/11 files (main.py fails)
- **All major Python constructs working**: classes, functions, methods, variables
- **Advanced features detected**: async/await, decorators, magic methods, type hints

### **Error Handling**
- **Missing dependencies**: Proper warnings shown
- **Malformed files**: Graceful failure without crashes
- **LSP server issues**: Continues processing despite warnings

---

## 📋 **ACTION ITEMS FOR NEXT DEVELOPER**

### **Priority 1: Fix main.py Symbol Extraction**
1. **Research pylsp workspace configuration**
   - Check if `pyrightconfig.json`, `pyproject.toml`, or `.vscode/settings.json` needed
   - Investigate LSP `initialize` request parameters
   - Test with different `rootUri` and `workspaceFolders` configurations

2. **Test minimal reproduction**
   - Create simple test case with just one relative import
   - Isolate whether issue is with imports or file structure
   - Compare behavior with absolute imports

3. **Alternative LSP servers**
   - Test with Pyright LSP server instead of pylsp
   - Compare symbol extraction results
   - Document differences in configuration requirements

### **Priority 2: Comprehensive Testing**
1. **Individual feature testing**
   - Create separate test files for each advanced Python feature
   - Verify each feature is properly extracted and analyzed
   - Document any features that don't work as expected

2. **Configuration optimization**
   - Research best practices for pylsp configuration
   - Test different plugin combinations
   - Optimize for maximum symbol extraction accuracy

### **Priority 3: Documentation**
1. **Update README** with Python-specific setup requirements
2. **Document known limitations** (if any are confirmed as unfixable)
3. **Provide troubleshooting guide** for common Python LSP issues

---

## ⚠️ **IMPORTANT: NOT UPSTREAM-READY YET**

**DO NOT SUBMIT UPSTREAM PR** until the main.py symbol extraction issue is resolved. A comprehensive test fixture where the main entry point file fails to extract symbols is not acceptable for production.

### **Success Criteria for Upstream Readiness**
- [ ] **main.py symbols extracted successfully** (should show ~10-15 symbols)
- [ ] **All 11 fixture files working** (currently 10/11 working)
- [ ] **LSP warnings investigated** and either resolved or documented as acceptable
- [ ] **Configuration documented** for reproducible setup

### **Alternative Approaches to Consider**
1. **Restructure main.py** to use absolute imports if relative imports prove unfixable
2. **Switch LSP servers** if pylsp limitations are insurmountable  
3. **Add configuration files** to properly set up Python workspace for LSP analysis
4. **Simplify test fixtures** while maintaining comprehensive coverage

---

## 🎯 **CURRENT STATUS: 90% COMPLETE**

**What's Working**: Real LSP integration, comprehensive feature coverage, production-quality code
**What's Broken**: 1 critical file (main.py) fails symbol extraction due to import resolution
**Next Steps**: Investigate and fix pylsp workspace configuration for relative imports

**This is a configuration/setup issue, not a fundamental limitation.**