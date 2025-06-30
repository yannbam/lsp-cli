#ifndef STRING_UTILS_H
#define STRING_UTILS_H

#include <stddef.h>
#include <stdbool.h>

/* String manipulation functions */

/**
 * Calculate the length of a string
 * @param str The string to measure
 * @return Length of the string
 */
size_t str_length(const char *str);

/**
 * Copy a string
 * @param dest Destination buffer
 * @param src Source string
 * @param size Size of destination buffer
 * @return Pointer to destination
 */
char* str_copy(char *dest, const char *src, size_t size);

/**
 * Compare two strings
 * @param s1 First string
 * @param s2 Second string
 * @return 0 if equal, <0 if s1<s2, >0 if s1>s2
 */
int str_compare(const char *s1, const char *s2);

/**
 * Find substring in string
 * @param haystack String to search in
 * @param needle String to find
 * @return Pointer to first occurrence or NULL
 */
char* str_find(const char *haystack, const char *needle);

/**
 * Convert string to uppercase
 * @param str String to convert (modified in-place)
 */
void str_to_upper(char *str);

/**
 * Check if string is valid identifier
 * @param str String to check
 * @return true if valid identifier
 */
bool str_is_identifier(const char *str);

/* Typedef for string processor function */
typedef void (*string_processor)(char *);

/* Struct for string buffer */
typedef struct {
    char *data;
    size_t size;
    size_t capacity;
} StringBuffer;

/**
 * Initialize string buffer
 * @param buffer Buffer to initialize
 * @param initial_capacity Initial capacity
 * @return 0 on success, -1 on failure
 */
int string_buffer_init(StringBuffer *buffer, size_t initial_capacity);

/**
 * Append to string buffer
 * @param buffer Buffer to append to
 * @param str String to append
 * @return 0 on success, -1 on failure
 */
int string_buffer_append(StringBuffer *buffer, const char *str);

/**
 * Free string buffer
 * @param buffer Buffer to free
 */
void string_buffer_free(StringBuffer *buffer);

/* Global constants */
extern const char *STRING_UTILS_VERSION;
extern const int MAX_STRING_LENGTH;

#endif /* STRING_UTILS_H */