# API Documentation

This document provides comprehensive documentation for the Accel Editor chat API endpoints and PostgreSQL database integration.

## Overview

The API provides RESTful endpoints for managing chat conversations with persistent storage in PostgreSQL. All endpoints use JSON for request/response bodies and follow standard HTTP status codes.

**Base URL**: `/api`

## Database Schema

### Chats Table

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

### Data Types

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  // Additional AI message properties
}

interface Chat {
  id: number;
  uuid: string;
  urlId: string | null;
  userId: string | null;
  description: string | null;
  messages: Message[];
  timestamp: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
}
```

## API Endpoints

### 1. Get All Chats

**Endpoint**: `GET /api/chats`

**Description**: Retrieves all chat conversations ordered by timestamp (newest first).

**Request**:
```http
GET /api/chats
```

**Response**:
```json
{
  "chats": [
    {
      "id": "1",
      "urlId": "chat-abc123",
      "description": "React Component Help",
      "messages": [...],
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Status Codes**:
- `200`: Success
- `500`: Internal server error

---

### 2. Get Specific Chat

**Endpoint**: `GET /api/chats?id={chatId}`

**Description**: Retrieves a specific chat by ID (numeric ID or URL ID).

**Parameters**:
- `id` (query, required): Chat ID (numeric) or URL ID (string)

**Request**:
```http
GET /api/chats?id=123
GET /api/chats?id=chat-abc123
```

**Response**:
```json
{
  "chat": {
    "id": "123",
    "urlId": "chat-abc123",
    "description": "React Component Help",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "How do I create a React component?",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "id": "msg-2", 
        "role": "assistant",
        "content": "Here's how to create a React component...",
        "timestamp": "2024-01-15T10:30:05.000Z"
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Status Codes**:
- `200`: Success
- `404`: Chat not found
- `500`: Internal server error

---

### 3. Create or Update Chat

**Endpoint**: `POST /api/chats`

**Description**: Creates a new chat or updates an existing one with messages.

**Request Body**:
```json
{
  "id": "123", // Optional: If omitted, auto-generates new ID
  "urlId": "chat-abc123", // Optional: If omitted, auto-generates based on ID
  "description": "React Component Help", // Optional
  "messages": [
    {
      "id": "msg-1",
      "role": "user", 
      "content": "How do I create a React component?"
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "id": "123",
  "urlId": "chat-abc123"
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid request (missing messages array)
- `500`: Internal server error

**Behavior**:
- If `id` is provided and exists: Updates the existing chat
- If `id` is provided but doesn't exist: Creates new chat with that ID
- If `id` is omitted: Generates new sequential ID
- If `urlId` is omitted: Generates unique URL ID based on chat ID

---

### 4. Delete Chat

**Endpoint**: `DELETE /api/chats`

**Description**: Deletes a specific chat by ID.

**Request Body**:
```json
{
  "id": "123"
}
```

**Response**:
```json
{
  "success": true
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid request (missing ID)
- `500`: Internal server error

---

### 5. Generate Next Chat ID

**Endpoint**: `GET /api/chats/next-id`

**Description**: Generates the next available sequential chat ID.

**Request**:
```http
GET /api/chats/next-id
```

**Response**:
```json
{
  "id": "124"
}
```

**Status Codes**:
- `200`: Success
- `500`: Internal server error

---

### 6. Generate URL ID

**Endpoint**: `GET /api/chats/url-id?base={baseId}`

**Description**: Generates a unique URL ID based on a base string, ensuring no conflicts.

**Parameters**:
- `base` (query, required): Base string for URL ID generation

**Request**:
```http
GET /api/chats/url-id?base=react-help
```

**Response**:
```json
{
  "urlId": "react-help-2"
}
```

**Status Codes**:
- `200`: Success
- `400`: Missing base parameter
- `500`: Internal server error

**Behavior**:
- If `base` is unique: Returns the base string
- If `base` exists: Appends `-2`, `-3`, etc. until unique

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Description of the error"
}
```

Common error scenarios:
- **400 Bad Request**: Invalid request parameters or body
- **404 Not Found**: Requested resource doesn't exist
- **405 Method Not Allowed**: HTTP method not supported for endpoint
- **500 Internal Server Error**: Database or server errors

## Rate Limiting

Currently no rate limiting is implemented, but recommended for production:
- Consider implementing per-IP rate limiting
- Suggested limits: 100 requests per minute per IP

## Authentication

Currently no authentication is implemented. The `user_id` field in the database schema is prepared for future user authentication features.

## Performance Considerations

### Database Indexes
- Primary key on `id` (automatic)
- Unique index on `url_id` for fast URL-based lookups
- Index on `timestamp` for efficient chronological ordering
- Index on `created_at` for creation-time queries

### Query Optimization
- Use URL ID for public-facing URLs (shorter, more user-friendly)
- Use numeric ID for internal operations (faster lookups)
- JSONB field for messages allows efficient JSON operations in PostgreSQL

### Caching Recommendations
- Consider implementing Redis cache for frequently accessed chats
- Cache chat lists for better performance on chat history loads

## Example Usage

### JavaScript/TypeScript Client

```typescript
// Get all chats
const response = await fetch('/api/chats');
const { chats } = await response.json();

// Get specific chat
const chatResponse = await fetch('/api/chats?id=chat-abc123');
const { chat } = await chatResponse.json();

// Create new chat
const createResponse = await fetch('/api/chats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { id: 'msg-1', role: 'user', content: 'Hello!' }
    ],
    description: 'Test chat'
  })
});
const { id, urlId } = await createResponse.json();

// Delete chat
await fetch('/api/chats', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: '123' })
});
```

### cURL Examples

```bash
# Get all chats
curl -X GET http://localhost:3000/api/chats

# Get specific chat
curl -X GET "http://localhost:3000/api/chats?id=123"

# Create chat
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"id": "1", "role": "user", "content": "Hello"}],
    "description": "Test chat"
  }'

# Delete chat
curl -X DELETE http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -d '{"id": "123"}'
```

## Database Connection Configuration

The API uses Drizzle ORM with PostgreSQL. Connection configuration in `app/lib/db/connection.ts`:

```typescript
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/accel_editor';

const pool = new Pool({
  connectionString,
  max: 10, // Maximum number of connections
  idleTimeoutMillis: 20000, // Close connections after 20 seconds of inactivity
  connectionTimeoutMillis: 10000, // Connection timeout
});
```

## Environment Variables

Required environment variables:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/accel_editor
```

Optional environment variables:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=accel_editor
DB_USER=username
DB_PASSWORD=password
``` 