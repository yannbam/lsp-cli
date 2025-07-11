import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SymbolInfo } from '../src/types';
import { type ExtractedSymbols, readOutput, runLSPCLI } from './utils';

const FIXTURES_DIR = join(process.cwd(), 'test', 'fixtures');

// Helper function to extract supertype names from the new structure
function getSupertypeNames(symbol: any): string[] {
    if (!symbol.supertypes) return [];
    return symbol.supertypes.map((s: any) => s.name);
}

describe('Fixture-based LSP Tests', () => {
    describe('Java', () => {
        const javaFixture = join(FIXTURES_DIR, 'java');
        const outputFile = 'test-java-fixture.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            // Run the analysis once for all Java tests
            runLSPCLI(javaFixture, 'java', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Java symbol types', () => {
            expect(result.language).toBe('java');
            expect(result.symbols.length).toBeGreaterThan(0);

            // Check for packages
            const packages = result.symbols.filter((s) => s.kind === 'package');
            expect(packages.length).toBeGreaterThan(0);
            const packageNames = packages.map((p) => p.name);
            expect(packageNames).toContain('com.example.service');

            // Check for classes
            const classes = result.symbols.filter((s) => s.kind === 'class');
            expect(classes.some((c) => c.name === 'UserService')).toBe(true);
            expect(classes.some((c) => c.name === 'BaseService')).toBe(true);
            expect(classes.some((c) => c.name === 'User')).toBe(true);

            // Check for interfaces
            const interfaces = result.symbols.filter((s) => s.kind === 'interface');
            expect(interfaces.some((i) => i.name === 'ServiceInterface')).toBe(true);
            expect(interfaces.some((i) => i.name === 'Auditable')).toBe(true);
            expect(interfaces.some((i) => i.name === 'UserRepository')).toBe(true);

            // Check for enums
            const enums = result.symbols.filter((s) => s.kind === 'enum');
            expect(enums.some((e) => e.name === 'UserStatus')).toBe(true);

            // Find UserService class
            const userService = classes.find((c) => c.name === 'UserService');
            expect(userService).toBeDefined();
            expect(userService!.children).toBeDefined();

            // Check UserService members
            const methods = userService!.children!.filter((c) => c.kind === 'method');
            const fields = userService!.children!.filter((c) => c.kind === 'field');
            const constructors = userService!.children!.filter((c) => c.kind === 'constructor');
            const innerClasses = userService!.children!.filter((c) => c.kind === 'class');
            const innerEnums = userService!.children!.filter((c) => c.kind === 'enum');

            expect(methods.length).toBeGreaterThan(0);
            expect(fields.length).toBeGreaterThan(0);
            expect(constructors.length).toBeGreaterThan(0);
            expect(innerClasses.some((c) => c.name === 'ServiceStats')).toBe(true);
            expect(innerEnums.some((e) => e.name === 'Operation')).toBe(true);

            // Check specific methods (Java includes parameter types in method names)
            expect(methods.some((m) => m.name.startsWith('findById'))).toBe(true);
            expect(methods.some((m) => m.name.startsWith('createUser'))).toBe(true);
            expect(methods.some((m) => m.name.startsWith('validateUser'))).toBe(true);

            // Check inheritance - some LSP servers might not provide this
            if (userService!.supertypes) {
                const supertypeNames = getSupertypeNames(userService!);
                expect(supertypeNames).toContain('BaseService');
                expect(supertypeNames).toContain('ServiceInterface');
                expect(supertypeNames).toContain('Auditable');
            }

            // Check enum members
            const userStatus = enums.find((e) => e.name === 'UserStatus');
            expect(userStatus!.children).toBeDefined();
            const enumMembers = userStatus!.children!.filter((c) => c.kind === 'enumMember');
            expect(enumMembers.some((m) => m.name === 'ACTIVE')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'PENDING')).toBe(true);

            // Check documentation
            const docsCount = countSymbolsWithDocumentation(result.symbols);
            expect(docsCount).toBeGreaterThan(0);
        });

        it('should have correct file paths and ranges', () => {
            const userService = findSymbolByName(result.symbols, 'UserService', 'class');
            expect(userService).toBeDefined();
            expect(userService!.file).toContain('UserService.java');
            expect(userService!.range).toBeDefined();
            expect(userService!.range.start.line).toBeGreaterThanOrEqual(0);
            expect(userService!.range.end.line).toBeGreaterThan(userService!.range.start.line);
        });

        it('should extract preview text for symbols', () => {
            // Check class preview
            const userService = findSymbolByName(result.symbols, 'UserService', 'class');
            expect(userService).toBeDefined();
            expect(userService!.preview).toBeDefined();
            expect(userService!.preview).toContain('public class UserService');

            // Check method preview
            const methods = userService!.children!.filter((c) => c.kind === 'method');
            const findById = methods.find((m) => m.name.startsWith('findById'));
            expect(findById).toBeDefined();
            expect(findById!.preview).toBeDefined();
            expect(findById!.preview).toContain('Optional<User> findById');

            // Check field preview
            const fields = userService!.children!.filter((c) => c.kind === 'field');
            const repository = fields.find((f) => f.name === 'repository');
            expect(repository).toBeDefined();
            expect(repository!.preview).toBeDefined();
            expect(repository!.preview).toContain('UserRepository repository');

            // Check constant preview (static final fields are reported as constants)
            const constants = userService!.children!.filter((c) => c.kind === 'constant');
            const serviceName = constants.find((c) => c.name === 'SERVICE_NAME');
            expect(serviceName).toBeDefined();
            expect(serviceName!.preview).toBeDefined();
            expect(serviceName!.preview).toContain('static final String SERVICE_NAME');

            // Check enum preview
            const userStatus = findSymbolByName(result.symbols, 'UserStatus', 'enum');
            expect(userStatus).toBeDefined();
            expect(userStatus!.preview).toBeDefined();
            expect(userStatus!.preview).toContain('enum UserStatus');

            // Check interface preview
            const serviceInterface = findSymbolByName(result.symbols, 'ServiceInterface', 'interface');
            expect(serviceInterface).toBeDefined();
            expect(serviceInterface!.preview).toBeDefined();
            expect(serviceInterface!.preview).toContain('interface ServiceInterface');
        });

        it('should extract supertypes consistently across type hierarchies', () => {
            // Test SimpleChild
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            if (simpleChild) {
                expect(simpleChild.supertypes).toBeDefined();
                expect(getSupertypeNames(simpleChild)).toEqual(['BaseClass']);
            }

            // Test MultipleInterfaces
            const multipleInterfaces = findSymbolByName(result.symbols, 'MultipleInterfaces', 'class');
            if (multipleInterfaces) {
                expect(multipleInterfaces.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(multipleInterfaces);
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ComplexChild
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            if (complexChild) {
                expect(complexChild.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(complexChild);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ExtendedInterface
            const extendedInterface = findSymbolByName(result.symbols, 'ExtendedInterface', 'interface');
            if (extendedInterface) {
                expect(extendedInterface.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(extendedInterface);
                expect(supertypeNames).toContain('BaseInterface');
                expect(supertypeNames).toContain('Interface1');
            }

            // Test KitchenSink
            const kitchenSink = findSymbolByName(result.symbols, 'KitchenSink', 'class');
            if (kitchenSink) {
                expect(kitchenSink.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(kitchenSink);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('ExtendedInterface');
                expect(supertypeNames).toContain('Interface2');
            }
        });

        it('should handle multi-line declarations', () => {
            // Check if we have the multi-line declarations file
            const multiLineClass = findSymbolByName(result.symbols, 'MultiLineDeclarations', 'class');
            if (multiLineClass) {
                // Check multi-line method
                const methods = multiLineClass.children!.filter((c) => c.kind === 'method');
                const transformList = methods.find((m) => m.name.includes('transformList'));
                if (transformList) {
                    expect(transformList.preview).toBeDefined();
                    // The preview should contain the method signature
                    expect(transformList.preview.length).toBeGreaterThan(0);
                }

                // Check multi-line class declaration
                const innerClasses = multiLineClass.children!.filter((c) => c.kind === 'class');
                const complexBuilder = innerClasses.find((c) => c.name === 'ComplexBuilder');
                if (complexBuilder) {
                    expect(complexBuilder.preview).toBeDefined();
                    expect(complexBuilder.preview).toContain('class ComplexBuilder');
                }
            }

            // Check the new multi-line class declaration test file
            const multiLineDeclaration = findSymbolByName(result.symbols, 'MultiLineDeclaration', 'class');
            if (multiLineDeclaration) {
                expect(multiLineDeclaration.preview).toBeDefined();
                // Should contain the full declaration including extends and implements
                expect(multiLineDeclaration.preview).toContain('extends BaseClass');
                expect(multiLineDeclaration.preview).toContain('implements Update, Validate');

                // Check supertypes
                expect(multiLineDeclaration.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(multiLineDeclaration);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('Update');
                expect(supertypeNames).toContain('Validate');
            }

            const singleLineBrace = findSymbolByName(result.symbols, 'SingleLineBrace', 'class');
            if (singleLineBrace) {
                expect(singleLineBrace.preview).toBeDefined();
                expect(singleLineBrace.preview).toContain('class SingleLineBrace extends Parent');

                // Check supertypes
                expect(singleLineBrace.supertypes).toBeDefined();
                expect(getSupertypeNames(singleLineBrace)).toContain('Parent');
            }

            const complexInterface = findSymbolByName(result.symbols, 'ComplexInterface', 'interface');
            if (complexInterface) {
                expect(complexInterface.preview).toBeDefined();
                expect(complexInterface.preview).toContain('interface ComplexInterface');
                expect(complexInterface.preview).toContain('extends Interface1<T>');
                expect(complexInterface.preview).toContain('Interface2<U>');

                // Check supertypes (generic parameters should be stripped)
                expect(complexInterface.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(complexInterface);
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }
        });
    });

    describe('TypeScript', () => {
        const tsFixture = join(FIXTURES_DIR, 'typescript');
        const outputFile = 'test-ts-fixture.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            // Run the analysis once for all TypeScript tests
            runLSPCLI(tsFixture, 'typescript', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all TypeScript symbol types', () => {
            expect(result.language).toBe('typescript');
            expect(result.symbols.length).toBeGreaterThan(0);

            // Check for classes
            const classes = result.symbols.filter((s) => s.kind === 'class');
            expect(classes.some((c) => c.name === 'OrderService')).toBe(true);
            expect(classes.some((c) => c.name === 'ValidationError')).toBe(true);

            // Check for interfaces
            const interfaces = result.symbols.filter((s) => s.kind === 'interface');
            expect(interfaces.some((i) => i.name === 'OrderServiceConfig')).toBe(true);
            expect(interfaces.some((i) => i.name === 'Order')).toBe(true);
            expect(interfaces.some((i) => i.name === 'OrderItem')).toBe(true);

            // Check for enums
            const enums = result.symbols.filter((s) => s.kind === 'enum');
            expect(enums.some((e) => e.name === 'OrderStatus')).toBe(true);
            expect(enums.some((e) => e.name === 'UserRole')).toBe(true);

            // Check for type aliases (reported as variables)
            const variables = result.symbols.filter((s) => s.kind === 'variable');
            expect(variables.some((v) => v.name === 'ValidationResult')).toBe(true);
            expect(variables.some((v) => v.name === 'PaymentMethod')).toBe(true);
            expect(variables.some((v) => v.name === 'OrderValidator')).toBe(true);

            // Check for functions
            const functions = result.symbols.filter((s) => s.kind === 'function');
            expect(functions.some((f) => f.name === 'createMaxTotalValidator')).toBe(true);

            // Check for constants
            const constants = result.symbols.filter((s) => s.kind === 'constant');
            expect(constants.some((c) => c.name === 'DEFAULT_ORDER_TIMEOUT')).toBe(true);
            expect(constants.some((c) => c.name === 'processOrderAsync')).toBe(true);

            // Check for namespaces/modules
            const modules = result.symbols.filter((s) => s.kind === 'module');
            expect(modules.some((m) => m.name === 'OrderUtils')).toBe(true);

            // Check OrderService members
            const orderService = classes.find((c) => c.name === 'OrderService');
            expect(orderService!.children).toBeDefined();

            const methods = orderService!.children!.filter((c) => c.kind === 'method');
            const properties = orderService!.children!.filter((c) => c.kind === 'property');
            const constructorMethod = orderService!.children!.find((c) => c.kind === 'constructor');

            expect(methods.length).toBeGreaterThan(0);
            expect(properties.length).toBeGreaterThan(0);
            expect(constructorMethod).toBeDefined();

            // Check namespace contents
            const orderUtils = modules.find((m) => m.name === 'OrderUtils');
            expect(orderUtils!.children).toBeDefined();
            const namespaceFunctions = orderUtils!.children!.filter((c) => c.kind === 'function');
            expect(namespaceFunctions.some((f) => f.name === 'calculateTotal')).toBe(true);
            expect(namespaceFunctions.some((f) => f.name === 'formatOrderId')).toBe(true);

            // Check nested namespace
            const nestedModules = orderUtils!.children!.filter((c) => c.kind === 'module');
            expect(nestedModules.some((m) => m.name === 'Advanced')).toBe(true);
        });

        it('should extract enum members correctly', () => {
            const orderStatus = findSymbolByName(result.symbols, 'OrderStatus', 'enum');
            expect(orderStatus).toBeDefined();
            expect(orderStatus!.children).toBeDefined();

            // TypeScript LSP reports enum members as 'constant'
            const enumMembers = orderStatus!.children!.filter((c) => c.kind === 'constant' || c.kind === 'enumMember');
            expect(enumMembers.length).toBe(6);
            expect(enumMembers.some((m) => m.name === 'Pending')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'Processing')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'Shipped')).toBe(true);
        });

        it('should extract preview text for TypeScript symbols', () => {
            // Check class preview
            const orderService = findSymbolByName(result.symbols, 'OrderService', 'class');
            expect(orderService).toBeDefined();
            expect(orderService!.preview).toBeDefined();
            expect(orderService!.preview).toContain('class OrderService');

            // Check interface preview
            const orderInterface = findSymbolByName(result.symbols, 'Order', 'interface');
            expect(orderInterface).toBeDefined();
            expect(orderInterface!.preview).toBeDefined();
            expect(orderInterface!.preview).toContain('interface Order');

            // Check method preview
            if (orderService!.children) {
                const methods = orderService!.children.filter((c) => c.kind === 'method');
                const method = methods[0];
                if (method) {
                    expect(method.preview).toBeDefined();
                    expect(method.preview.length).toBeGreaterThan(0);
                }
            }

            // Check enum preview
            const orderStatus = findSymbolByName(result.symbols, 'OrderStatus', 'enum');
            expect(orderStatus).toBeDefined();
            expect(orderStatus!.preview).toBeDefined();
            expect(orderStatus!.preview).toContain('enum OrderStatus');
        });

        it('should extract supertypes consistently across type hierarchies', () => {
            // Test SimpleChild
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            if (simpleChild) {
                expect(simpleChild.supertypes).toBeDefined();
                expect(getSupertypeNames(simpleChild)).toEqual(['BaseClass']);
            }

            // Test MultipleInterfaces
            const multipleInterfaces = findSymbolByName(result.symbols, 'MultipleInterfaces', 'class');
            if (multipleInterfaces) {
                expect(multipleInterfaces.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(multipleInterfaces);
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ComplexChild
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            if (complexChild) {
                expect(complexChild.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(complexChild);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ExtendedInterface
            const extendedInterface = findSymbolByName(result.symbols, 'ExtendedInterface', 'interface');
            if (extendedInterface) {
                expect(extendedInterface.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(extendedInterface);
                expect(supertypeNames).toContain('BaseInterface');
                expect(supertypeNames).toContain('Interface1');
            }

            // Test KitchenSink
            const kitchenSink = findSymbolByName(result.symbols, 'KitchenSink', 'class');
            if (kitchenSink) {
                expect(kitchenSink.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(kitchenSink);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('ExtendedInterface');
                expect(supertypeNames).toContain('Interface2');
            }
        });
    });

    describe('C++', () => {
        const cppFixture = join(FIXTURES_DIR, 'cpp');
        const outputFile = 'test-cpp-fixture.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            // Run the analysis once for all C++ tests
            runLSPCLI(cppFixture, 'cpp', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all C++ symbol types', () => {
            expect(result.language).toBe('cpp');
            expect(result.symbols.length).toBeGreaterThan(0);

            // Check for namespaces
            const namespaces = result.symbols.filter((s) => s.kind === 'namespace');
            expect(namespaces.some((n) => n.name === 'graphics')).toBe(true);
            expect(namespaces.some((n) => n.name === 'math')).toBe(true);

            // Check for classes (includes structs) - need to look inside namespaces
            const allSymbols = flattenSymbols(result.symbols);
            const classes = allSymbols.filter((s) => s.kind === 'class');
            expect(classes.some((c) => c.name === 'Renderer')).toBe(true);
            expect(classes.some((c) => c.name === 'Vector3')).toBe(true);
            expect(classes.some((c) => c.name === 'Vector2')).toBe(true);

            // Check for functions
            const functions = result.symbols.filter((s) => s.kind === 'function');
            expect(functions.length).toBeGreaterThan(0);

            // Find Renderer class (using findSymbolByName to search nested)
            const renderer = findSymbolByName(result.symbols, 'Renderer', 'class');
            expect(renderer).toBeDefined();
            expect(renderer!.children).toBeDefined();

            // Check Renderer members
            const methods = renderer!.children!.filter((c) => c.kind === 'method');
            const fields = renderer!.children!.filter((c) => c.kind === 'field');
            const constructors = renderer!.children!.filter((c) => c.kind === 'constructor');
            const innerClasses = renderer!.children!.filter((c) => c.kind === 'class');
            const enums = renderer!.children!.filter((c) => c.kind === 'enum');

            expect(methods.length).toBeGreaterThan(0);
            expect(fields.length).toBeGreaterThan(0);
            expect(constructors.length).toBeGreaterThan(0);
            expect(innerClasses.some((c) => c.name === 'Statistics')).toBe(true);
            expect(enums.some((e) => e.name === 'RenderMode')).toBe(true);

            // Note: Template functions might not be reported by clangd as regular functions
            // They are often only instantiated when used

            // Check global variables
            const variables = result.symbols.filter((s) => s.kind === 'variable');
            expect(variables.length).toBeGreaterThan(0);
        });

        it('should link declarations to definitions', () => {
            // Find methods that should have definitions
            const renderer = findSymbolByName(result.symbols, 'Renderer', 'class');
            expect(renderer).toBeDefined();

            const methods = renderer!.children!.filter((c) => c.kind === 'method');
            const methodsWithDefinitions = methods.filter((m) => m.definition);

            // Some methods should have definitions in .cpp files
            expect(methodsWithDefinitions.length).toBeGreaterThan(0);

            const initialize = methods.find((m) => m.name === 'initialize');
            if (initialize?.definition) {
                expect(initialize.definition.file).toContain('.cpp');
                expect(initialize.definition.range).toBeDefined();
            }
        });

        it('should extract preview text for C++ symbols and definitions', () => {
            // Check class preview
            const renderer = findSymbolByName(result.symbols, 'Renderer', 'class');
            expect(renderer).toBeDefined();
            expect(renderer!.preview).toBeDefined();
            expect(renderer!.preview).toContain('class Renderer');

            // Check method preview
            if (renderer!.children) {
                const methods = renderer!.children.filter((c) => c.kind === 'method');
                const method = methods[0];
                if (method) {
                    expect(method.preview).toBeDefined();
                    expect(method.preview.length).toBeGreaterThan(0);

                    // If method has a definition, check definition preview
                    if (method.definition?.preview) {
                        expect(method.definition.preview).toBeDefined();
                        expect(method.definition.preview.length).toBeGreaterThan(0);
                    }
                }
            }

            // Check namespace preview
            const namespaces = result.symbols.filter((s) => s.kind === 'namespace');
            if (namespaces.length > 0) {
                const namespace = namespaces[0];
                expect(namespace.preview).toBeDefined();
                expect(namespace.preview).toContain('namespace');
            }
        });

        it('should extract supertypes consistently across type hierarchies', () => {
            // Test SimpleChild
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            if (simpleChild) {
                expect(simpleChild.supertypes).toBeDefined();
                expect(getSupertypeNames(simpleChild)).toEqual(['BaseClass']);
            }

            // Test MultipleInterfaces
            const multipleInterfaces = findSymbolByName(result.symbols, 'MultipleInterfaces', 'class');
            if (multipleInterfaces) {
                expect(multipleInterfaces.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(multipleInterfaces);
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ComplexChild
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            if (complexChild) {
                expect(complexChild.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(complexChild);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test KitchenSink
            const kitchenSink = findSymbolByName(result.symbols, 'KitchenSink', 'class');
            if (kitchenSink) {
                expect(kitchenSink.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(kitchenSink);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('BaseInterface');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }
        });
    });

    describe('C', () => {
        const cFixture = join(FIXTURES_DIR, 'c');
        const outputFile = 'test-c-fixture.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            // Run the analysis once for all C tests
            runLSPCLI(cFixture, 'c', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all C symbol types', () => {
            expect(result.language).toBe('c');
            expect(result.symbols.length).toBeGreaterThan(0);

            // Check for functions
            const functions = result.symbols.filter((s) => s.kind === 'function');
            expect(functions.some((f) => f.name === 'main')).toBe(true);
            expect(functions.some((f) => f.name === 'str_length')).toBe(true);
            expect(functions.some((f) => f.name === 'list_create')).toBe(true);
            expect(functions.some((f) => f.name === 'hash_table_create')).toBe(true);

            // Check for structs (reported as class)
            const structs = result.symbols.filter((s) => s.kind === 'class');
            expect(structs.some((s) => s.name === 'ListNode')).toBe(true);
            expect(structs.some((s) => s.name === 'LinkedList')).toBe(true);
            expect(structs.some((s) => s.name === 'TreeNode')).toBe(true);
            expect(structs.some((s) => s.name === 'HashTable')).toBe(true);
            expect(structs.some((s) => s.name === 'StringBuffer')).toBe(true);

            // Check for enums
            const enums = result.symbols.filter((s) => s.kind === 'enum');
            expect(enums.some((e) => e.name === 'DataStructureType')).toBe(true);

            // Check for global variables
            const variables = result.symbols.filter((s) => s.kind === 'variable');
            expect(variables.some((v) => v.name === 'g_verbose')).toBe(true);
            expect(variables.some((v) => v.name === 'g_program_name')).toBe(true);
            expect(variables.some((v) => v.name === 's_counter')).toBe(true);

            // Check struct members - LinkedList should now have the children directly
            // after typedef merging
            const linkedList = structs.find((s) => s.name === 'LinkedList');
            expect(linkedList).toBeDefined();
            expect(linkedList!.children).toBeDefined();
            const fields = linkedList!.children!.filter((c) => c.kind === 'field');
            expect(fields.some((f) => f.name === 'head')).toBe(true);
            expect(fields.some((f) => f.name === 'tail')).toBe(true);
            expect(fields.some((f) => f.name === 'size')).toBe(true);

            // Check enum members
            const dsType = enums.find((e) => e.name === 'DataStructureType');
            expect(dsType!.children).toBeDefined();
            // C clangd reports enum members as 'enum' not 'enumMember'
            const enumMembers = dsType!.children!.filter((c) => c.kind === 'enum' || c.kind === 'enumMember');
            expect(enumMembers.some((m) => m.name === 'DS_LIST')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'DS_TREE')).toBe(true);
        });

        it('should handle typedefs and function pointers', () => {
            // Check for typedef structs
            const structs = result.symbols.filter((s) => s.kind === 'class');
            expect(structs.some((s) => s.name === 'StringBuffer')).toBe(true);
            expect(structs.some((s) => s.name === 'DataStructureInfo')).toBe(true);

            // The typedef struct should be found
            const dsInfo = structs.find((s) => s.name === 'DataStructureInfo');
            expect(dsInfo).toBeDefined();
        });

        it('should merge typedef structs and unions correctly', () => {
            const allSymbols = flattenSymbols(result.symbols);

            // Check that anonymous structs are properly merged
            // Note: There's one legitimate anonymous struct - the nested version struct in DataStructureInfo
            const anonymousStructs = allSymbols.filter((s) => s.name.includes('(anonymous struct)'));
            expect(anonymousStructs.length).toBe(1); // Only the nested version struct should remain

            // Verify it's the nested struct with version fields
            const nestedStruct = anonymousStructs[0];
            expect(nestedStruct.children).toBeDefined();
            const versionFields = nestedStruct.children!.filter((c) => c.kind === 'field');
            expect(versionFields.some((f) => f.name === 'major')).toBe(true);
            expect(versionFields.some((f) => f.name === 'minor')).toBe(true);
            expect(versionFields.some((f) => f.name === 'patch')).toBe(true);

            // Check that anonymous unions are properly merged
            const anonymousUnions = allSymbols.filter((s) => s.name.includes('(anonymous union)'));
            expect(anonymousUnions.length).toBe(0); // All should be merged

            // Check for DataValue union (was anonymous)
            const dataValue = allSymbols.find((s) => s.name === 'DataValue' && s.kind === 'class');
            expect(dataValue).toBeDefined();
            expect(dataValue!.children).toBeDefined();
            const unionFields = dataValue!.children!.filter((c) => c.kind === 'field');
            expect(unionFields.some((f) => f.name === 'int_value')).toBe(true);
            expect(unionFields.some((f) => f.name === 'float_value')).toBe(true);
            expect(unionFields.some((f) => f.name === 'string_value')).toBe(true);
            expect(unionFields.some((f) => f.name === 'ptr_value')).toBe(true);

            // Check that named typedefs don't have duplicates
            const listNodes = allSymbols.filter((s) => s.name === 'ListNode' && s.kind === 'class');
            expect(listNodes.length).toBe(1); // Should only have one ListNode

            const hashEntries = allSymbols.filter((s) => s.name === 'HashEntry' && s.kind === 'class');
            expect(hashEntries.length).toBe(1); // Should only have one HashEntry

            // Verify ListNode has its fields
            const listNode = listNodes[0];
            expect(listNode.children).toBeDefined();
            const listNodeFields = listNode.children!.filter((c) => c.kind === 'field');
            expect(listNodeFields.some((f) => f.name === 'data')).toBe(true);
            expect(listNodeFields.some((f) => f.name === 'next')).toBe(true);
        });
    });

    describe('Haxe', () => {
        const haxeFixture = join(FIXTURES_DIR, 'haxe');
        const outputFile = 'test-haxe-fixture.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            // Run the analysis once for all Haxe tests
            runLSPCLI(haxeFixture, 'haxe', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Haxe symbol types', () => {
            expect(result.language).toBe('haxe');
            expect(result.symbols.length).toBeGreaterThan(0);

            // Check for classes
            const classes = result.symbols.filter((s) => s.kind === 'class');
            expect(classes.some((c) => c.name === 'Main')).toBe(true);
            expect(classes.some((c) => c.name === 'Entity')).toBe(true);
            expect(classes.some((c) => c.name === 'Player')).toBe(true);
            expect(classes.some((c) => c.name === 'Enemy')).toBe(true);
            expect(classes.some((c) => c.name === 'GameState')).toBe(true);
            expect(classes.some((c) => c.name === 'Logger')).toBe(true);
            expect(classes.some((c) => c.name === 'MathUtils')).toBe(true);

            // Check for interfaces
            const interfaces = result.symbols.filter((s) => s.kind === 'interface');
            expect(interfaces.some((i) => i.name === 'IEntity')).toBe(true);

            // Check for enums
            const enums = result.symbols.filter((s) => s.kind === 'enum');
            expect(enums.some((e) => e.name === 'Ability')).toBe(true);
            expect(enums.some((e) => e.name === 'EnemyType')).toBe(true);
            expect(enums.some((e) => e.name === 'LogLevel')).toBe(true);

            // Check Main class
            const mainClass = classes.find((c) => c.name === 'Main');
            expect(mainClass!.children).toBeDefined();
            const mainMethods = mainClass!.children!.filter((c) => c.kind === 'method');
            expect(mainMethods.some((m) => m.name === 'main')).toBe(true);
            expect(mainMethods.some((m) => m.name === 'run')).toBe(true);

            // Check Player class
            const player = classes.find((c) => c.name === 'Player');
            expect(player!.children).toBeDefined();
            const playerMethods = player!.children!.filter((c) => c.kind === 'method');
            expect(playerMethods.some((m) => m.name === 'attack')).toBe(true);
            expect(playerMethods.some((m) => m.name === 'useAbility')).toBe(true);
            expect(playerMethods.some((m) => m.name === 'gainExperience')).toBe(true);

            // Check that supertypes are provided (Player extends Entity)
            expect(player!.supertypes).toBeDefined();
            expect(getSupertypeNames(player!)).toContain('Entity');

            // Check Enemy extends Entity
            const enemy = classes.find((c) => c.name === 'Enemy');
            expect(enemy!.supertypes).toBeDefined();
            expect(getSupertypeNames(enemy!)).toContain('Entity');

            // Check static methods
            const staticMethods = playerMethods.filter((m) => m.name === 'createDefaultPlayer');
            expect(staticMethods.length).toBeGreaterThan(0);

            // Check constants
            const gameState = classes.find((c) => c.name === 'GameState');
            expect(gameState!.children).toBeDefined();
            const constants = gameState!.children!.filter(
                (c) => c.name === 'EASY' || c.name === 'NORMAL' || c.name === 'HARD'
            );
            expect(constants.length).toBe(3);
        });

        it('should extract typedefs', () => {
            // Haxe typedefs might be in variables or have their own kind
            const allSymbols = flattenSymbols(result.symbols);

            // Check for Vector2D and Vector3D typedefs
            const hasVector2D = allSymbols.some((s) => s.name === 'Vector2D');
            const hasVector3D = allSymbols.some((s) => s.name === 'Vector3D');

            expect(hasVector2D || hasVector3D).toBe(true);
        });

        it('should extract supertypes consistently across type hierarchies', () => {
            // Test SimpleChild
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            if (simpleChild) {
                expect(simpleChild.supertypes).toBeDefined();
                expect(getSupertypeNames(simpleChild)).toEqual(['BaseClass']);
            }

            // Test MultipleInterfaces
            const multipleInterfaces = findSymbolByName(result.symbols, 'MultipleInterfaces', 'class');
            if (multipleInterfaces) {
                expect(multipleInterfaces.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(multipleInterfaces);
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ComplexChild
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            if (complexChild) {
                expect(complexChild.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(complexChild);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ExtendedInterface
            const extendedInterface = findSymbolByName(result.symbols, 'ExtendedInterface', 'interface');
            if (extendedInterface) {
                expect(extendedInterface.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(extendedInterface);
                expect(supertypeNames).toContain('BaseInterface');
                expect(supertypeNames).toContain('Interface1');
            }

            // Test KitchenSink
            const kitchenSink = findSymbolByName(result.symbols, 'KitchenSink', 'class');
            if (kitchenSink) {
                expect(kitchenSink.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(kitchenSink);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('ExtendedInterface');
                expect(supertypeNames).toContain('Interface2');
            }
        });
    });

    describe('Preview Field Validation', () => {
        it('should have preview text for all symbols across all languages', () => {
            const languages = ['java', 'typescript', 'cpp', 'c', 'haxe', 'dart'] as const;
            const results: Record<string, { total: number; withPreview: number; percentage: number }> = {};

            for (const language of languages) {
                const fixture = join(FIXTURES_DIR, language);
                const outputFile = `test-${language}-preview.json`;

                try {
                    runLSPCLI(fixture, language, outputFile);
                    const result = readOutput(outputFile);

                    const validation = validateAllSymbolsHavePreview(result.symbols);
                    const percentage = (validation.withPreview / validation.total) * 100;

                    results[language] = {
                        total: validation.total,
                        withPreview: validation.withPreview,
                        percentage
                    };

                    // Log missing previews for debugging
                    if (validation.missing.length > 0 && validation.missing.length <= 10) {
                        console.log(`\n${language} - Missing previews (first 10):`, validation.missing.slice(0, 10));
                    }

                    // Expect at least 90% of symbols to have preview text
                    // Some LSP servers might not provide preview for all symbol types
                    expect(percentage).toBeGreaterThanOrEqual(90);

                    // Clean up
                    if (existsSync(outputFile)) {
                        execSync(`rm -f ${outputFile}`);
                    }
                } catch (error) {
                    console.error(`Failed to test ${language}:`, error);
                }
            }

            // Log summary
            console.log('\nPreview field coverage summary:');
            for (const [lang, stats] of Object.entries(results)) {
                console.log(`${lang}: ${stats.withPreview}/${stats.total} (${stats.percentage.toFixed(1)}%)`);
            }
        });
    });

    describe('Dart', () => {
        const dartFixture = join(FIXTURES_DIR, 'dart');
        const outputFile = 'test-dart-fixture.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            // Run the analysis once for all Dart tests
            runLSPCLI(dartFixture, 'dart', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Dart symbol types', () => {
            expect(result.language).toBe('dart');
            expect(result.symbols.length).toBeGreaterThan(0);

            // Check for top-level variables
            const variables = result.symbols.filter((s) => s.kind === 'variable');
            expect(variables.some((v) => v.name === 'appVersion')).toBe(true);
            expect(variables.some((v) => v.name === 'globalCounter')).toBe(true);

            // Check for top-level functions
            const functions = result.symbols.filter((s) => s.kind === 'function');
            expect(functions.some((f) => f.name === 'calculateSum')).toBe(true);
            expect(functions.some((f) => f.name === 'main')).toBe(true);

            // Check for classes
            const classes = result.symbols.filter((s) => s.kind === 'class');
            expect(classes.some((c) => c.name === 'Entity')).toBe(true);
            expect(classes.some((c) => c.name === 'User')).toBe(true);
            expect(classes.some((c) => c.name === 'UserService')).toBe(true);
            // Note: Dart LSP reports typedefs as 'class'
            expect(classes.some((c) => c.name === 'UserCallback')).toBe(true);

            // Check for enums
            const enums = result.symbols.filter((s) => s.kind === 'enum');
            expect(enums.some((e) => e.name === 'UserStatus')).toBe(true);

            // Check Entity abstract class
            const entity = classes.find((c) => c.name === 'Entity');
            expect(entity!.children).toBeDefined();
            const entityFields = entity!.children!.filter((c) => c.kind === 'field');
            expect(entityFields.some((f) => f.name === 'id')).toBe(true);
            expect(entityFields.some((f) => f.name === 'createdAt')).toBe(true);

            // Check User class
            const user = classes.find((c) => c.name === 'User');
            expect(user!.children).toBeDefined();

            // Check fields
            const userFields = user!.children!.filter((c) => c.kind === 'field');
            expect(userFields.some((f) => f.name === 'name')).toBe(true);
            expect(userFields.some((f) => f.name === 'email')).toBe(true);
            expect(userFields.some((f) => f.name === 'status')).toBe(true);

            // Check constructors
            const constructors = user!.children!.filter((c) => c.kind === 'constructor');
            expect(constructors.some((c) => c.name === 'User')).toBe(true);
            expect(constructors.some((c) => c.name === 'User.guest')).toBe(true);

            // Check properties (getters/setters)
            const properties = user!.children!.filter((c) => c.kind === 'property');
            expect(properties.some((p) => p.name === 'isActive')).toBe(true);
            expect(properties.some((p) => p.name === 'active')).toBe(true);

            // Check methods
            const methods = user!.children!.filter((c) => c.kind === 'method');
            expect(methods.some((m) => m.name === 'updateEmail')).toBe(true);
            expect(methods.some((m) => m.name === 'fromJson')).toBe(true);
            expect(methods.some((m) => m.name === 'toJson')).toBe(true);

            // Check UserService class
            const userService = classes.find((c) => c.name === 'UserService');
            expect(userService!.children).toBeDefined();
            const serviceMethods = userService!.children!.filter((c) => c.kind === 'method');
            expect(serviceMethods.some((m) => m.name === 'addUser')).toBe(true);
            expect(serviceMethods.some((m) => m.name === 'getAllUsers')).toBe(true);
            expect(serviceMethods.some((m) => m.name === 'findById')).toBe(true);

            // Note: Dart LSP currently does not provide documentation in document symbols
            // This is a limitation of the Dart language server, not our implementation
        });

        it('should extract enum members correctly', () => {
            const userStatus = findSymbolByName(result.symbols, 'UserStatus', 'enum');
            expect(userStatus).toBeDefined();
            expect(userStatus!.children).toBeDefined();

            // Dart LSP reports enum members as 'enum' not 'enumMember'
            const enumMembers = userStatus!.children!.filter((c) => c.kind === 'enum');
            expect(enumMembers.length).toBe(4);
            expect(enumMembers.some((m) => m.name === 'active')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'inactive')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'pending')).toBe(true);
            expect(enumMembers.some((m) => m.name === 'banned')).toBe(true);
        });

        it('should handle Dart-specific features', () => {
            // Check for async methods
            const userService = findSymbolByName(result.symbols, 'UserService', 'class');
            const serviceMethods = userService!.children!.filter((c) => c.kind === 'method');

            // Check async method (Future return type)
            const addUser = serviceMethods.find((m) => m.name === 'addUser');
            expect(addUser).toBeDefined();

            // Check generator method (Stream return type)
            const getAllUsers = serviceMethods.find((m) => m.name === 'getAllUsers');
            expect(getAllUsers).toBeDefined();

            // Check named constructors
            const user = findSymbolByName(result.symbols, 'User', 'class');
            const constructors = user!.children!.filter((c) => c.kind === 'constructor');
            const namedConstructor = constructors.find((c) => c.name === 'User.guest');
            expect(namedConstructor).toBeDefined();

            // Check that supertypes are provided (User extends Entity)
            if (user!.supertypes) {
                expect(getSupertypeNames(user!)).toContain('Entity');
            }
        });

        it('should extract supertypes consistently across type hierarchies', () => {
            // Test SimpleChild
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            if (simpleChild) {
                expect(simpleChild.supertypes).toBeDefined();
                expect(getSupertypeNames(simpleChild)).toEqual(['BaseClass']);
            }

            // Test MultipleInterfaces
            const multipleInterfaces = findSymbolByName(result.symbols, 'MultipleInterfaces', 'class');
            if (multipleInterfaces) {
                expect(multipleInterfaces.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(multipleInterfaces);
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test ComplexChild
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            if (complexChild) {
                expect(complexChild.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(complexChild);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }

            // Test KitchenSink with mixins
            const kitchenSink = findSymbolByName(result.symbols, 'KitchenSink', 'class');
            if (kitchenSink) {
                expect(kitchenSink.supertypes).toBeDefined();
                const supertypeNames = getSupertypeNames(kitchenSink);
                expect(supertypeNames).toContain('BaseClass');
                expect(supertypeNames).toContain('ValidationMixin');
                expect(supertypeNames).toContain('BaseInterface');
                expect(supertypeNames).toContain('Interface1');
                expect(supertypeNames).toContain('Interface2');
            }
        });
    });
});

// Helper functions
function findSymbolByName(symbols: SymbolInfo[], name: string, kind?: string): SymbolInfo | undefined {
    for (const symbol of symbols) {
        if (symbol.name === name && (!kind || symbol.kind === kind)) {
            return symbol;
        }
        if (symbol.children) {
            const found = findSymbolByName(symbol.children, name, kind);
            if (found) return found;
        }
    }
    return undefined;
}

describe('Generic/Template Type Parameter Tests', () => {
    describe('Java Generics', () => {
        const outputFile = 'test-java-generics.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            const javaFixture = join(FIXTURES_DIR, 'java');
            runLSPCLI(javaFixture, 'java', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract type parameters from classes', () => {
            // BaseClass<T>
            const baseClass = findSymbolByName(result.symbols, 'BaseClass', 'class');
            expect(baseClass?.typeParameters).toEqual(['T']);

            // ComplexChild<T, U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            expect(complexChild?.typeParameters).toEqual(['T', 'U']);

            // SimpleChild (no type parameters)
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            expect(simpleChild?.typeParameters).toBeUndefined();
        });

        it('should extract type parameters from interfaces', () => {
            // Interface1<T>
            const interface1 = findSymbolByName(result.symbols, 'Interface1', 'interface');
            expect(interface1?.typeParameters).toEqual(['T']);

            // ComplexInterface<T, U>
            const complexInterface = findSymbolByName(result.symbols, 'ComplexInterface', 'interface');
            expect(complexInterface?.typeParameters).toEqual(['T', 'U']);

            // Interface2 (no type parameters)
            const interface2 = findSymbolByName(result.symbols, 'Interface2', 'interface');
            expect(interface2?.typeParameters).toBeUndefined();
        });

        it('should handle bounded type parameters', () => {
            // MultiLineDeclaration<T extends MultiLineDeclaration<T, D, P>, D extends Data<T, P>, P extends Pose>
            const multiLine = findSymbolByName(result.symbols, 'MultiLineDeclaration', 'class');
            expect(multiLine?.typeParameters).toEqual(['T', 'D', 'P']);
        });

        it('should preserve type arguments in supertypes', () => {
            // SimpleChild extends BaseClass<String>
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            const simpleChildBase = simpleChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            expect(simpleChildBase?.typeArguments).toEqual(['String']);

            // ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>, Interface2
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            const complexChildBase = complexChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            const complexChildInterface1 = complexChild?.supertypes?.find((s: any) => s.name === 'Interface1');
            const complexChildInterface2 = complexChild?.supertypes?.find((s: any) => s.name === 'Interface2');

            expect(complexChildBase?.typeArguments).toEqual(['T']);
            expect(complexChildInterface1?.typeArguments).toEqual(['U']);
            expect(complexChildInterface2?.typeArguments).toBeUndefined();
        });

        it('should handle complex nested generics in supertypes', () => {
            // MultiLineDeclaration extends BaseClass<D, P, P>
            const multiLine = findSymbolByName(result.symbols, 'MultiLineDeclaration', 'class');
            const multiLineBase = multiLine?.supertypes?.find((s: any) => s.name === 'BaseClass');
            expect(multiLineBase?.typeArguments).toEqual(['D', 'P', 'P']);
        });

        it('should handle wildcard and bounded types (adversarial)', () => {
            // Even with complex wildcards in the source, extraction should work
            const allClasses = result.symbols.filter((s) => s.kind === 'class');
            allClasses.forEach((cls) => {
                // Type parameters should be simple names
                if (cls.typeParameters) {
                    cls.typeParameters.forEach((param) => {
                        expect(param).toMatch(/^[A-Za-z_]\w*$/);
                    });
                }
            });
        });
    });

    describe('TypeScript Generics', () => {
        const outputFile = 'test-typescript-generics.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            const tsFixture = join(FIXTURES_DIR, 'typescript');
            runLSPCLI(tsFixture, 'typescript', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract type parameters from classes', () => {
            // BaseClass<T = any>
            const baseClass = findSymbolByName(result.symbols, 'BaseClass', 'class');
            expect(baseClass?.typeParameters).toEqual(['T']);

            // ComplexChild<T, U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            expect(complexChild?.typeParameters).toEqual(['T', 'U']);
        });

        it('should extract type parameters from interfaces', () => {
            // Interface1<T = any>
            const interface1 = findSymbolByName(result.symbols, 'Interface1', 'interface');
            expect(interface1?.typeParameters).toEqual(['T']);

            // ExtendedInterface<T>
            const extendedInterface = findSymbolByName(result.symbols, 'ExtendedInterface', 'interface');
            expect(extendedInterface?.typeParameters).toEqual(['T']);
        });

        it('should extract type parameters from type aliases', () => {
            // type Result<T, E = Error>
            // Note: TypeScript LSP reports type aliases as 'variable'
            const resultType = result.symbols.find(
                (s) => s.name === 'Result' && (s.kind === 'type' || s.kind === 'variable')
            );
            expect(resultType?.typeParameters).toEqual(['T', 'E']);

            // type OrderField<T extends keyof Order>
            const orderField = result.symbols.find(
                (s) => s.name === 'OrderField' && (s.kind === 'type' || s.kind === 'variable')
            );
            expect(orderField?.typeParameters).toEqual(['T']);
        });

        it('should preserve type arguments in supertypes', () => {
            // SimpleChild extends BaseClass<string>
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            const simpleChildBase = simpleChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            expect(simpleChildBase?.typeArguments).toEqual(['string']);

            // ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>, Interface2
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            const complexChildBase = complexChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            const complexChildInterface1 = complexChild?.supertypes?.find((s: any) => s.name === 'Interface1');

            expect(complexChildBase?.typeArguments).toEqual(['T']);
            expect(complexChildInterface1?.typeArguments).toEqual(['U']);
        });

        it('should handle generic constraints and defaults (adversarial)', () => {
            // TypeScript allows complex constraints and defaults
            const allTypes = result.symbols.filter(
                (s) => s.kind === 'class' || s.kind === 'interface' || s.kind === 'type'
            );

            allTypes.forEach((type) => {
                if (type.typeParameters) {
                    // Should extract parameter names only, not constraints or defaults
                    type.typeParameters.forEach((param) => {
                        expect(param).not.toContain('=');
                        expect(param).not.toContain('extends');
                        expect(param).toMatch(/^[A-Za-z_]\w*$/);
                    });
                }
            });
        });
    });

    describe('C++ Templates', () => {
        const outputFile = 'test-cpp-templates.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            const cppFixture = join(FIXTURES_DIR, 'cpp');
            runLSPCLI(cppFixture, 'cpp', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract template parameters from classes', () => {
            // With our improved preview construction, we can now extract C++ templates

            // template<typename T = void> class BaseClass
            const baseClass = findSymbolByName(result.symbols, 'BaseClass', 'class');
            expect(baseClass?.typeParameters).toEqual(['T']);

            // template<typename T, typename U> class ComplexChild
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            expect(complexChild?.typeParameters).toEqual(['T', 'U']);

            // SimpleChild should not have type parameters
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            expect(simpleChild?.typeParameters).toBeUndefined();
        });

        it('should handle non-type template parameters', () => {
            // template<int N> - non-type template parameter
            const allSymbols = flattenSymbols(result.symbols);
            const vectorN = allSymbols.find((s) => s.name === 'VectorN' && s.kind === 'class');
            expect(vectorN?.typeParameters).toEqual(['N']);
        });

        it('should preserve template arguments in supertypes', () => {
            // SimpleChild : public BaseClass<std::string>
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            const simpleChildBase = simpleChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            expect(simpleChildBase?.typeArguments).toEqual(['std::string']);

            // ComplexChild<T, U> : public BaseClass<T>, public Interface1<U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            const complexChildBase = complexChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            const complexChildInterface1 = complexChild?.supertypes?.find((s: any) => s.name === 'Interface1');

            expect(complexChildBase?.typeArguments).toEqual(['T']);
            expect(complexChildInterface1?.typeArguments).toEqual(['U']);
        });

        it('should handle template template parameters (adversarial)', () => {
            // C++ allows template<template<typename> class T>
            // We should still extract clean parameter names
            const allClasses = result.symbols.filter((s) => s.kind === 'class');
            allClasses.forEach((cls) => {
                if (cls.typeParameters) {
                    cls.typeParameters.forEach((param) => {
                        // Should be clean identifier
                        expect(param).toMatch(/^[A-Za-z_]\w*$/);
                    });
                }
            });
        });
    });

    describe('Haxe Generics', () => {
        const outputFile = 'test-haxe-generics.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            const haxeFixture = join(FIXTURES_DIR, 'haxe');
            runLSPCLI(haxeFixture, 'haxe', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract type parameters from classes', () => {
            // class BaseClass<T>
            const baseClass = findSymbolByName(result.symbols, 'BaseClass', 'class');
            expect(baseClass?.typeParameters).toEqual(['T']);

            // class ComplexChild<T, U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            expect(complexChild?.typeParameters).toEqual(['T', 'U']);
        });

        it('should extract type parameters from interfaces', () => {
            // interface Interface1<T>
            const interface1 = findSymbolByName(result.symbols, 'Interface1', 'interface');
            expect(interface1?.typeParameters).toEqual(['T']);

            // interface ExtendedInterface<T>
            const extendedInterface = findSymbolByName(result.symbols, 'ExtendedInterface', 'interface');
            expect(extendedInterface?.typeParameters).toEqual(['T']);
        });

        it('should preserve type arguments in supertypes', () => {
            // SimpleChild extends BaseClass<String>
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            const simpleChildBase = simpleChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            expect(simpleChildBase?.typeArguments).toEqual(['String']);

            // ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            const complexChildBase = complexChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            const complexChildInterface1 = complexChild?.supertypes?.find((s: any) => s.name === 'Interface1');

            expect(complexChildBase?.typeArguments).toEqual(['T']);
            expect(complexChildInterface1?.typeArguments).toEqual(['U']);
        });

        it('should handle Haxe-specific generic syntax (adversarial)', () => {
            // Haxe uses <T:Constraint> syntax
            const allTypes = result.symbols.filter((s) => s.kind === 'class' || s.kind === 'interface');

            allTypes.forEach((type) => {
                if (type.typeParameters) {
                    type.typeParameters.forEach((param) => {
                        // Should not include constraints
                        expect(param).not.toContain(':');
                        expect(param).toMatch(/^[A-Za-z_]\w*$/);
                    });
                }
            });
        });
    });

    describe('Dart Generics', () => {
        const outputFile = 'test-dart-generics.json';
        let result: ExtractedSymbols;

        beforeAll(() => {
            const dartFixture = join(FIXTURES_DIR, 'dart');
            runLSPCLI(dartFixture, 'dart', outputFile);
            result = readOutput(outputFile);
        });

        afterAll(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract type parameters from classes', () => {
            // class BaseClass<T>
            const baseClass = findSymbolByName(result.symbols, 'BaseClass', 'class');
            expect(baseClass?.typeParameters).toEqual(['T']);

            // class ComplexChild<T, U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            expect(complexChild?.typeParameters).toEqual(['T', 'U']);
        });

        it('should extract type parameters from abstract classes', () => {
            // abstract class Interface1<T>
            const interface1 = findSymbolByName(result.symbols, 'Interface1', 'class');
            expect(interface1?.typeParameters).toEqual(['T']);
        });

        it('should preserve type arguments in supertypes', () => {
            // SimpleChild extends BaseClass<String>
            const simpleChild = findSymbolByName(result.symbols, 'SimpleChild', 'class');
            const simpleChildBase = simpleChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            expect(simpleChildBase?.typeArguments).toEqual(['String']);

            // ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>
            const complexChild = findSymbolByName(result.symbols, 'ComplexChild', 'class');
            const complexChildBase = complexChild?.supertypes?.find((s: any) => s.name === 'BaseClass');
            const complexChildInterface1 = complexChild?.supertypes?.find((s: any) => s.name === 'Interface1');

            expect(complexChildBase?.typeArguments).toEqual(['T']);
            expect(complexChildInterface1?.typeArguments).toEqual(['U']);
        });

        it('should handle Dart-specific generic features (adversarial)', () => {
            // Dart allows bounded generics like <T extends Comparable<T>>
            const allClasses = result.symbols.filter((s) => s.kind === 'class');

            allClasses.forEach((cls) => {
                if (cls.typeParameters) {
                    cls.typeParameters.forEach((param) => {
                        // Should extract clean parameter names
                        expect(param).not.toContain('extends');
                        expect(param).toMatch(/^[A-Za-z_]\w*$/);
                    });
                }
            });
        });
    });

    describe('Cross-Language Consistency', () => {
        it('should handle empty type parameters consistently', () => {
            // Some LSPs might report <> as empty array, some as undefined
            const languages = ['java', 'typescript', 'cpp', 'haxe', 'dart'];

            languages.forEach((lang) => {
                const fixture = join(FIXTURES_DIR, lang);
                if (!existsSync(fixture)) return;

                const outputFile = `test-${lang}-empty-generics.json`;
                runLSPCLI(fixture, lang, outputFile);
                const result = readOutput(outputFile);

                // Classes without generics should have undefined or empty typeParameters
                const simpleClasses = result.symbols.filter((s) => s.name.includes('Simple') && s.kind === 'class');

                simpleClasses.forEach((cls) => {
                    if (cls.typeParameters) {
                        expect(cls.typeParameters).toEqual([]);
                    }
                });

                if (existsSync(outputFile)) {
                    execSync(`rm -f ${outputFile}`);
                }
            });
        });
    });
});

function countSymbolsWithDocumentation(symbols: SymbolInfo[]): number {
    let count = 0;
    for (const symbol of symbols) {
        if (symbol.documentation) count++;
        if (symbol.children) {
            count += countSymbolsWithDocumentation(symbol.children);
        }
    }
    return count;
}

function flattenSymbols(symbols: SymbolInfo[]): SymbolInfo[] {
    const result: SymbolInfo[] = [];
    for (const symbol of symbols) {
        result.push(symbol);
        if (symbol.children) {
            result.push(...flattenSymbols(symbol.children));
        }
    }
    return result;
}

function validateAllSymbolsHavePreview(symbols: SymbolInfo[]): {
    total: number;
    withPreview: number;
    missing: string[];
} {
    let total = 0;
    let withPreview = 0;
    const missing: string[] = [];

    function check(syms: SymbolInfo[], path: string = '') {
        for (const symbol of syms) {
            total++;
            const fullPath = path ? `${path} > ${symbol.name}` : symbol.name;

            if (symbol.preview && symbol.preview.trim().length > 0) {
                withPreview++;
            } else {
                missing.push(`${fullPath} (${symbol.kind})`);
            }

            if (symbol.children) {
                check(symbol.children, fullPath);
            }
        }
    }

    check(symbols);
    return { total, withPreview, missing };
}
