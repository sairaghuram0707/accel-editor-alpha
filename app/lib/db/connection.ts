import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Create the database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/accel_editor';

// Create postgres client pool
const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 20000, // Close connections after 20 seconds of inactivity
  connectionTimeoutMillis: 10000, // Connection timeout
});

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export the pool for direct access if needed
export { pool };

// Graceful shutdown
export async function closeConnection() {
  await pool.end();
} 