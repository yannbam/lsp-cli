package com.example.repository;

import com.example.model.User;
import com.example.model.UserStatus;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entities.
 */
public interface UserRepository {
    Optional<User> findById(Long id);
    List<User> findByStatus(UserStatus status);
    User save(User user);
    void delete(Long id);
}