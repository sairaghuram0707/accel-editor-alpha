# PostgreSQL Local Setup Guide

This guide provides step-by-step instructions for setting up PostgreSQL locally with the Accel Editor application on macOS and Docker.

## Overview

The Accel Editor uses PostgreSQL as its primary database with Drizzle ORM for type-safe database operations. This setup provides:

- **Persistent Storage**: Server-side chat history storage
- **ACID Compliance**: Reliable data integrity
- **Type Safety**: Full TypeScript integration with Drizzle ORM

## Prerequisites

- Node.js 18.18.0 or higher
- npm/pnpm package manager
- macOS or Docker installed

## Installation Options

### Option 1: macOS Local Installation (Homebrew)

#### Install PostgreSQL
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL service
brew services start postgresql@15

# Verify installation
brew services list | grep postgresql
```

#### Create Database and User
```bash
# Create database
createdb accel_editor

# Create user with password (optional but recommended)
psql -d postgres -c "CREATE USER accel_user WITH PASSWORD 'accel_password';"
psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE accel_editor TO accel_user;"

# Test connection
psql -d accel_editor -c "SELECT version();"
```

#### Environment Variables
Create `.env` file in project root:
```bash
# For default postgres user
DATABASE_URL=postgresql://postgres@localhost:5432/accel_editor

# Or for custom user
DATABASE_URL=postgresql://accel_user:accel_password@localhost:5432/accel_editor
```

### Option 2: Docker Local Installation

#### Docker Compose (Recommended)
Create `docker-compose.yml` in project root:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    container_name: accel-postgres
    environment:
      POSTGRES_DB: accel_editor
      POSTGRES_USER: accel_user
      POSTGRES_PASSWORD: accel_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

Start PostgreSQL:
```bash
# Start container
docker-compose up -d

# Check if running
docker-compose ps

# View logs
docker-compose logs postgres
```

#### Environment Variables
Create `.env` file in project root:
```bash
DATABASE_URL=postgresql://accel_user:accel_password@localhost:5432/accel_editor
```

#### Alternative: Direct Docker Command
```bash
# Run PostgreSQL container
docker run --name accel-postgres \
  -e POSTGRES_DB=accel_editor \
  -e POSTGRES_USER=accel_user \
  -e POSTGRES_PASSWORD=accel_password \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15

# Check if running
docker ps | grep accel-postgres
```

## Database Setup

### 1. Install Dependencies
```bash
# Install all project dependencies
npm install

# Or with pnpm
pnpm install
```

### 2. Run Database Setup
```bash
# Automated setup (recommended)
npm run db:setup

# Or step by step
npm run db:generate  # Generate migrations
npm run db:push      # Apply schema
```

### 3. Verify Setup
```bash
# Open database studio
npm run db:studio

# Or connect directly
psql postgresql://accel_user:accel_password@localhost:5432/accel_editor
```

## Database Management

### Available Commands
```bash
# Generate new migrations
npm run db:generate

# Apply schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Open database GUI
npm run db:studio
```

### Manual Database Access

#### macOS (Homebrew)
```bash
# Connect to database
psql -d accel_editor

# Or with custom user
psql -h localhost -U accel_user -d accel_editor
```

#### Docker
```bash
# Connect via docker exec
docker exec -it accel-postgres psql -U accel_user -d accel_editor

# Or using docker-compose
docker-compose exec postgres psql -U accel_user -d accel_editor
```

### Useful SQL Commands
```sql
-- List all tables
\dt

-- Describe chats table
\d chats

-- View recent chats
SELECT id, description, timestamp FROM chats ORDER BY timestamp DESC LIMIT 5;

-- Count total chats
SELECT COUNT(*) FROM chats;
```

## Troubleshooting

### macOS Issues

#### PostgreSQL Won't Start
```bash
# Check if already running
brew services list | grep postgresql

# Stop and restart
brew services stop postgresql@15
brew services start postgresql@15

# Check logs
tail -f /opt/homebrew/var/log/postgresql@15.log
```

#### Connection Refused
```bash
# Verify PostgreSQL is listening
lsof -i :5432

# Check configuration
psql -d postgres -c "SHOW config_file;"
```

### Docker Issues

#### Container Won't Start
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres
```

#### Port Already in Use
```bash
# Find what's using port 5432
lsof -i :5432

# Kill process if safe
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "5433:5432"  # Use port 5433 instead
```

#### Volume Issues
```bash
# Remove volume and recreate
docker-compose down -v
docker-compose up -d
```

### General Issues

#### Authentication Failed
```bash
# Reset password (macOS)
psql -d postgres -c "ALTER USER accel_user WITH PASSWORD 'new_password';"

# For Docker, recreate container with new password
docker-compose down
# Update password in docker-compose.yml
docker-compose up -d
```

#### Database Doesn't Exist
```bash
# Create database (macOS)
createdb accel_editor

# For Docker
docker-compose exec postgres createdb -U accel_user accel_editor
```

## Quick Test

Create a test script `test-connection.js`:
```javascript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ Database connected successfully');
    console.log('PostgreSQL version:', result.rows[0].version);
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
```

Run test:
```bash
node test-connection.js
```

## Development Workflow

1. **Start PostgreSQL**:
   ```bash
   # macOS
   brew services start postgresql@15
   
   # Docker
   docker-compose up -d
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Make schema changes**:
   ```bash
   # Edit app/lib/db/schema.ts
   npm run db:generate
   npm run db:push
   ```

4. **View database**:
   ```bash
   npm run db:studio
   ```

## Stopping Services

### macOS
```bash
# Stop PostgreSQL
brew services stop postgresql@15
```

### Docker
```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

That's it! Your PostgreSQL database is now ready for local development with the Accel Editor. 