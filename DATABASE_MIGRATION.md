# Database Migration: IndexedDB to PostgreSQL

This document outlines the migration from client-side IndexedDB storage to server-side PostgreSQL database.

## Overview

The application has been migrated from using browser-based IndexedDB for chat persistence to a server-side PostgreSQL database. This provides:

- **Centralized storage**: All chat data is stored server-side
- **Better performance**: Optimized queries and indexing
- **Data integrity**: ACID compliance and better error handling
- **Scalability**: Support for multiple users and larger datasets
- **Backup capabilities**: Standard database backup and recovery

## Database Schema

The PostgreSQL schema replaces the IndexedDB object store with a proper relational table:

```sql
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  url_id VARCHAR(255) UNIQUE,
  user_id VARCHAR(255), -- For future user authentication
  description TEXT,
  messages JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chats_url_id ON chats(url_id);
CREATE INDEX idx_chats_timestamp ON chats(timestamp);
CREATE INDEX idx_chats_created_at ON chats(created_at);
```

## Environment Setup

1. **Database Connection**: Add to your environment variables:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/accel_editor
   ```

2. **Install PostgreSQL**: 
   - Local: Install PostgreSQL locally
   - Cloud: Use services like Supabase, AWS RDS, or Google Cloud SQL

## Database Setup Commands

```bash
# Install dependencies
pnpm install

# Generate database migrations
pnpm run db:generate

# Push schema to database
pnpm run db:push

# Run migrations (if using migration files)
pnpm run db:migrate

# Open database studio for inspection
pnpm run db:studio
```

## API Endpoints

The migration introduces new API endpoints to replace direct database access:

- `GET /api/chats` - Get all chats
- `GET /api/chats?id=123` - Get specific chat
- `POST /api/chats` - Create/update chat
- `DELETE /api/chats` - Delete chat
- `GET /api/chats/next-id` - Generate next chat ID
- `GET /api/chats/url-id?base=abc` - Generate unique URL ID

## File Changes Summary

### New Files Created:
1. **`app/lib/db/schema.ts`** - PostgreSQL table definitions using Drizzle ORM
2. **`app/lib/db/connection.ts`** - Database connection and configuration
3. **`app/routes/api.chats.ts`** - Main CRUD API endpoints for chats
4. **`app/routes/api.chats.next-id.ts`** - ID generation endpoint
5. **`app/routes/api.chats.url-id.ts`** - URL ID generation endpoint
6. **`drizzle.config.ts`** - Drizzle ORM configuration

### Modified Files:
1. **`package.json`** - Added PostgreSQL and Drizzle dependencies
2. **`app/lib/persistence/db.ts`** - Complete rewrite for PostgreSQL operations
3. **`app/lib/persistence/useChatHistory.ts`** - Updated to use API calls instead of direct DB access
4. **`app/lib/persistence/index.ts`** - Updated exports

## Migration Process

### For Development:
1. Set up PostgreSQL database locally
2. Configure `DATABASE_URL` environment variable
3. Run database setup commands
4. Start the application

### For Production:
1. Set up PostgreSQL database (cloud service recommended)
2. Configure production `DATABASE_URL`
3. Run migrations on production database
4. Deploy application with new code

## Data Migration

If you have existing IndexedDB data that needs to be migrated:

1. **Export existing data**: Create a script to export from IndexedDB
2. **Transform data**: Convert to new PostgreSQL format
3. **Import data**: Use the new API endpoints or direct database insertion

Example export script (run in browser console):
```javascript
// This would need to be run in the browser to access IndexedDB
async function exportIndexedDBData() {
  const request = indexedDB.open('boltHistory', 1);
  return new Promise((resolve) => {
    request.onsuccess = async (event) => {
      const db = event.target.result;
      const transaction = db.transaction('chats', 'readonly');
      const store = transaction.objectStore('chats');
      const data = await store.getAll();
      console.log('Exported data:', JSON.stringify(data, null, 2));
      resolve(data);
    };
  });
}
```

## Backward Compatibility

The migration maintains backward compatibility:
- Same `ChatHistoryItem` interface
- Same hook API (`useChatHistory`)
- Same component behavior
- Graceful error handling for network issues

## Testing

Test the migration:
1. Create new chats - verify they save to PostgreSQL
2. Load existing chats - verify they display correctly
3. Edit chat descriptions - verify updates persist
4. Delete chats - verify they're removed from database
5. Test offline behavior - verify appropriate error messages

## Troubleshooting

Common issues and solutions:

1. **Connection errors**: Verify `DATABASE_URL` is correct
2. **Migration failures**: Check PostgreSQL version compatibility
3. **Performance issues**: Verify database indexes are created
4. **API errors**: Check server logs for detailed error messages

## Future Enhancements

With PostgreSQL in place, future enhancements become possible:
- User authentication and multi-user support
- Advanced search and filtering
- Chat sharing and collaboration
- Data analytics and usage metrics
- Automated backups and recovery 