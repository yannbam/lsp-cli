// Test file for supertype extraction consistency
#include <string>

class BaseInterface {
public:
    virtual ~BaseInterface() = default;
    virtual const char* getId() const = 0;
};

template<typename T>
class Interface1 {
public:
    virtual ~Interface1() = default;
    virtual void process(T item) = 0;
};

class Interface2 {
public:
    virtual ~Interface2() = default;
    virtual bool validate() = 0;
};

template<typename T = void>
class BaseClass {
protected:
    T data;
public:
    BaseClass(T data) : data(data) {}
    virtual ~BaseClass() = default;
};

// Simple inheritance
class SimpleChild : public BaseClass<std::string> {
public:
    SimpleChild(const std::string& data) : BaseClass(data) {}
    std::string getName() const { return data; }
};

// Multiple interfaces
class MultipleInterfaces : public Interface1<int>, public Interface2 {
public:
    void process(int item) override {
        // process
    }
    
    bool validate() override {
        return true;
    }
};

// Complex inheritance
template<typename T, typename U>
class ComplexChild : public BaseClass<T>, public Interface1<U>, public Interface2 {
public:
    ComplexChild(T data) : BaseClass<T>(data) {}
    
    void process(U item) override {
        // process
    }
    
    bool validate() override {
        return true;
    }
};

// Everything combined
template<typename T>
class KitchenSink : public BaseClass<T>, public BaseInterface, public Interface1<T>, public Interface2 {
private:
    std::string id = "123";
    std::string extra = "extra";
    
public:
    KitchenSink(T data) : BaseClass<T>(data) {}
    
    const char* getId() const override {
        return id.c_str();
    }
    
    void process(T item) override {
        // process
    }
    
    bool validate() override {
        return true;
    }
};