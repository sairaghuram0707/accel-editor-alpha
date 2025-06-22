// Export only client-side functionality
export * from './useChatHistory';

// Re-export key types for convenience (types are safe for client-side)
export type { Chat, NewChat } from '~/lib/db/schema';

// Note: Server-side database functions are available in ~/lib/persistence/db
// but should only be imported in API routes and server-side code
