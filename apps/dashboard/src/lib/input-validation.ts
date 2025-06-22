/**
 * Input Validation and Sanitization Utilities
 * Provides secure input handling for user data
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Common validation schemas
export const validationSchemas = {
    // Memory-related validations
    memoryContent: z
        .string()
        .min(1, 'Memory content is required')
        .max(10000, 'Memory content must be less than 10,000 characters')
        .refine(
            (val) => val.trim().length > 0,
            'Memory content cannot be only whitespace'
        ),

    memoryMetadata: z.object({
        importance: z.number().min(0).max(1).optional(),
        tags: z.array(z.string().max(50)).max(20).optional(),
        category: z.string().max(100).optional(),
        agentId: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid agent ID format').optional(),
    }),

    // Search validations
    searchQuery: z
        .string()
        .min(1, 'Search query is required')
        .max(1000, 'Search query must be less than 1,000 characters')
        .refine(
            (val) => !/<script|javascript:|data:|vbscript:/i.test(val),
            'Search query contains potentially dangerous content'
        ),

    searchFilters: z.object({
        agentId: z.string().regex(/^[a-zA-Z0-9_-]*$/, 'Invalid agent ID format').optional(),
        tags: z.array(z.string().max(50)).max(10).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        minImportance: z.number().min(0).max(1).optional(),
        maxImportance: z.number().min(0).max(1).optional(),
    }),

    // User input validations
    agentId: z
        .string()
        .regex(/^[a-zA-Z0-9_-]+$/, 'Agent ID can only contain letters, numbers, hyphens, and underscores')
        .min(1, 'Agent ID is required')
        .max(50, 'Agent ID must be less than 50 characters'),

    // API parameter validations
    paginationParams: z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
    }),

    // Configuration validations
    systemConfig: z.object({
        maxMemories: z.number().int().min(1).max(1000000).optional(),
        enableAnalytics: z.boolean().optional(),
        enableRealTime: z.boolean().optional(),
        cacheTimeout: z.number().int().min(0).max(86400).optional(), // Max 24 hours
    }),
};

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true,
    });
}

/**
 * Sanitizes text content by removing potentially dangerous characters
 */
export function sanitizeText(input: string): string {
    return input
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/data:/gi, '') // Remove data: protocols
        .replace(/vbscript:/gi, '') // Remove vbscript: protocols
        .trim();
}

/**
 * Validates and sanitizes memory content
 */
export function validateMemoryContent(content: unknown): string {
    const validated = validationSchemas.memoryContent.parse(content);
    return sanitizeText(validated);
}

/**
 * Validates and sanitizes search query
 */
export function validateSearchQuery(query: unknown): string {
    const validated = validationSchemas.searchQuery.parse(query);
    return sanitizeText(validated);
}

/**
 * Validates agent ID format
 */
export function validateAgentId(agentId: unknown): string {
    return validationSchemas.agentId.parse(agentId);
}

/**
 * Validates pagination parameters
 */
export function validatePagination(params: unknown): { page: number; limit: number } {
    return validationSchemas.paginationParams.parse(params);
}

/**
 * Validates and sanitizes memory metadata
 */
export function validateMemoryMetadata(metadata: unknown): {
    importance?: number;
    tags?: string[];
    category?: string;
    agentId?: string;
} {
    const validated = validationSchemas.memoryMetadata.parse(metadata);

    // Sanitize text fields
    if (validated.category) {
        validated.category = sanitizeText(validated.category);
    }

    if (validated.tags) {
        validated.tags = validated.tags.map(tag => sanitizeText(tag));
    }

    return validated;
}

/**
 * Validates search filters
 */
export function validateSearchFilters(filters: unknown): {
    agentId?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    minImportance?: number;
    maxImportance?: number;
} {
    const validated = validationSchemas.searchFilters.parse(filters);

    // Sanitize text fields
    if (validated.tags) {
        validated.tags = validated.tags.map(tag => sanitizeText(tag));
    }

    return validated;
}

/**
 * Validates API request body with custom schema
 */
export function validateRequestBody<T>(
    body: unknown,
    schema: z.ZodSchema<T>
): T {
    try {
        return schema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessage = error.errors
                .map((err) => `${err.path.join('.')}: ${err.message}`)
                .join(', ');
            throw new Error(`Validation failed: ${errorMessage}`);
        }
        throw error;
    }
}

/**
 * Rate limiting validation - checks if request exceeds rate limits
 */
export function validateRateLimit(
    identifier: string,
    maxRequests: number = 100,
    windowMs: number = 60000 // 1 minute
): boolean {
    // In production, this would use Redis or a proper rate limiting service
    // For now, we'll use a simple in-memory store
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request log for identifier
    if (!rateLimitStore.has(identifier)) {
        rateLimitStore.set(identifier, []);
    }

    const requests = rateLimitStore.get(identifier)!;

    // Remove old requests outside the window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= maxRequests) {
        return false;
    }

    // Add current request
    recentRequests.push(now);
    rateLimitStore.set(identifier, recentRequests);

    return true;
}

// Simple in-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, number[]>();

/**
 * Validates file upload parameters
 */
export const fileUploadSchema = z.object({
    filename: z.string().max(255).regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename'),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
    mimetype: z.enum([
        'application/json',
        'text/plain',
        'text/csv',
        'application/csv',
    ]),
});

/**
 * Validates file upload
 */
export function validateFileUpload(file: unknown): {
    filename: string;
    size: number;
    mimetype: string;
} {
    return fileUploadSchema.parse(file);
}

/**
 * SQL injection prevention for search queries
 */
export function sanitizeForDatabase(input: string): string {
    return input
        .replace(/[';]/g, '') // Remove semicolons
        .replace(/--/g, '') // Remove SQL comments
        .replace(/\/\*/g, '') // Remove SQL block comments start
        .replace(/\*\//g, '') // Remove SQL block comments end
        .replace(/\bDROP\b/gi, '') // Remove DROP statements
        .replace(/\bDELETE\b/gi, '') // Remove DELETE statements
        .replace(/\bUPDATE\b/gi, '') // Remove UPDATE statements
        .replace(/\bINSERT\b/gi, '') // Remove INSERT statements
        .trim();
}

/**
 * Error classes for validation
 */
export class ValidationError extends Error {
    constructor(message: string, public field?: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class RateLimitError extends Error {
    constructor(message: string = 'Rate limit exceeded') {
        super(message);
        this.name = 'RateLimitError';
    }
}
