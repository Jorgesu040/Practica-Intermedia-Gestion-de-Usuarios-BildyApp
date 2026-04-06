export class AppError extends Error {
    constructor(message, statusCode, code = 'CUSTOM_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message, code = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }

    static unauthorized(message, code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }

    static forbidden(message, code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }

    static notFound(resource, code = 'NOT_FOUND') {
        return new AppError(`${resource} no encontrado`, 404, code);
    }

    static conflict(message, code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }
    
    static validation(message) {
        return new AppError(message, 400, 'VALIDATION_ERROR');
    }

    static tooManyRequests(message = 'Demasiadas peticiones', code = 'TOO_MANY_REQUESTS') {
        return new AppError(message, 429, code);
    }

    static internal(message = 'Error interno del servidor', code = 'INTERNAL_ERROR') {
        return new AppError(message, 500, code);
    }
}
