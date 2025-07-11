package com.example.hierarchy;

// Test file for supertype extraction consistency

interface BaseInterface {
    String getId();
}

interface Interface1<T> {
    void process(T item);
}

interface Interface2 {
    boolean validate();
}

class BaseClass<T> {
    protected T data;
    
    public BaseClass(T data) {
        this.data = data;
    }
}

// Simple inheritance
class SimpleChild extends BaseClass<String> {
    public SimpleChild(String data) {
        super(data);
    }
    
    public String getName() {
        return data;
    }
}

// Multiple interfaces
class MultipleInterfaces implements Interface1<Integer>, Interface2 {
    @Override
    public void process(Integer item) {
        System.out.println(item);
    }
    
    @Override
    public boolean validate() {
        return true;
    }
}

// Complex inheritance
class ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>, Interface2 {
    public ComplexChild(T data) {
        super(data);
    }
    
    @Override
    public void process(U item) {
        System.out.println(item);
    }
    
    @Override
    public boolean validate() {
        return true;
    }
}

// Interface extending interfaces
interface ExtendedInterface<T> extends BaseInterface, Interface1<T> {
    String getExtra();
}

// Everything combined
class KitchenSink<T> extends BaseClass<T> implements ExtendedInterface<T>, Interface2 {
    private String id = "123";
    private String extra = "extra";
    
    public KitchenSink(T data) {
        super(data);
    }
    
    @Override
    public String getId() {
        return id;
    }
    
    @Override
    public String getExtra() {
        return extra;
    }
    
    @Override
    public void process(T item) {
        System.out.println(item);
    }
    
    @Override
    public boolean validate() {
        return true;
    }
}