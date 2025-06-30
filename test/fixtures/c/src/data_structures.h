#ifndef DATA_STRUCTURES_H
#define DATA_STRUCTURES_H

#include <stddef.h>

/* Linked list node */
typedef struct ListNode {
    void *data;
    struct ListNode *next;
} ListNode;

/* Linked list */
typedef struct {
    ListNode *head;
    ListNode *tail;
    size_t size;
} LinkedList;

/* Binary tree node */
struct TreeNode {
    int value;
    struct TreeNode *left;
    struct TreeNode *right;
};

/* Hash table entry */
typedef struct HashEntry {
    char *key;
    void *value;
    struct HashEntry *next;
} HashEntry;

/* Hash table */
typedef struct {
    HashEntry **buckets;
    size_t bucket_count;
    size_t size;
} HashTable;

/* Enum for data structure types */
enum DataStructureType {
    DS_LIST,
    DS_TREE,
    DS_HASH_TABLE,
    DS_STACK,
    DS_QUEUE
};

/* Union example */
typedef union {
    int int_value;
    float float_value;
    char *string_value;
    void *ptr_value;
} DataValue;

/* Anonymous struct in typedef */
typedef struct {
    enum DataStructureType type;
    size_t element_count;
    struct {
        int major;
        int minor;
        int patch;
    } version;
} DataStructureInfo;

/* Function declarations */

/* List operations */
LinkedList* list_create(void);
void list_destroy(LinkedList *list);
int list_append(LinkedList *list, void *data);
int list_prepend(LinkedList *list, void *data);
void* list_get(LinkedList *list, size_t index);

/* Tree operations */
struct TreeNode* tree_create_node(int value);
void tree_destroy(struct TreeNode *root);
struct TreeNode* tree_insert(struct TreeNode *root, int value);
struct TreeNode* tree_find(struct TreeNode *root, int value);
int tree_height(struct TreeNode *root);

/* Hash table operations */
HashTable* hash_table_create(size_t bucket_count);
void hash_table_destroy(HashTable *table);
int hash_table_put(HashTable *table, const char *key, void *value);
void* hash_table_get(HashTable *table, const char *key);
int hash_table_remove(HashTable *table, const char *key);

/* Utility functions */
unsigned int hash_string(const char *str);
void print_data_structure_info(const DataStructureInfo *info);

/* Function pointer typedef */
typedef int (*comparator_func)(const void *, const void *);

/* Generic sort function */
void generic_sort(void **array, size_t count, comparator_func compare);

/* Macro definitions */
#define INITIAL_BUCKET_COUNT 16
#define LOAD_FACTOR_THRESHOLD 0.75

/* Inline function */
static inline int max(int a, int b) {
    return (a > b) ? a : b;
}

#endif /* DATA_STRUCTURES_H */