using System;

namespace CommentTest.Test
{
    /// <summary>
    /// Test service specifically for comment extraction edge cases.
    /// This file contains various comment patterns to test the extraction feature.
    /// </summary>
    public class CommentTestService
    {
        private static readonly string BaseUrl = "https://api.example.com/v1"; // End-of-line comment
        private readonly string debugPattern = "Use // for debugging, /* for blocks */"; // String with comment symbols
        
        /// <summary>
        /// Tests various comment patterns within methods.
        /// </summary>
        public void TestCommentExtraction()
        {
            // Step 1: Basic validation
            // Step 2: Process data
            string url = "file://path/to/file"; // This should not trigger comment detection
            
            /* Single-line block comment */
            string config = @"{ ""apiKey"": ""abc123"" }"; /* Inline block comment */
            
            /*
             * Multi-line block comment
             * with multiple lines
             * of content
             */
            ValidateInput(); // Validate user input
            
            string escaped = "String with \" // escaped quote and comment";
            string verbatim = @"Verbatim string with // comment symbols";
            
            // Consecutive comment lines
            // should be grouped together
            // as a single block
            ProcessData(); // But this end-of-line comment stays separate
            
            // Final processing step
            Console.WriteLine("Processing complete"); // Log completion
        }
        
        /// <summary>
        /// Method with complex comment scenarios.
        /// </summary>
        /// <returns>Result string</returns>
        public string ComplexCommentScenarios()
        {
            string urlPattern = "http://example.com"; // URL in string
            
            /* Process step 1 */ Step1(); /* Process step 2 */
            
            // Handle special case
            if (true)
            {
                /* Nested comment processing */
                return "success"; // Return success
            }
            
            return "failure"; // Default return
        }
        
        private void ValidateInput()
        {
            // Input validation logic
            // Check for null values
            // Verify data types
        }
        
        private void ProcessData()
        {
            /* Data processing implementation */
        }
        
        private void Step1()
        {
            // Step 1 implementation
        }
    }
}
