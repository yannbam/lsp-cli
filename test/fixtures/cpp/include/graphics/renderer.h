#ifndef RENDERER_H
#define RENDERER_H

#include <vector>
#include <memory>
#include <string>
#include "math/vector.h"

namespace graphics {

// Forward declarations
class Texture;
class Shader;
struct RenderState;

/**
 * @brief Main renderer class for 3D graphics.
 * 
 * This class handles all rendering operations including
 * mesh rendering, texture management, and shader compilation.
 */
class Renderer {
public:
    /**
     * @brief Rendering modes
     */
    enum class RenderMode {
        Wireframe,
        Solid,
        Textured,
        Shaded
    };

    /**
     * @brief Configuration for renderer
     */
    struct Config {
        int width;
        int height;
        bool vsync;
        int multisampling;
        
        Config() : width(800), height(600), vsync(true), multisampling(4) {}
    };

    // Constructors and destructor
    Renderer();
    explicit Renderer(const Config& config);
    ~Renderer();

    // Delete copy constructor and assignment
    Renderer(const Renderer&) = delete;
    Renderer& operator=(const Renderer&) = delete;

    // Move constructor and assignment
    Renderer(Renderer&& other) noexcept;
    Renderer& operator=(Renderer&& other) noexcept;

    /**
     * @brief Initialize the renderer
     * @return true if successful
     */
    bool initialize();

    /**
     * @brief Render a frame
     */
    void renderFrame();

    /**
     * @brief Clear the screen
     * @param r Red component
     * @param g Green component  
     * @param b Blue component
     * @param a Alpha component
     */
    void clear(float r = 0.0f, float g = 0.0f, float b = 0.0f, float a = 1.0f);

    /**
     * @brief Draw a mesh
     * @param vertices Vertex data
     * @param indices Index data
     */
    void drawMesh(const std::vector<math::Vector3>& vertices, 
                  const std::vector<unsigned int>& indices);

    /**
     * @brief Set render mode
     * @param mode The render mode to use
     */
    void setRenderMode(RenderMode mode) { m_renderMode = mode; }

    /**
     * @brief Get current render mode
     * @return Current render mode
     */
    RenderMode getRenderMode() const { return m_renderMode; }

    /**
     * @brief Load a texture
     * @param path Path to texture file
     * @return Texture ID or -1 on failure
     */
    int loadTexture(const std::string& path);

    /**
     * @brief Compile a shader
     * @param vertexSource Vertex shader source
     * @param fragmentSource Fragment shader source
     * @return Shader ID or -1 on failure
     */
    int compileShader(const std::string& vertexSource,
                      const std::string& fragmentSource);

    // Friend function for debugging
    friend void debugPrintRenderer(const Renderer& renderer);

    /**
     * @brief Inner class for render statistics
     */
    class Statistics {
    public:
        Statistics() : m_frameCount(0), m_drawCalls(0), m_triangles(0) {}
        
        void reset() {
            m_frameCount = 0;
            m_drawCalls = 0;
            m_triangles = 0;
        }
        
        void recordFrame() { m_frameCount++; }
        void recordDrawCall(int triangles) {
            m_drawCalls++;
            m_triangles += triangles;
        }
        
        int getFrameCount() const { return m_frameCount; }
        int getDrawCalls() const { return m_drawCalls; }
        int getTriangles() const { return m_triangles; }
        
    private:
        int m_frameCount;
        int m_drawCalls;
        int m_triangles;
    };

    Statistics& getStatistics() { return m_stats; }

private:
    Config m_config;
    RenderMode m_renderMode;
    std::unique_ptr<RenderState> m_state;
    std::vector<std::shared_ptr<Texture>> m_textures;
    std::vector<std::shared_ptr<Shader>> m_shaders;
    Statistics m_stats;
    
    void cleanup();
};

/**
 * @brief Global function to create default renderer
 * @return Unique pointer to renderer
 */
std::unique_ptr<Renderer> createDefaultRenderer();

/**
 * @brief Template function for render operations
 */
template<typename T>
void renderObject(Renderer& renderer, const T& object) {
    // Template implementation would go here
    object.render(renderer);
}

} // namespace graphics

#endif // RENDERER_H