#!/usr/bin/env node

/**
 * ContentSys Database Initialization Script
 * Creates the ContentSys database and initializes the schema
 */

const { Pool } = require('pg');
require('dotenv').config();

// Disable SSL certificate verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env');
  process.exit(1);
}

// Parse connection string to get postgres admin connection
const adminConnStr = DATABASE_URL.replace('/ContentSys', '/postgres');

async function createDatabase() {
  console.log('🗄️  ContentSys Database Initialization');
  console.log('=====================================\n');

  const adminPool = new Pool({
    connectionString: adminConnStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    console.log('📡 Connecting to PostgreSQL server...');
    await adminPool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL server\n');

    // Check if ContentSys database exists
    const dbCheck = await adminPool.query(
      `SELECT datname FROM pg_database WHERE datname = 'ContentSys'`
    );

    if (dbCheck.rows.length === 0) {
      console.log('📦 Creating ContentSys database...');
      await adminPool.query('CREATE DATABASE "ContentSys"');
      console.log('✅ ContentSys database created\n');
    } else {
      console.log('✅ ContentSys database already exists\n');
    }

    await adminPool.end();

    // Now connect to ContentSys and create schema
    console.log('📋 Initializing database schema...');
    
    const contentPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000
    });

    const schema = `
      -- Tenants (Clients)
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        domain_url VARCHAR(255),
        icp_profile TEXT,
        brand_voice TEXT,
        wp_credentials TEXT,
        api_config TEXT,
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
        reasoning_trace TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_content_queue_status ON content_queue(status);
      CREATE INDEX IF NOT EXISTS idx_content_queue_scheduled ON content_queue(scheduled_for);
      CREATE INDEX IF NOT EXISTS idx_content_queue_tenant ON content_queue(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_queue_step ON artifacts(queue_id, step_name);
      CREATE INDEX IF NOT EXISTS idx_agent_logs_queue ON agent_logs(queue_id);
      CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_name);
    `;

    await contentPool.query(schema);
    console.log('✅ Database schema initialized\n');

    // Verify tables
    const tables = await contentPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 Tables created:');
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    await contentPool.end();

    console.log('\n🎉 Database initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Start the API server: npm run dev');
    console.log('2. Create a tenant via POST /api/tenants');
    console.log('3. Add content to queue via POST /api/content/add');

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

createDatabase();
