"""
Application constants and configuration values.

This module demonstrates:
- Module-level constants  
- Enums with different value types
- Configuration dictionaries
- Type annotations for constants
"""

from enum import Enum, IntEnum, Flag, auto
from typing import Dict, List, Tuple, Final

# String constants
APP_NAME: Final[str] = "LSP CLI Test Application"
VERSION: Final[str] = "1.0.0"
AUTHOR: Final[str] = "Test Suite"
LICENSE: Final[str] = "MIT"

# Numeric constants  
DEFAULT_PORT: Final[int] = 8080
MAX_CONNECTIONS: Final[int] = 1000
TIMEOUT_SECONDS: Final[int] = 30
BUFFER_SIZE: Final[int] = 8192

# Boolean constants
DEBUG_ENABLED: Final[bool] = True
LOGGING_ENABLED: Final[bool] = True
METRICS_ENABLED: Final[bool] = False

# Collection constants
SUPPORTED_FORMATS: Final[List[str]] = ['json', 'xml', 'yaml', 'csv']
MIME_TYPES: Final[Dict[str, str]] = {
    'json': 'application/json',
    'xml': 'application/xml', 
    'yaml': 'application/x-yaml',
    'csv': 'text/csv'
}

DEFAULT_HEADERS: Final[Dict[str, str]] = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': f'{APP_NAME}/{VERSION}'
}

# Configuration tuples
DATABASE_CONFIG: Final[Tuple[str, int, str]] = ('localhost', 5432, 'testdb')
REDIS_CONFIG: Final[Tuple[str, int]] = ('localhost', 6379)


class LogLevel(Enum):
    """Logging level enumeration."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class HttpStatus(IntEnum):
    """HTTP status codes."""
    OK = 200
    CREATED = 201
    ACCEPTED = 202
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    METHOD_NOT_ALLOWED = 405
    CONFLICT = 409
    INTERNAL_SERVER_ERROR = 500
    NOT_IMPLEMENTED = 501
    BAD_GATEWAY = 502
    SERVICE_UNAVAILABLE = 503


class Permission(Flag):
    """Permission flags using Flag enum."""
    READ = auto()
    WRITE = auto()
    EXECUTE = auto()
    DELETE = auto()
    
    # Combinations
    READ_WRITE = READ | WRITE
    READ_EXECUTE = READ | EXECUTE
    ALL = READ | WRITE | EXECUTE | DELETE


class CacheStrategy(Enum):
    """Cache strategy options."""
    NO_CACHE = "no_cache"
    MEMORY_ONLY = "memory_only"
    DISK_ONLY = "disk_only"
    MEMORY_AND_DISK = "memory_and_disk"
    DISTRIBUTED = "distributed"


# Environment-specific configurations
DEVELOPMENT_CONFIG: Final[Dict[str, any]] = {
    'debug': True,
    'log_level': LogLevel.DEBUG.value,
    'cache_strategy': CacheStrategy.MEMORY_ONLY.value,
    'max_connections': 100,
    'timeout': 10
}

PRODUCTION_CONFIG: Final[Dict[str, any]] = {
    'debug': False,
    'log_level': LogLevel.INFO.value,
    'cache_strategy': CacheStrategy.MEMORY_AND_DISK.value,
    'max_connections': MAX_CONNECTIONS,
    'timeout': TIMEOUT_SECONDS
}

TEST_CONFIG: Final[Dict[str, any]] = {
    'debug': True,
    'log_level': LogLevel.WARNING.value,
    'cache_strategy': CacheStrategy.NO_CACHE.value,
    'max_connections': 10,
    'timeout': 5
}

# Regular expressions
EMAIL_PATTERN: Final[str] = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
PHONE_PATTERN: Final[str] = r'^\+?1?-?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})$'
URL_PATTERN: Final[str] = r'^https?://(?:[-\w.])+(?:[:\d]+)?/(?:[\w/_.])*(?:\?(?:[\w&%._=+-])*)?(?:#(?:\w)*)?$'

# Error messages
ERROR_MESSAGES: Final[Dict[str, str]] = {
    'invalid_input': 'Invalid input provided',
    'unauthorized': 'Unauthorized access attempt',
    'not_found': 'Requested resource not found',
    'server_error': 'Internal server error occurred',
    'timeout': 'Operation timed out',
    'connection_failed': 'Failed to establish connection'
}

# Default values for various components
DEFAULT_USER_ROLE: Final[str] = "user"
DEFAULT_CACHE_TTL: Final[int] = 3600  # 1 hour in seconds
DEFAULT_PAGE_SIZE: Final[int] = 20
DEFAULT_MAX_RETRIES: Final[int] = 3

# File and directory constants
UPLOAD_DIR: Final[str] = "/tmp/uploads"
LOG_DIR: Final[str] = "/var/log/app"
CONFIG_DIR: Final[str] = "/etc/app"
DATA_DIR: Final[str] = "/var/lib/app"

ALLOWED_EXTENSIONS: Final[set] = {'.txt', '.pdf', '.doc', '.docx', '.jpg', '.png', '.gif'}
MAX_FILE_SIZE: Final[int] = 10 * 1024 * 1024  # 10MB in bytes

# API versioning
API_VERSION: Final[str] = "v1"
API_BASE_PATH: Final[str] = f"/api/{API_VERSION}"

# Rate limiting
RATE_LIMIT_REQUESTS: Final[int] = 100
RATE_LIMIT_WINDOW: Final[int] = 3600  # 1 hour in seconds

# Security constants
SECRET_KEY_LENGTH: Final[int] = 32
TOKEN_EXPIRY_HOURS: Final[int] = 24
PASSWORD_MIN_LENGTH: Final[int] = 8
MAX_LOGIN_ATTEMPTS: Final[int] = 5

# Monitoring and metrics
METRICS_COLLECTION_INTERVAL: Final[int] = 60  # seconds
HEALTH_CHECK_TIMEOUT: Final[int] = 5  # seconds
ALERT_THRESHOLD_CPU: Final[float] = 80.0  # percentage
ALERT_THRESHOLD_MEMORY: Final[float] = 85.0  # percentage