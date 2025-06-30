package com.example.service;

/**
 * Abstract base class for all services.
 */
public abstract class BaseService {
    protected boolean debug = false;
    
    /**
     * Initializes the service.
     */
    public void initialize() {
        System.out.println("Initializing " + getClass().getSimpleName());
    }
    
    /**
     * Sets debug mode.
     * @param debug Enable or disable debug mode
     */
    public void setDebug(boolean debug) {
        this.debug = debug;
    }
}