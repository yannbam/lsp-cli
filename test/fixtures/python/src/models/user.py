"""
User model with comprehensive Python features.

This module demonstrates:
- Enums and constants
- Classes with inheritance
- Property decorators (@property, @classmethod, @staticmethod)
- Magic methods (__init__, __str__, __repr__, __eq__)
- Type hints and generics
- Comprehensive docstrings
- Inline comments within methods
"""

from enum import Enum, auto
from typing import Optional, Dict, Any, ClassVar
from datetime import datetime
import hashlib


class UserRole(Enum):
    """User role enumeration."""
    ADMIN = "admin"
    MODERATOR = "moderator" 
    USER = "user"
    GUEST = "guest"


class UserStatus(Enum):
    """User account status."""
    ACTIVE = auto()
    INACTIVE = auto()
    SUSPENDED = auto()
    DELETED = auto()


# Module constants
DEFAULT_ROLE = UserRole.USER
MAX_LOGIN_ATTEMPTS = 3
PASSWORD_MIN_LENGTH = 8


class BaseUser:
    """
    Base user class with common functionality.
    
    This demonstrates inheritance and abstract-like patterns in Python.
    """
    
    # Class variable
    total_users: ClassVar[int] = 0
    
    def __init__(self, username: str):
        """Initialize base user."""
        self.username = username
        self.created_at = datetime.now()
        BaseUser.total_users += 1
        
    def get_age_days(self) -> int:
        """Get user age in days since creation."""
        # Calculate time difference  
        delta = datetime.now() - self.created_at
        return delta.days


