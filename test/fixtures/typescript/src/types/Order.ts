/**
 * Order-related type definitions.
 */

/**
 * Enum for order status.
 */
export enum OrderStatus {
    Pending = 'pending',
    Processing = 'processing',
    Shipped = 'shipped',
    Delivered = 'delivered',
    Cancelled = 'cancelled',
    Refunded = 'refunded'
}

/**
 * Interface for order items.
 */
export interface OrderItem {
    id: string;
    productId: string;
    name: string;
    price: number;
    quantity: number;
    metadata?: Record<string, any>;
}

/**
 * Main order interface.
 */
export interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    status: OrderStatus;
    paymentMethod: string;
    shippingAddress?: Address;
    billingAddress?: Address;
    createdAt: Date;
    updatedAt: Date;
    notes?: string;
}

/**
 * Interface for addresses.
 */
export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

/**
 * Type for order filters.
 */
export type OrderFilter = {
    status?: OrderStatus;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
};

/**
 * Generic result type.
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Conditional type example.
 */
export type OrderField<T extends keyof Order> = Order[T];

/**
 * Mapped type example.
 */
export type PartialOrder = {
    [K in keyof Order]?: Order[K];
};

/**
 * Intersection type example.
 */
export type TrackedOrder = Order & {
    trackingNumber: string;
    carrier: string;
};
