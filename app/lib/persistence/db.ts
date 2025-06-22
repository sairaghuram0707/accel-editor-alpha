import type { Message } from 'ai';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '~/lib/db/connection';
import { chats } from '~/lib/db/schema';
import { createScopedLogger } from '~/utils/logger';
import type { ChatHistoryItem } from './useChatHistory';

const logger = createScopedLogger('ChatHistory');

// Database operations for PostgreSQL

export async function getAll(): Promise<ChatHistoryItem[]> {
  try {
    const result = await db
      .select({
        id: chats.id,
        urlId: chats.urlId,
        description: chats.description,
        messages: chats.messages,
        timestamp: chats.timestamp,
      })
      .from(chats)
      .orderBy(desc(chats.timestamp));

    return result.map(chat => ({
      id: chat.id.toString(),
      urlId: chat.urlId || undefined,
      description: chat.description || undefined,
      messages: chat.messages || [],
      timestamp: chat.timestamp?.toISOString() || new Date().toISOString(),
    }));
  } catch (error) {
    logger.error('Failed to get all chats:', error);
    throw new Error('Failed to retrieve chat history');
  }
}

export async function setMessages(
  id: string,
  messages: Message[],
  urlId?: string,
  description?: string,
): Promise<void> {
  try {
    const numericId = parseInt(id);
    
    // Try to update existing chat first
    const result = await db
      .update(chats)
      .set({
        messages,
        description,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, numericId))
      .returning();

    // If no existing chat, create new one
    if (result.length === 0) {
      await db.insert(chats).values({
        id: numericId,
        messages,
        urlId,
        description,
        timestamp: new Date(),
      });
    }
  } catch (error) {
    logger.error('Failed to set messages:', error);
    throw new Error('Failed to save chat messages');
  }
}

export async function getMessages(id: string): Promise<ChatHistoryItem | null> {
  try {
    // First try to get by ID
    const byId = await getMessagesById(id);
    if (byId) return byId;

    // Then try to get by URL ID
    return await getMessagesByUrlId(id);
  } catch (error) {
    logger.error('Failed to get messages:', error);
    return null;
  }
}

export async function getMessagesByUrlId(urlId: string): Promise<ChatHistoryItem | null> {
  try {
    const result = await db
      .select({
        id: chats.id,
        urlId: chats.urlId,
        description: chats.description,
        messages: chats.messages,
        timestamp: chats.timestamp,
      })
      .from(chats)
      .where(eq(chats.urlId, urlId))
      .limit(1);

    if (result.length === 0) return null;

    const chat = result[0];
    return {
      id: chat.id.toString(),
      urlId: chat.urlId || undefined,
      description: chat.description || undefined,
      messages: chat.messages || [],
      timestamp: chat.timestamp?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get messages by URL ID:', error);
    return null;
  }
}

export async function getMessagesById(id: string): Promise<ChatHistoryItem | null> {
  try {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;

    const result = await db
      .select({
        id: chats.id,
        urlId: chats.urlId,
        description: chats.description,
        messages: chats.messages,
        timestamp: chats.timestamp,
      })
      .from(chats)
      .where(eq(chats.id, numericId))
      .limit(1);

    if (result.length === 0) return null;

    const chat = result[0];
    return {
      id: chat.id.toString(),
      urlId: chat.urlId || undefined,
      description: chat.description || undefined,
      messages: chat.messages || [],
      timestamp: chat.timestamp?.toISOString() || new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get messages by ID:', error);
    return null;
  }
}

export async function deleteById(id: string): Promise<void> {
  try {
    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      throw new Error('Invalid ID format');
    }

    await db.delete(chats).where(eq(chats.id, numericId));
  } catch (error) {
    logger.error('Failed to delete chat:', error);
    throw new Error('Failed to delete chat');
  }
}

export async function getNextId(): Promise<string> {
  try {
    const result = await db
      .select({
        maxId: sql<number>`COALESCE(MAX(${chats.id}), 0) + 1`,
      })
      .from(chats);

    return result[0].maxId.toString();
  } catch (error) {
    logger.error('Failed to get next ID:', error);
    throw new Error('Failed to generate next ID');
  }
}

export async function getUrlId(baseId: string): Promise<string> {
  try {
    const existingUrlIds = await db
      .select({ urlId: chats.urlId })
      .from(chats)
      .where(sql`${chats.urlId} LIKE ${baseId + '%'}`);

    const existingIds = existingUrlIds
      .map(row => row.urlId)
      .filter(Boolean) as string[];

    if (!existingIds.includes(baseId)) {
      return baseId;
    }

    let i = 2;
    while (existingIds.includes(`${baseId}-${i}`)) {
      i++;
    }

    return `${baseId}-${i}`;
  } catch (error) {
    logger.error('Failed to get URL ID:', error);
    throw new Error('Failed to generate URL ID');
  }
}

// Legacy compatibility - these functions are no longer needed for PostgreSQL
// but kept for backward compatibility
export async function openDatabase(): Promise<any> {
  logger.warn('openDatabase is deprecated when using PostgreSQL');
  return { connected: true };
}
