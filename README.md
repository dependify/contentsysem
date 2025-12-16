# ContentSys - Multi-Tenant AI Content Engine

A scalable, multi-tenant SaaS platform for automated content generation using an agentic workflow architecture.

## Architecture

ContentSys follows a 3-layer architecture:

1. **Layer 1: Directives** - SOPs in Markdown that define agent behavior
2. **Layer 2: Orchestration** - Mastra workflows that manage agent execution
3. **Layer 3: Execution** - Deterministic TypeScript tools for API calls and data processing

## Features

- **Multi-tenant isolation** with client workspaces
- **12-step agentic workflow** from strategy to deployment
- **Multiple AI providers** (Minimax M2, OpenAI, Anthropic)
- **Advanced research** using Tavily, Exa.ai, and Firecrawl
- **Image generation** with Runware.ai or DALL-E
- **WordPress deployment** with media upload and SEO optimization
- **Queue management** with BullMQ and Redis
- **Comprehensive logging** and observability

## Quick Start

1. **Clone and install dependencies:**
```bash
git clone <repository>
cd contentsys
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Initialize the database:**
```bash
npm run dev
# POST to http://localhost:3000/api/init
```

4. **Start the worker:**
```bash
npm run worker
```

## API Endpoints

### Tenant Management
- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants/:id` - Get tenant details

### Content Queue
- `POST /api/content/add` - Add single content to queue
- `POST /api/content/bulk-add` - Bulk add content with scheduling
- `GET /api/queue/status/:tenant_id` - Get queue status

### System Monitoring
- `GET /api/system/stats` - System-wide statistics
- `POST /api/jobs/trigger` - Manually trigger content generation
- `GET /api/jobs/:job_id` - Get job details

## The Agentic Workflow

### Phase 1: Strategy & Intelligence
1. **Nexus** - Strategic planning and research question generation
2. **Vantage** - Deep research using multiple sources

### Phase 2: Structural Engineering
3. **Vertex** - SEO architecture and content outlining

### Phase 3: Content Production
4. **Hemingway** - Content writing
5. **Prism** - Quality control and editing

### Phase 4: Multimedia Enrichment
6. **Canvas** - Visual direction and image prompting
7. **Lens** - Video curation
8. **Pixel** - Image generation

### Phase 5: Assembly & Deployment
9. **Mosaic** - HTML assembly with multimedia
10. **Deployer** - WordPress publishing

## Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgres://...

# Redis
REDIS_URL=rediss://...

# AI APIs
MINIMAX_API_KEY=your_key
OPENAI_API_KEY=your_key

# Research APIs
TAVILY_API_KEY=your_key
EXA_API_KEY=your_key
FIRECRAWL_API_KEY=your_key

# Image Generation
RUNWARE_API_KEY=your_key
```

### Tenant Configuration

Each tenant requires:
- Business profile (name, domain, niche)
- ICP (Ideal Customer Profile)
- Brand voice guidelines
- WordPress credentials
- Custom API keys (optional)

## Development

### Project Structure
```
src/
├── directives/          # Agent SOPs (Layer 1)
├── workflows/           # Mastra orchestration (Layer 2)
├── execution/           # Deterministic tools (Layer 3)
├── index.ts            # API server
├── scheduler.ts        # Content scheduler
└── worker.ts           # BullMQ worker
```

### Adding New Agents

1. Create directive in `src/directives/`
2. Add step to workflow in `src/workflows/`
3. Implement execution tools in `src/execution/`

### Testing

```bash
# Start development server
npm run dev

# Test with sample content
curl -X POST http://localhost:3000/api/jobs/trigger \
  -H "Content-Type: application/json" \
  -d '{"tenant_id": 1, "title": "The Future of AI in Content Marketing"}'
```

## Deployment

### Production Setup

1. **Database**: PostgreSQL with SSL
2. **Cache**: Redis with TLS
3. **Queue**: BullMQ workers
4. **Monitoring**: Agent logs and system stats

### Scaling

- Horizontal scaling with multiple workers
- Database connection pooling
- Redis clustering for high availability
- Load balancing for API endpoints

## Monitoring & Observability

- **Agent Logs**: Duration, token usage, success/failure rates
- **Queue Status**: Pending, processing, completed, failed
- **System Stats**: Performance metrics and health checks
- **Error Tracking**: Comprehensive error logging with stack traces

## License

MIT License - see LICENSE file for details.