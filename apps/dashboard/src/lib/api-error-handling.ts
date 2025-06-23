/**
 * API Error Handling Utilities
 * Standardized error handling for API routes and responses
 */

import { NextResponse, NextRequest } from "next/server";
import { ZodError } from "zod";
import { ValidationError, RateLimitError } from "./input-validation";

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId?: string;
  };
}

/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

/**
 * API response type union
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Server errors (5xx)
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",

  // Application-specific errors
  MEMORY_NOT_FOUND = "MEMORY_NOT_FOUND",
  AGENT_NOT_FOUND = "AGENT_NOT_FOUND",
  SEARCH_FAILED = "SEARCH_FAILED",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: ApiSuccessResponse<T>["meta"],
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
      ...meta,
    },
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: unknown,
  requestId?: string,
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId(),
    },
  };
}

/**
 * Maps error types to appropriate HTTP status codes and error codes
 */
function mapErrorToResponse(error: Error): {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
  details?: unknown;
} {
  // API errors (already have status code and error code)
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      errorCode: error.code,
      message: error.message,
      details: error.details,
    };
  }

  // Validation errors
  if (error instanceof ValidationError) {
    return {
      statusCode: 400,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: error.message,
      details: { field: error.field },
    };
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: "Invalid input data",
      details: error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    };
  }

  // Rate limit errors
  if (error instanceof RateLimitError) {
    return {
      statusCode: 429,
      errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
      message: error.message,
    };
  }

  // Network/connection errors
  if (
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("timeout")
  ) {
    return {
      statusCode: 503,
      errorCode: ErrorCode.SERVICE_UNAVAILABLE,
      message: "Service temporarily unavailable",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }

  // Database errors
  if (
    error.message.includes("database") ||
    error.message.includes("connection")
  ) {
    return {
      statusCode: 500,
      errorCode: ErrorCode.DATABASE_ERROR,
      message: "Database error occurred",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    };
  }

  // Default internal server error
  return {
    statusCode: 500,
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: "An unexpected error occurred",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  };
}

/**
 * Global error handler for API routes
 */
export function handleApiError(error: Error): NextResponse<ApiErrorResponse> {
  const { statusCode, errorCode, message, details } = mapErrorToResponse(error);

  // Log error for monitoring
  console.error("API Error:", {
    error: error.message,
    stack: error.stack,
    statusCode,
    errorCode,
    timestamp: new Date().toISOString(),
  });

  // Create error response
  const errorResponse = createErrorResponse(errorCode, message, details);

  return NextResponse.json(errorResponse, {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Async handler wrapper that catches and handles errors
 */
export function asyncHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  };
}

/**
 * Validates HTTP method for API routes
 */
export function validateHttpMethod(
  request: NextRequest,
  allowedMethods: string[],
): void {
  const method = request.method;
  if (!allowedMethods.includes(method)) {
    throw new ApiError(
      ErrorCode.METHOD_NOT_ALLOWED,
      `Method ${method} not allowed. Allowed methods: ${allowedMethods.join(", ")}`,
      405,
    );
  }
}

/**
 * Extracts and validates request body
 */
export async function getRequestBody<T>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ApiError(
      ErrorCode.BAD_REQUEST,
      "Invalid JSON in request body",
      400,
      error instanceof Error ? error.message : undefined,
    );
  }
}

/**
 * Extracts query parameters with type safety
 */
export function getQueryParams(
  request: NextRequest,
): Record<string, string | string[]> {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // Convert to array if multiple values
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Creates paginated response metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): NonNullable<ApiSuccessResponse["meta"]>["pagination"] {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Rate limiting middleware
 */
export function checkRateLimit(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 60000,
): void {
  // Get client identifier (IP address from headers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const identifier = (forwardedFor || realIp) ?? "unknown";

  // Check rate limit (this would use Redis in production)
  const isAllowed = validateRateLimit(identifier, maxRequests, windowMs);

  if (!isAllowed) {
    throw new RateLimitError("Rate limit exceeded. Please try again later.");
  }
}

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function validateRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // New window or expired entry
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * CORS headers for API responses
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  return response;
}

/**
 * Security headers for API responses
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}
