import { pgTable, serial, varchar, text, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { Message } from 'ai';

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().unique(),
  urlId: varchar('url_id', { length: 255 }).unique(),
  userId: varchar('user_id', { length: 255 }), // For future user authentication
  description: text('description'),
  messages: jsonb('messages').$type<Message[]>().notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert; 