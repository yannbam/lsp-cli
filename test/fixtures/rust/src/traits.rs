//! Trait definitions and implementations for testing
//! 
//! This module tests trait extraction, implementations,
//! and associated type/constant handling.

use std::fmt::Display;

/// A basic trait with documentation
pub trait Drawable {
    /// Draw the object
    fn draw(&self);
    
    /// Get the area (default implementation)
    fn area(&self) -> f64 {
        0.0
    }
}

/// Trait with associated types and constants
pub trait Container<T> {
    /// The type of iterator this container provides
    type Iterator: Iterator<Item = T>;
    
    /// Maximum capacity of the container
    const MAX_CAPACITY: usize;
    
    /// Add an item to the container
    fn add(&mut self, item: T);
    
    /// Get an iterator over the items
    fn iter(&self) -> Self::Iterator;
    
    /// Check if container is full
    fn is_full(&self) -> bool;
}

/// Trait with generic bounds and where clauses
pub trait Processor<T>
where
    T: Clone + Display,
{
    /// The output type after processing
    type Output;
    
    /// Process the input
    fn process(&self, input: T) -> Self::Output;
    
    /// Process multiple items
    fn process_batch(&self, items: Vec<T>) -> Vec<Self::Output> {
        // Default implementation
        items.into_iter().map(|item| self.process(item)).collect()
    }
}

/// Marker trait (no methods)
pub trait Serializable {}

/// Trait with lifetime parameters
pub trait Borrower<'a> {
    /// The borrowed type
    type Borrowed: 'a;
    
    /// Borrow something
    fn borrow(&'a self) -> Self::Borrowed;
}

/// Struct that implements multiple traits
#[derive(Debug, Clone)]
pub struct Rectangle {
    pub width: f64,
    pub height: f64,
}

impl Drawable for Rectangle {
    /// Draw a rectangle
    fn draw(&self) {
        // Draw implementation
        println!("Drawing rectangle {}x{}", self.width, self.height);
    }
    
    /// Calculate rectangle area
    fn area(&self) -> f64 {
        // Area calculation
        self.width * self.height
    }
}

/// Implementation with associated type specification
impl Container<i32> for Rectangle {
    type Iterator = std::vec::IntoIter<i32>;
    const MAX_CAPACITY: usize = 100;
    
    fn add(&mut self, _item: i32) {
        // Implementation details
        todo!("Add implementation")
    }
    
    fn iter(&self) -> Self::Iterator {
        // Return empty iterator for this test
        vec![].into_iter()
    }
    
    fn is_full(&self) -> bool {
        // Always false for this test
        false
    }
}

impl Serializable for Rectangle {}

/// Generic struct with trait bounds
#[derive(Debug)]
pub struct Wrapper<T: Clone> {
    pub value: T,
}

impl<T: Clone + Display> Processor<T> for Wrapper<T> {
    type Output = String;
    
    /// Process by converting to string
    fn process(&self, input: T) -> Self::Output {
        // Format the input
        format!("Processed: {}", input)
    }
}

/// Trait object usage function
pub fn draw_all(drawables: Vec<Box<dyn Drawable>>) {
    // Draw each item
    for drawable in drawables {
        drawable.draw();
        // Also get area
        let area = drawable.area();
        println!("Area: {}", area);
    }
}

/// Function using trait bounds
pub fn process_drawable<T>(item: T) -> f64 
where 
    T: Drawable,
{
    // Get the area
    item.area()
}

/// Async trait (if supported)
#[cfg(feature = "async")]
pub trait AsyncProcessor {
    /// Async processing method
    async fn process_async(&self, data: String) -> Result<String, String>;
}

/// Implementation with lifetime bounds
impl<'a> Borrower<'a> for Rectangle {
    type Borrowed = &'a f64;
    
    fn borrow(&'a self) -> Self::Borrowed {
        // Borrow the width
        &self.width
    }
}

/// Test function for trait functionality
pub fn test_traits() {
    // Create a rectangle
    let rect = Rectangle { width: 10.0, height: 5.0 };
    
    // Test Drawable trait
    rect.draw();
    let area = rect.area();
    
    // Test Container trait
    let is_full = rect.is_full();
    
    // Test generic wrapper
    let wrapper = Wrapper { value: 42 };
    let processed = wrapper.process(100);
    
    println!("Area: {}, Full: {}, Processed: {}", area, is_full, processed);
}