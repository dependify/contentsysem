# ContentSys Multi-Tenant AI Content Engine - Design Document

## Overview

ContentSys is a scalable, multi-tenant SaaS platform that automates content creation through a sophisticated agentic workflow. The system implements a 3-layer architecture that separates probabilistic AI decision-making from deterministic business logic, ensuring reliability and maintainability. The platform operates as an "assembly line" where 12 specialized AI agents collaborate to research, write, optimize, and publish high-quality blog content while maintaining strict tenant isolation.

## Architecture

### 3-Layer Architecture Pattern

The system follows a strict separation of concerns across three distinct layers:

**Layer 1: Directives (What to do)**
- Markdown-based Standard Operating Procedures (SOPs) stored in `directives/`
- Natural language instructions defining goals, inputs, tools, outputs, and edge cases
- Living documents that evolve through self-annealing processes
- Agent-specific behavioral guidelines and quality standards

**Layer 2: Orchestration (Decision making)**
- Mastra-based workflow engine providing intelligent routing and error handling
- Responsible for reading directives, calling execution tools, and managing state transitions
- Implements retry logic, error recovery, and directive learning updates
- Bridges human intent (directives) with deterministic execution

**Layer 3: Execution (Doing the work)**
- Deterministic TypeScript modules handling API calls, data processing, and integrations
- Environment-based configuration management for credentials and settings
- Reliable, testable, and fast operations with comprehensive error handling
- Database interactions, file operations, and external service integrations

### Multi-Tenant Infrastructure

**Database Architecture:**
- PostgreSQL primary database: `ContentSys`
- Redis for BullMQ queue management and caching
- Tenant isolation through database-level separation
- Encrypted credential storage for sensitive client data

**Queue Management:**
- BullMQ for asynchronous agent workflow processing
- Redis-backed job persistence and retry mechanisms
- Scalable worker processes for concurrent tenant processing
- Dead letter queues for failed job analysis

## Components and Interfaces

### Core Database Schema

```sql
-- Tenant Management
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    business_name VARCHAR(255),
    domain_url VARCHAR(255),
    icp_profile TEXT, -- JSON string of Ideal Customer Profile
    brand_voice TEXT, -- Guidelines for content agents
    wp_credentials TEXT, -- Encrypted WordPress credentials
    api_config TEXT -- Custom API keys configuration
);

-- Content Processing Queue
CREATE TABLE content_queue (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    title VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    current_step INT DEFAULT 0,
    scheduled_for TIMESTAMP,
    published_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agent Output Persistence
CREATE TABLE artifacts (
    id SERIAL PRIMARY KEY,
    queue_id INT REFERENCES content_queue(id),
    step_name VARCHAR(50),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- System Observability
CREATE TABLE agent_logs (
    id SERIAL PRIMARY KEY,
    queue_id INT,
    agent_name VARCHAR(50),
    duration_ms INT,
    token_usage INT,
    success BOOLEAN,
    error_trace TEXT
);
```

### Agent Workflow Components

**Phase 1: Strategy & Intelligence**
1. **Trigger System**: Database scanner for scheduled content
2. **Nexus Agent**: Strategic analysis and research question generation
3. **Vantage Agent**: Deep research and competitive analysis

**Phase 2: Structural Engineering**
4. **Vertex Agent**: SEO optimization and content architecture

**Phase 3: Content Production**
5. **Hemingway Agent**: Content writing and brand voice adherence
6. **Prism Agent**: Quality assurance and editorial review

**Phase 4: Multimedia Enrichment**
7. **Canvas Agent**: Visual content strategy and image prompting
8. **Lens Agent**: Video content curation and integration
9. **Pixel Agent**: Image generation and optimization

**Phase 5: Assembly & Deployment**
10. **Mosaic Agent**: HTML compilation and schema generation
11. **Deployer Agent**: WordPress publishing and metadata management
12. **Archival System**: Final content storage and status updates

### External Service Integrations

