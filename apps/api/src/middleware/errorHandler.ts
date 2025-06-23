import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(
    error: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    logger.error('API Error:', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.url,
        ip: req.ip,
    });

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: message,
        code: error.code || 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        path: req.url,
    });
}

export function createApiError(message: string, statusCode: number = 500, code?: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

export function asyncHandler(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = fn(req, res, next);
            if (result && typeof result.catch === 'function') {
                return result.catch(next);
            }
            return result;
        } catch (error) {
            next(error);
        }
    };
}
