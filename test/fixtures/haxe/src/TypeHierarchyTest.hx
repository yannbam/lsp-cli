// Test file for supertype extraction consistency

interface BaseInterface {
    function getId():String;
}

interface Interface1<T> {
    function process(item:T):Void;
}

interface Interface2 {
    function validate():Bool;
}

class BaseClass<T> {
    private var data:T;

    public function new(data:T) {
        this.data = data;
    }

    public function getData():T {
        return data;
    }
}

// Simple inheritance
class SimpleChild extends BaseClass<String> {
    public function new(data:String) {
        super(data);
    }

    public function getName():String {
        return data;
    }
}

// Multiple interfaces
class MultipleInterfaces implements Interface1<Int>, Interface2 {
    public function new() {}

    public function process(item:Int):Void {
        trace(item);
    }

    public function validate():Bool {
        return true;
    }
}

// Complex inheritance
class ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>, Interface2 {
    public function new(data:T) {
        super(data);
    }

    public function process(item:U):Void {
        trace(item);
    }

    public function validate():Bool {
        return true;
    }
}

// Interface extending interfaces
interface ExtendedInterface<T> extends BaseInterface, Interface1<T> {
    function getExtra():String;
}

// Everything combined
class KitchenSink<T> extends BaseClass<T> implements ExtendedInterface<T>, Interface2 {
    private var id:String = "123";
    private var extra:String = "extra";

    public function new(data:T) {
        super(data);
    }

    public function getId():String {
        return id;
    }

    public function getExtra():String {
        return extra;
    }

    public function process(item:T):Void {
        trace(item);
    }

    public function validate():Bool {
        return true;
    }
}