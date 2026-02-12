import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations, type AnyPgColumn } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  serialKey: text("serial_key").notNull().unique(),
  role: text("role").notNull().default("user"), // 'owner' or 'user'
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  ringtoneUrl: text("ringtone_url"),
  muteNotifications: boolean("mute_notifications").default(false),
  avatarUrl: text("avatar_url"),
  profileDecoration: text("profile_decoration"),
  tokens: integer("tokens").notNull().default(100),
});

export const accessKeys = pgTable("access_keys", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  type: text("type").notNull(), // 'permanent' or 'limited'
  durationMinutes: integer("duration_minutes"),
  createdBy: integer("created_by").references(() => users.id),
  isUsed: boolean("is_used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  query: text("query"),
  url: text("url").notNull(),
  visitedAt: timestamp("visited_at").defaultNow(),
});

export const groupChats = pgTable("group_chats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const groupChatMembers = pgTable("group_chat_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupChats.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id),
  groupId: integer("group_id").references(() => groupChats.id),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // 'image', 'video', 'audio'
  replyToId: integer("reply_to_id").references((): AnyPgColumn => messages.id),
  isForwarded: boolean("is_forwarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===

export const usersRelations = relations(users, ({ many }) => ({
  history: many(searchHistory),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  createdKeys: many(accessKeys),
  groups: many(groupChatMembers),
}));

export const groupChatsRelations = relations(groupChats, ({ one, many }) => ({
  owner: one(users, { fields: [groupChats.ownerId], references: [users.id] }),
  members: many(groupChatMembers),
  messages: many(messages),
}));

export const groupChatMembersRelations = relations(groupChatMembers, ({ one }) => ({
  group: one(groupChats, { fields: [groupChatMembers.groupId], references: [groupChats.id] }),
  user: one(users, { fields: [groupChatMembers.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "recipient",
  }),
  group: one(groupChats, {
    fields: [messages.groupId],
    references: [groupChats.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const selectUserSchema = createSelectSchema(users);

export const insertKeySchema = createInsertSchema(accessKeys).omit({ id: true, isUsed: true, createdAt: true });
export const insertHistorySchema = createInsertSchema(searchHistory).omit({ id: true, visitedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

// === TYPES ===

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AccessKey = typeof accessKeys.$inferSelect;
export type Message = typeof messages.$inferSelect;

// Auth & API Contracts
export type LoginRequest = { serialKey: string; username?: string };
export type LoginResponse = { user: User };
export type CreateKeyRequest = { type: 'permanent' | 'limited'; durationMinutes?: number };
export type MessageWithUser = Message & { senderName: string };