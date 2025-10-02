#!/usr/bin/env python3
"""
Main application entry point.

This module demonstrates basic Python constructs that lsp-cli should extract:
- Module-level functions
- Variables and constants  
- Import statements
- Inline comments within function bodies
"""

import sys
from typing import Optional, List
from src.models.user import User
from src.services.data_service import DataService

# Module-level constants
DEFAULT_PORT = 8080
DEBUG_MODE = True
SUPPORTED_FORMATS = ['json', 'xml', 'csv']

# Module-level variable
current_user: Optional[User] = None


def initialize_application(port: int = DEFAULT_PORT) -> bool:
    """
    Initialize the main application with configuration.
    
    Args:
        port: The port number to bind to
        
    Returns:
        True if initialization successful, False otherwise
    """
    # Check if port is available
    if port < 1024:
        print(f"Warning: port {port} requires root privileges")
        return False
        
    # Initialize core services
    service = DataService()
    
    # Setup logging configuration
    if DEBUG_MODE:
        print("Debug mode enabled")
        
    # Validate supported formats
    for fmt in SUPPORTED_FORMATS:
        print(f"Supporting format: {fmt}")
        
    return True


def process_user_data(users: List[User]) -> dict:
    """Process a list of users and return statistics."""
    stats = {
        'total': 0,
        'active': 0, 
        'inactive': 0
    }
    
    # Count user statistics
    for user in users:
        stats['total'] += 1
        
        # Check user status
        if user.is_active:
            stats['active'] += 1
        else:
            stats['inactive'] += 1
            
    return stats


def main():
    """Main entry point."""
    # Parse command line arguments
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    
    # Initialize the application
    if not initialize_application(port):
        print("Failed to initialize application")
        sys.exit(1)
        
    print(f"Application started on port {port}")


if __name__ == "__main__":
    main()