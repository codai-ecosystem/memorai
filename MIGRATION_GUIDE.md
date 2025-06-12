# 🔄 Migration Guide: Memorai 1.x → 2.x Multi-Tier Architecture

## Overview

Memorai 2.0 introduces a revolutionary **multi-tier memory architecture** that provides 100% functionality with or without OpenAI. This guide helps you migrate from the previous version and understand the new capabilities.

## 🎯 **What's New in 2.0**

### Major Changes
- ✅ **Multi-tier architecture** (4 memory tiers)
- ✅ **Auto-detection and fallback** system
- ✅ **Works without OpenAI** API key
- ✅ **Local AI embeddings** support
- ✅ **Zero-configuration startup**
- ✅ **Backward compatibility** maintained

### Breaking Changes
- ⚠️ `MemoryEngine` class superseded by `UnifiedMemoryEngine`
- ⚠️ Configuration structure enhanced (old configs still work)
- ⚠️ New tier-aware error messages

## 🚀 **Quick Migration**

### Option 1: Drop-in Replacement (Recommended)

**Before (v1.x):**
```javascript
import { MemoryEngine } from '@codai/memorai-core';

const memory = new MemoryEngine({
  vector_db: { /* config */ },
  openai: { /* config */ }
});
```

**After (v2.x):**
```javascript
import { UnifiedMemoryEngine } from '@codai/memorai-core';

const memory = new UnifiedMemoryEngine({
  // Same configuration works!
  vector_db: { /* config */ },
  openai: { /* config */ },
  
  // New options (optional)
  autoDetect: true,      // Automatically select best tier
  enableFallback: true   // Graceful fallback
});
```

### Option 2: Zero Configuration
```javascript
// Simplest migration - just use defaults!
import { UnifiedMemoryEngine } from '@codai/memorai-core';

const memory = new UnifiedMemoryEngine(); // Works immediately!
await memory.initialize();
```

## 📦 **Package Updates**

### Update Dependencies

```bash
# Update to latest version
npm update @codai/memorai-mcp

# Or install specific version
npm install @codai/memorai-mcp@^2.0.0-beta.1
```

### MCP Server Updates

**Before (v1.x) - Required OpenAI:**
```json
{
  "mcpServers": {
    "memorai": {
      "command": "memorai-mcp",
      "args": [],
      "env": {
        "MEMORAI_OPENAI_API_KEY": "required"
      }
    }
  }
}
```

**After (v2.x) - OpenAI Optional:**
```json
{
  "mcpServers": {
    "memorai": {
      "command": "memorai-mcp",
      "args": []
      // No env required! Works without OpenAI
    }
  }
}
```

## 🔧 **Configuration Migration**

### Old Configuration (Still Works!)
```javascript
const config = {
  vector_db: {
    url: 'http://localhost:6333',
    api_key: 'your-key',
    collection: 'memories',
    dimension: 1536
  },
  redis: {
    url: 'redis://localhost:6379',
    password: 'your-password',
    db: 0
  },
  openai: {
    api_key: 'your-openai-key',
    model: 'text-embedding-3-small'
  }
};
```

### Enhanced Configuration (Optional)
```javascript
const config = {
  // All old configs still work...
  vector_db: { /* same as before */ },
  redis: { /* same as before */ },
  openai: { /* same as before */ },
  
  // New multi-tier options
  autoDetect: true,           // Auto-select best tier
  enableFallback: true,       // Enable graceful fallback
  preferredTier: 'advanced',  // Force specific tier
  
  // Local AI configuration (new)
  localEmbedding: {
    model: 'all-MiniLM-L6-v2',
    pythonPath: 'python3',
    cachePath: './cache'
  },
  
  // Mock/testing configuration (new)
  mock: {
    simulateDelay: false,
    deterministicResponses: true
  }
};
```

## 🔀 **API Migration**

### Core API (Unchanged)
```javascript
// These work exactly the same in v2.x
await memory.remember(content, tenantId, agentId, options);
await memory.recall(query, tenantId, agentId, options);
await memory.getContext(request);
await memory.forget(memoryId);
```

### New APIs (Added)
```javascript
// Get current tier information
const tierInfo = memory.getTierInfo();
console.log(tierInfo.currentTier);     // 'advanced', 'smart', 'basic', 'mock'
console.log(tierInfo.capabilities);    // Tier capabilities
console.log(tierInfo.fallbackChain);   // Available fallback tiers

// Manual tier switching
await memory.switchTier('basic');      // Force switch to basic tier

// Get statistics
const stats = await memory.getStats();
console.log(stats.currentTier);
console.log(stats.engineStats);
```

### MCP Tools (Enhanced)
```javascript
// All existing tools work the same
await callTool('remember', { agentId, content });
await callTool('recall', { agentId, query });
await callTool('context', { agentId });
await callTool('forget', { agentId, memoryId });

// Tools now include tier information in responses
{
  success: true,
  result: "Memory stored",
  tier: "advanced",           // New: Current tier
  capabilities: { /* ... */ } // New: Tier capabilities
}
```

