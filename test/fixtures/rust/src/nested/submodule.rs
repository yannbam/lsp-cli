//! Submodule for testing deep module hierarchy

/// Struct in submodule
#[derive(Debug, Clone)]
pub struct SubmoduleStruct {
    /// Data field
    pub data: Vec<u8>,
}

impl SubmoduleStruct {
    /// Create new submodule struct
    pub fn new(data: Vec<u8>) -> Self {
        Self { data }
    }
    
    /// Get data length
    pub fn len(&self) -> usize {
        self.data.len()
    }
    
    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.data.is_empty()
    }
}

/// Function in submodule
pub fn submodule_function(input: &str) -> SubmoduleStruct {
    SubmoduleStruct::new(input.as_bytes().to_vec())
}