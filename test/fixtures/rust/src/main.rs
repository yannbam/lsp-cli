//! Main module for lsp-cli Rust testing
//! 
//! This module tests various Rust constructs and documentation patterns
//! to ensure comprehensive symbol extraction.

use std::collections::HashMap;

pub mod advanced;
pub mod traits;
pub mod nested;
pub mod edge_cases;

/// A basic struct with standard documentation above
#[derive(Debug, Clone)]
pub struct StandardPerson {
    /// Person's name
    pub name: String,
    /// Person's age in years
    pub age: u32,
    /// Private field for testing
    private_data: String,
}

#[derive(Debug)]
pub struct BelowDocPerson {
    pub name: String,
    pub age: u32,
}
/// Documentation below struct definition (edge case)
/// This tests whether doc extraction handles misplaced documentation

impl StandardPerson {
    /// Creates a new StandardPerson
    /// 
    /// # Arguments
    /// * `name` - The person's name
    /// * `age` - The person's age
    /// 
    /// # Returns
    /// A new StandardPerson instance
    pub fn new(name: String, age: u32) -> Self {
        // Initialize private data
        let private_data = format!("private_{}", name);
        StandardPerson {
            name,
            age,
            private_data,
        }
    }

    pub fn get_age(&self) -> u32 {
        self.age
    }
    /// Documentation after method definition (edge case)
    /// Tests post-definition documentation extraction

    /// Updates the person's age
    /// Validates the age is reasonable
    pub fn set_age(&mut self, age: u32) {
        // Validate age is reasonable
        assert!(age <= 150, "Age must be 150 or less");
        // Update the age
        self.age = age;
        // Log the change
        println!("Age updated to {}", age);
    }

    /** Block comment documentation style
     * This tests alternative documentation format
     * Multiple lines with asterisks
     */
    pub fn block_doc_method(&self) -> &str {
        &self.name
    }

    /** 
     * Another block comment style
     * Without exclamation mark
     */
    pub fn another_block_doc(&self) -> String {
        // Create formatted string
        format!("{} ({})", self.name, self.age)
        // Return the formatted result
    }
}

/// Enum with comprehensive documentation
#[derive(Debug, PartialEq)]
pub enum Status {
    /// Active status
    Active,
    /// Inactive with reason
    Inactive(String),
    /// Pending with timestamp and priority
    Pending { timestamp: u64, priority: u8 },
}

/// Function with documentation above
/// Tests standard function documentation
pub fn documented_above_function(input: &str) -> String {
    // Process the input
    let processed = input.to_uppercase();
    // Add prefix
    format!("PROCESSED: {}", processed)
}

pub fn undocumented_function(x: i32, y: i32) -> i32 {
    // Simple addition
    x + y
    // Return result
}

/// Multiple 
/// line
/// documentation
/// with separate comment blocks
pub fn multi_line_docs(value: u64) -> u64 {
    value * 2
}

pub fn function_with_complex_comments(data: Vec<String>) -> HashMap<String, usize> {
    // Initialize result map
    let mut result = HashMap::new();
    
    // Process each item in the data
    for item in data {
        // Count characters in item
        let count = item.len();
        // Insert into result map
        result.insert(item, count);
        // Continue to next item
    }
    
    // Return the completed map
    result
}

/// A constant with documentation
pub const MAX_USERS: usize = 1000;

/// Static variable for testing
pub static GLOBAL_COUNTER: std::sync::atomic::AtomicUsize = 
    std::sync::atomic::AtomicUsize::new(0);

// Regular comment (not documentation)
// This should not be extracted as documentation
pub fn regular_comments() {
    // This is a regular comment
    println!("Hello");
    // Another regular comment
}

/// Generic function with type parameters
/// Tests generic symbol extraction
pub fn generic_function<T: Clone>(item: T) -> T {
    // Clone the item
    item.clone()
}

fn private_function() {
    // This is a private function
    // Should still be extracted by LSP
}

/// Function with inline comments testing comment extraction
pub fn inline_comment_function() -> i32 {
    let x = 5; // Set initial value
    let y = 10; // Set second value
    // Calculate result
    let result = x + y; // Add them together
    result // Return the result
}

/// Entry point for testing
fn main() {
    // Create a person
    let mut person = StandardPerson::new("Alice".to_string(), 25);
    
    // Test various methods
    let _age = person.get_age();
    person.set_age(26);
    
    // Test enum
    let status = Status::Active;
    
    // Test function calls
    let _processed = documented_above_function("test");
    let _sum = undocumented_function(1, 2);
    
    println!("Person: {:?}, Status: {:?}", person, status);
}