## 🔍 **Testing Migration**

### Validate Your Migration

1. **Test Auto-Detection:**
```bash
node scripts/setup.js
# Shows which tiers are available
```

2. **Test All Tiers:**
```bash
node scripts/test-all-tiers.mjs
# Comprehensive test of all functionality
```

3. **Test Your Existing Code:**
```javascript
// Your existing tests should still pass!
import { UnifiedMemoryEngine } from '@codai/memorai-core';

const memory = new UnifiedMemoryEngine(yourExistingConfig);
await memory.initialize();

// All your existing operations work
const memoryId = await memory.remember('test', 'tenant', 'agent');
const results = await memory.recall('test', 'tenant', 'agent');
```

## 🌟 **Benefits After Migration**

### Immediate Benefits
- ✅ **No more "OpenAI key required" errors**
- ✅ **Works in offline/air-gapped environments**  
- ✅ **Automatic fallback for reliability**
- ✅ **Better error messages with tier context**
- ✅ **Zero-config setup for new users**

### Performance Benefits
- ⚡ **Faster initialization** with basic tiers
- ⚡ **Local caching** for embeddings
- ⚡ **Optimized fallback** paths
- ⚡ **Reduced external dependencies**

### Operational Benefits
- 🔧 **Simplified deployment** (no mandatory API keys)
- 🔧 **Better monitoring** with tier awareness
- 🔧 **Easier debugging** with tier-specific logs
- 🔧 **Flexible scaling** per environment

## 🚨 **Troubleshooting**

### Common Migration Issues

**Issue 1: "Cannot find UnifiedMemoryEngine"**
```bash
# Solution: Update package
npm install @codai/memorai-mcp@latest
```

**Issue 2: "Memory engine not initialized"**
```javascript
// Solution: Check tier availability
const tierInfo = memory.getTierInfo();
console.log('Available tiers:', tierInfo.fallbackChain);
```

**Issue 3: "Unexpected tier behavior"**
```javascript
// Solution: Disable auto-detection for testing
const memory = new UnifiedMemoryEngine({
  autoDetect: false,
  preferredTier: 'basic', // Force specific tier
  enableFallback: false   // Disable for debugging
});
```

### Environment-Specific Issues

**Docker/Container Environments:**
```dockerfile
# Add Python for Tier 2 support (optional)
RUN apt-get update && apt-get install -y python3 python3-pip
RUN pip3 install sentence-transformers

# Or use basic tier only
ENV MEMORAI_PREFERRED_TIER=basic
```

**Serverless/Lambda:**
```javascript
// Use basic tier for faster cold starts
const memory = new UnifiedMemoryEngine({
  preferredTier: 'basic',
  enableFallback: false
});
```

**CI/CD Pipelines:**
```javascript
// Use mock tier for testing
const memory = new UnifiedMemoryEngine({
  preferredTier: 'mock',
  mock: {
    deterministicResponses: true
  }
});
```

## 📊 **Migration Checklist**

### Pre-Migration
- [ ] Backup existing memory data
- [ ] Review current configuration
- [ ] Test suite ready
- [ ] Staging environment available

### Migration Steps
- [ ] Update package to v2.x
- [ ] Replace `MemoryEngine` with `UnifiedMemoryEngine`
- [ ] Test with existing configuration
- [ ] Enable auto-detection (optional)
- [ ] Test fallback behavior
- [ ] Update error handling (optional)

### Post-Migration
- [ ] Verify all tiers work in your environment
- [ ] Update monitoring/logging
- [ ] Update documentation
- [ ] Train team on new features
- [ ] Monitor tier usage in production

### Validation
- [ ] All existing tests pass
- [ ] New tier-specific tests added
- [ ] Performance benchmarks maintained
- [ ] Error handling improved

## 🎯 **Migration Strategies**

### Strategy 1: Conservative (Recommended)
1. Keep existing configuration
2. Add auto-detection gradually
3. Test thoroughly in staging
4. Monitor tier usage

### Strategy 2: Progressive
1. Start with basic tier only
2. Add local AI (Tier 2) 
3. Enable OpenAI (Tier 1) when ready
4. Full auto-detection last

### Strategy 3: Aggressive
1. Enable full auto-detection immediately
2. Rely on fallback system
3. Monitor and tune as needed

## 🆘 **Need Help?**

### Support Resources
- 📖 [Full Documentation](./MULTI_TIER_README.md)
- 🐛 [GitHub Issues](https://github.com/dragoscv/memorai-mcp/issues)
- 💬 [Discord Community](https://discord.gg/memorai)
- 📧 [Email Support](mailto:support@memorai.com)

### Migration Assistance
We're here to help! Reach out if you need:
- Custom migration planning
- Environment-specific guidance  
- Performance optimization
- Training for your team

---

**🎉 Welcome to Memorai 2.0 - Memory that works everywhere!**
