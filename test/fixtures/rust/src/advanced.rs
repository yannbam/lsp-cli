//! Advanced Rust constructs for comprehensive testing
//! 
//! This module contains complex language features to test
//! the limits of LSP symbol extraction.

use std::marker::PhantomData;
use std::collections::BTreeMap;

/// Generic struct with multiple type parameters and bounds
#[derive(Debug)]
pub struct ComplexGeneric<T, U, V> 
where
    T: Clone + Send + Sync,
    U: Default,
    V: Into<String>,
{
    /// Primary value
    pub primary: T,
    /// Secondary value with default
    pub secondary: U,
    /// Convertible value
    pub convertible: V,
    /// Phantom data for lifetime tracking
    phantom: PhantomData<(T, U, V)>,
}

impl<T, U, V> ComplexGeneric<T, U, V>
where
    T: Clone + Send + Sync,
    U: Default,
    V: Into<String>,
{
    /// Create a new complex generic instance
    pub fn new(primary: T, convertible: V) -> Self {
        Self {
            primary,
            secondary: U::default(),
            convertible,
            phantom: PhantomData,
        }
    }
    
    /// Get a reference to the primary value
    pub fn get_primary(&self) -> &T {
        &self.primary
    }
    
    /// Convert the convertible value to string
    pub fn convert_to_string(self) -> String {
        self.convertible.into()
    }
}

/// Enum with complex variants and generics
#[derive(Debug, Clone)]
pub enum ComplexEnum<T> {
    /// Empty variant
    Empty,
    /// Single value variant
    Single(T),
    /// Multiple values
    Multiple(T, String, u64),
    /// Struct-like variant with named fields
    Structured {
        /// Main data
        data: T,
        /// Metadata
        metadata: BTreeMap<String, String>,
        /// Optional flag
        enabled: bool,
    },
    /// Nested enum variant
    Nested(Box<ComplexEnum<T>>),
}

impl<T: Clone> ComplexEnum<T> {
    /// Check if the enum is empty
    pub fn is_empty(&self) -> bool {
        matches!(self, ComplexEnum::Empty)
    }
    
    /// Extract the data if it exists
    pub fn extract_data(&self) -> Option<T> {
        match self {
            ComplexEnum::Single(data) => Some(data.clone()),
            ComplexEnum::Multiple(data, _, _) => Some(data.clone()),
            ComplexEnum::Structured { data, .. } => Some(data.clone()),
            ComplexEnum::Nested(inner) => inner.extract_data(),
            ComplexEnum::Empty => None,
        }
    }
}

/// Struct with lifetime parameters
#[derive(Debug)]
pub struct LifetimeStruct<'a, 'b> {
    /// Reference with lifetime 'a
    pub short_lived: &'a str,
    /// Reference with lifetime 'b
    pub long_lived: &'b str,
}

impl<'a, 'b> LifetimeStruct<'a, 'b> {
    /// Create new instance with two different lifetimes
    pub fn new(short: &'a str, long: &'b str) -> Self {
        Self {
            short_lived: short,
            long_lived: long,
        }
    }
    
    /// Method with additional lifetime parameter
    pub fn compare_with<'c>(&self, other: &'c str) -> bool 
    where
        'a: 'c,  // Lifetime bound
    {
        self.short_lived == other
    }
}

/// Higher-kinded types simulation
pub struct HigherKinded<F> 
where
    F: Fn(i32) -> i32,
{
    /// Function stored in struct
    pub transformer: F,
}

impl<F> HigherKinded<F>
where
    F: Fn(i32) -> i32,
{
    /// Create new transformer
    pub fn new(func: F) -> Self {
        Self { transformer: func }
    }
    
    /// Apply the transformation
    pub fn apply(&self, value: i32) -> i32 {
        (self.transformer)(value)
    }
    
    /// Chain with another transformation
    pub fn chain<G>(self, other: G) -> HigherKinded<impl Fn(i32) -> i32>
    where
        G: Fn(i32) -> i32,
    {
        HigherKinded::new(move |x| other((self.transformer)(x)))
    }
}

