package com.example.service;

import java.time.LocalDateTime;

/**
 * Interface for auditable entities.
 */
public interface Auditable {
    default LocalDateTime getLastModified() {
        return LocalDateTime.now();
    }
    
    default String getLastModifiedBy() {
        return "system";
    }
}