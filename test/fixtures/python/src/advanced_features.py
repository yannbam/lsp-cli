"""
Advanced Python features demonstration.

This module showcases:
- Magic methods (__dunder__ methods)
- Property decorators and descriptors
- Multiple inheritance and method resolution order
- Context managers
- Metaclasses
- Generators and iterators
- Coroutines and async generators
"""

import asyncio
from typing import Any, Iterator, AsyncIterator, Optional, Type
from abc import ABC, abstractmethod
from contextlib import contextmanager, asynccontextmanager


class LoggingMeta(type):
    """
    Metaclass that adds logging to method calls.
    
    Demonstrates metaclass usage for advanced Python features.
    """
    
    def __new__(mcs, name: str, bases: tuple, dct: dict):
        """Create new class with logging wrapper."""
        # Wrap methods with logging
        for key, value in dct.items():
            if callable(value) and not key.startswith('_'):
                dct[key] = mcs._wrap_with_logging(value, key)
                
        return super().__new__(mcs, name, bases, dct)
        
    @staticmethod
    def _wrap_with_logging(func, method_name: str):
        """Wrap method with logging functionality."""
        def wrapper(*args, **kwargs):
            # Log method entry
            print(f"Calling method: {method_name}")
            
            try:
                # Execute original method
                result = func(*args, **kwargs)
                print(f"Method {method_name} completed successfully")
                return result
            except Exception as e:
                # Log method failure
                print(f"Method {method_name} failed: {e}")
                raise
                
        return wrapper


class Descriptor:
    """
    Custom descriptor demonstrating descriptor protocol.
    """
    
    def __init__(self, name: str, validator=None):
        self.name = name
        self.private_name = f'_{name}'
        self.validator = validator
        
    def __get__(self, obj, objtype=None):
        """Get descriptor value."""
        if obj is None:
            return self
        return getattr(obj, self.private_name, None)
        
    def __set__(self, obj, value):
        """Set descriptor value with validation."""
        # Run validator if provided
        if self.validator:
            if not self.validator(value):
                raise ValueError(f"Invalid value for {self.name}: {value}")
                
        # Store the value
        setattr(obj, self.private_name, value)
        
    def __delete__(self, obj):
        """Delete descriptor value."""
        delattr(obj, self.private_name)


def positive_validator(value: Any) -> bool:
    """Validator for positive numbers."""
    return isinstance(value, (int, float)) and value > 0


class Mixins:
    """Mixin classes for demonstrating multiple inheritance."""
    
    class Serializable:
        """Mixin for serialization capabilities."""
        
        def to_dict(self) -> dict:
            """Convert object to dictionary."""
            # Get all non-private attributes
            result = {}
            for key, value in self.__dict__.items():
                if not key.startswith('_'):
                    result[key] = value
            return result
            
        def from_dict(self, data: dict) -> None:
            """Populate object from dictionary."""
            # Set attributes from dictionary data
            for key, value in data.items():
                if hasattr(self, key):
                    setattr(self, key, value)
                    
    class Timestamped:
        """Mixin for timestamp tracking."""
        
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            from datetime import datetime
            self.created_at = datetime.now()
            self.updated_at = datetime.now()
            
        def touch(self) -> None:
            """Update the timestamp."""
            from datetime import datetime
            self.updated_at = datetime.now()


class AdvancedContainer(Mixins.Serializable, Mixins.Timestamped, metaclass=LoggingMeta):
    """
    Advanced container class demonstrating multiple Python features.
    
    Features:
    - Magic methods for container behavior
    - Property decorators
    - Context manager protocol
    - Multiple inheritance
    - Metaclass usage
    """
    
    # Descriptor usage
    capacity = Descriptor('capacity', positive_validator)
    
    def __init__(self, name: str, initial_capacity: int = 10):
        """
        Initialize advanced container.
        
        Args:
            name: Container name
            initial_capacity: Initial capacity
        """
        super().__init__()  # Call mixin constructors
        
        self.name = name
        self.capacity = initial_capacity
        self._items = []
        self._locked = False
        
    def __len__(self) -> int:
        """Return number of items in container."""
        return len(self._items)
        
    def __getitem__(self, index: int) -> Any:
        """Get item by index."""
        # Validate index range
        if not 0 <= index < len(self._items):
            raise IndexError(f"Index {index} out of range")
        return self._items[index]
        
    def __setitem__(self, index: int, value: Any) -> None:
        """Set item by index."""
        # Check if container is locked
        if self._locked:
            raise RuntimeError("Container is locked")
            
        # Validate index range
        if not 0 <= index < len(self._items):
            raise IndexError(f"Index {index} out of range")
            
        # Update timestamp when modifying
        self.touch()
        self._items[index] = value
        
    def __delitem__(self, index: int) -> None:
        """Delete item by index."""
        if self._locked:
            raise RuntimeError("Container is locked")
            
        # Remove item and update timestamp
        del self._items[index]
        self.touch()
        
    def __iter__(self) -> Iterator[Any]:
        """Return iterator over items."""
        return iter(self._items)
        
    def __reversed__(self) -> Iterator[Any]:
        """Return reversed iterator."""
        return reversed(self._items)
        
    def __contains__(self, item: Any) -> bool:
        """Check if item is in container."""
        return item in self._items
        
    def __bool__(self) -> bool:
        """Return True if container has items."""
        return len(self._items) > 0
        
    def __str__(self) -> str:
        """String representation."""
        return f"AdvancedContainer('{self.name}', {len(self._items)} items)"
        
    def __repr__(self) -> str:
        """Detailed representation."""
        return f"AdvancedContainer(name='{self.name}', capacity={self.capacity}, items={len(self._items)})"
        
    def __enter__(self):
        """Context manager entry."""
        # Lock container during context
        self._locked = True
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        # Unlock container
        self._locked = False
        
        # Handle exceptions
        if exc_type:
            print(f"Exception in container context: {exc_val}")
            
        return False  # Don't suppress exceptions
        
    @property
    def is_full(self) -> bool:
        """Check if container is at capacity."""
        return len(self._items) >= self.capacity
        
    @property
    def is_empty(self) -> bool:
        """Check if container is empty."""
        return len(self._items) == 0
        
    @property
    def utilization(self) -> float:
        """Get capacity utilization percentage."""
        return (len(self._items) / self.capacity) * 100
        
    def add_item(self, item: Any) -> bool:
        """
        Add item to container.
        
        Args:
            item: Item to add
            
        Returns:
            True if item was added
        """
        # Check capacity
        if self.is_full:
            print(f"Container '{self.name}' is at capacity")
            return False
            
        # Check if locked
        if self._locked:
            print("Cannot add item: container is locked")
            return False
            
        # Add item and update timestamp
        self._items.append(item)
        self.touch()
        return True
        
    def remove_item(self, item: Any) -> bool:
        """Remove item from container."""
        if self._locked:
            return False
            
        try:
            # Remove item and update timestamp
            self._items.remove(item)
            self.touch()
            return True
        except ValueError:
            # Item not found
            return False
            
    def clear(self) -> None:
        """Clear all items from container."""
        if not self._locked:
            self._items.clear()
            self.touch()


