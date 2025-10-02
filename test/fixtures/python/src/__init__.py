"""
LSP CLI Test Application Package.

This package demonstrates comprehensive Python features for LSP CLI testing:
- Classes with inheritance and magic methods
- Async/await functionality
- Decorators and descriptors
- Context managers
- Type hints and generics
- Documentation strings
- Inline comments
"""

__version__ = "1.0.0"
__author__ = "Test Suite"
__email__ = "test@example.com"
__license__ = "MIT"

# Import main components for easy access
from .main import initialize_application, process_user_data, main
from .models import User, UserRole, UserStatus
from .services import DataService, DatabaseConnection
from .constants import (
    APP_NAME, 
    VERSION, 
    DEFAULT_PORT,
    LogLevel,
    HttpStatus
)
from .utils import (
    format_timestamp,
    validate_input,
    parse_config,
    calculate_hash,
    retry_operation
)

# Define what gets imported with "from src import *"
__all__ = [
    # Core functions
    'initialize_application',
    'process_user_data', 
    'main',
    
    # Models
    'User',
    'UserRole',
    'UserStatus',
    
    # Services
    'DataService',
    'DatabaseConnection',
    
    # Constants
    'APP_NAME',
    'VERSION',
    'DEFAULT_PORT',
    'LogLevel',
    'HttpStatus',
    
    # Utilities
    'format_timestamp',
    'validate_input',
    'parse_config',
    'calculate_hash',
    'retry_operation',
    
    # Package metadata
    '__version__',
    '__author__',
    '__email__',
    '__license__'
]

# Package-level configuration
DEFAULT_CONFIG = {
    'debug': False,
    'log_level': 'INFO',
    'port': DEFAULT_PORT,
    'timeout': 30
}

def get_version() -> str:
    """Get package version."""
    return __version__


def get_package_info() -> dict:
    """
    Get comprehensive package information.
    
    Returns:
        Dictionary with package metadata
    """
    return {
        'name': 'lsp-cli-test-app',
        'version': __version__,
        'author': __author__,
        'email': __email__,
        'license': __license__,
        'python_requires': '>=3.8'
    }