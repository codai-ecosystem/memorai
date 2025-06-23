import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { configRouter } from '../../../src/routes/config';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { createMockMemoryEngine } from '../../helpers/testHelpers';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
    logger: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('Config Routes', () => {
    let app: express.Application;
    let mockMemoryEngine: any;
    beforeEach(() => {
        app = express();
        app.use(express.json());

        mockMemoryEngine = createMockMemoryEngine();

        // Add memory engine to request
        app.use((req: any, res, next) => {
            req.memoryEngine = mockMemoryEngine;
            next();
        });

        app.use('/api/config', configRouter);

        // Add error handler middleware
        app.use(errorHandler);
    });

    describe('GET /', () => {
        it('should return current configuration', async () => {
            const response = await request(app)
                .get('/api/config')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.config).toBeDefined();
            expect(response.body.config.tier).toBeDefined();
            expect(response.body.config.environment).toBeDefined();
            expect(response.body.config.features).toBeDefined();
        });

        it('should include tier information', async () => {
            const response = await request(app)
                .get('/api/config')
                .expect(200);

            const { config } = response.body;
            expect(config.tier.level).toBe('mock');
            expect(config.tier.capabilities).toBeDefined();
            expect(config.tier.message).toBeDefined();
        });

        it('should include environment information', async () => {
            const response = await request(app)
                .get('/api/config')
                .expect(200);

            const { environment } = response.body.config;
            expect(environment.hasOpenAIKey).toBeDefined();
            expect(environment.hasAzureConfig).toBeDefined();
            expect(environment.hasLocalAI).toBe(true);
            expect(environment.pythonPath).toBeDefined();
            expect(environment.cachePath).toBeDefined();
        });

        it('should include feature capabilities', async () => {
            const response = await request(app)
                .get('/api/config')
                .expect(200);

            const { features } = response.body.config;
            expect(features.embedding).toBe(true);
            expect(features.similarity).toBe(true);
            expect(features.persistence).toBe(true);
            expect(features.scalability).toBe(false);
        }); it('should handle missing memory engine', async () => {
            const noEngineApp = express();
            noEngineApp.use(express.json());

            noEngineApp.use((req: any, res, next) => {
                req.memoryEngine = null;
                next();
            });
            noEngineApp.use('/api/config', configRouter);
            noEngineApp.use(errorHandler);

            const response = await request(noEngineApp)
                .get('/api/config')
                .expect(503);

            expect(response.body.error).toBe('Memory engine not available');
            expect(response.body.code).toBe('MEMORY_ENGINE_UNAVAILABLE');
        });

        it('should handle configuration retrieval failure', async () => {
            mockMemoryEngine.getTierInfo.mockImplementation(() => {
                throw new Error('Tier info failed');
            });

            const response = await request(app)
                .get('/api/config')
                .expect(500);

            expect(response.body.error).toContain('Failed to get configuration');
            expect(response.body.code).toBe('CONFIG_GET_FAILED');
        });
    });

    describe('POST /test-tier', () => {
        it('should accept valid tier values', async () => {
            const validTiers = ['advanced', 'smart', 'basic', 'mock'];

            for (const tier of validTiers) {
                const response = await request(app)
                    .post('/api/config/test-tier')
                    .send({ tier })
                    .expect(200);

                // Assuming the endpoint returns success when tier is valid
                expect(response.body).toBeDefined();
            }
        });

        it('should reject invalid tier values', async () => {
            const invalidTiers = ['invalid', 'test', 'production', ''];

            for (const tier of invalidTiers) {
                const response = await request(app)
                    .post('/api/config/test-tier')
                    .send({ tier })
                    .expect(400);

                expect(response.body.error).toBe('Invalid tier specified');
                expect(response.body.code).toBe('INVALID_TIER');
            }
        });        it('should handle missing tier parameter', async () => {
            const response = await request(app)
                .post('/api/config/test-tier')
                .send({})
                .expect(400);

            expect(response.body.error).toBe('Tier not specified');
            expect(response.body.code).toBe('TIER_NOT_SPECIFIED');
        });
    });
});
