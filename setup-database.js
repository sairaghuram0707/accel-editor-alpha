#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script helps set up the PostgreSQL database for the accel-editor application.
 * It creates the database, runs migrations, and verifies the setup.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.log('📝 Add DATABASE_URL to your .env file:');
  console.log('   DATABASE_URL=postgresql://username:password@localhost:5432/accel_editor');
  process.exit(1);
}

console.log('🚀 Setting up PostgreSQL database for accel-editor...\n');

async function runCommand(command, description) {
  console.log(`📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...');
  
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: DATABASE_URL });
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT version()');
    client.release();
    await pool.end();
    
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Ensure PostgreSQL is running');
    console.log('2. Verify DATABASE_URL is correct');
    console.log('3. Check database permissions');
    throw error;
  }
}

async function main() {
  try {
    // Check if we can connect to the database
    await checkDatabaseConnection();
    
    // Generate migrations
    await runCommand('npm run db:generate', 'Generating database migrations');
    
    // Push schema to database
    await runCommand('npm run db:push', 'Pushing schema to database');
    
    console.log('🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Run `npm dev` to start the development server');
    console.log('2. Run `npm run db:studio` to open the database studio');
    console.log('3. Check DATABASE_MIGRATION.md for more information');
    
  } catch (error) {
    console.error('\n💥 Setup failed. Please check the error messages above.');
    process.exit(1);
  }
}

// Run the setup
main(); 