import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SymbolInfo } from '../src/types';
import { readOutput, runLSPCLI } from './utils';

const FIXTURES_DIR = join(process.cwd(), 'test', 'fixtures');

describe('Fixture-based LSP Tests', () => {
    describe('Java', () => {
        const javaFixture = join(FIXTURES_DIR, 'java');
        const outputFile = 'test-java-fixture.json';

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Java symbol types', () => {
            runLSPCLI(javaFixture, 'java', outputFile);
            const result = readOutput(outputFile);

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
                expect(userService!.supertypes).toContain('BaseService');
                expect(userService!.supertypes).toContain('ServiceInterface');
                expect(userService!.supertypes).toContain('Auditable');
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
            runLSPCLI(javaFixture, 'java', outputFile);
            const result = readOutput(outputFile);

            const userService = findSymbolByName(result.symbols, 'UserService', 'class');
            expect(userService).toBeDefined();
            expect(userService!.file).toContain('UserService.java');
            expect(userService!.range).toBeDefined();
            expect(userService!.range.start.line).toBeGreaterThanOrEqual(0);
            expect(userService!.range.end.line).toBeGreaterThan(userService!.range.start.line);
        });
    });

    describe('TypeScript', () => {
        const tsFixture = join(FIXTURES_DIR, 'typescript');
        const outputFile = 'test-ts-fixture.json';

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all TypeScript symbol types', () => {
            runLSPCLI(tsFixture, 'typescript', outputFile);
            const result = readOutput(outputFile);

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
            runLSPCLI(tsFixture, 'typescript', outputFile);
            const result = readOutput(outputFile);

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
    });

    describe('C++', () => {
        const cppFixture = join(FIXTURES_DIR, 'cpp');
        const outputFile = 'test-cpp-fixture.json';

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all C++ symbol types', () => {
            runLSPCLI(cppFixture, 'cpp', outputFile);
            const result = readOutput(outputFile);

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
            runLSPCLI(cppFixture, 'cpp', outputFile);
            const result = readOutput(outputFile);

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
    });

    describe('C', () => {
        const cFixture = join(FIXTURES_DIR, 'c');
        const outputFile = 'test-c-fixture.json';

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all C symbol types', () => {
            runLSPCLI(cFixture, 'c', outputFile);
            const result = readOutput(outputFile);

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
            runLSPCLI(cFixture, 'c', outputFile);
            const result = readOutput(outputFile);

            // Check for typedef structs
            const structs = result.symbols.filter((s) => s.kind === 'class');
            expect(structs.some((s) => s.name === 'StringBuffer')).toBe(true);
            expect(structs.some((s) => s.name === 'DataStructureInfo')).toBe(true);

            // The typedef struct should be found
            const dsInfo = structs.find((s) => s.name === 'DataStructureInfo');
            expect(dsInfo).toBeDefined();
        });

        it('should merge typedef structs and unions correctly', () => {
            runLSPCLI(cFixture, 'c', outputFile);
            const result = readOutput(outputFile);

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

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Haxe symbol types', () => {
            runLSPCLI(haxeFixture, 'haxe', outputFile);
            const result = readOutput(outputFile);

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

            // Note: Haxe LSP currently does not provide supertypes information
            // This is a limitation of the Haxe language server, not our implementation
            expect(player!.supertypes).toBeUndefined();

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
            runLSPCLI(haxeFixture, 'haxe', outputFile);
            const result = readOutput(outputFile);

            // Haxe typedefs might be in variables or have their own kind
            const allSymbols = flattenSymbols(result.symbols);

            // Check for Vector2D and Vector3D typedefs
            const hasVector2D = allSymbols.some((s) => s.name === 'Vector2D');
            const hasVector3D = allSymbols.some((s) => s.name === 'Vector3D');

            expect(hasVector2D || hasVector3D).toBe(true);
        });
    });

    describe('Dart', () => {
        const dartFixture = join(FIXTURES_DIR, 'dart');
        const outputFile = 'test-dart-fixture.json';

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Dart symbol types', () => {
            runLSPCLI(dartFixture, 'dart', outputFile);
            const result = readOutput(outputFile);

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
            runLSPCLI(dartFixture, 'dart', outputFile);
            const result = readOutput(outputFile);

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
            runLSPCLI(dartFixture, 'dart', outputFile);
            const result = readOutput(outputFile);

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
                expect(user!.supertypes).toContain('Entity');
            }
        });
    });

    describe('Python', () => {
        const pythonFixture = join(FIXTURES_DIR, 'python');
        const outputFile = 'test-python-fixture.json';

        afterEach(() => {
            if (existsSync(outputFile)) {
                execSync(`rm -f ${outputFile}`);
            }
        });

        it('should extract all Python symbol types', () => {
            runLSPCLI(pythonFixture, 'python', outputFile);
            const result = readOutput(outputFile);

            expect(result.language).toBe('python');
            expect(result.symbols.length).toBeGreaterThan(500); // Expect comprehensive fixture coverage

            // Check for modules
            const modules = result.symbols.filter((s) => s.kind === 'module');
            expect(modules.some((m) => m.name === 'sys')).toBe(true);
            expect(modules.some((m) => m.name === 'asyncio')).toBe(true);

            // Check for classes
            const classes = result.symbols.filter((s) => s.kind === 'class');
            expect(classes.some((c) => c.name === 'User')).toBe(true);
            expect(classes.some((c) => c.name === 'DataService')).toBe(true);
            expect(classes.some((c) => c.name === 'DatabaseError')).toBe(true);

            // Check for functions
            const functions = result.symbols.filter((s) => s.kind === 'function');
            expect(functions.some((f) => f.name === 'main')).toBe(true);
            expect(functions.some((f) => f.name === 'initialize_application')).toBe(true);
            expect(functions.some((f) => f.name === 'process_user_data')).toBe(true);

            // Check for variables
            const variables = result.symbols.filter((s) => s.kind === 'variable');
            expect(variables.some((v) => v.name === 'DEFAULT_PORT')).toBe(true);
            expect(variables.some((v) => v.name === 'DEBUG_MODE')).toBe(true);

            // Verify main.py symbols are extracted (this was the critical fix)
            const mainSymbols = result.symbols.filter((s) => s.file.includes('main.py'));
            expect(mainSymbols.length).toBeGreaterThan(10); // Should have ~17 symbols

            // Check main.py specific symbols
            const mainFunctions = mainSymbols.filter((s) => s.kind === 'function');
            expect(mainFunctions.some((f) => f.name === 'main')).toBe(true);
            expect(mainFunctions.some((f) => f.name === 'initialize_application')).toBe(true);
            expect(mainFunctions.some((f) => f.name === 'process_user_data')).toBe(true);
        });

        it('should handle advanced Python features', () => {
            runLSPCLI(pythonFixture, 'python', outputFile);
            const result = readOutput(outputFile);

            // Check for async functions
            const allSymbols = flattenSymbols(result.symbols);
            const asyncMethods = allSymbols.filter(
                (s) =>
                    (s.kind === 'method' && s.name.includes('async')) ||
                    (s.preview &&
                        Array.isArray(s.preview) &&
                        s.preview.some((line: string) => line.includes('async def')))
            );
            expect(asyncMethods.length).toBeGreaterThan(0);

            // Check for dataclass
            const dataclasses = allSymbols.filter(
                (s) => s.kind === 'class' && (s.name === 'DataModel' || s.name === 'ConnectionConfig')
            );
            expect(dataclasses.length).toBeGreaterThan(0);

            // Check for decorators usage (retry_decorator function should exist)
            const decoratorFunctions = allSymbols.filter((s) => s.kind === 'function' && s.name.includes('decorator'));
            expect(decoratorFunctions.length).toBeGreaterThan(0);
        });

        it('should extract comprehensive symbols without cache poisoning', () => {
            // Run test multiple times to ensure cache clearing works
            for (let i = 0; i < 3; i++) {
                runLSPCLI(pythonFixture, 'python', `${outputFile}-run-${i}`);
                const result = readOutput(`${outputFile}-run-${i}`);

                // Each run should extract the same number of symbols (no cache poisoning)
                expect(result.symbols.length).toBeGreaterThan(500);

                // main.py symbols should always be present
                const mainSymbols = result.symbols.filter((s) => s.file.includes('main.py'));
                expect(mainSymbols.length).toBeGreaterThan(10);

                // Cleanup
                if (existsSync(`${outputFile}-run-${i}`)) {
                    execSync(`rm -f ${outputFile}-run-${i}`);
                }
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
