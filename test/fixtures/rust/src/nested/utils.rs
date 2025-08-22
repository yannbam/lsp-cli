//! Utility functions for the nested module

use super::ModuleStruct;

/// Utility function with super import
pub fn format_module_struct(module_struct: &ModuleStruct) -> String {
    format!("ModuleStruct({})", module_struct.public_field)
}

/// Private utility function
fn private_helper() -> &'static str {
    "helper"
}

/// Another utility using private helper
pub fn get_helper_info() -> String {
    format!("Helper: {}", private_helper())
}