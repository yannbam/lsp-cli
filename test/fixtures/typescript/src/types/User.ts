/**
 * User type definitions.
 */

/**
 * User interface.
 */
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    preferences?: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * User role enum.
 */
export enum UserRole {
    Admin = 'admin',
    Customer = 'customer',
    Vendor = 'vendor',
    Support = 'support'
}

/**
 * User preferences interface.
 */
export interface UserPreferences {
    language: string;
    currency: string;
    notifications: NotificationSettings;
}

/**
 * Notification settings.
 */
export interface NotificationSettings {
    email: boolean;
    sms: boolean;
    push: boolean;
}
