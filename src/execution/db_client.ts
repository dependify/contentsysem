import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool for ContentSys database
class DatabaseClient {
  private pool: Pool;

  constructor() {
    let connectionString = process.env.DATABASE_URL || '';
    const isProduction = process.env.NODE_ENV === 'production';

    // Security Check: Fail if using placeholder values in production or if URL is missing
    if (!connectionString) {
      console.error('❌ Critical Error: DATABASE_URL is not defined.');
      if (isProduction) {
        throw new Error('DATABASE_URL environment variable is required in production.');
      }
    }

    if (connectionString.includes('@host:5432') || connectionString.includes('username:password')) {
      console.error('❌ Critical Error: DATABASE_URL contains placeholder values (username, password, or host).');
      console.error('   Please update your environment variables with the actual database credentials.');
      throw new Error('Invalid DATABASE_URL: Placeholder values detected.');
    }

    // For cloud databases with self-signed certs, we need to disable TLS verification
    // This is safe for trusted cloud providers (Coolify, Railway, Render, Heroku, Supabase, etc.)
    if (isProduction || process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1') {
      // Set global Node.js TLS setting as fallback (pg sometimes ignores ssl option)
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    // Determine SSL config
    let sslConfig: any = false;
    const sslMode = connectionString.match(/sslmode=(\w+)/)?.[1];

    // Remove sslmode from connection string to avoid conflicts
    connectionString = connectionString.replace(/[?&]sslmode=\w+/g, '');
    // Clean up any dangling ? or &
    connectionString = connectionString.replace(/\?&/, '?').replace(/\?$/, '');

    if (sslMode === 'disable' || process.env.DATABASE_SSL === 'false' || process.env.DATABASE_SSL === '0') {
      sslConfig = false;
      // Reset TLS setting if SSL is disabled
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else if (isProduction || sslMode === 'require' || sslMode === 'prefer' || process.env.DATABASE_SSL === 'true') {
      sslConfig = { rejectUnauthorized: false };
    }

    console.log(`[DB] SSL Config: ${JSON.stringify(sslConfig)}`);
    console.log(`[DB] NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED}`);

    this.pool = new Pool({
      connectionString: connectionString,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  // Execute a query with parameters
  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get a single row
  async queryOne(text: string, params?: any[]): Promise<any> {
    const rows = await this.query(text, params);
    return rows[0] || null;
  }

  // Initialize database schema
  async initializeSchema(): Promise<void> {
    const schema = `
      -- Users (Admin & Clients)
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'client', -- 'admin' or 'client'
        tenant_id INT, -- Null for super admin
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Tenants (Clients) - Extended
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        domain_url VARCHAR(255),
        niche VARCHAR(255),
        
        -- Identity Layer (File Paths or Text)
        icp_profile TEXT,
        brand_voice TEXT,
        marketing_frameworks TEXT,
        lead_magnets TEXT,
        
        -- Configuration
        wp_credentials TEXT,
        api_config TEXT,
        scheduling_prefs TEXT, -- CRON strings or JSON config
        auto_publish BOOLEAN DEFAULT TRUE,
        
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Content Queue (The Assembly Line)
      CREATE TABLE IF NOT EXISTS content_queue (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        title VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        current_step INT DEFAULT 0,
        scheduled_for TIMESTAMP,
        published_url VARCHAR(255),
        html_content TEXT, -- Stored final HTML
        markdown_content TEXT, -- Stored final Markdown
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Artifacts (State Persistence)
      CREATE TABLE IF NOT EXISTS artifacts (
        id SERIAL PRIMARY KEY,
        queue_id INT REFERENCES content_queue(id),
        step_name VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Agent Logs (Observability)
      CREATE TABLE IF NOT EXISTS agent_logs (
        id SERIAL PRIMARY KEY,
        queue_id INT,
        agent_name VARCHAR(50) NOT NULL,
        duration_ms INT,
        token_usage INT,
        success BOOLEAN NOT NULL,
        error_trace TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Image Assets (Generated Images)
      CREATE TABLE IF NOT EXISTS image_assets (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        queue_id INT REFERENCES content_queue(id),
        filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        prompt_used TEXT,
        image_type VARCHAR(50) DEFAULT 'blog_image',
        width INT,
        height INT,
        file_size INT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Blog Post Titles (Asset Library)
      CREATE TABLE IF NOT EXISTS blog_titles (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        title VARCHAR(500) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
        priority INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Content Schedules (Calendar Management)
      CREATE TABLE IF NOT EXISTS content_schedules (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        title VARCHAR(500) NOT NULL,
        scheduled_date DATE NOT NULL,
        scheduled_time TIME DEFAULT '09:00:00',
        status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'published', 'cancelled'
        auto_publish BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- System Settings (Admin God Mode)
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(50) DEFAULT 'string', -- 'string', 'json', 'boolean', 'number'
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Global Prompt Templates (Admin Management)
      CREATE TABLE IF NOT EXISTS prompt_templates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL, -- 'strategy', 'research', 'writing', etc.
        template_content TEXT NOT NULL,
        variables JSONB, -- Available variables for the template
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Content Versions (Version History)
      CREATE TABLE IF NOT EXISTS content_versions (
        id SERIAL PRIMARY KEY,
        queue_id INT REFERENCES content_queue(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        html_content TEXT,
        markdown_content TEXT,
        change_summary VARCHAR(500),
        created_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Token Usage Tracking
      CREATE TABLE IF NOT EXISTS token_usage (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        queue_id INT REFERENCES content_queue(id),
        agent_name VARCHAR(50),
        input_tokens INT DEFAULT 0,
        output_tokens INT DEFAULT 0,
        model VARCHAR(100),
        cost_usd DECIMAL(10, 6),
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Audit Logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INT,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- API Keys
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        key_name VARCHAR(100),
        key_hash VARCHAR(255) NOT NULL,
        key_prefix VARCHAR(10) NOT NULL,
        permissions JSONB,
        expires_at TIMESTAMP,
        last_used_at TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Webhooks
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        tenant_id INT REFERENCES tenants(id),
        url VARCHAR(500) NOT NULL,
        events JSONB NOT NULL,
        secret VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        failure_count INT DEFAULT 0,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Email Logs
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        recipient VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        success BOOLEAN NOT NULL,
        error TEXT,
        sent_at TIMESTAMP DEFAULT NOW()
      );

      -- Image Tags
      CREATE TABLE IF NOT EXISTS image_tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        tenant_id INT REFERENCES tenants(id),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS image_asset_tags (
        image_id INT REFERENCES image_assets(id) ON DELETE CASCADE,
        tag_id INT REFERENCES image_tags(id) ON DELETE CASCADE,
        PRIMARY KEY (image_id, tag_id)
      );

      -- Add archived column to tenants (safe to run multiple times)
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='tenants' AND column_name='archived') THEN
          ALTER TABLE tenants ADD COLUMN archived BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
      CREATE INDEX IF NOT EXISTS idx_content_queue_scheduled ON content_queue(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_artifacts_queue_step ON artifacts(queue_id, step_name);
      CREATE INDEX IF NOT EXISTS idx_image_assets_tenant ON image_assets(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_blog_titles_tenant ON blog_titles(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_content_schedules_tenant_date ON content_schedules(tenant_id, scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_content_versions_queue ON content_versions(queue_id);
      CREATE INDEX IF NOT EXISTS idx_token_usage_tenant ON token_usage(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
    `;

    await this.query(schema);
    console.log('Database schema initialized successfully');
  }

  // Close the connection pool
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = new DatabaseClient();