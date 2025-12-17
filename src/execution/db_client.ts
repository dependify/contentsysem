import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool for ContentSys database
class DatabaseClient {
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    
    // Parse SSL mode from connection string
    const sslMode = connectionString?.match(/sslmode=(\w+)/)?.[1];
    let sslConfig: any = false;
    
    if (sslMode === 'require') {
      sslConfig = { rejectUnauthorized: false };
    } else if (sslMode === 'disable') {
      sslConfig = false;
    }
    
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

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
      CREATE INDEX IF NOT EXISTS idx_content_queue_scheduled ON content_queue(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_artifacts_queue_step ON artifacts(queue_id, step_name);
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