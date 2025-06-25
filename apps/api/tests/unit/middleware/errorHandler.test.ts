import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  errorHandler,
  createApiError,
  asyncHandler,
} from '../../../src/middleware/errorHandler';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ErrorHandler Middleware', () => {
  let mockRequest: Request;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
    } as Request;

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    mockNext = vi.fn() as unknown as NextFunction;
  });

  describe('errorHandler', () => {
    it('should handle standard errors with default status code', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Test error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        path: '/test',
      });
    });
    it('should handle API errors with custom status code', () => {
      const error = createApiError('Custom error', 400, 'CUSTOM_ERROR');

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Custom error',
        code: 'CUSTOM_ERROR',
        timestamp: expect.any(String),
        path: '/test',
      });
    });
    it('should handle errors without message', () => {
      const error = new Error();

      errorHandler(error, mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        timestamp: expect.any(String),
        path: '/test',
      });
    });
  });

  describe('createApiError', () => {
    it('should create error with default values', () => {
      const error = createApiError('Test message');

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBeUndefined();
    });

    it('should create error with custom values', () => {
      const error = createApiError('Custom message', 404, 'NOT_FOUND');

      expect(error.message).toBe('Custom message');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('asyncHandler', () => {
    it('should call next with error when async function throws', async () => {
      const asyncFunction = vi.fn().mockRejectedValue(new Error('Async error'));
      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Async error'));
    });

    it('should not call next when async function succeeds', async () => {
      const asyncFunction = vi.fn().mockResolvedValue('success');
      const wrappedFunction = asyncHandler(asyncFunction);

      await wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle synchronous functions', () => {
      const syncFunction = vi.fn();
      const wrappedFunction = asyncHandler(syncFunction);

      wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(syncFunction).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle synchronous functions that throw', () => {
      const syncFunction = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      const wrappedFunction = asyncHandler(syncFunction);

      wrappedFunction(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Sync error'));
    });
  });
});
