// Test file for supertype extraction consistency

interface BaseInterface {
    id: string;
}

interface Interface1<T = any> {
    process(item: T): void;
}

interface Interface2 {
    validate(): boolean;
}

class BaseClass<T = any> {
    protected data: T;
    constructor(data: T) {
        this.data = data;
    }
}

// Simple inheritance
export class SimpleChild extends BaseClass<string> {
    getName(): string {
        return this.data;
    }
}

// Multiple interfaces
export class MultipleInterfaces implements Interface1<number>, Interface2 {
    process(item: number): void {
        console.log(item);
    }

    validate(): boolean {
        return true;
    }
}

// Complex inheritance
export class ComplexChild<T, U> extends BaseClass<T> implements Interface1<U>, Interface2 {
    process(item: U): void {
        console.log(item);
    }

    validate(): boolean {
        return true;
    }
}

// Interface extending interfaces
interface ExtendedInterface<T> extends BaseInterface, Interface1<T> {
    extra: string;
}

// Everything combined
export class KitchenSink<T> extends BaseClass<T> implements ExtendedInterface<T>, Interface2 {
    id: string = '123';
    extra: string = 'extra';

    process(item: T): void {
        console.log(item);
    }

    validate(): boolean {
        return true;
    }
}
