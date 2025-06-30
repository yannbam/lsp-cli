package com.example.service;

import java.util.Optional;

/**
 * Interface for all services.
 */
public interface ServiceInterface {
    /**
     * Finds an entity by ID.
     * @param id The entity ID
     * @return Optional containing the entity if found
     */
    Optional<?> findById(Long id);
}