"""
Utility helper functions with comprehensive inline comments.

This module demonstrates:
- Standalone utility functions
- Extensive inline comments within function bodies
- Various parameter types and return values
- Error handling patterns
- Type hints for all functions
"""

import re
import json
import hashlib
import time
from typing import Any, Dict, Optional, Union, Callable, TypeVar
from datetime import datetime, timezone
from pathlib import Path

# Type variable for generic functions
F = TypeVar('F', bound=Callable[..., Any])

# Module constants
DEFAULT_ENCODING = 'utf-8'
TIMESTAMP_FORMAT = '%Y-%m-%d %H:%M:%S'
CONFIG_EXTENSIONS = ['.json', '.yaml', '.yml', '.toml']


def format_timestamp(dt: Optional[datetime] = None, include_timezone: bool = True) -> str:
    """
    Format datetime as string with optional timezone.
    
    Args:
        dt: Datetime to format (defaults to now)
        include_timezone: Whether to include timezone info
        
    Returns:
        Formatted timestamp string
    """
    # Use current time if none provided
    if dt is None:
        dt = datetime.now(timezone.utc) if include_timezone else datetime.now()
        
    # Choose format based on timezone requirement
    if include_timezone and dt.tzinfo:
        # Include timezone information
        base_format = TIMESTAMP_FORMAT + ' %Z'
        formatted = dt.strftime(base_format)
    else:
        # Standard format without timezone
        formatted = dt.strftime(TIMESTAMP_FORMAT)
        
    # Ensure consistent formatting
    return formatted.strip()


def validate_input(data: Any, required_fields: Optional[list] = None, 
                  max_length: Optional[int] = None) -> bool:
    """
    Validate input data against various criteria.
    
    Args:
        data: Data to validate
        required_fields: Required fields for dict data
        max_length: Maximum length for string/list data
        
    Returns:
        True if validation passes
        
    Raises:
        ValueError: If validation fails
    """
    # Handle None data
    if data is None:
        raise ValueError("Data cannot be None")
        
    # Validate dictionary data
    if isinstance(data, dict):
        # Check for required fields
        if required_fields:
            missing_fields = []
            
            # Find missing required fields
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
                    
            # Raise error if fields are missing
            if missing_fields:
                raise ValueError(f"Missing required fields: {missing_fields}")
                
        # Validate field values are not empty
        for key, value in data.items():
            if value is None or (isinstance(value, str) and not value.strip()):
                raise ValueError(f"Field '{key}' cannot be empty")
                
    # Validate string data
    elif isinstance(data, str):
        # Check if string is empty
        if not data.strip():
            raise ValueError("String cannot be empty")
            
        # Check maximum length
        if max_length and len(data) > max_length:
            raise ValueError(f"String too long: {len(data)} > {max_length}")
            
    # Validate list data
    elif isinstance(data, list):
        # Check if list is empty
        if not data:
            raise ValueError("List cannot be empty")
            
        # Check maximum length
        if max_length and len(data) > max_length:
            raise ValueError(f"List too long: {len(data)} > {max_length}")
            
        # Validate list items are not None
        for i, item in enumerate(data):
            if item is None:
                raise ValueError(f"List item at index {i} cannot be None")
                
    return True


