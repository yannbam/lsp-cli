// Test file for supertype extraction consistency

abstract class BaseInterface {
  String get id;
}

abstract class Interface1<T> {
  void process(T item);
}

abstract class Interface2 {
  bool validate();
}

class BaseClass<T> {
  final T data;
  BaseClass(this.data);
}

// Simple inheritance
class SimpleChild extends BaseClass<String> {
  SimpleChild(String data) : super(data);
  
  String getName() => data;
}

// Multiple interfaces
class MultipleInterfaces implements Interface1<int>, Interface2 {
  @override
  void process(int item) {
    print(item);
  }
  
  @override
  bool validate() => true;
}

// Complex inheritance
class ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>, Interface2 {
  ComplexChild(T data) : super(data);
  
  @override
  void process(U item) {
    print(item);
  }
  
  @override
  bool validate() => true;
}

// Mixin example (Dart-specific)
mixin ValidationMixin {
  bool isValid = true;
}

// Everything combined
class KitchenSink<T> extends BaseClass<T> 
    with ValidationMixin 
    implements BaseInterface, Interface1<T>, Interface2 {
  
  @override
  String id = "123";
  
  String extra = "extra";
  
  KitchenSink(T data) : super(data);
  
  @override
  void process(T item) {
    print(item);
  }
  
  @override
  bool validate() => true;
}