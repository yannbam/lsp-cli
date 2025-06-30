/// A simple Dart test fixture for LSP analysis
library test_fixture;

import 'dart:async';

/// Global constant
const String appVersion = '1.0.0';

/// Global variable
var globalCounter = 0;

/// Top-level function
int calculateSum(int a, int b) {
  return a + b;
}

/// User status enumeration
enum UserStatus {
  active,
  inactive,
  pending,
  banned
}

/// Type alias for a callback function
typedef UserCallback = void Function(User user);

/// Base class for entities
abstract class Entity {
  final String id;
  DateTime createdAt;
  
  Entity(this.id) : createdAt = DateTime.now();
  
  /// Abstract method to be implemented
  Map<String, dynamic> toJson();
}

/// User class extending Entity
class User extends Entity {
  String name;
  String email;
  UserStatus status;
  
  /// Constructor
  User({
    required String id,
    required this.name,
    required this.email,
    this.status = UserStatus.pending,
  }) : super(id);
  
  /// Named constructor
  User.guest()
      : name = 'Guest',
        email = 'guest@example.com',
        status = UserStatus.active,
        super('guest');
  
  /// Getter
  bool get isActive => status == UserStatus.active;
  
  /// Setter
  set active(bool value) {
    status = value ? UserStatus.active : UserStatus.inactive;
  }
  
  /// Instance method
  void updateEmail(String newEmail) {
    email = newEmail;
  }
  
  /// Static method
  static User fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      email: json['email'],
    );
  }
  
  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'status': status.toString(),
      'createdAt': createdAt.toIso8601String(),
    };
  }
}

/// A service class with async operations
class UserService {
  final List<User> _users = [];
  
  /// Add a user
  Future<void> addUser(User user) async {
    await Future.delayed(Duration(milliseconds: 100));
    _users.add(user);
  }
  
  /// Get all users
  Stream<User> getAllUsers() async* {
    for (final user in _users) {
      yield user;
    }
  }
  
  /// Find user by ID
  User? findById(String id) {
    try {
      return _users.firstWhere((user) => user.id == id);
    } catch (e) {
      return null;
    }
  }
}

/// Main entry point
void main() {
  print('Dart LSP Test Fixture');
  
  final user = User(
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
  );
  
  print('User: ${user.toJson()}');
}