//! Edge cases and boundary conditions for LSP testing
//!
//! This module specifically tests edge cases that might
//! break symbol extraction or documentation parsing.

/// Struct with no documentation
pub struct NoDocStruct {
    pub field: i32,
}

/// Function with documentation ABOVE
/// Multiple lines of documentation
/// Each line should be captured
pub fn doc_above_function() {}

pub fn doc_below_function() {}
/// Documentation BELOW the function (edge case)
/// This should ideally not be captured as function documentation
/// But we test how the LSP handles this

/// Documentation with special characters: !@#$%^&*()
/// Unicode characters: 🦀 Rust crab emoji
/// Markdown: **bold** and *italic* and `code`
/// Links: [Rust](https://rust-lang.org)
pub fn special_chars_in_docs() {}

/* 
 * C-style block comment
 * Multiple lines
 * Should this be captured?
 */
pub fn c_style_comments() {}

/**
 * JavaDoc-style comment
 * @param none - no parameters
 * @return nothing
 */
pub fn javadoc_style() {}

/** 
 * Outer doc comment style
 * Should be handled as function documentation
 */
pub fn inner_doc_comment() {}

/// Extremely long documentation that exceeds normal line lengths and might cause issues with parsing if the LSP server or lsp-cli has buffer limitations or truncation issues that need to be tested to ensure robust handling of edge cases
pub fn very_long_documentation() {}

///
/// Empty documentation lines
///
/// With gaps between content
///
pub fn empty_doc_lines() {}

/// Multiple
/// documentation
/// blocks
/// that are
/// separated
pub fn multiple_doc_blocks() {}

/// Doc comment followed immediately by another
/// Without any gap between them
/// Should all be captured together
pub fn consecutive_doc_comments() {}

pub fn mixed_comment_styles() {
    /// This is incorrectly placed documentation
    /// Inside the function body
    let x = 5;
    
    // Regular comment
    let y = 10;
    
    /* Block comment */
    let z = x + y;
    
    /** Another block comment */
    println!("{}", z);
}

/// Struct with mixed visibility and documentation
pub struct MixedVisibility {
    /// Public documented field
    pub public_field: String,
    
    pub undocumented_public: i32,
    
    /// Private documented field
    private_field: f64,
    
    undocumented_private: bool,
}

impl MixedVisibility {
    /// Constructor with edge case documentation
    /// 
    /// # Examples
    /// ```
    /// let m = MixedVisibility::new();
    /// ```
    /// 
    /// # Panics
    /// Never panics
    pub fn new() -> Self {
        Self {
            public_field: String::new(),
            undocumented_public: 0,
            private_field: 0.0,
            undocumented_private: false,
        }
    }
    
    pub fn no_doc_method(&self) {}
    
    /// Method with doc
    pub fn with_doc_method(&self) {}
    
    fn private_no_doc(&self) {}
    
    /// Private with doc
    fn private_with_doc(&self) {}
}

/// Empty struct
pub struct EmptyStruct;

/// Unit struct
pub struct UnitStruct();

/// Tuple struct
pub struct TupleStruct(pub i32, String, f64);

/// Struct with zero-sized types
pub struct ZeroSized {
    pub phantom: std::marker::PhantomData<i32>,
    pub unit: (),
}

/// Generic struct with constraints in weird positions
pub struct WeirdGenerics<
    T: Clone + 
       Send + 
       Sync,
    const N: usize
> where
    T: std::fmt::Debug,
{
    pub data: [T; N],
}

/// Enum with extremely complex variants
pub enum ComplexVariants {
    /// Simple variant
    A,
    
    /// Tuple variant with multiple types
    B(i32, String, Vec<u8>, std::collections::HashMap<String, i32>),
    
    /// Struct variant with complex fields
    C {
        /// Field with complex type
        complex_field: Result<Option<Box<dyn std::error::Error>>, String>,
        /// Generic field
        generic_field: std::collections::BTreeMap<String, Vec<Option<f64>>>,
    },
    
    /// Recursive variant
    D(Box<ComplexVariants>),
}

/// Function with extremely complex signature
pub fn complex_signature<'a, T, U, E>(
    _param1: &'a mut std::collections::HashMap<String, Vec<T>>,
    param2: impl Iterator<Item = Result<U, E>> + Send + 'a,
    _param3: Box<dyn Fn(T) -> U + Send + Sync>,
) -> Result<Vec<U>, Box<dyn std::error::Error + Send + Sync>>
where
    T: Clone + Send + Sync + std::fmt::Debug + 'a,
    U: Default + Send + 'a,
    E: std::error::Error + Send + Sync + 'static,
{
    // Collect results to avoid inference issues
    let results: Result<Vec<U>, E> = param2.collect();
    match results {
        Ok(items) => Ok(items),
        Err(e) => Err(Box::new(e)),
    }
}

/// Function that might cause parsing issues
pub fn potential_parsing_issues() {
    // String with quotes and escapes
    let _s = "This has \"quotes\" and \\ backslashes";
    
    // Raw string that might confuse parsers
    let _raw = r#"Raw string with "quotes" and #hashtags"#;
    
    // Multi-line string
    let _multi = "This is a \
                 multi-line string \
                 that continues";
    
    // Complex macro usage
    println!("Value: {}", stringify!(complex_macro_arg!()));
}

/// Macro definition to test macro symbol extraction
macro_rules! test_macro {
    ($name:ident) => {
        /// Generated by macro
        pub fn $name() {
            println!("Generated function");
        }
    };
    
    ($name:ident, $type:ty) => {
        /// Generated struct by macro
        pub struct $name {
            pub field: $type,
        }
    };
}

// Use the macro to generate symbols
test_macro!(generated_function);
test_macro!(GeneratedStruct, i32);

/// Test module boundaries and symbol resolution
pub mod inner_test {
    /// Inner module function
    pub fn inner_function() {}
    
    /// Re-export from parent
    pub use super::NoDocStruct;
    
    /// Type alias
    pub type InnerAlias = super::MixedVisibility;
}

/// Constants with various types
pub const SIMPLE_CONST: i32 = 42;
pub const COMPLEX_CONST: &'static [&'static str] = &["one", "two", "three"];
pub const COMPUTED_CONST: usize = std::mem::size_of::<MixedVisibility>();

/// Static items
pub static SIMPLE_STATIC: std::sync::Mutex<i32> = std::sync::Mutex::new(0);
pub static mut MUTABLE_STATIC: i32 = 0;

/// External items and FFI
extern "C" {
    /// External function
    pub fn external_function(x: i32) -> i32;
    
    /// External static
    pub static EXTERNAL_STATIC: i32;
}

/// Tests for function that might be hard to parse
pub fn edge_case_testing() {
    // Test all the edge cases
    let _ = NoDocStruct { field: 1 };
    doc_above_function();
    doc_below_function();
    
    let mixed = MixedVisibility::new();
    mixed.with_doc_method();
    
    println!("Edge case testing complete");
}