class User(BaseUser):
    """
    Comprehensive user model demonstrating all Python features.
    
    This class shows:
    - Class inheritance
    - Property decorators
    - Magic methods
    - Type hints
    - Instance and class variables
    """
    
    # Class variables
    _id_counter: ClassVar[int] = 1000
    valid_roles: ClassVar[set] = {UserRole.ADMIN, UserRole.MODERATOR, UserRole.USER}
    
    def __init__(self, username: str, email: str, role: UserRole = DEFAULT_ROLE):
        """
        Initialize a new user.
        
        Args:
            username: Unique username for the user
            email: User's email address
            role: User's role (defaults to USER)
            
        Raises:
            ValueError: If username or email is empty
        """
        super().__init__(username)
        
        # Validate input parameters
        if not username.strip():
            raise ValueError("Username cannot be empty")
            
        if not email.strip():
            raise ValueError("Email cannot be empty")
            
        # Initialize instance variables
        self.id = User._id_counter
        self.email = email
        self._role = role
        self._status = UserStatus.ACTIVE
        self._password_hash: Optional[str] = None
        self._login_attempts = 0
        self._profile_data: Dict[str, Any] = {}
        
        # Increment the class counter
        User._id_counter += 1
        
    def __str__(self) -> str:
        """Return string representation of user."""
        return f"User({self.username}, {self.email})"
        
    def __repr__(self) -> str:
        """Return detailed string representation."""
        return f"User(id={self.id}, username='{self.username}', email='{self.email}', role={self._role.value})"
        
    def __eq__(self, other) -> bool:
        """Check equality based on user ID."""
        if not isinstance(other, User):
            return False
        return self.id == other.id
        
    def __hash__(self) -> int:
        """Return hash based on user ID."""
        return hash(self.id)
        
    @property 
    def role(self) -> UserRole:
        """Get user role."""
        return self._role
        
    @role.setter
    def role(self, value: UserRole) -> None:
        """
        Set user role with validation.
        
        Args:
            value: New role to assign
            
        Raises:
            ValueError: If role is not valid
        """
        # Validate the role
        if value not in self.valid_roles:
            raise ValueError(f"Invalid role: {value}")
            
        # Log role change for audit
        old_role = self._role
        self._role = value
        
        # Additional logic for role changes
        if old_role != value:
            print(f"Role changed from {old_role.value} to {value.value}")
            
    @property
    def status(self) -> UserStatus:
        """Get user status."""
        return self._status
        
    @property
    def is_active(self) -> bool:
        """Check if user is active."""
        return self._status == UserStatus.ACTIVE
        
    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges."""
        return self._role == UserRole.ADMIN
        
    def set_password(self, password: str) -> bool:
        """
        Set user password with validation and hashing.
        
        Args:
            password: Plain text password
            
        Returns:
            True if password was set successfully
        """
        # Validate password length
        if len(password) < PASSWORD_MIN_LENGTH:
            print(f"Password must be at least {PASSWORD_MIN_LENGTH} characters")
            return False
            
        # Hash the password for security
        salt = self.username.encode()
        password_bytes = password.encode()
        
        # Create secure hash
        hash_obj = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, 100000)
        self._password_hash = hash_obj.hex()
        
        return True
        
    def verify_password(self, password: str) -> bool:
        """Verify password against stored hash."""
        if not self._password_hash:
            return False
            
        # Generate hash for comparison
        salt = self.username.encode()
        password_bytes = password.encode()
        hash_obj = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, 100000)
        
        # Compare hashes securely
        return hash_obj.hex() == self._password_hash
        
    def login_attempt(self, password: str) -> bool:
        """
        Handle login attempt with rate limiting.
        
        Args:
            password: Password to verify
            
        Returns:
            True if login successful
        """
        # Check if account is locked
        if self._login_attempts >= MAX_LOGIN_ATTEMPTS:
            print("Account locked due to too many failed attempts")
            return False
            
        # Verify password
        if self.verify_password(password):
            # Reset attempts on success
            self._login_attempts = 0
            return True
        else:
            # Increment failed attempts
            self._login_attempts += 1
            attempts_left = MAX_LOGIN_ATTEMPTS - self._login_attempts
            
            # Log failed attempt
            if attempts_left > 0:
                print(f"Invalid password. {attempts_left} attempts remaining")
            else:
                print("Account locked due to too many failed attempts")
                
            return False
            
    def update_profile(self, **kwargs: Any) -> None:
        """Update user profile data."""
        # Merge new data with existing profile
        for key, value in kwargs.items():
            self._profile_data[key] = value
            
        # Log profile update
        print(f"Profile updated for user {self.username}")
        
    def get_profile_value(self, key: str, default: Any = None) -> Any:
        """Get profile value by key."""
        return self._profile_data.get(key, default)
        
    @classmethod
    def create_admin(cls, username: str, email: str) -> 'User':
        """
        Factory method to create admin user.
        
        Args:
            username: Admin username
            email: Admin email
            
        Returns:
            New User instance with admin role
        """
        # Create user with admin role
        admin_user = cls(username, email, UserRole.ADMIN)
        
        # Set default admin profile
        admin_user.update_profile(
            admin_created=True,
            permissions=['read', 'write', 'delete', 'manage_users']
        )
        
        return admin_user
        
    @staticmethod
    def is_valid_email(email: str) -> bool:
        """
        Validate email format.
        
        Args:
            email: Email to validate
            
        Returns:
            True if email format is valid
        """
        # Simple email validation
        if '@' not in email:
            return False
            
        # Check for basic email structure
        parts = email.split('@')
        if len(parts) != 2:
            return False
            
        local, domain = parts
        
        # Validate parts are not empty
        if not local or not domain:
            return False
            
        return '.' in domain
        
    @classmethod
    def get_total_users(cls) -> int:
        """Get total number of users created."""
        return cls.total_users
        
    def deactivate(self) -> None:
        """Deactivate user account."""
        # Change status to inactive
        old_status = self._status
        self._status = UserStatus.INACTIVE
        
        # Log status change
        print(f"User {self.username} status changed from {old_status.name} to {self._status.name}")
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary representation."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self._role.value,
            'status': self._status.name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat(),
            'profile': self._profile_data.copy()
        }