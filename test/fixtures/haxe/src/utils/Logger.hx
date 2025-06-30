package utils;

/**
 * Simple logging utility
 */
class Logger {
    private var name:String;
    private var level:LogLevel;
    
    /**
     * Create a new logger
     * @param name Logger name
     * @param level Minimum log level
     */
    public function new(name:String, ?level:LogLevel) {
        this.name = name;
        this.level = level != null ? level : LogLevel.INFO;
    }
    
    /**
     * Log debug message
     */
    public function debug(message:String):Void {
        if (Type.enumIndex(level) <= Type.enumIndex(LogLevel.DEBUG)) {
            log("DEBUG", message);
        }
    }
    
    /**
     * Log info message
     */
    public function info(message:String):Void {
        if (Type.enumIndex(level) <= Type.enumIndex(LogLevel.INFO)) {
            log("INFO", message);
        }
    }
    
    /**
     * Log warning message
     */
    public function warn(message:String):Void {
        if (Type.enumIndex(level) <= Type.enumIndex(LogLevel.WARN)) {
            log("WARN", message);
        }
    }
    
    /**
     * Log error message
     */
    public function error(message:String):Void {
        if (Type.enumIndex(level) <= Type.enumIndex(LogLevel.ERROR)) {
            log("ERROR", message);
        }
    }
    
    /**
     * Internal log method
     */
    private function log(levelStr:String, message:String):Void {
        var timestamp = Date.now().toString();
        trace('[$timestamp] [$name] $levelStr: $message');
    }
    
    /**
     * Set log level
     */
    public function setLevel(level:LogLevel):Void {
        this.level = level;
    }
    
    /**
     * Get current log level
     */
    public function getLevel():LogLevel {
        return level;
    }
    
    /**
     * Create a child logger
     */
    public function createChild(childName:String):Logger {
        return new Logger('$name.$childName', level);
    }
    
    /**
     * Static factory method
     */
    public static function create(name:String):Logger {
        return new Logger(name);
    }
}

/**
 * Log level enumeration
 */
enum LogLevel {
    DEBUG;
    INFO;
    WARN;
    ERROR;
}