class AsyncDataProcessor:
    """
    Async data processor demonstrating async features.
    
    Features:
    - Async methods
    - Async context managers
    - Async generators
    - Coroutines
    """
    
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self._processing = False
        
    async def __aenter__(self):
        """Async context manager entry."""
        # Initialize async resources
        self._processing = True
        print("Starting async data processor")
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        # Cleanup async resources
        self._processing = False
        print("Stopping async data processor")
        
        if exc_type:
            print(f"Async processing error: {exc_val}")
            
        return False
        
    async def process_item(self, item: Any) -> Any:
        """
        Process a single item asynchronously.
        
        Args:
            item: Item to process
            
        Returns:
            Processed item
        """
        # Simulate async processing
        await asyncio.sleep(0.01)
        
        # Process the item
        if isinstance(item, str):
            processed = item.upper()
        elif isinstance(item, (int, float)):
            processed = item * 2
        else:
            processed = str(item)
            
        return processed
        
    async def process_batch(self, items: list) -> list:
        """Process a batch of items concurrently."""
        # Create tasks for concurrent processing
        tasks = [self.process_item(item) for item in items]
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks)
        
        return results
        
    async def stream_process(self, items: list) -> AsyncIterator[Any]:
        """
        Async generator for streaming processing.
        
        Args:
            items: Items to process
            
        Yields:
            Processed items one by one
        """
        # Process items in batches
        for i in range(0, len(items), self.batch_size):
            batch = items[i:i + self.batch_size]
            
            # Process batch concurrently
            processed_batch = await self.process_batch(batch)
            
            # Yield processed items
            for item in processed_batch:
                yield item
                
            # Small delay between batches
            await asyncio.sleep(0.01)


class IteratorExample:
    """Class demonstrating iterator protocol."""
    
    def __init__(self, data: list):
        self.data = data
        self.index = 0
        
    def __iter__(self):
        """Return iterator object."""
        return self
        
    def __next__(self):
        """Get next item in iteration."""
        # Check if we've reached the end
        if self.index >= len(self.data):
            raise StopIteration
            
        # Get current item and advance index
        item = self.data[self.index]
        self.index += 1
        
        return item


def fibonacci_generator(n: int) -> Iterator[int]:
    """
    Generator function for Fibonacci sequence.
    
    Args:
        n: Number of Fibonacci numbers to generate
        
    Yields:
        Fibonacci numbers
    """
    # Initialize first two Fibonacci numbers
    a, b = 0, 1
    count = 0
    
    # Generate Fibonacci numbers
    while count < n:
        yield a
        
        # Calculate next Fibonacci number
        a, b = b, a + b
        count += 1


@contextmanager
def temporary_config(config: dict):
    """
    Context manager for temporary configuration.
    
    Args:
        config: Temporary configuration values
    """
    # Save original configuration
    original_config = globals().get('_temp_config', {})
    
    try:
        # Apply temporary configuration
        globals()['_temp_config'] = config
        print(f"Applied temporary config: {list(config.keys())}")
        yield config
        
    finally:
        # Restore original configuration
        globals()['_temp_config'] = original_config
        print("Restored original configuration")


class CallableClass:
    """Class that implements __call__ to make instances callable."""
    
    def __init__(self, multiplier: int = 2):
        self.multiplier = multiplier
        self.call_count = 0
        
    def __call__(self, value: int) -> int:
        """Make instance callable like a function."""
        # Increment call counter
        self.call_count += 1
        
        # Apply multiplication
        result = value * self.multiplier
        
        # Log the call
        print(f"Callable instance called {self.call_count} times")
        
        return result


# Module-level callable instance
doubler = CallableClass(2)
tripler = CallableClass(3)