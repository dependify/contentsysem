# Requirements Document

## Introduction

ContentSys is a scalable, multi-tenant SaaS platform that automates content creation through an agentic workflow. The system operates as an "assembly line" where specialized AI agents collaborate to research, write, optimize, and publish high-quality blog content. The platform provides admin oversight capabilities while maintaining strict tenant isolation for client workspaces.

## Glossary

- **ContentSys**: The multi-tenant AI content engine platform
- **Agent**: A specialized AI component responsible for a specific task in the content creation workflow
- **Tenant**: A client organization with isolated workspace and configuration
- **Assembly Line**: The sequential workflow of agents processing content from ideation to publication
- **Strategic Brief**: Output from Nexus agent containing research questions and content strategy
- **Fact Sheet**: Compiled research data and competitive analysis from Vantage agent
- **Skeleton**: SEO-optimized content structure and outline from Vertex agent
- **BullMQ**: Redis-based queue system for managing asynchronous agent workflows
- **Mastra**: Orchestration framework managing agent workflow execution
- **Minimax M2**: Default AI model for agent intelligence

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want to manage multiple client tenants with isolated workspaces, so that each client's data, configuration, and content remain completely separate and secure.

#### Acceptance Criteria

1. WHEN a new tenant is created, THE ContentSys SHALL establish an isolated workspace with dedicated configuration storage
2. WHEN accessing tenant data, THE ContentSys SHALL enforce strict isolation preventing cross-tenant data access
3. WHEN storing tenant configurations, THE ContentSys SHALL encrypt sensitive credentials including WordPress passwords and API keys
4. WHERE tenant-specific settings exist, THE ContentSys SHALL apply those settings only to that tenant's content workflow
5. WHEN managing multiple tenants, THE ContentSys SHALL maintain separate ICP profiles, brand voice guidelines, and lead magnets per tenant

### Requirement 2

**User Story:** As a content manager, I want to queue blog titles for automated processing, so that the system can generate complete articles according to scheduled timelines.

#### Acceptance Criteria

1. WHEN a blog title is added to the queue, THE ContentSys SHALL store it with pending status and scheduled processing time
2. WHEN the scheduled time arrives, THE ContentSys SHALL automatically trigger the agentic workflow for that title
3. WHEN processing begins, THE ContentSys SHALL update the status to track workflow progress through each agent
4. WHEN workflow completes successfully, THE ContentSys SHALL mark the title as complete and store the published URL
5. IF workflow fails at any step, THEN THE ContentSys SHALL log the error and allow for retry or manual intervention

### Requirement 3

**User Story:** As the Nexus strategist agent, I want to analyze blog titles against client pain points, so that I can generate targeted research questions and content strategy.

#### Acceptance Criteria

1. WHEN receiving a blog title and client ICP, THE Nexus SHALL analyze the topic against documented pain points
2. WHEN generating strategy, THE Nexus SHALL produce exactly 5 specific research questions for the Vantage agent
3. WHEN creating the strategic brief, THE Nexus SHALL identify the primary emotional hook for the content
4. WHEN determining content angle, THE Nexus SHALL align with the client's brand voice and target audience
5. WHEN outputting results, THE Nexus SHALL format the strategic brief as structured JSON data

### Requirement 4

**User Story:** As the Vantage researcher agent, I want to conduct deep research using multiple search tools, so that I can provide comprehensive fact-based data for content creation.

#### Acceptance Criteria

1. WHEN receiving research questions from Nexus, THE Vantage SHALL execute searches using Tavily, Exa.ai, and Firecrawl APIs
2. WHEN analyzing competitors, THE Vantage SHALL scrape the top 3 ranking articles to identify content gaps
3. WHEN gathering statistics, THE Vantage SHALL find at least 1 relevant statistical dataset for visualization
4. WHEN compiling research, THE Vantage SHALL create a comprehensive fact sheet with sources and competitor analysis
5. WHEN research fails for any query, THE Vantage SHALL log the failure and continue with available data

### Requirement 5

**User Story:** As the Vertex SEO architect agent, I want to create optimized content structure, so that the final article ranks well in search engines and follows SEO best practices.

#### Acceptance Criteria

1. WHEN creating content structure, THE Vertex SHALL generate an H1 title optimized for the primary keyword
2. WHEN building the outline, THE Vertex SHALL include exactly 6 deep-dive H2 subsections with supporting content
3. WHEN structuring content, THE Vertex SHALL create sections for introduction, key points summary, table of contents, data visualization, listicle, and FAQ
4. WHEN adding internal links, THE Vertex SHALL search the client's previous posts and suggest 2 relevant internal links
5. WHEN selecting CTAs, THE Vertex SHALL choose the most relevant lead magnet from the client's available options

### Requirement 6

**User Story:** As the Hemingway writer agent, I want to create fact-dense content in the client's brand voice, so that the final article is engaging, accurate, and on-brand.

