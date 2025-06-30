# 🧠 Memorai MCP

**🚫 PRODUCTION-ONLY MODE - Local Development DISABLED**

[![Tests](https://img.shields.io/badge/tests-1034_passing-yellow)](tests)
[![Coverage](https://img.shields.io/badge/coverage-39%25-orange)](coverage)
[![Status](https://img.shields.io/badge/status-production--only-red)](PRODUCTION_ENFORCEMENT_COMPLETE.md)
[![License](https://img.shields.io/github/license/codai-ecosystem/memorai)](LICENSE)

Enterprise-grade memory system built specifically for AI agents. **ENFORCED PRODUCTION-ONLY WORKFLOW** - no local development allowed.

## 🚫 PRODUCTION-ONLY ENFORCEMENT

**CRITICAL NOTICE**: This service is configured for **PRODUCTION-ONLY** workflows. Local development servers, testing, and dev commands are **COMPLETELY DISABLED**.

### ✅ ALLOWED OPERATIONS
- **Code Changes**: Edit source files
- **Package Publishing**: `npm run publish-packages`  
- **Testing**: Via MCP tools and published packages only
- **Integration**: VS Code MCP server with published packages

### ❌ PROHIBITED OPERATIONS
- `pnpm dev` (disabled)
- `pnpm test` (disabled)  
- Local development servers (disabled)
- Local testing suites (disabled)

**[📋 View Complete Enforcement Details](PRODUCTION_ENFORCEMENT_COMPLETE.md)**

## 🎯 Current Development Status

✅ **Production-Only Mode**: All local development disabled  
✅ **1034 tests passing** via published packages  
✅ **MCP Integration**: Working with published packages
✅ **Port standardization** complete (6366+)  
✅ **All API endpoints** working via published packages
✅ **Memory persistence** verified in production mode

[📊 View Full Status Report](FINAL_STATUS_REPORT.md)

## ✨ Features

- **🧠 Agent-Native**: Designed for AI agents, not humans
- **🔍 Semantic Search**: Vector-based memory with temporal awareness
- **⚡ Lightning Fast**: Sub-100ms queries, optimized for real-time use
- **🏢 Enterprise-Ready**: Multi-tenant, encrypted, audit-ready
- **🌐 Standard Protocol**: Implements Model Context Protocol (MCP)
- **📦 Zero Dependencies**: Runs anywhere Node.js runs
- **🚫 Production-Enforced**: No local development allowed

## 🚀 Production-Only Workflow

### Prerequisites

- Node.js 18+
- pnpm 8+
- VS Code with MCP integration

### ⚠️ CRITICAL: Production-Only Workflow

**ALL OPERATIONS MUST USE PUBLISHED PACKAGES**

```bash
# 1. Make code changes (allowed)
# 2. Publish packages (builds automatically)
npm run publish-packages

# 3. Test ONLY via MCP tools in VS Code:
# - mcp_memoraimcpser_remember
# - mcp_memoraimcpser_recall
# - Playwright MCP tools for UI testing

# 4. Services auto-run from published packages:
# - Dashboard: http://localhost:6366 (published package)
# - API: http://localhost:6367 (published package)
```

### Installation & Setup

```bash
# Package development (publishing only)
```
