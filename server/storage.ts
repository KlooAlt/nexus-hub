
import { db } from "./db";
import { users, accessKeys, searchHistory, messages,
  type User, type AccessKey, type HistoryItem, type Message,
  type CreateKeyRequest, type CreateHistoryRequest, type CreateMessageRequest
} from "@shared/schema";
import { eq, desc, and, or, gt, sql } from "drizzle-orm";

export interface IStorage {
  // User & Auth
  getUser(id: number): Promise<User | undefined>;
  getUserBySerial(serialKey: string): Promise<User | undefined>;
  createUser(user: { username: string; serialKey: string; role: string; expiresAt?: Date }): Promise<User>;
  
  // Keys
  createAccessKey(key: { key: string; type: string; durationMinutes?: number; createdBy: number }): Promise<AccessKey>;
  getAccessKey(key: string): Promise<AccessKey | undefined>;
  listAccessKeys(): Promise<AccessKey[]>;
  deleteAccessKey(id: number): Promise<void>;
  markKeyAsUsed(id: number): Promise<void>;

  // History
  getHistory(userId: number): Promise<HistoryItem[]>;
  createHistory(item: { userId: number; url: string; query?: string }): Promise<HistoryItem>;
  clearHistory(userId: number): Promise<void>;

  // Chat
  getMessages(currentUserId: number, recipientId?: number): Promise<(Message & { senderName: string })[]>;
  getPublicMessages(): Promise<(Message & { senderName: string })[]>;
  createMessage(msg: { senderId: number; recipientId?: number | null; content: string }): Promise<Message>;
  getAllUsers(): Promise<User[]>;
}

export class DatabaseStorage implements IStorage {
  // User & Auth
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserBySerial(serialKey: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.serialKey, serialKey));
    return user;
  }

  async createUser(insertUser: { username: string; serialKey: string; role: string; expiresAt?: Date }): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Keys
  async createAccessKey(data: { key: string; type: string; durationMinutes?: number; createdBy: number }): Promise<AccessKey> {
    const [key] = await db.insert(accessKeys).values(data).returning();
    return key;
  }

  async getAccessKey(key: string): Promise<AccessKey | undefined> {
    const [accessKey] = await db.select().from(accessKeys).where(eq(accessKeys.key, key));
    return accessKey;
  }

  async listAccessKeys(): Promise<AccessKey[]> {
    return await db.select().from(accessKeys).orderBy(desc(accessKeys.createdAt));
  }

  async deleteAccessKey(id: number): Promise<void> {
    await db.delete(accessKeys).where(eq(accessKeys.id, id));
  }
  
  async markKeyAsUsed(id: number): Promise<void> {
    await db.update(accessKeys).set({ isUsed: true }).where(eq(accessKeys.id, id));
  }

  // History
  async getHistory(userId: number): Promise<HistoryItem[]> {
    return await db.select()
      .from(searchHistory)
      .where(eq(searchHistory.userId, userId))
      .orderBy(desc(searchHistory.visitedAt))
      .limit(50);
  }

  async createHistory(item: { userId: number; url: string; query?: string }): Promise<HistoryItem> {
    const [entry] = await db.insert(searchHistory).values(item).returning();
    return entry;
  }

  async clearHistory(userId: number): Promise<void> {
    await db.delete(searchHistory).where(eq(searchHistory.userId, userId));
  }

  // Chat
  async getMessages(currentUserId: number, recipientId?: number): Promise<(Message & { senderName: string })[]> {
    // If recipientId is provided, get DMs between current user and recipient
    if (recipientId) {
      return await db.select({
        id: messages.id,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: users.username,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          and(eq(messages.senderId, currentUserId), eq(messages.recipientId, recipientId)),
          and(eq(messages.senderId, recipientId), eq(messages.recipientId, currentUserId))
        )
      )
      .orderBy(messages.createdAt);
    } 
    
    // Otherwise get public messages (where recipientId is null)
    return await this.getPublicMessages();
  }

  async getPublicMessages(): Promise<(Message & { senderName: string })[]> {
    return await db.select({
      id: messages.id,
      senderId: messages.senderId,
      recipientId: messages.recipientId,
      content: messages.content,
      createdAt: messages.createdAt,
      senderName: users.username,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(sql`${messages.recipientId} IS NULL`)
    .orderBy(messages.createdAt);
  }

  async createMessage(msg: { senderId: number; recipientId?: number | null; content: string }): Promise<Message> {
    const [message] = await db.insert(messages).values(msg).returning();
    return message;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
}

export const storage = new DatabaseStorage();
