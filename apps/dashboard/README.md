# Memorai Web Dashboard

A modern, feature-rich web interface for managing AI memories and system configuration.

## Features

### 🧠 Memory Management

- **Add Memories**: Store new memories with metadata
- **Search & Recall**: Advanced search with similarity scoring
- **Delete Memories**: Remove unwanted memories
- **Export/Import**: Backup and restore memory data
- **Real-time Updates**: Live memory operations via WebSocket

### 📊 Statistics & Analytics

- **Usage Metrics**: Track memory operations over time
- **Performance Analytics**: Monitor system performance
- **Tier Usage**: Visualize memory tier utilization
- **Agent Statistics**: Per-agent memory analytics

### 🕸️ Knowledge Graph (Coming Soon)

- **Visual Relationships**: See connections between memories
- **Interactive Exploration**: Navigate memory relationships
- **Export Capabilities**: Save graph data

### ⚙️ Configuration Management

- **Tier Information**: View current memory tier and capabilities
- **Environment Status**: Check API keys and dependencies
- **System Health**: Monitor component availability

## Quick Start

1. **Install Dependencies**:

   ```bash
   cd apps/dashboard
   npm install
   ```

2. **Start the Server**:

   ```bash
   npm run dev
   ```

3. **Open Dashboard**:
   Navigate to `http://localhost:6366`

## Architecture

### Backend Server

- **Express.js**: RESTful API server
- **Socket.IO**: Real-time WebSocket communication
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston-based structured logging

### Frontend Dashboard

- **Modern HTML5**: Semantic, accessible markup
- **Tailwind CSS**: Utility-first styling with dark mode
- **Vanilla JavaScript**: No framework dependencies
- **Chart.js**: Interactive data visualization
- **Lucide Icons**: Beautiful, consistent iconography

### Memory Integration

- **Unified Engine**: Integrates with @codai/memorai-core
- **Auto-Detection**: Automatically detects available tiers
- **Fallback Support**: Graceful degradation to mock mode
- **Error Handling**: Comprehensive error management

## API Endpoints

### Memory Operations

- `POST /api/memory/remember` - Store a new memory
- `POST /api/memory/recall` - Search and retrieve memories
- `DELETE /api/memory/forget` - Delete a memory
- `POST /api/memory/context` - Get agent context

### Configuration

- `GET /api/config` - Get current configuration
- `GET /api/health` - Health check endpoint

### Statistics

- `GET /api/stats` - Get system statistics

## WebSocket Events

### Client → Server

- `memory:remember` - Store memory
- `memory:recall` - Search memories
- `memory:forget` - Delete memory
- `config:get` - Get configuration
- `stats:get` - Get statistics

### Server → Client

- `connected` - Connection established
- `config` - Configuration data
- `memory:created` - Memory added
- `memory:deleted` - Memory removed
- `system:event` - System events

## Development

### Running in Development Mode

```bash
# Start with auto-reload
npm run dev

# Or with environment variables
MEMORAI_OPENAI_API_KEY=your_key npm run dev
```

### Environment Variables

- `WEB_PORT` - Server port (default: 6366)
- `MEMORAI_OPENAI_API_KEY` - OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `PYTHON_PATH` - Python executable path

### Mock Mode

The dashboard automatically runs in mock mode when the Memorai core engine is not available, providing a fully functional demo experience.

## Features Overview

### Memory Management Tab

- **Interactive Forms**: Add memories with rich metadata
- **Advanced Search**: Query memories with similarity matching
- **Memory Cards**: Beautiful display of search results
- **Batch Operations**: Export and clear operations
- **Real-time Updates**: Live memory synchronization

### Knowledge Graph Tab

- **Visual Network**: Interactive memory relationship visualization
- **Node Interaction**: Click and explore memory connections
- **Export Options**: Save graph in multiple formats
- **Filter Controls**: Focus on specific relationships

### Statistics Tab

- **Key Metrics**: Total memories, active agents, API calls, uptime
- **Usage Charts**: Time-series memory operation tracking
- **Performance Metrics**: Tier usage and response times
- **Real-time Updates**: Live statistics monitoring

### Configuration Tab

- **Current Status**: Active tier and capabilities
- **Environment Check**: API key and dependency status
- **Tier Information**: Available memory tiers and requirements
- **Health Monitoring**: Component availability status

## Security Features

- **Helmet.js**: Security headers and CSP
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable cross-origin settings
- **Input Validation**: Sanitized user inputs
- **Error Handling**: Safe error responses

## Accessibility

- **WCAG 2.1 Compliant**: Follows accessibility guidelines
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Friendly**: Proper ARIA labels
- **High Contrast**: Dark/light theme support
- **Responsive Design**: Mobile and desktop optimized

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile Support**: iOS Safari 13+, Chrome Mobile 80+
- **JavaScript**: ES2020+ features used
- **CSS**: CSS Grid and Flexbox layout

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### Environment Configuration

```bash
# Production environment
NODE_ENV=production
WEB_PORT=3002
MEMORAI_OPENAI_API_KEY=your_production_key
```

## Contributing

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/amazing-feature`
3. **Commit Changes**: `git commit -m 'Add amazing feature'`
4. **Push to Branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:

- **GitHub Issues**: [Report bugs and feature requests](https://github.com/dragoscv/memorai-mcp/issues)
- **Documentation**: [Full documentation](https://github.com/dragoscv/memorai-mcp#readme)
- **Community**: [Discussions and help](https://github.com/dragoscv/memorai-mcp/discussions)
