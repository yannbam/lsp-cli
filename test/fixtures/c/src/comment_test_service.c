#include <stdio.h>
#include <string.h>

/* Test service specifically for comment extraction edge cases */
/* This file contains various comment patterns to test the extraction feature */

const char *BASE_URL = "https://api.example.com/v1"; /* End-of-line comment */
static const char *debug_pattern = "Use // for debugging, /* for blocks */"; /* String with comment symbols */

/* Function prototypes */
void test_comment_extraction(void);
char* complex_comment_scenarios(void);
static void validate_input(void);
static void process_data(void);
static void step1(void);

/**
 * Tests various comment patterns within functions.
 */
void test_comment_extraction(void) {
    // Step 1: Basic validation
    // Step 2: Process data
    const char *url = "file://path/to/file"; // This should not trigger comment detection
    
    /* Single-line block comment */
    const char *config = "{ \"apiKey\": \"abc123\" }"; /* Inline block comment */
    
    /*
     * Multi-line block comment
     * with multiple lines
     * of content
     */
    validate_input(); // Validate user input
    
    const char *escaped = "String with \" // escaped quote and comment";
    
    // Consecutive comment lines
    // should be grouped together
    // as a single block
    process_data(); // But this end-of-line comment stays separate
    
    // Final processing step
    printf("Processing complete\n"); // Log completion
}

/**
 * Function with complex comment scenarios.
 */
char* complex_comment_scenarios(void) {
    const char *url_pattern = "http://example.com"; // URL in string
    
    /* Process step 1 */ step1(); /* Process step 2 */
    
    // Handle special case
    if (1) {
        /* Nested comment processing */
        return "success"; // Return success
    }
    
    return "failure"; // Default return
}

static void validate_input(void) {
    // Input validation logic
    // Check for null values
    // Verify data types
}

static void process_data(void) {
    /* Data processing implementation */
}

static void step1(void) {
    // Step 1 implementation
}