**AI and Research Services:**
- Minimax M2: Primary AI model for agent intelligence
- Tavily AI: Advanced search and research capabilities
- Exa.ai: Semantic search and content discovery
- Firecrawl: Web scraping and content extraction

**Content Generation:**
- Runware.ai: Fast image generation via Stable Diffusion
- Flux API: Alternative image generation service
- YouTube API: Video content discovery and embedding

**Publishing Platform:**
- WordPress REST API: Content publishing and media management
- SEO plugins: Yoast/RankMath integration for metadata

## Data Models

### Tenant Configuration Model
```typescript
interface TenantConfig {
    id: number;
    businessName: string;
    domainUrl: string;
    icpProfile: {
        demographics: string;
        painPoints: string[];
        goals: string[];
        preferredContent: string[];
    };
    brandVoice: {
        tone: string;
        style: string;
        avoidWords: string[];
        preferredPhrases: string[];
    };
    wpCredentials: {
        url: string;
        username: string;
        appPassword: string; // Encrypted
    };
    apiConfig: {
        minimaxKey?: string;
        openaiKey?: string;
        anthropicKey?: string;
    };
    leadMagnets: LeadMagnet[];
}
```

### Content Queue Model
```typescript
interface ContentQueueItem {
    id: number;
    tenantId: number;
    title: string;
    status: 'pending' | 'processing' | 'complete' | 'failed';
    currentStep: number;
    scheduledFor: Date;
    publishedUrl?: string;
    artifacts: AgentArtifact[];
}
```

