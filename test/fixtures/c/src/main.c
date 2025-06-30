#include <stdio.h>
#include <stdlib.h>
#include "string_utils.h"
#include "data_structures.h"

/* Global variables */
int g_verbose = 0;
const char *g_program_name = "C Test Program";
static int s_counter = 0;

/* Function prototypes */
void test_string_utils(void);
void test_data_structures(void);
static void print_usage(const char *program);
int compare_ints(const void *a, const void *b);

/* Main function */
int main(int argc, char *argv[]) {
    printf("%s v%s\n", g_program_name, STRING_UTILS_VERSION);
    
    if (argc > 1 && str_compare(argv[1], "-v") == 0) {
        g_verbose = 1;
    }
    
    test_string_utils();
    test_data_structures();
    
    return 0;
}

void test_string_utils(void) {
    printf("\n=== Testing String Utils ===\n");
    
    /* Test string length */
    const char *test_str = "Hello, World!";
    printf("Length of '%s': %zu\n", test_str, str_length(test_str));
    
    /* Test string copy */
    char buffer[50];
    str_copy(buffer, test_str, sizeof(buffer));
    printf("Copied string: %s\n", buffer);
    
    /* Test string uppercase */
    str_to_upper(buffer);
    printf("Uppercase: %s\n", buffer);
    
    /* Test identifier check */
    const char *identifiers[] = {"valid_name", "123invalid", "_underscore", "has-dash"};
    for (int i = 0; i < 4; i++) {
        printf("'%s' is %sa valid identifier\n", 
               identifiers[i], 
               str_is_identifier(identifiers[i]) ? "" : "not ");
    }
    
    /* Test string buffer */
    StringBuffer sb;
    if (string_buffer_init(&sb, 16) == 0) {
        string_buffer_append(&sb, "First ");
        string_buffer_append(&sb, "Second ");
        string_buffer_append(&sb, "Third");
        printf("String buffer: %s\n", sb.data);
        string_buffer_free(&sb);
    }
    
    s_counter++;
}

void test_data_structures(void) {
    printf("\n=== Testing Data Structures ===\n");
    
    /* Test linked list */
    LinkedList *list = list_create();
    if (list) {
        int values[] = {10, 20, 30};
        for (int i = 0; i < 3; i++) {
            list_append(list, &values[i]);
        }
        
        printf("List contents: ");
        for (size_t i = 0; i < list->size; i++) {
            int *value = (int*)list_get(list, i);
            printf("%d ", *value);
        }
        printf("\n");
        
        list_destroy(list);
    }
    
    /* Test binary tree */
    struct TreeNode *root = NULL;
    int tree_values[] = {50, 30, 70, 20, 40, 60, 80};
    
    for (int i = 0; i < 7; i++) {
        root = tree_insert(root, tree_values[i]);
    }
    
    printf("Tree height: %d\n", tree_height(root));
    
    struct TreeNode *found = tree_find(root, 40);
    printf("Found 40: %s\n", found ? "yes" : "no");
    
    tree_destroy(root);
    
    /* Test hash table */
    HashTable *table = hash_table_create(INITIAL_BUCKET_COUNT);
    if (table) {
        hash_table_put(table, "key1", "value1");
        hash_table_put(table, "key2", "value2");
        hash_table_put(table, "key3", "value3");
        
        char *value = (char*)hash_table_get(table, "key2");
        printf("Hash table get('key2'): %s\n", value ? value : "not found");
        
        hash_table_remove(table, "key2");
        value = (char*)hash_table_get(table, "key2");
        printf("After remove, get('key2'): %s\n", value ? value : "not found");
        
        hash_table_destroy(table);
    }
    
    /* Test data structure info */
    DataStructureInfo info = {
        .type = DS_HASH_TABLE,
        .element_count = 3,
        .version = {1, 0, 0}
    };
    print_data_structure_info(&info);
    
    s_counter++;
}

static void print_usage(const char *program) {
    printf("Usage: %s [-v]\n", program);
    printf("  -v  Enable verbose output\n");
}

int compare_ints(const void *a, const void *b) {
    int *ia = (int*)a;
    int *ib = (int*)b;
    return *ia - *ib;
}