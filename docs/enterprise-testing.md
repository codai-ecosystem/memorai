# Enterprise Testing Suite Documentation

## Overview

The Memorai Enterprise Testing Suite provides comprehensive end-to-end testing capabilities using Playwright, ensuring production-ready quality and performance across all service components.

## Testing Architecture

### Test Suites

1. **Enterprise E2E Tests** (`tests/e2e/enterprise.spec.ts`)
   - Dashboard functionality validation
   - API health checks and integration testing
   - Memory operations verification
   - Service integration testing
   - Error handling validation

2. **Performance Tests** (`tests/e2e/performance.spec.ts`)
   - Memory operations performance benchmarking
   - API response time monitoring
   - Dashboard load time validation
   - Concurrent operation handling
   - Context retrieval performance

3. **Security Tests** (`tests/e2e/security.spec.ts`)
   - Input validation and sanitization
   - XSS and SQL injection prevention
   - Authentication and authorization testing
   - Rate limiting and DoS protection
   - Data encryption and privacy validation

4. **Load Tests** (`tests/e2e/load.spec.ts`)
   - Sustained memory creation load testing
   - Concurrent search operation testing
   - Mixed workload scenarios
   - Stress testing under extreme conditions
   - Graceful degradation validation

## Configuration

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:6366',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    // Automatic service startup for testing
  ]
});
```

### Test Fixtures (`tests/fixtures/memorai-fixtures.ts`)

Custom Playwright fixtures provide:
- Memory service abstraction
- API request utilities
- Test data management
- Service integration helpers

## Running Tests

### Basic Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI mode
pnpm test:e2e:ui

# Run in headed mode (visible browser)
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug
```

### Specific Test Suites

```bash
# Enterprise functionality tests
pnpm test:e2e:enterprise

# Performance benchmarking
pnpm test:e2e:performance

# Security validation
pnpm test:e2e:security

# Load testing
pnpm test:e2e:load
```

## Service Requirements

### Prerequisites

Before running tests, ensure all services are running:

```bash
# Start Docker services
docker-compose up -d

# Verify service health
curl http://localhost:6366  # Dashboard
curl http://localhost:6367/api/health  # API
```

### Port Configuration

- **Dashboard**: http://localhost:6366
- **API**: http://localhost:6367
- **MCP**: http://localhost:6368
- **Redis**: localhost:6369

## Test Categories

### 1. Functional Testing

**Dashboard Tests:**
- Page load validation
- UI component verification
- Navigation testing
- Real-time updates

**Memory Operations:**
- Create, read, update, delete operations
- Search functionality
- Context retrieval
- Multi-agent isolation

**API Integration:**
- Endpoint availability
- Request/response validation
- Error handling
- Status code verification

### 2. Performance Testing

**Benchmarks:**
- Memory operations: Target >10 ops/sec
- Search operations: Target >5 searches/sec
- API requests: Target >1 req/sec
- Dashboard load: Target <30 seconds

**Metrics Collected:**
- Operation throughput
- Response times
- Success rates
- Resource utilization

### 3. Security Testing

**Validation Areas:**
- Input sanitization
- XSS prevention
- SQL injection protection
- Authentication enforcement
- Authorization validation
- Rate limiting
- Data privacy

**Security Headers:**
- Content Security Policy
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security

### 4. Load Testing

**Scenarios:**
- Sustained memory creation (50 operations)
- Concurrent searches (30 operations)
- Mixed workloads (40 operations)
- Stress testing (60 operations across 3 agents)

**Success Criteria:**
- >80% success rate under normal load
- >90% success rate for searches
- >85% success rate for mixed workloads
- >70% graceful handling under stress

## CI/CD Integration

### GitHub Actions Integration

The test suite integrates with the enterprise CI/CD pipeline:

```yaml
- name: Run E2E Tests
  run: |
    docker-compose up -d
    sleep 10
    pnpm test:e2e
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

### Test Reports

Generated artifacts:
- HTML report: `playwright-report/index.html`
- JSON results: `playwright-report/results.json`
- JUnit XML: `playwright-report/results.xml`
- Screenshots and videos for failures

## Best Practices

### Test Design

1. **Isolation**: Each test should be independent
2. **Cleanup**: Proper test data cleanup
3. **Realistic Data**: Use production-like test scenarios
4. **Error Handling**: Test both success and failure paths
5. **Performance**: Set realistic performance expectations

### Maintenance

1. **Regular Updates**: Keep tests aligned with feature changes
2. **Performance Monitoring**: Track performance trends
3. **Security Updates**: Regular security test updates
4. **Documentation**: Keep test documentation current

### Debugging

1. **Headed Mode**: Use `--headed` for visual debugging
2. **Debug Mode**: Use `--debug` for step-by-step execution
3. **Screenshots**: Automatic screenshots on failure
4. **Trace Viewer**: Use Playwright trace viewer for analysis

## Enterprise Quality Gates

### Pre-Production Checklist

- [ ] All enterprise tests passing
- [ ] Performance benchmarks met
- [ ] Security tests validated
- [ ] Load tests successful
- [ ] No critical vulnerabilities
- [ ] Documentation updated

### Production Monitoring

- [ ] Automated test runs on schedule
- [ ] Performance regression alerts
- [ ] Security scanning integration
- [ ] Load testing on production data
- [ ] Incident response procedures

## Support and Troubleshooting

### Common Issues

1. **Service Startup**: Ensure Docker services are running
2. **Port Conflicts**: Check port availability
3. **Test Timeouts**: Adjust timeout settings
4. **Memory Issues**: Clean up test data
5. **Network Issues**: Verify service connectivity

### Getting Help

- Check service logs: `docker-compose logs`
- Review test output: `playwright show-report`
- Debug individual tests: `pnpm test:e2e:debug`
- Monitor service health: API health endpoints

---

**Enterprise Testing Excellence**: This comprehensive testing suite ensures Memorai meets enterprise-grade quality, performance, security, and reliability standards for production deployment.
