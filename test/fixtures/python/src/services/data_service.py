"""
Data service with advanced Python features.

This module demonstrates:
- Async/await functionality
- Decorators (custom and built-in)
- Context managers
- Type hints with generics
- Exception handling
- Multiple inheritance
- Abstract base classes
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager, contextmanager
from functools import wraps, lru_cache
from typing import TypeVar, Generic, List, Dict, Optional, Union, Any, AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import json

# Type variables for generics
T = TypeVar('T')
K = TypeVar('K')
V = TypeVar('V')

# Module-level logger
logger = logging.getLogger(__name__)

# Configuration constants
DEFAULT_TIMEOUT = 30.0
MAX_RETRIES = 3
CACHE_SIZE = 1000


def retry_on_failure(max_retries: int = MAX_RETRIES):
    """
    Decorator for retrying failed operations.
    
    Args:
        max_retries: Maximum number of retry attempts
        
    Returns:
        Decorated function with retry logic
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Track retry attempts
            for attempt in range(max_retries + 1):
                try:
                    # Execute the function
                    result = await func(*args, **kwargs)
                    return result
                except Exception as e:
                    # Log the attempt
                    if attempt < max_retries:
                        logger.warning(f"Attempt {attempt + 1} failed: {e}")
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    else:
                        logger.error(f"All {max_retries + 1} attempts failed")
                        raise
        return wrapper
    return decorator


