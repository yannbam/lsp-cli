package com.example.service;

import java.util.List;
import java.util.Optional;

/**
 * Service for managing users.
 * This class demonstrates comprehensive Java symbol types.
 */
public class UserService extends BaseService implements ServiceInterface, Auditable {
    private static final String SERVICE_NAME = "UserService";
    private final UserRepository repository;
    private volatile boolean initialized;
    
    /**
     * Creates a new UserService instance.
     * @param repository The user repository
     */
    public UserService(UserRepository repository) {
        this.repository = repository;
        this.initialized = false;
    }
    
    /**
     * Finds a user by ID.
     * @param id The user ID
     * @return Optional containing the user if found
     */
    @Override
    public Optional<User> findById(Long id) {
        validateId(id);
        return repository.findById(id);
    }
    
    /**
     * Gets all active users.
     * @return List of active users
     */
    public List<User> getActiveUsers() {
        return repository.findByStatus(UserStatus.ACTIVE);
    }
    
    /**
     * Creates a new user.
     * @param user The user to create
     * @return The created user
     * @throws ValidationException if user data is invalid
     */
    public User createUser(User user) throws ValidationException {
        validateUser(user);
        user.setStatus(UserStatus.ACTIVE);
        return repository.save(user);
    }
    
    /**
     * Updates an existing user.
     * @param id The user ID
     * @param user The updated user data
     * @return The updated user
     */
    public User updateUser(Long id, User user) {
        validateId(id);
        validateUser(user);
        user.setId(id);
        return repository.save(user);
    }
    
    /**
     * Validates a user object.
     */
    private void validateUser(User user) throws ValidationException {
        if (user == null) {
            throw new ValidationException("User cannot be null");
        }
        if (user.getEmail() == null || user.getEmail().isEmpty()) {
            throw new ValidationException("Email is required");
        }
    }
    
    /**
     * Validates an ID.
     */
    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Invalid ID");
        }
    }
    
    /**
     * Inner class for service statistics.
     */
    public static class ServiceStats {
        private int totalRequests;
        private int successfulRequests;
        private long averageResponseTime;
        
        public ServiceStats() {
            this.totalRequests = 0;
            this.successfulRequests = 0;
            this.averageResponseTime = 0;
        }
        
        public void recordRequest(boolean success, long responseTime) {
            totalRequests++;
            if (success) successfulRequests++;
            updateAverageResponseTime(responseTime);
        }
        
        private void updateAverageResponseTime(long responseTime) {
            averageResponseTime = (averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
        }
    }
    
    /**
     * Enum for user operations.
     */
    public enum Operation {
        CREATE("create", 1),
        READ("read", 2),
        UPDATE("update", 3),
        DELETE("delete", 4);
        
        private final String name;
        private final int code;
        
        Operation(String name, int code) {
            this.name = name;
            this.code = code;
        }
        
        public String getName() { return name; }
        public int getCode() { return code; }
    }
}