/// Union-like enum (tagged union)
#[derive(Debug)]
pub enum TaggedUnion {
    /// Integer variant
    Integer(i64),
    /// Float variant  
    Float(f64),
    /// String variant
    Text(String),
    /// Binary data variant
    Binary(Vec<u8>),
    /// Nested structure
    Nested {
        /// Tag for the nested data
        tag: String,
        /// The actual nested data
        data: Box<TaggedUnion>,
    },
}

/// Macro for creating test data
macro_rules! create_test_data {
    ($name:ident, $type:ty, $value:expr) => {
        /// Auto-generated test data
        pub const $name: $type = $value;
    };
    
    (struct $name:ident { $($field:ident: $type:ty),* }) => {
        /// Auto-generated struct
        #[derive(Debug)]
        pub struct $name {
            $(pub $field: $type),*
        }
    };
}

// Use the macro to generate test data
create_test_data!(TEST_VALUE, i32, 42);
create_test_data!(TEST_STRING, &str, "test");

create_test_data!(struct MacroGenerated {
    id: u64,
    name: String,
    active: bool
});

/// Associated constants and types in impl block
impl MacroGenerated {
    /// Maximum ID value
    pub const MAX_ID: u64 = u64::MAX;
    
    /// Default name
    pub const DEFAULT_NAME: &'static str = "default";
    
    /// Create new instance with defaults
    pub fn with_defaults(id: u64) -> Self {
        Self {
            id,
            name: Self::DEFAULT_NAME.to_string(),
            active: true,
        }
    }
}

/// Function with complex return type
pub fn complex_return_type() -> impl Iterator<Item = Result<String, std::io::Error>> + Send + 'static {
    // Create iterator over results
    (0..10).map(|i| Ok(format!("item_{}", i)))
}

/// Async function (if supported)
#[cfg(feature = "async")]
pub async fn async_function(data: Vec<u8>) -> Result<String, Box<dyn std::error::Error>> {
    // Simulate async work
    tokio::time::sleep(std::time::Duration::from_millis(10)).await;
    
    // Convert to string
    let result = String::from_utf8(data)?;
    Ok(result)
}

/// Unsafe function for testing
pub unsafe fn unsafe_function(ptr: *const u8, len: usize) -> Vec<u8> {
    // Create slice from raw pointer
    let slice = std::slice::from_raw_parts(ptr, len);
    // Convert to vector
    slice.to_vec()
}

/// External function declaration
extern "C" {
    /// C function binding
    pub fn external_c_function(x: i32) -> i32;
}

/// Function with complex closure
pub fn with_complex_closure() -> impl Fn(i32) -> Box<dyn Fn(i32) -> i32> {
    // Return a closure that returns another closure
    |multiplier| {
        Box::new(move |x| x * multiplier)
    }
}

/// Test all advanced features
pub fn test_advanced_features() {
    // Test complex generic
    let complex: ComplexGeneric<i32, String, &str> = ComplexGeneric::new(42, "test");
    let primary = complex.get_primary();
    
    // Test complex enum
    let enum_val = ComplexEnum::Structured {
        data: 100,
        metadata: BTreeMap::new(),
        enabled: true,
    };
    let data = enum_val.extract_data();
    
    // Test lifetime struct
    let short = "short";
    let long = "long";
    let lifetime_struct = LifetimeStruct::new(short, long);
    
    // Test higher-kinded types
    let transformer = HigherKinded::new(|x| x * 2);
    let result = transformer.apply(5);
    
    // Test macro-generated data
    let generated = MacroGenerated::with_defaults(TEST_VALUE as u64);
    
    println!("Complex: {:?}, Data: {:?}, Result: {}, Generated: {:?}", 
             primary, data, result, generated);
}