### Agent Artifact Model
```typescript
interface AgentArtifact {
    id: number;
    queueId: number;
    stepName: string;
    data: {
        input: any;
        output: any;
        metadata: {
            duration: number;
            tokenUsage: number;
            timestamp: Date;
        };
    };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Multi-Tenant Isolation Properties

**Property 1: Tenant workspace isolation**
*For any* two different tenants, creating workspaces should result in completely isolated data storage with no cross-tenant access possible
**Validates: Requirements 1.1, 1.2**

**Property 2: Credential encryption consistency**
*For any* tenant credentials stored in the system, they should always be encrypted in the database and never stored in plain text
**Validates: Requirements 1.3**

**Property 3: Tenant-specific configuration application**
*For any* content workflow execution, only the settings belonging to that specific tenant should be applied, never settings from other tenants
**Validates: Requirements 1.4, 1.5**

### Content Queue Management Properties

**Property 4: Queue item state consistency**
*For any* blog title added to the queue, it should be stored with pending status and scheduled time, and status updates should follow the correct progression
**Validates: Requirements 2.1, 2.3**

**Property 5: Workflow completion state management**
*For any* successfully completed workflow, the final state should include complete status and published URL storage
**Validates: Requirements 2.4**

**Property 6: Error handling and recovery**
*For any* workflow failure at any step, the system should log the error and maintain recoverability without data corruption
**Validates: Requirements 2.5**

### Agent Output Consistency Properties

**Property 7: Nexus strategic output format**
*For any* blog title and ICP input, Nexus should produce exactly 5 research questions and valid JSON output containing strategic brief components
**Validates: Requirements 3.2, 3.5**

**Property 8: Vantage research completeness**
*For any* research execution, Vantage should attempt all specified API calls and produce a fact sheet with sources, even when some queries fail
**Validates: Requirements 4.1, 4.4, 4.5**

**Property 9: Vertex structural requirements**
*For any* content outline generation, Vertex should produce exactly 6 H2 subsections and all required content sections
**Validates: Requirements 5.2, 5.3**

**Property 10: Hemingway content quality standards**
*For any* content generation, Hemingway should produce valid Markdown that adheres to brand voice and backs claims with fact sheet data
**Validates: Requirements 6.1, 6.2, 6.5**

**Property 11: Prism quality scoring consistency**
*For any* content review, Prism should assign scores between 0-100 and trigger rewrites when scores fall below 85
**Validates: Requirements 7.3, 7.4**

### Multimedia Generation Properties

**Property 12: Canvas visual identification precision**
*For any* content analysis, Canvas should identify exactly 2 sections for visual enhancement with complete technical specifications
**Validates: Requirements 8.1, 8.2**

**Property 13: Pixel image generation and optimization**
*For any* image generation request, Pixel should produce exactly 2 images in WebP format optimized for WordPress
**Validates: Requirements 9.1, 9.2, 9.3**

### Publishing and Deployment Properties

**Property 14: Deployer WordPress integration completeness**
*For any* content deployment, Deployer should upload images to media library, create draft posts, and set all required SEO metadata
**Validates: Requirements 10.1, 10.2, 10.3**

**Property 15: Content archival consistency**
*For any* completed workflow, the system should save WordPress post ID and final content to the database with proper status updates
**Validates: Requirements 10.5**

### System Observability Properties

**Property 16: Comprehensive operation logging**
*For any* agent execution, the system should log duration, token usage, success status, and complete error traces when failures occur
**Validates: Requirements 11.1, 11.2**

**Property 17: Performance monitoring completeness**
*For any* system operation, performance metrics should be collected and made available through admin dashboard interfaces
**Validates: Requirements 11.3, 11.5**

### Architectural Compliance Properties

**Property 18: Three-layer architecture adherence**
*For any* system component, directives should be stored as Markdown, orchestration should use Mastra, and execution should use deterministic TypeScript
**Validates: Requirements 12.1, 12.2, 12.3**

**Property 19: Self-annealing system improvement**
*For any* system error, self-annealing loops should update directives with learnings while maintaining directive-execution layer separation
**Validates: Requirements 12.4, 12.5**

## Error Handling

### Agent-Level Error Recovery

**Retry Mechanisms:**
- Each agent implements exponential backoff for API failures
- Maximum 3 retry attempts before escalation to human review
- State persistence between retries to avoid data loss
- Graceful degradation when external services are unavailable

**Self-Annealing Process:**
1. Error detection and logging with complete stack traces
2. Automatic directive analysis to identify improvement opportunities
3. Directive updates with new error handling patterns
4. System testing to validate improvements
5. Knowledge base updates for future error prevention

**Workflow-Level Resilience:**
- Checkpoint system for long-running workflows
- Ability to resume from last successful agent step
- Dead letter queue for permanently failed jobs
- Human intervention triggers for complex failures

### Data Integrity Protection

**Transaction Management:**
- Database transactions for multi-step operations
- Rollback capabilities for failed workflow steps
- Consistent state maintenance across agent boundaries
- Audit trails for all data modifications

**Tenant Isolation Security:**
- Row-level security policies in PostgreSQL
- Encrypted credential storage with key rotation
- API rate limiting per tenant to prevent resource abuse
- Comprehensive access logging for security auditing

## Testing Strategy

### Dual Testing Approach

The ContentSys platform requires both unit testing and property-based testing to ensure comprehensive correctness validation:

**Unit Testing Requirements:**
- Test specific agent behaviors with known inputs and expected outputs
- Validate database operations and API integrations
- Test error handling scenarios and edge cases
- Verify WordPress publishing workflows with mock environments
- Test tenant isolation with specific tenant configurations

**Property-Based Testing Requirements:**
- Use **fast-check** as the property-based testing library for TypeScript/Node.js
- Configure each property-based test to run a minimum of 100 iterations
- Tag each property-based test with comments explicitly referencing design document properties
- Use format: `**Feature: contentsys-engine, Property {number}: {property_text}**`
- Generate realistic test data including tenant configurations, content titles, and API responses
- Test universal properties that should hold across all valid inputs and tenant configurations

**Testing Framework Integration:**
- Jest as the primary testing framework for both unit and property-based tests
- Testcontainers for PostgreSQL and Redis integration testing
- Mock external APIs (Tavily, Exa.ai, WordPress) for deterministic testing
- Separate test databases for each test suite to ensure isolation

**Coverage Requirements:**
- Minimum 90% code coverage for execution layer (Layer 3)
- Property-based test coverage for all correctness properties
- Integration test coverage for complete workflow execution
- Performance testing for multi-tenant scalability scenarios
