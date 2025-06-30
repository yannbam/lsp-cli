#include "math/vector.h"

namespace math {

// Explicit template instantiations
template class VectorN<4>;
template class VectorN<5>;

// Additional helper functions
namespace {
    const float EPSILON = 1e-6f;
    
    bool isNearlyZero(float value) {
        return std::abs(value) < EPSILON;
    }
}

// Global utility functions
bool areVectorsEqual(const Vector3& a, const Vector3& b, float tolerance) {
    return std::abs(a.x - b.x) < tolerance &&
           std::abs(a.y - b.y) < tolerance &&
           std::abs(a.z - b.z) < tolerance;
}

Vector3 lerp(const Vector3& a, const Vector3& b, float t) {
    return a + (b - a) * t;
}

} // namespace math