def parse_config(config_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Parse configuration file from various formats.
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        Parsed configuration dictionary
        
    Raises:
        FileNotFoundError: If config file doesn't exist
        ValueError: If config format is unsupported or invalid
    """
    # Convert to Path object for easier handling
    path = Path(config_path)
    
    # Check if file exists
    if not path.exists():
        raise FileNotFoundError(f"Configuration file not found: {path}")
        
    # Check if it's a file
    if not path.is_file():
        raise ValueError(f"Path is not a file: {path}")
        
    # Get file extension
    extension = path.suffix.lower()
    
    # Validate supported extensions
    if extension not in CONFIG_EXTENSIONS:
        supported = ', '.join(CONFIG_EXTENSIONS)
        raise ValueError(f"Unsupported config format: {extension}. Supported: {supported}")
        
    # Read file content
    try:
        content = path.read_text(encoding=DEFAULT_ENCODING)
    except UnicodeDecodeError as e:
        raise ValueError(f"Failed to decode config file: {e}")
        
    # Parse based on file extension
    try:
        if extension == '.json':
            # Parse JSON configuration
            config = json.loads(content)
            
        elif extension in ['.yaml', '.yml']:
            # Parse YAML configuration (would require PyYAML)
            # For demonstration, we'll simulate YAML parsing
            config = {"format": "yaml", "content": content}
            
        elif extension == '.toml':
            # Parse TOML configuration (would require toml library)
            # For demonstration, we'll simulate TOML parsing
            config = {"format": "toml", "content": content}
            
        else:
            # This shouldn't happen due to earlier validation
            raise ValueError(f"Internal error: unhandled extension {extension}")
            
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in config file: {e}")
        
    # Validate parsed configuration
    if not isinstance(config, dict):
        raise ValueError("Configuration must be a dictionary/object")
        
    # Log successful parsing
    print(f"Successfully parsed {extension} config with {len(config)} keys")
    
    return config


def calculate_hash(data: Union[str, bytes, Dict[str, Any]], 
                  algorithm: str = 'sha256') -> str:
    """
    Calculate hash of various data types.
    
    Args:
        data: Data to hash
        algorithm: Hash algorithm to use
        
    Returns:
        Hexadecimal hash string
        
    Raises:
        ValueError: If algorithm is unsupported or data cannot be hashed
    """
    # Validate hash algorithm
    supported_algorithms = ['md5', 'sha1', 'sha256', 'sha512']
    if algorithm not in supported_algorithms:
        raise ValueError(f"Unsupported algorithm: {algorithm}. Supported: {supported_algorithms}")
        
    # Get hash function
    try:
        hash_func = getattr(hashlib, algorithm)()
    except AttributeError:
        raise ValueError(f"Hash algorithm not available: {algorithm}")
        
    # Convert data to bytes for hashing
    if isinstance(data, str):
        # Hash string data directly
        hash_func.update(data.encode(DEFAULT_ENCODING))
        
    elif isinstance(data, bytes):
        # Hash bytes data directly
        hash_func.update(data)
        
    elif isinstance(data, dict):
        # Serialize dictionary to JSON for consistent hashing
        json_str = json.dumps(data, sort_keys=True, separators=(',', ':'))
        hash_func.update(json_str.encode(DEFAULT_ENCODING))
        
    else:
        # Try to convert to string as fallback
        try:
            str_data = str(data)
            hash_func.update(str_data.encode(DEFAULT_ENCODING))
        except Exception as e:
            raise ValueError(f"Cannot hash data of type {type(data)}: {e}")
            
    # Return hexadecimal digest
    result = hash_func.hexdigest()
    
    # Log hash calculation for debugging
    print(f"Calculated {algorithm} hash: {result[:16]}...")
    
    return result


def retry_operation(func: F, max_attempts: int = 3, delay: float = 1.0, 
                   exponential_backoff: bool = True) -> F:
    """
    Retry wrapper for operations that might fail.
    
    Args:
        func: Function to retry
        max_attempts: Maximum number of attempts
        delay: Initial delay between attempts
        exponential_backoff: Whether to use exponential backoff
        
    Returns:
        Result of successful function call
        
    Raises:
        Exception: Last exception if all attempts fail
    """
    def wrapper(*args, **kwargs):
        last_exception = None
        current_delay = delay
        
        # Attempt the operation multiple times
        for attempt in range(max_attempts):
            try:
                # Call the original function
                result = func(*args, **kwargs)
                
                # Log successful attempt if not first try
                if attempt > 0:
                    print(f"Operation succeeded on attempt {attempt + 1}")
                    
                return result
                
            except Exception as e:
                # Store the exception for potential re-raising
                last_exception = e
                
                # Log the failed attempt
                if attempt < max_attempts - 1:
                    print(f"Attempt {attempt + 1} failed: {e}")
                    print(f"Retrying in {current_delay} seconds...")
                    
                    # Wait before next attempt
                    time.sleep(current_delay)
                    
                    # Increase delay for exponential backoff
                    if exponential_backoff:
                        current_delay *= 2
                        
                else:
                    # Final attempt failed
                    print(f"All {max_attempts} attempts failed")
                    
        # Re-raise the last exception
        if last_exception:
            raise last_exception
            
    return wrapper  # type: ignore


def sanitize_filename(filename: str, replacement: str = '_') -> str:
    """
    Sanitize filename by removing invalid characters.
    
    Args:
        filename: Original filename
        replacement: Character to replace invalid chars with
        
    Returns:
        Sanitized filename safe for filesystem
    """
    # Define invalid characters for most filesystems
    invalid_chars = r'[<>:"/\\|?*\x00-\x1f]'
    
    # Replace invalid characters
    sanitized = re.sub(invalid_chars, replacement, filename)
    
    # Remove leading/trailing whitespace and dots
    sanitized = sanitized.strip(' .')
    
    # Handle empty filename
    if not sanitized:
        sanitized = 'unnamed_file'
        
    # Limit filename length (most filesystems support 255 chars)
    max_length = 255
    if len(sanitized) > max_length:
        # Keep extension if present
        name, ext = Path(sanitized).stem, Path(sanitized).suffix
        available_length = max_length - len(ext)
        sanitized = name[:available_length] + ext
        
    return sanitized


def deep_merge_dicts(dict1: Dict[str, Any], dict2: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deep merge two dictionaries.
    
    Args:
        dict1: Base dictionary
        dict2: Dictionary to merge into base
        
    Returns:
        New dictionary with merged values
    """
    # Start with copy of first dictionary
    result = dict1.copy()
    
    # Merge each key from second dictionary
    for key, value in dict2.items():
        if key in result:
            # Both dictionaries have this key
            if isinstance(result[key], dict) and isinstance(value, dict):
                # Both values are dicts - recursively merge
                result[key] = deep_merge_dicts(result[key], value)
            else:
                # At least one value is not a dict - second dict wins
                result[key] = value
        else:
            # Key only in second dictionary - add it
            result[key] = value
            
    return result


# Module-level variable for testing
_module_cache: Dict[str, Any] = {}


def get_or_compute(key: str, compute_func: Callable[[], Any]) -> Any:
    """
    Get cached value or compute and cache it.
    
    Args:
        key: Cache key
        compute_func: Function to compute value if not cached
        
    Returns:
        Cached or newly computed value
    """
    # Check cache first
    if key in _module_cache:
        print(f"Cache hit for key: {key}")
        return _module_cache[key]
        
    # Compute new value
    print(f"Cache miss for key: {key}, computing...")
    value = compute_func()
    
    # Store in cache
    _module_cache[key] = value
    
    return value