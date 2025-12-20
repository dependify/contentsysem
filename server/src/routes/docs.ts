// OpenAPI/Swagger API Documentation
import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';

const router = Router();

// OpenAPI 3.0 Specification
const openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'ContentSys API',
        version: '1.0.0',
        description: 'Multi-Tenant AI Content Engine API Documentation',
        contact: {
            name: 'ContentSys Support',
            email: 'support@contentsys.io',
        },
    },
    servers: [
        {
            url: '/api',
            description: 'API Server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            apiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'x-api-key',
            },
        },
        schemas: {
            Error: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: { type: 'string' },
                },
            },
            Tenant: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    business_name: { type: 'string' },
                    domain_url: { type: 'string' },
                    niche: { type: 'string' },
                    brand_voice: { type: 'string' },
                    icp_profile: { type: 'object' },
                    auto_publish: { type: 'boolean' },
                    archived: { type: 'boolean' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                },
            },
            Content: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    tenant_id: { type: 'integer' },
                    keyword: { type: 'string' },
                    title: { type: 'string' },
                    content: { type: 'string' },
                    status: {
                        type: 'string',
                        enum: ['pending', 'processing', 'completed', 'failed', 'paused']
                    },
                    scheduled_for: { type: 'string', format: 'date-time' },
                    wp_post_id: { type: 'integer' },
                    created_at: { type: 'string', format: 'date-time' },
                },
            },
            Job: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    content_id: { type: 'integer' },
                    status: { type: 'string' },
                    current_step: { type: 'integer' },
                    steps: { type: 'array', items: { type: 'object' } },
                    error: { type: 'string' },
                    started_at: { type: 'string', format: 'date-time' },
                    completed_at: { type: 'string', format: 'date-time' },
                },
            },
            User: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
                    created_at: { type: 'string', format: 'date-time' },
                },
            },
            Image: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    tenant_id: { type: 'integer' },
                    url: { type: 'string' },
                    filename: { type: 'string' },
                    alt_text: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    created_at: { type: 'string', format: 'date-time' },
                },
            },
        },
    },
    security: [
        { bearerAuth: [] },
        { apiKeyAuth: [] },
    ],
    paths: {
        // Authentication
        '/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'Login with email and password',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 6 },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Login successful',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        token: { type: 'string' },
                                        user: { $ref: '#/components/schemas/User' },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'Invalid credentials' },
                },
            },
        },
        '/auth/register': {
            post: {
                tags: ['Authentication'],
                summary: 'Register a new user',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password', 'name'],
                                properties: {
                                    email: { type: 'string', format: 'email' },
                                    password: { type: 'string', minLength: 6 },
                                    name: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'User created successfully' },
                    400: { description: 'Invalid input or email already exists' },
                },
            },
        },

        // Tenants
        '/tenants': {
            get: {
                tags: ['Tenants'],
                summary: 'List all tenants',
                parameters: [
                    { name: 'include_archived', in: 'query', schema: { type: 'boolean' } },
                ],
                responses: {
                    200: {
                        description: 'List of tenants',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        tenants: { type: 'array', items: { $ref: '#/components/schemas/Tenant' } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            post: {
                tags: ['Tenants'],
                summary: 'Create a new tenant',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['business_name'],
                                properties: {
                                    business_name: { type: 'string' },
                                    domain_url: { type: 'string' },
                                    niche: { type: 'string' },
                                    brand_voice: { type: 'string' },
                                    icp_profile: { type: 'object' },
                                    auto_publish: { type: 'boolean' },
                                    wp_credentials: {
                                        type: 'object',
                                        properties: {
                                            url: { type: 'string' },
                                            username: { type: 'string' },
                                            app_password: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Tenant created' },
                },
            },
        },
        '/tenants/{id}': {
            get: {
                tags: ['Tenants'],
                summary: 'Get tenant by ID',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Tenant details' },
                    404: { description: 'Tenant not found' },
                },
            },
            put: {
                tags: ['Tenants'],
                summary: 'Update tenant',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                requestBody: {
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Tenant' },
                        },
                    },
                },
                responses: {
                    200: { description: 'Tenant updated' },
                },
            },
            delete: {
                tags: ['Tenants'],
                summary: 'Delete or archive tenant',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                    { name: 'permanent', in: 'query', schema: { type: 'boolean' } },
                ],
                responses: {
                    200: { description: 'Tenant deleted/archived' },
                },
            },
        },

        // Content
        '/content': {
            get: {
                tags: ['Content'],
                summary: 'List content items',
                parameters: [
                    { name: 'tenant_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'status', in: 'query', schema: { type: 'string' } },
                    { name: 'page', in: 'query', schema: { type: 'integer' } },
                    { name: 'limit', in: 'query', schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'List of content items' },
                },
            },
            post: {
                tags: ['Content'],
                summary: 'Add content to queue',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['tenant_id', 'keyword'],
                                properties: {
                                    tenant_id: { type: 'integer' },
                                    keyword: { type: 'string' },
                                    scheduled_for: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Content added to queue' },
                },
            },
        },
        '/content/bulk': {
            post: {
                tags: ['Content'],
                summary: 'Bulk add content',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['tenant_id', 'items'],
                                properties: {
                                    tenant_id: { type: 'integer' },
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                keyword: { type: 'string' },
                                                scheduled_for: { type: 'string', format: 'date-time' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Content items added' },
                },
            },
        },
        '/content/{id}': {
            get: {
                tags: ['Content'],
                summary: 'Get content by ID',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Content details' },
                },
            },
            put: {
                tags: ['Content'],
                summary: 'Update content',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Content updated' },
                },
            },
            delete: {
                tags: ['Content'],
                summary: 'Delete content',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Content deleted' },
                },
            },
        },
        '/content/{id}/pause': {
            post: {
                tags: ['Content'],
                summary: 'Pause content processing',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Content paused' },
                },
            },
        },
        '/content/{id}/retry': {
            post: {
                tags: ['Content'],
                summary: 'Retry failed content',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Content retried' },
                },
            },
        },
        '/content/{id}/publish': {
            post: {
                tags: ['Content'],
                summary: 'Publish content to WordPress',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
                ],
                responses: {
                    200: { description: 'Content published' },
                },
            },
        },

        // Images
        '/images': {
            get: {
                tags: ['Images'],
                summary: 'List images',
                parameters: [
                    { name: 'tenant_id', in: 'query', schema: { type: 'integer' } },
                    { name: 'tags', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'List of images' },
                },
            },
            post: {
                tags: ['Images'],
                summary: 'Upload image',
                requestBody: {
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    file: { type: 'string', format: 'binary' },
                                    tenant_id: { type: 'integer' },
                                    alt_text: { type: 'string' },
                                    tags: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    201: { description: 'Image uploaded' },
                },
            },
        },
        '/images/generate': {
            post: {
                tags: ['Images'],
                summary: 'Generate AI image',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['tenant_id', 'prompt'],
                                properties: {
                                    tenant_id: { type: 'integer' },
                                    prompt: { type: 'string' },
                                    negative_prompt: { type: 'string' },
                                    width: { type: 'integer' },
                                    height: { type: 'integer' },
                                },
                            },
                        },
                    },
                },
                responses: {
                    200: { description: 'Image generated' },
                },
            },
        },

        // Admin
        '/admin/users': {
            get: {
                tags: ['Admin'],
                summary: 'List users (admin only)',
                responses: {
                    200: { description: 'List of users' },
                },
            },
        },
        '/admin/audit-logs': {
            get: {
                tags: ['Admin'],
                summary: 'Get audit logs (admin only)',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer' } },
                    { name: 'action', in: 'query', schema: { type: 'string' } },
                    { name: 'resource', in: 'query', schema: { type: 'string' } },
                ],
                responses: {
                    200: { description: 'Audit logs' },
                },
            },
        },
        '/admin/health': {
            get: {
                tags: ['Admin'],
                summary: 'System health check',
                responses: {
                    200: { description: 'Health status' },
                },
            },
        },
        '/admin/metrics': {
            get: {
                tags: ['Admin'],
                summary: 'System metrics',
                responses: {
                    200: { description: 'System metrics' },
                },
            },
        },
    },
    tags: [
        { name: 'Authentication', description: 'User authentication endpoints' },
        { name: 'Tenants', description: 'Tenant management' },
        { name: 'Content', description: 'Content queue and management' },
        { name: 'Images', description: 'Image library and AI generation' },
        { name: 'Admin', description: 'Administrative endpoints' },
    ],
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ContentSys API Documentation',
}));

// Serve raw OpenAPI spec
router.get('/spec.json', (req: Request, res: Response) => {
    res.json(openApiSpec);
});

export default router;
