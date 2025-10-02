//! Nested module for testing module hierarchy
//! 
//! This module tests how LSP handles nested modules,
//! visibility modifiers, and symbol resolution across modules.

pub mod submodule;
pub mod utils;

use crate::StandardPerson;

/// Module-level constant
pub const MODULE_VERSION: &str = "1.0.0";

/// Private module constant
const PRIVATE_CONSTANT: i32 = 42;

/// Public struct in nested module
#[derive(Debug)]
pub struct ModuleStruct {
    /// Public field
    pub public_field: String,
    /// Package-private field
    pub(crate) crate_field: i32,
    /// Module-private field
    pub(self) module_field: f64,
    /// Fully private field
    private_field: bool,
}

impl ModuleStruct {
    /// Create new instance
    pub fn new(name: String) -> Self {
        Self {
            public_field: name,
            crate_field: 0,
            module_field: 0.0,
            private_field: false,
        }
    }
    
    /// Public method
    pub fn public_method(&self) -> &str {
        &self.public_field
    }
    
    /// Crate-visible method
    pub(crate) fn crate_method(&mut self) {
        self.crate_field += 1;
    }
    
    /// Module-visible method
    pub(self) fn module_method(&mut self) {
        self.module_field += 1.0;
    }
    
    /// Private method
    fn private_method(&mut self) {
        self.private_field = !self.private_field;
    }
}

/// Function using type from parent module
pub fn use_parent_type(person: StandardPerson) -> String {
    format!("Processing person: {}", person.name)
}

/// Re-export from submodule
pub use submodule::SubmoduleStruct;

/// Type alias
pub type ModuleResult<T> = Result<T, ModuleError>;

/// Module-specific error type
#[derive(Debug)]
pub enum ModuleError {
    /// Invalid input error
    InvalidInput(String),
    /// Processing error
    ProcessingError { 
        /// Error code
        code: u32, 
        /// Error message
        message: String 
    },
}

/// Function with module-specific types
pub fn process_data(input: &str) -> ModuleResult<ModuleStruct> {
    if input.is_empty() {
        Err(ModuleError::InvalidInput("Input cannot be empty".to_string()))
    } else {
        Ok(ModuleStruct::new(input.to_string()))
    }
}