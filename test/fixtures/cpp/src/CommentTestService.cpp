#include <string>
#include <iostream>

/**
 * Test service specifically for comment extraction edge cases.
 * This file contains various comment patterns to test the extraction feature.
 */

namespace test {

class CommentTestService {
private:
    static const std::string BASE_URL; // End-of-line comment
    const std::string debug_pattern = "Use // for debugging, /* for blocks */"; // String with comment symbols

public:
    /**
     * Tests various comment patterns within methods.
     */
    void testCommentExtraction() {
        // Step 1: Basic validation
        // Step 2: Process data
        std::string url = "file://path/to/file"; // This should not trigger comment detection
        
        /* Single-line block comment */
        std::string config = "{ \"apiKey\": \"abc123\" }"; /* Inline block comment */
        
        /*
         * Multi-line block comment
         * with multiple lines
         * of content
         */
        validateInput(); // Validate user input
        
        std::string escaped = R"(String with " // raw string with comment symbols)";
        
        // Consecutive comment lines
        // should be grouped together
        // as a single block
        processData(); // But this end-of-line comment stays separate
        
        // Final processing step
        std::cout << "Processing complete" << std::endl; // Log completion
    }
    
    /**
     * Method with complex comment scenarios.
     */
    std::string complexCommentScenarios() {
        std::string urlPattern = "http://example.com"; // URL in string
        
        /* Process step 1 */ step1(); /* Process step 2 */
        
        // Handle special case
        if (true) {
            /* Nested comment processing */
            return "success"; // Return success
        }
        
        return "failure"; // Default return
    }

private:
    void validateInput() {
        // Input validation logic
        // Check for null values
        // Verify data types
    }
    
    void processData() {
        /* Data processing implementation */
    }
    
    void step1() {
        // Step 1 implementation
    }
};

// Static member definition
const std::string CommentTestService::BASE_URL = "https://api.example.com/v1";

} // namespace test
