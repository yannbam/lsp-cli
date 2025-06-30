#include "graphics/renderer.h"
#include <iostream>
#include <algorithm>

namespace graphics {

// Anonymous namespace for internal helpers
namespace {
    constexpr int MAX_TEXTURES = 256;
    constexpr int MAX_SHADERS = 128;
    
    bool validateConfig(const Renderer::Config& config) {
        return config.width > 0 && config.height > 0;
    }
}

// Private implementation structure
struct RenderState {
    bool initialized;
    int activeTexture;
    int activeShader;
    
    RenderState() : initialized(false), activeTexture(-1), activeShader(-1) {}
};

// Constructor implementations
Renderer::Renderer() : Renderer(Config{}) {}

Renderer::Renderer(const Config& config) 
    : m_config(config)
    , m_renderMode(RenderMode::Solid)
    , m_state(std::make_unique<RenderState>())
    , m_stats() {
    if (!validateConfig(config)) {
        throw std::invalid_argument("Invalid renderer configuration");
    }
}

Renderer::~Renderer() {
    cleanup();
}

// Move constructor
Renderer::Renderer(Renderer&& other) noexcept
    : m_config(std::move(other.m_config))
    , m_renderMode(other.m_renderMode)
    , m_state(std::move(other.m_state))
    , m_textures(std::move(other.m_textures))
    , m_shaders(std::move(other.m_shaders))
    , m_stats(std::move(other.m_stats)) {
}

// Move assignment operator
Renderer& Renderer::operator=(Renderer&& other) noexcept {
    if (this != &other) {
        cleanup();
        m_config = std::move(other.m_config);
        m_renderMode = other.m_renderMode;
        m_state = std::move(other.m_state);
        m_textures = std::move(other.m_textures);
        m_shaders = std::move(other.m_shaders);
        m_stats = std::move(other.m_stats);
    }
    return *this;
}

bool Renderer::initialize() {
    if (m_state->initialized) {
        return true;
    }
    
    std::cout << "Initializing renderer with " 
              << m_config.width << "x" << m_config.height 
              << " resolution" << std::endl;
    
    // Simulate initialization
    m_state->initialized = true;
    return true;
}

void Renderer::renderFrame() {
    if (!m_state->initialized) {
        throw std::runtime_error("Renderer not initialized");
    }
    
    m_stats.recordFrame();
    // Rendering logic would go here
}

void Renderer::clear(float r, float g, float b, float a) {
    // Clear implementation
    (void)r; (void)g; (void)b; (void)a; // Suppress unused warnings
}

void Renderer::drawMesh(const std::vector<math::Vector3>& vertices,
                       const std::vector<unsigned int>& indices) {
    if (vertices.empty() || indices.empty()) {
        return;
    }
    
    int triangleCount = static_cast<int>(indices.size() / 3);
    m_stats.recordDrawCall(triangleCount);
    
    // Drawing implementation would go here
}

int Renderer::loadTexture(const std::string& path) {
    if (m_textures.size() >= MAX_TEXTURES) {
        return -1;
    }
    
    // Texture loading would go here
    m_textures.push_back(nullptr); // Placeholder
    return static_cast<int>(m_textures.size() - 1);
}

int Renderer::compileShader(const std::string& vertexSource,
                           const std::string& fragmentSource) {
    if (m_shaders.size() >= MAX_SHADERS) {
        return -1;
    }
    
    // Shader compilation would go here
    m_shaders.push_back(nullptr); // Placeholder
    return static_cast<int>(m_shaders.size() - 1);
}

void Renderer::cleanup() {
    m_textures.clear();
    m_shaders.clear();
    m_state->initialized = false;
}

// Friend function implementation
void debugPrintRenderer(const Renderer& renderer) {
    std::cout << "Renderer Debug Info:" << std::endl;
    std::cout << "  Resolution: " << renderer.m_config.width 
              << "x" << renderer.m_config.height << std::endl;
    std::cout << "  Mode: " << static_cast<int>(renderer.m_renderMode) << std::endl;
    std::cout << "  Textures: " << renderer.m_textures.size() << std::endl;
    std::cout << "  Shaders: " << renderer.m_shaders.size() << std::endl;
}

// Global function implementation
std::unique_ptr<Renderer> createDefaultRenderer() {
    return std::make_unique<Renderer>();
}

} // namespace graphics