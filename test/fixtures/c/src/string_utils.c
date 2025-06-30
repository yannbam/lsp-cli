#include "string_utils.h"
#include <stdlib.h>
#include <ctype.h>
#include <string.h>

/* Global constants */
const char *STRING_UTILS_VERSION = "1.0.0";
const int MAX_STRING_LENGTH = 4096;

/* Static helper function */
static int is_alpha_or_underscore(char c) {
    return isalpha(c) || c == '_';
}

size_t str_length(const char *str) {
    if (!str) return 0;
    
    size_t len = 0;
    while (str[len] != '\0') {
        len++;
    }
    return len;
}

char* str_copy(char *dest, const char *src, size_t size) {
    if (!dest || !src || size == 0) return dest;
    
    size_t i;
    for (i = 0; i < size - 1 && src[i] != '\0'; i++) {
        dest[i] = src[i];
    }
    dest[i] = '\0';
    
    return dest;
}

int str_compare(const char *s1, const char *s2) {
    if (!s1 && !s2) return 0;
    if (!s1) return -1;
    if (!s2) return 1;
    
    while (*s1 && *s2) {
        if (*s1 != *s2) {
            return *s1 - *s2;
        }
        s1++;
        s2++;
    }
    
    return *s1 - *s2;
}

char* str_find(const char *haystack, const char *needle) {
    if (!haystack || !needle) return NULL;
    
    size_t needle_len = str_length(needle);
    if (needle_len == 0) return (char*)haystack;
    
    while (*haystack) {
        if (strncmp(haystack, needle, needle_len) == 0) {
            return (char*)haystack;
        }
        haystack++;
    }
    
    return NULL;
}

void str_to_upper(char *str) {
    if (!str) return;
    
    while (*str) {
        *str = toupper(*str);
        str++;
    }
}

bool str_is_identifier(const char *str) {
    if (!str || !*str) return false;
    
    /* First character must be letter or underscore */
    if (!is_alpha_or_underscore(*str)) {
        return false;
    }
    
    str++;
    while (*str) {
        if (!is_alpha_or_underscore(*str) && !isdigit(*str)) {
            return false;
        }
        str++;
    }
    
    return true;
}

int string_buffer_init(StringBuffer *buffer, size_t initial_capacity) {
    if (!buffer) return -1;
    
    buffer->data = malloc(initial_capacity);
    if (!buffer->data) return -1;
    
    buffer->data[0] = '\0';
    buffer->size = 0;
    buffer->capacity = initial_capacity;
    
    return 0;
}

int string_buffer_append(StringBuffer *buffer, const char *str) {
    if (!buffer || !str) return -1;
    
    size_t str_len = str_length(str);
    size_t new_size = buffer->size + str_len;
    
    /* Resize if necessary */
    if (new_size + 1 > buffer->capacity) {
        size_t new_capacity = buffer->capacity * 2;
        while (new_capacity < new_size + 1) {
            new_capacity *= 2;
        }
        
        char *new_data = realloc(buffer->data, new_capacity);
        if (!new_data) return -1;
        
        buffer->data = new_data;
        buffer->capacity = new_capacity;
    }
    
    /* Append string */
    str_copy(buffer->data + buffer->size, str, str_len + 1);
    buffer->size = new_size;
    
    return 0;
}

void string_buffer_free(StringBuffer *buffer) {
    if (!buffer) return;
    
    free(buffer->data);
    buffer->data = NULL;
    buffer->size = 0;
    buffer->capacity = 0;
}