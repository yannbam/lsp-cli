/**
 * Test service specifically for comment extraction edge cases.
 * This file contains various comment patterns to test the extraction feature.
 */

export class CommentTestService {
    private readonly baseUrl = 'https://api.example.com/v1'; // End-of-line comment
    private readonly debugPattern = 'Use // for debugging, /* for blocks */'; // String with comment symbols

    /**
     * Tests various comment patterns within methods.
     */
    public testCommentExtraction(): void {
        // Step 1: Basic validation
        // Step 2: Process data
        const url = 'file://path/to/file'; // This should not trigger comment detection

        /* Single-line block comment */
        const config = { apiKey: 'abc123' }; /* Inline block comment */

        /*
         * Multi-line block comment
         * with multiple lines
         * of content
         */
        this.validateInput(); // Validate user input

        const message = `Template literal with // comment symbols`;
        const escaped = 'String with " // escaped quote and comment';

        // Consecutive comment lines
        // should be grouped together
        // as a single block
        this.processData(); // But this end-of-line comment stays separate

        // Final processing step
        console.log('Processing complete'); // Log completion
    }

    /**
     * Method with complex comment scenarios.
     */
    public complexCommentScenarios(): string {
        const regex = /\/\//; // Regex containing comment pattern
        const urlPattern = 'http://example.com'; // URL in string

        /* Process step 1 */ this.step1(); /* Process step 2 */

        // Handle special case
        if (true) {
            /* Nested comment processing */
            return 'success'; // Return success
        }

        return 'failure'; // Default return
    }

    private validateInput(): void {
        // Input validation logic
        // Check for null values
        // Verify data types
    }

    private processData(): void {
        /* Data processing implementation */
    }

    private step1(): void {
        // Step 1 implementation
    }
}
