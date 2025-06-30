/**
 * Service for managing orders.
 * Demonstrates TypeScript symbol types including classes, interfaces, enums, and type aliases.
 */

import { ValidationError } from './errors/ValidationError';
import { type Order, type OrderItem, OrderStatus } from './types/Order';
import type { User } from './types/User';

/** Configuration options for OrderService */
export interface OrderServiceConfig {
    maxItemsPerOrder: number;
    enableNotifications: boolean;
    defaultTimeout: number;
}

/** Type alias for order validation result */
export type ValidationResult = {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
};

/** Union type for different payment methods */
export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'crypto';

/** Function type for order validators */
export type OrderValidator = (order: Order) => ValidationResult;

/**
 * Main service class for order management.
 */
export class OrderService {
    private static readonly DEFAULT_MAX_ITEMS = 100;
    private readonly config: OrderServiceConfig;
    private validators: OrderValidator[] = [];

    /**
     * Creates a new OrderService instance.
     * @param config - Service configuration
     */
    constructor(config: Partial<OrderServiceConfig> = {}) {
        this.config = {
            maxItemsPerOrder: config.maxItemsPerOrder ?? OrderService.DEFAULT_MAX_ITEMS,
            enableNotifications: config.enableNotifications ?? true,
            defaultTimeout: config.defaultTimeout ?? 30000
        };
    }

    /**
     * Creates a new order.
     * @param user - The user placing the order
     * @param items - Order items
     * @param paymentMethod - Payment method to use
     * @returns The created order
     * @throws {ValidationError} If order validation fails
     */
    public async createOrder(user: User, items: OrderItem[], paymentMethod: PaymentMethod): Promise<Order> {
        const order: Order = {
            id: this.generateOrderId(),
            userId: user.id,
            items,
            status: OrderStatus.Pending,
            paymentMethod,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const validation = this.validateOrder(order);
        if (!validation.valid) {
            throw new ValidationError('Order validation failed', validation.errors);
        }

        return this.processOrder(order);
    }

    /**
     * Validates an order.
     * @param order - The order to validate
     * @returns Validation result
     */
    private validateOrder(order: Order): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (order.items.length === 0) {
            errors.push('Order must contain at least one item');
        }

        if (order.items.length > this.config.maxItemsPerOrder) {
            errors.push(`Order cannot exceed ${this.config.maxItemsPerOrder} items`);
        }

        for (const validator of this.validators) {
            const result = validator(order);
            if (result.errors) errors.push(...result.errors);
            if (result.warnings) warnings.push(...result.warnings);
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }

    /**
     * Processes an order.
     * @param order - The order to process
     * @returns The processed order
     */
    private async processOrder(order: Order): Promise<Order> {
        // Simulate async processing
        await new Promise((resolve) => setTimeout(resolve, 100));

        order.status = OrderStatus.Processing;
        order.updatedAt = new Date();

        return order;
    }

    /**
     * Generates a unique order ID.
     * @returns Generated order ID
     */
    private generateOrderId(): string {
        return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Adds a custom validator.
     * @param validator - The validator function to add
     */
    public addValidator(validator: OrderValidator): void {
        this.validators.push(validator);
    }

    /**
     * Gets order by ID.
     * @param orderId - The order ID
     * @returns The order if found
     */
    public async getOrder(_orderId: string): Promise<Order | null> {
        // Implementation would fetch from database
        return null;
    }

    /**
     * Static method to check if payment method is supported.
     * @param method - Payment method to check
     * @returns True if supported
     */
    public static isPaymentMethodSupported(method: string): method is PaymentMethod {
        const supportedMethods: PaymentMethod[] = ['credit_card', 'debit_card', 'paypal', 'crypto'];
        return supportedMethods.includes(method as PaymentMethod);
    }
}

/**
 * Namespace for order utilities.
 */
export namespace OrderUtils {
    /**
     * Calculates order total.
     * @param order - The order
     * @returns Total amount
     */
    export function calculateTotal(order: Order): number {
        return order.items.reduce((total, item) => total + item.price * item.quantity, 0);
    }

    /**
     * Formats order ID for display.
     * @param orderId - The order ID
     * @returns Formatted ID
     */
    export function formatOrderId(orderId: string): string {
        return orderId.toUpperCase().replace(/-/g, ' ');
    }

    /**
     * Inner namespace for advanced utilities.
     */
    export namespace Advanced {
        export function analyzeOrderPattern(_orders: Order[]): object {
            // Analysis logic
            return {};
        }
    }
}

/**
 * Standalone function to create order validator.
 * @param maxTotal - Maximum allowed order total
 * @returns Validator function
 */
export function createMaxTotalValidator(maxTotal: number): OrderValidator {
    return (order: Order): ValidationResult => {
        const total = OrderUtils.calculateTotal(order);
        if (total > maxTotal) {
            return {
                valid: false,
                errors: [`Order total ${total} exceeds maximum ${maxTotal}`]
            };
        }
        return { valid: true };
    };
}

/** Constant for default order timeout */
export const DEFAULT_ORDER_TIMEOUT = 30000;

/** Variable for current API version */
export const apiVersion = '1.0.0';

/** Arrow function constant */
export const processOrderAsync = async (order: Order): Promise<void> => {
    console.log('Processing order:', order.id);
};