#### Acceptance Criteria

1. WHEN writing content, THE Hemingway SHALL strictly adhere to the client's documented brand voice guidelines
2. WHEN incorporating facts, THE Hemingway SHALL back every claim with data points from the Vantage fact sheet
3. WHEN lacking supporting data, THE Hemingway SHALL acknowledge gaps rather than generate unsupported claims
4. WHEN creating prose, THE Hemingway SHALL avoid generic AI language patterns and corporate jargon
5. WHEN outputting content, THE Hemingway SHALL format the complete article in valid Markdown syntax

### Requirement 7

**User Story:** As the Prism editor agent, I want to review and score content quality, so that only high-quality articles proceed to publication.

#### Acceptance Criteria

1. WHEN reviewing content, THE Prism SHALL evaluate tone correctness against brand voice guidelines
2. WHEN checking SEO compliance, THE Prism SHALL verify keywords are naturally integrated throughout the content
3. WHEN detecting quality issues, THE Prism SHALL assign a numerical score out of 100 points
4. IF the quality score is below 85, THEN THE Prism SHALL provide specific feedback and trigger a rewrite by Hemingway
5. WHEN maximum retries are reached, THE Prism SHALL escalate to human review rather than continue automated loops

### Requirement 8

**User Story:** As the Canvas visual director agent, I want to identify optimal image placement opportunities, so that the content includes relevant visual elements that enhance engagement.

#### Acceptance Criteria

1. WHEN analyzing content, THE Canvas SHALL identify the 2 most engaging sections suitable for visual enhancement
2. WHEN creating image prompts, THE Canvas SHALL generate high-fidelity descriptions with specific technical parameters
3. WHEN specifying images, THE Canvas SHALL include aspect ratio requirements and visual style guidelines
4. WHEN selecting content sections, THE Canvas SHALL prioritize areas that benefit most from visual illustration
5. WHEN outputting prompts, THE Canvas SHALL format them for compatibility with image generation APIs

### Requirement 9

**User Story:** As the Pixel generator agent, I want to create optimized images for web publication, so that the content includes fast-loading, relevant visuals.

#### Acceptance Criteria

1. WHEN generating images, THE Pixel SHALL create exactly 2 images based on Canvas prompts using Runware.ai or Flux API
2. WHEN processing images, THE Pixel SHALL compress all generated images to WebP format for optimal web performance
3. WHEN preparing for upload, THE Pixel SHALL optimize images for WordPress media library compatibility
4. WHEN image generation fails, THE Pixel SHALL log the error and provide fallback placeholder recommendations
5. WHEN storing images, THE Pixel SHALL maintain temporary local copies until successful WordPress upload

### Requirement 10

**User Story:** As the Deployer publisher agent, I want to upload content to WordPress as a draft, so that clients can review before publication while maintaining proper SEO metadata.

#### Acceptance Criteria

1. WHEN uploading images, THE Deployer SHALL add them to the WordPress media library and retrieve permanent URLs
2. WHEN creating posts, THE Deployer SHALL upload the final HTML content as a draft status for client review
3. WHEN setting metadata, THE Deployer SHALL configure Yoast or RankMath title, meta description, categories, and tags
4. WHEN replacing placeholders, THE Deployer SHALL swap temporary image references with live WordPress URLs
5. WHEN archiving results, THE Deployer SHALL save the WordPress post ID and final content to the ContentSys database

### Requirement 11

**User Story:** As a system administrator, I want comprehensive logging and observability, so that I can monitor system performance, debug issues, and track resource usage.

#### Acceptance Criteria

1. WHEN agents execute, THE ContentSys SHALL log step duration, token usage, and success status for each operation
2. WHEN errors occur, THE ContentSys SHALL capture complete error traces and reasoning for debugging
3. WHEN tracking performance, THE ContentSys SHALL monitor CPU, memory, and API usage across all tenants
4. WHEN storing logs, THE ContentSys SHALL use either LangSmith integration or custom PostgreSQL logging tables
5. WHEN analyzing system health, THE ContentSys SHALL provide admin dashboard access to aggregated metrics and alerts

### Requirement 12

**User Story:** As a system architect, I want a 3-layer architecture separating directives, orchestration, and execution, so that the system maintains reliability and allows for easy maintenance and updates.

#### Acceptance Criteria

1. WHEN implementing directives, THE ContentSys SHALL store all agent instructions as Markdown SOPs in the directives layer
2. WHEN orchestrating workflows, THE ContentSys SHALL use Mastra framework for intelligent routing and decision making
3. WHEN executing operations, THE ContentSys SHALL implement deterministic TypeScript tools for all API calls and data processing
4. WHEN errors occur, THE ContentSys SHALL implement self-annealing loops that fix issues and update directives with learnings
5. WHEN maintaining the system, THE ContentSys SHALL allow directive updates without requiring code changes to execution layer