def performance_monitor(func):
    """Decorator to monitor function performance."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Record start time
        start_time = datetime.now()
        
        try:
            # Execute function
            result = await func(*args, **kwargs)
            return result
        finally:
            # Calculate execution time
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            # Log performance metrics
            logger.info(f"{func.__name__} executed in {duration:.3f}s")
            
    return wrapper


@dataclass
class ConnectionConfig:
    """Database connection configuration."""
    host: str
    port: int
    database: str
    username: str
    password: str
    timeout: float = DEFAULT_TIMEOUT
    ssl_enabled: bool = True
    connection_pool_size: int = 10
    
    # Fields with default factories
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """Validate configuration after initialization."""
        # Validate port range
        if not (1 <= self.port <= 65535):
            raise ValueError(f"Invalid port: {self.port}")
            
        # Validate timeout
        if self.timeout <= 0:
            raise ValueError("Timeout must be positive")


class DatabaseError(Exception):
    """Custom database exception."""
    
    def __init__(self, message: str, error_code: Optional[int] = None):
        super().__init__(message)
        self.error_code = error_code
        self.timestamp = datetime.now()


class ConnectionPool(ABC):
    """Abstract base class for connection pools."""
    
    @abstractmethod
    async def get_connection(self) -> Any:
        """Get a connection from the pool."""
        pass
        
    @abstractmethod
    async def return_connection(self, connection: Any) -> None:
        """Return a connection to the pool."""
        pass
        
    @abstractmethod
    async def close_all(self) -> None:
        """Close all connections in the pool."""
        pass


class SimpleConnectionPool(ConnectionPool):
    """Simple implementation of connection pool."""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self._connections: List[Any] = []
        self._available: List[Any] = []
        self._in_use: set = set()
        
    async def get_connection(self) -> Any:
        """Get connection with pool management."""
        # Check for available connections
        if self._available:
            connection = self._available.pop()
            self._in_use.add(connection)
            return connection
            
        # Create new connection if under limit
        if len(self._connections) < self.config.connection_pool_size:
            connection = await self._create_connection()
            self._connections.append(connection)
            self._in_use.add(connection)
            return connection
            
        # Wait for connection to become available
        while not self._available:
            await asyncio.sleep(0.1)
            
        connection = self._available.pop()
        self._in_use.add(connection)
        return connection
        
    async def return_connection(self, connection: Any) -> None:
        """Return connection to pool."""
        if connection in self._in_use:
            self._in_use.remove(connection)
            self._available.append(connection)
            
    async def close_all(self) -> None:
        """Close all connections."""
        # Close all connections
        for connection in self._connections:
            await self._close_connection(connection)
            
        # Clear all lists and sets
        self._connections.clear()
        self._available.clear()
        self._in_use.clear()
        
    async def _create_connection(self) -> Any:
        """Create a new database connection."""
        # Simulate connection creation
        await asyncio.sleep(0.1)
        return {"id": len(self._connections), "connected": True}
        
    async def _close_connection(self, connection: Any) -> None:
        """Close a database connection."""
        # Simulate connection closing
        connection["connected"] = False


class DatabaseConnection:
    """
    Database connection context manager.
    
    Demonstrates context manager protocol and resource management.
    """
    
    def __init__(self, pool: ConnectionPool):
        self.pool = pool
        self._connection: Optional[Any] = None
        
    async def __aenter__(self):
        """Async context manager entry."""
        # Get connection from pool
        self._connection = await self.pool.get_connection()
        logger.debug("Database connection acquired")
        return self._connection
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self._connection:
            # Return connection to pool
            await self.pool.return_connection(self._connection)
            logger.debug("Database connection returned to pool")
            
        # Handle exceptions
        if exc_type:
            logger.error(f"Database operation failed: {exc_val}")
            
        return False  # Don't suppress exceptions


class CacheManager(Generic[K, V]):
    """Generic cache manager with TTL support."""
    
    def __init__(self, max_size: int = CACHE_SIZE, ttl_seconds: int = 3600):
        self._cache: Dict[K, tuple[V, datetime]] = {}
        self.max_size = max_size
        self.ttl = timedelta(seconds=ttl_seconds)
        
    def get(self, key: K) -> Optional[V]:
        """Get cached value."""
        if key not in self._cache:
            return None
            
        value, timestamp = self._cache[key]
        
        # Check if expired
        if datetime.now() - timestamp > self.ttl:
            del self._cache[key]
            return None
            
        return value
        
    def set(self, key: K, value: V) -> None:
        """Set cached value."""
        # Clean expired entries if at capacity
        if len(self._cache) >= self.max_size:
            self._cleanup_expired()
            
        # Add to cache with timestamp
        self._cache[key] = (value, datetime.now())
        
    def _cleanup_expired(self) -> None:
        """Remove expired cache entries."""
        now = datetime.now()
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if now - timestamp > self.ttl
        ]
        
        # Remove expired entries
        for key in expired_keys:
            del self._cache[key]


class DataService(Generic[T]):
    """
    Comprehensive data service demonstrating advanced Python features.
    
    This class shows:
    - Generic types
    - Async/await
    - Context managers  
    - Decorators
    - Exception handling
    - Multiple inheritance concepts
    """
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self._pool = SimpleConnectionPool(config)
        self._cache: CacheManager[str, Any] = CacheManager()
        self._stats = {
            'queries_executed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': 0
        }
        
    @contextmanager
    def transaction_context(self):
        """Synchronous context manager for transactions."""
        # Begin transaction
        transaction_id = f"txn_{datetime.now().timestamp()}"
        logger.info(f"Beginning transaction {transaction_id}")
        
        try:
            yield transaction_id
            # Commit transaction
            logger.info(f"Committing transaction {transaction_id}")
        except Exception as e:
            # Rollback on error
            logger.error(f"Rolling back transaction {transaction_id}: {e}")
            raise
        finally:
            # Cleanup resources
            logger.debug(f"Transaction {transaction_id} cleanup complete")
            
    @asynccontextmanager
    async def async_transaction(self) -> AsyncGenerator[str, None]:
        """Async context manager for database transactions."""
        transaction_id = f"async_txn_{datetime.now().timestamp()}"
        
        # Get database connection
        async with DatabaseConnection(self._pool) as connection:
            try:
                # Begin transaction
                logger.info(f"Beginning async transaction {transaction_id}")
                yield transaction_id
                
                # Commit transaction
                logger.info(f"Committing async transaction {transaction_id}")
                
            except Exception as e:
                # Rollback on error
                logger.error(f"Rolling back async transaction {transaction_id}: {e}")
                raise
                
    @retry_on_failure(max_retries=3)
    @performance_monitor
    async def fetch_data(self, query: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Fetch data with caching, retries, and performance monitoring.
        
        Args:
            query: SQL query to execute
            params: Query parameters
            
        Returns:
            List of result rows
            
        Raises:
            DatabaseError: If query execution fails
        """
        # Generate cache key
        cache_key = self._generate_cache_key(query, params)
        
        # Check cache first
        cached_result = self._cache.get(cache_key)
        if cached_result is not None:
            self._stats['cache_hits'] += 1
            logger.debug(f"Cache hit for query: {query[:50]}...")
            return cached_result
            
        self._stats['cache_misses'] += 1
        
        # Execute query against database
        try:
            async with self.async_transaction() as txn_id:
                # Simulate database query execution
                await asyncio.sleep(0.1)  # Simulate query time
                
                # Mock result data
                result = [
                    {'id': 1, 'name': 'John Doe', 'query': query},
                    {'id': 2, 'name': 'Jane Smith', 'query': query}
                ]
                
                # Update statistics
                self._stats['queries_executed'] += 1
                
                # Cache the result
                self._cache.set(cache_key, result)
                
                logger.info(f"Query executed successfully in transaction {txn_id}")
                return result
                
        except Exception as e:
            # Update error statistics
            self._stats['errors'] += 1
            
            # Wrap in custom exception
            raise DatabaseError(f"Query execution failed: {e}", error_code=500)
            
    @lru_cache(maxsize=100)
    def _generate_cache_key(self, query: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Generate cache key for query and parameters."""
        # Create deterministic cache key
        if params:
            params_str = json.dumps(params, sort_keys=True)
            return f"{hash(query)}_{hash(params_str)}"
        else:
            return str(hash(query))
            
    async def batch_insert(self, table: str, records: List[Dict[str, Any]]) -> int:
        """
        Insert multiple records in batches.
        
        Args:
            table: Target table name
            records: List of records to insert
            
        Returns:
            Number of records inserted
        """
        inserted_count = 0
        batch_size = 100
        
        # Process records in batches
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            
            try:
                async with self.async_transaction() as txn_id:
                    # Simulate batch insert
                    await asyncio.sleep(0.05 * len(batch))
                    
                    # Log batch processing
                    logger.info(f"Inserted batch of {len(batch)} records into {table}")
                    inserted_count += len(batch)
                    
            except DatabaseError as e:
                logger.error(f"Failed to insert batch starting at index {i}: {e}")
                # Continue with next batch instead of failing completely
                continue
                
        return inserted_count
        
    async def search_with_filters(self, 
                                filters: Dict[str, Union[str, int, List[Any]]], 
                                sort_by: Optional[str] = None,
                                limit: int = 100) -> List[T]:
        """
        Advanced search with dynamic filtering.
        
        Args:
            filters: Dictionary of filter criteria
            sort_by: Field to sort by
            limit: Maximum number of results
            
        Returns:
            List of matching records
        """
        # Build dynamic query based on filters
        query_parts = ["SELECT * FROM data WHERE 1=1"]
        params = {}
        
        # Add filter conditions
        for field, value in filters.items():
            if isinstance(value, list):
                # Handle IN clauses
                placeholders = ','.join([f':{field}_{i}' for i in range(len(value))])
                query_parts.append(f"AND {field} IN ({placeholders})")
                
                # Add parameters for each value
                for i, val in enumerate(value):
                    params[f'{field}_{i}'] = val
            else:
                # Handle equality conditions
                query_parts.append(f"AND {field} = :{field}")
                params[field] = value
                
        # Add sorting
        if sort_by:
            query_parts.append(f"ORDER BY {sort_by}")
            
        # Add limit
        query_parts.append(f"LIMIT {limit}")
        
        # Execute the constructed query
        query = ' '.join(query_parts)
        results = await self.fetch_data(query, params)
        
        # Cast results to generic type T (in real implementation)
        return results  # type: ignore
        
    def get_statistics(self) -> Dict[str, Any]:
        """Get service performance statistics."""
        # Calculate cache hit rate
        total_requests = self._stats['cache_hits'] + self._stats['cache_misses']
        hit_rate = (self._stats['cache_hits'] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            **self._stats,
            'cache_hit_rate_percent': round(hit_rate, 2),
            'total_requests': total_requests
        }
        
    async def close(self) -> None:
        """Clean up resources."""
        # Close connection pool
        await self._pool.close_all()
        
        # Log final statistics
        stats = self.get_statistics()
        logger.info(f"DataService closed. Final stats: {stats}")


# Module-level async function
async def create_data_service(config_dict: Dict[str, Any]) -> DataService:
    """
    Factory function for creating DataService instances.
    
    Args:
        config_dict: Configuration dictionary
        
    Returns:
        Configured DataService instance
    """
    # Create configuration from dictionary
    config = ConnectionConfig(**config_dict)
    
    # Create and return service
    service = DataService(config)
    
    # Warm up the service
    logger.info("DataService created and initialized")
    
    return service