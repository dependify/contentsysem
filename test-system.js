#!/usr/bin/env node

/**
 * ContentSys System Test Script
 * Tests database connectivity, Redis connection, and basic API functionality
 */

// Disable SSL certificate verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
const Redis = require('ioredis');

// Load environment variables
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

console.log('🧪 ContentSys System Test');
console.log('=========================\n');

async function testDatabase() {
  console.log('📊 Testing PostgreSQL connection...');
  
  if (!DATABASE_URL) {
    console.log('❌ DATABASE_URL not set in .env');
    return false;
  }

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ PostgreSQL connected! Server time: ${result.rows[0].current_time}`);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    if (tables.rows.length > 0) {
      console.log(`   Tables found: ${tables.rows.map(r => r.table_name).join(', ')}`);
    } else {
      console.log('   ⚠️  No tables found. Run POST /api/init to create schema.');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ PostgreSQL connection failed: ${error.message}`);
    return false;
  }
}

async function testRedis() {
  console.log('\n📮 Testing Redis connection...');
  
  if (!REDIS_URL) {
    console.log('❌ REDIS_URL not set in .env');
    return false;
  }

  try {
    const redis = new Redis(REDIS_URL);
    
    await redis.ping();
    console.log('✅ Redis connected!');
    
    // Test set/get
    await redis.set('contentsys:test', 'hello');
    const value = await redis.get('contentsys:test');
    console.log(`   Test key set/get: ${value === 'hello' ? 'OK' : 'FAILED'}`);
    await redis.del('contentsys:test');
    
    await redis.quit();
    return true;
  } catch (error) {
    console.log(`❌ Redis connection failed: ${error.message}`);
    return false;
  }
}

function testEnvironmentVariables() {
  console.log('\n🔑 Checking environment variables...');
  
  const required = [
    'DATABASE_URL',
    'REDIS_URL'
  ];
  
  const optional = [
    'MINIMAX_API_KEY',
    'OPENAI_API_KEY',
    'TAVILY_API_KEY',
    'FIRECRAWL_API_KEY',
    'EXA_API_KEY',
    'RUNWARE_API_KEY'
  ];
  
  let allRequired = true;
  
  for (const key of required) {
    if (process.env[key]) {
      console.log(`✅ ${key}: Set`);
    } else {
      console.log(`❌ ${key}: Missing (REQUIRED)`);
      allRequired = false;
    }
  }
  
  console.log('\n   Optional API keys:');
  for (const key of optional) {
    if (process.env[key]) {
      const masked = process.env[key].substring(0, 8) + '...';
      console.log(`   ✅ ${key}: ${masked}`);
    } else {
      console.log(`   ⚠️  ${key}: Not set`);
    }
  }
  
  return allRequired;
}

async function testTavilyAPI() {
  console.log('\n🔍 Testing Tavily API...');
  
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.log('⚠️  TAVILY_API_KEY not set, skipping');
    return true;
  }

  try {
    const axios = require('axios');
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: 'test query',
      max_results: 1
    });
    
    if (response.data && response.data.results) {
      console.log('✅ Tavily API working!');
      return true;
    }
  } catch (error) {
    console.log(`❌ Tavily API error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('Starting tests...');
  
  const envResult = testEnvironmentVariables();
  const dbResult = await testDatabase();
  const redisResult = await testRedis();
  const tavilyResult = await testTavilyAPI();
  
  const results = {
    env: envResult,
    db: dbResult,
    redis: redisResult,
    tavily: tavilyResult
  };
  
  console.log('\n📋 Test Summary');
  console.log('===============');
  console.log(`Environment: ${results.env ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`PostgreSQL:  ${results.db ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Redis:       ${results.redis ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Tavily API:  ${results.tavily ? '✅ PASS' : '⚠️  SKIP/FAIL'}`);
  
  const allPassed = results.env && results.db && results.redis;
  
  if (allPassed) {
    console.log('\n🎉 All core tests passed! System is ready.');
    console.log('\nNext steps:');
    console.log('1. Start the API server: npm run dev');
    console.log('2. Initialize database: POST http://localhost:3000/api/init');
    console.log('3. Create a tenant and start generating content!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your configuration.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('Test script error:', error);
  process.exit(1);
});
