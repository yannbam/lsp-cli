/**
 * Custom validation error class.
 */
export class ValidationError extends Error {
    public readonly errors?: string[];

    constructor(message: string, errors?: string[]) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }
}
