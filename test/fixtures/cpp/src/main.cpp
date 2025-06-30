#include <iostream>
#include <memory>
#include <vector>
#include "graphics/renderer.h"
#include "math/vector.h"

// Global constants
const int WINDOW_WIDTH = 1024;
const int WINDOW_HEIGHT = 768;

// Global variable
graphics::Renderer* g_renderer = nullptr;

// Function declarations
void initializeApplication();
void runMainLoop();
void cleanup();

// Template function
template<typename T>
void printVector(const T& vec) {
    std::cout << vec << std::endl;
}

// Main function
int main(int argc, char* argv[]) {
    std::cout << "Starting application..." << std::endl;
    
    try {
        initializeApplication();
        runMainLoop();
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    
    cleanup();
    return 0;
}

void initializeApplication() {
    // Create renderer configuration
    graphics::Renderer::Config config;
    config.width = WINDOW_WIDTH;
    config.height = WINDOW_HEIGHT;
    config.vsync = true;
    
    // Create and initialize renderer
    auto renderer = std::make_unique<graphics::Renderer>(config);
    if (!renderer->initialize()) {
        throw std::runtime_error("Failed to initialize renderer");
    }
    
    g_renderer = renderer.release();
    
    // Test vector operations
    math::Vector3 v1(1.0f, 2.0f, 3.0f);
    math::Vector3 v2(4.0f, 5.0f, 6.0f);
    
    auto v3 = v1 + v2;
    printVector(v3);
    
    std::cout << "Dot product: " << v1.dot(v2) << std::endl;
    std::cout << "Cross product: " << v1.cross(v2) << std::endl;
}

void runMainLoop() {
    // Create some test geometry
    std::vector<math::Vector3> vertices = {
        math::Vector3(-1.0f, -1.0f, 0.0f),
        math::Vector3( 1.0f, -1.0f, 0.0f),
        math::Vector3( 0.0f,  1.0f, 0.0f)
    };
    
    std::vector<unsigned int> indices = {0, 1, 2};
    
    // Simulate rendering loop
    for (int frame = 0; frame < 10; ++frame) {
        g_renderer->clear(0.2f, 0.3f, 0.4f);
        g_renderer->drawMesh(vertices, indices);
        g_renderer->renderFrame();
    }
    
    // Print statistics
    auto& stats = g_renderer->getStatistics();
    std::cout << "Rendered " << stats.getFrameCount() << " frames" << std::endl;
    std::cout << "Total draw calls: " << stats.getDrawCalls() << std::endl;
    std::cout << "Total triangles: " << stats.getTriangles() << std::endl;
}

void cleanup() {
    delete g_renderer;
    g_renderer = nullptr;
    std::cout << "Application shutdown complete" << std::endl;
}

// Namespace for utilities
namespace utils {
    void printInfo() {
        std::cout << "Application info:" << std::endl;
        std::cout << "  Window: " << WINDOW_WIDTH << "x" << WINDOW_HEIGHT << std::endl;
    }
}

// Anonymous namespace
namespace {
    struct AppState {
        bool running;
        int frameCount;
    };
    
    AppState g_appState = {true, 0};
}