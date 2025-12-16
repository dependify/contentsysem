#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 ContentSys Setup Script');
console.log('==========================\n');

// Check if .env exists
if (!fs.existsSync('.env')) {
  console.log('📝 Creating .env file from template...');
  fs.copyFileSync('.env.example', '.env');
  console.log('✅ .env file created. Please edit it with your API keys.\n');
} else {
  console.log('✅ .env file already exists.\n');
}

// Create .tmp directory
if (!fs.existsSync('.tmp')) {
  console.log('📁 Creating .tmp directory...');
  fs.mkdirSync('.tmp');
  console.log('✅ .tmp directory created.\n');
} else {
  console.log('✅ .tmp directory already exists.\n');
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed.\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed.\n');
}

// Build the project
console.log('🔨 Building TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed.\n');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.log('⚠️  You may need to fix TypeScript errors before running.\n');
}

console.log('🎉 Setup completed!');
console.log('\nNext steps:');
console.log('1. Edit .env file with your API keys');
console.log('2. Start the API server: npm run dev');
console.log('3. Initialize database: POST to http://localhost:3000/api/init');
console.log('4. Start the worker: npm run worker');
console.log('5. Create a tenant and start generating content!');
console.log('\nFor more information, see README.md');