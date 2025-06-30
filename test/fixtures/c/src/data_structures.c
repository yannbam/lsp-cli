#include "data_structures.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* Static function for internal use */
static ListNode* create_node(void *data) {
    ListNode *node = malloc(sizeof(ListNode));
    if (node) {
        node->data = data;
        node->next = NULL;
    }
    return node;
}

/* List implementation */
LinkedList* list_create(void) {
    LinkedList *list = malloc(sizeof(LinkedList));
    if (list) {
        list->head = NULL;
        list->tail = NULL;
        list->size = 0;
    }
    return list;
}

void list_destroy(LinkedList *list) {
    if (!list) return;
    
    ListNode *current = list->head;
    while (current) {
        ListNode *next = current->next;
        free(current);
        current = next;
    }
    
    free(list);
}

int list_append(LinkedList *list, void *data) {
    if (!list) return -1;
    
    ListNode *node = create_node(data);
    if (!node) return -1;
    
    if (list->tail) {
        list->tail->next = node;
    } else {
        list->head = node;
    }
    list->tail = node;
    list->size++;
    
    return 0;
}

int list_prepend(LinkedList *list, void *data) {
    if (!list) return -1;
    
    ListNode *node = create_node(data);
    if (!node) return -1;
    
    node->next = list->head;
    list->head = node;
    if (!list->tail) {
        list->tail = node;
    }
    list->size++;
    
    return 0;
}

void* list_get(LinkedList *list, size_t index) {
    if (!list || index >= list->size) return NULL;
    
    ListNode *current = list->head;
    for (size_t i = 0; i < index; i++) {
        current = current->next;
    }
    
    return current->data;
}

/* Tree implementation */
struct TreeNode* tree_create_node(int value) {
    struct TreeNode *node = malloc(sizeof(struct TreeNode));
    if (node) {
        node->value = value;
        node->left = NULL;
        node->right = NULL;
    }
    return node;
}

void tree_destroy(struct TreeNode *root) {
    if (!root) return;
    
    tree_destroy(root->left);
    tree_destroy(root->right);
    free(root);
}

struct TreeNode* tree_insert(struct TreeNode *root, int value) {
    if (!root) {
        return tree_create_node(value);
    }
    
    if (value < root->value) {
        root->left = tree_insert(root->left, value);
    } else if (value > root->value) {
        root->right = tree_insert(root->right, value);
    }
    
    return root;
}

struct TreeNode* tree_find(struct TreeNode *root, int value) {
    if (!root) return NULL;
    
    if (value == root->value) {
        return root;
    } else if (value < root->value) {
        return tree_find(root->left, value);
    } else {
        return tree_find(root->right, value);
    }
}

int tree_height(struct TreeNode *root) {
    if (!root) return 0;
    
    int left_height = tree_height(root->left);
    int right_height = tree_height(root->right);
    
    return 1 + max(left_height, right_height);
}

/* Hash table implementation */
unsigned int hash_string(const char *str) {
    unsigned int hash = 5381;
    int c;
    
    while ((c = *str++)) {
        hash = ((hash << 5) + hash) + c;
    }
    
    return hash;
}

HashTable* hash_table_create(size_t bucket_count) {
    HashTable *table = malloc(sizeof(HashTable));
    if (!table) return NULL;
    
    table->buckets = calloc(bucket_count, sizeof(HashEntry*));
    if (!table->buckets) {
        free(table);
        return NULL;
    }
    
    table->bucket_count = bucket_count;
    table->size = 0;
    
    return table;
}

void hash_table_destroy(HashTable *table) {
    if (!table) return;
    
    for (size_t i = 0; i < table->bucket_count; i++) {
        HashEntry *entry = table->buckets[i];
        while (entry) {
            HashEntry *next = entry->next;
            free(entry->key);
            free(entry);
            entry = next;
        }
    }
    
    free(table->buckets);
    free(table);
}

int hash_table_put(HashTable *table, const char *key, void *value) {
    if (!table || !key) return -1;
    
    unsigned int hash = hash_string(key);
    size_t index = hash % table->bucket_count;
    
    /* Check if key already exists */
    HashEntry *entry = table->buckets[index];
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            entry->value = value;
            return 0;
        }
        entry = entry->next;
    }
    
    /* Create new entry */
    entry = malloc(sizeof(HashEntry));
    if (!entry) return -1;
    
    entry->key = strdup(key);
    if (!entry->key) {
        free(entry);
        return -1;
    }
    
    entry->value = value;
    entry->next = table->buckets[index];
    table->buckets[index] = entry;
    table->size++;
    
    return 0;
}

void* hash_table_get(HashTable *table, const char *key) {
    if (!table || !key) return NULL;
    
    unsigned int hash = hash_string(key);
    size_t index = hash % table->bucket_count;
    
    HashEntry *entry = table->buckets[index];
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            return entry->value;
        }
        entry = entry->next;
    }
    
    return NULL;
}

int hash_table_remove(HashTable *table, const char *key) {
    if (!table || !key) return -1;
    
    unsigned int hash = hash_string(key);
    size_t index = hash % table->bucket_count;
    
    HashEntry *entry = table->buckets[index];
    HashEntry *prev = NULL;
    
    while (entry) {
        if (strcmp(entry->key, key) == 0) {
            if (prev) {
                prev->next = entry->next;
            } else {
                table->buckets[index] = entry->next;
            }
            
            free(entry->key);
            free(entry);
            table->size--;
            return 0;
        }
        
        prev = entry;
        entry = entry->next;
    }
    
    return -1;
}

/* Utility functions */
void print_data_structure_info(const DataStructureInfo *info) {
    if (!info) return;
    
    const char *type_names[] = {
        "List", "Tree", "Hash Table", "Stack", "Queue"
    };
    
    printf("Data Structure: %s\n", type_names[info->type]);
    printf("Element Count: %zu\n", info->element_count);
    printf("Version: %d.%d.%d\n", 
           info->version.major, 
           info->version.minor, 
           info->version.patch);
}

void generic_sort(void **array, size_t count, comparator_func compare) {
    /* Simple bubble sort for demonstration */
    for (size_t i = 0; i < count - 1; i++) {
        for (size_t j = 0; j < count - i - 1; j++) {
            if (compare(array[j], array[j + 1]) > 0) {
                void *temp = array[j];
                array[j] = array[j + 1];
                array[j + 1] = temp;
            }
        }
    }
}