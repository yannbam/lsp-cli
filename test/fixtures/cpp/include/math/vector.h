#ifndef VECTOR_H
#define VECTOR_H

#include <cmath>
#include <iostream>

namespace math {

/**
 * @brief 3D vector class
 */
class Vector3 {
public:
    float x, y, z;
    
    // Constructors
    Vector3() : x(0), y(0), z(0) {}
    Vector3(float x, float y, float z) : x(x), y(y), z(z) {}
    
    // Operators
    Vector3 operator+(const Vector3& other) const {
        return Vector3(x + other.x, y + other.y, z + other.z);
    }
    
    Vector3 operator-(const Vector3& other) const {
        return Vector3(x - other.x, y - other.y, z - other.z);
    }
    
    Vector3 operator*(float scalar) const {
        return Vector3(x * scalar, y * scalar, z * scalar);
    }
    
    Vector3& operator+=(const Vector3& other) {
        x += other.x;
        y += other.y;
        z += other.z;
        return *this;
    }
    
    // Methods
    float length() const {
        return std::sqrt(x * x + y * y + z * z);
    }
    
    Vector3 normalized() const {
        float len = length();
        if (len > 0) {
            return *this * (1.0f / len);
        }
        return *this;
    }
    
    float dot(const Vector3& other) const {
        return x * other.x + y * other.y + z * other.z;
    }
    
    Vector3 cross(const Vector3& other) const {
        return Vector3(
            y * other.z - z * other.y,
            z * other.x - x * other.z,
            x * other.y - y * other.x
        );
    }
    
    // Static methods
    static Vector3 zero() { return Vector3(0, 0, 0); }
    static Vector3 one() { return Vector3(1, 1, 1); }
    static Vector3 up() { return Vector3(0, 1, 0); }
    static Vector3 forward() { return Vector3(0, 0, 1); }
    static Vector3 right() { return Vector3(1, 0, 0); }
};

// Global operators
inline Vector3 operator*(float scalar, const Vector3& vec) {
    return vec * scalar;
}

// Stream operators
inline std::ostream& operator<<(std::ostream& os, const Vector3& vec) {
    os << "(" << vec.x << ", " << vec.y << ", " << vec.z << ")";
    return os;
}

/**
 * @brief 2D vector struct
 */
struct Vector2 {
    float x, y;
    
    Vector2() : x(0), y(0) {}
    Vector2(float x, float y) : x(x), y(y) {}
    
    float length() const {
        return std::sqrt(x * x + y * y);
    }
};

/**
 * @brief Template vector class for arbitrary dimensions
 */
template<int N>
class VectorN {
public:
    float data[N];
    
    VectorN() {
        for (int i = 0; i < N; ++i) {
            data[i] = 0;
        }
    }
    
    float& operator[](int index) { return data[index]; }
    const float& operator[](int index) const { return data[index]; }
    
    float length() const {
        float sum = 0;
        for (int i = 0; i < N; ++i) {
            sum += data[i] * data[i];
        }
        return std::sqrt(sum);
    }
};

// Type aliases
using Vec3 = Vector3;
using Vec2 = Vector2;
using Vec4 = VectorN<4>;

} // namespace math

#endif // VECTOR_H