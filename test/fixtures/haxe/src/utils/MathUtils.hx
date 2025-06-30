package utils;

/**
 * Mathematical utility functions
 */
class MathUtils {
    /**
     * Constant for PI
     */
    public static inline var PI:Float = 3.14159265359;
    
    /**
     * Constant for E
     */
    public static inline var E:Float = 2.71828182846;
    
    /**
     * Clamp a value between min and max
     */
    public static function clamp(value:Float, min:Float, max:Float):Float {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * Linear interpolation
     */
    public static function lerp(a:Float, b:Float, t:Float):Float {
        return a + (b - a) * clamp(t, 0, 1);
    }
    
    /**
     * Check if number is prime
     */
    public static function isPrime(n:Int):Bool {
        if (n <= 1) return false;
        if (n <= 3) return true;
        if (n % 2 == 0 || n % 3 == 0) return false;
        
        var i = 5;
        while (i * i <= n) {
            if (n % i == 0 || n % (i + 2) == 0) {
                return false;
            }
            i += 6;
        }
        
        return true;
    }
    
    /**
     * Calculate factorial
     */
    public static function factorial(n:Int):Int {
        if (n < 0) throw "Factorial not defined for negative numbers";
        if (n == 0 || n == 1) return 1;
        
        var result = 1;
        for (i in 2...n + 1) {
            result *= i;
        }
        return result;
    }
    
    /**
     * Greatest common divisor
     */
    public static function gcd(a:Int, b:Int):Int {
        while (b != 0) {
            var temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }
    
    /**
     * Least common multiple
     */
    public static function lcm(a:Int, b:Int):Int {
        return Std.int(Math.abs(a * b) / gcd(a, b));
    }
    
    /**
     * Distance between two 2D points
     */
    public static function distance2D(x1:Float, y1:Float, x2:Float, y2:Float):Float {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Convert degrees to radians
     */
    public static inline function toRadians(degrees:Float):Float {
        return degrees * PI / 180;
    }
    
    /**
     * Convert radians to degrees
     */
    public static inline function toDegrees(radians:Float):Float {
        return radians * 180 / PI;
    }
    
    /**
     * Generic type example - find maximum
     */
    public static function max<T>(a:T, b:T, compare:T->T->Int):T {
        return compare(a, b) > 0 ? a : b;
    }
}

/**
 * 2D Vector typedef
 */
typedef Vector2D = {
    x:Float,
    y:Float
}

/**
 * 3D Vector typedef
 */
typedef Vector3D = {
    > Vector2D,
    z:Float
}