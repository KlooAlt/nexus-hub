
import { db } from "./db";
import { users, accessKeys, searchHistory, messages, groupChats, groupChatMembers,
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
  getMessages(currentUserId: number, recipientId?: number, groupId?: number): Promise<(Message & { senderName: string })[]>;
  getPublicMessages(): Promise<(Message & { senderName: string })[]>;
  createMessage(msg: { senderId: number; recipientId?: number | null; groupId?: number | null; content: string; mediaUrl?: string | null; mediaType?: string | null; replyToId?: number | null }): Promise<Message>;
  getAllUsers(): Promise<User[]>;

  // Groups
  createGroup(data: { name: string; inviteCode: string; ownerId: number }): Promise<any>;
  joinGroup(userId: number, groupId: number): Promise<void>;
  getGroupByCode(code: string): Promise<any>;
  getUserGroups(userId: number): Promise<any[]>;
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
  async getMessages(currentUserId: number, recipientId?: number, groupId?: number): Promise<(Message & { senderName: string })[]> {
    if (groupId) {
      return await db.select({
        id: messages.id,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        groupId: messages.groupId,
        content: messages.content,
        createdAt: messages.createdAt,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        replyToId: messages.replyToId,
        isDeleted: messages.isDeleted,
        senderName: users.username,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.groupId, groupId))
      .orderBy(messages.createdAt);
    }

    if (recipientId) {
      return await db.select({
        id: messages.id,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        groupId: messages.groupId,
        content: messages.content,
        createdAt: messages.createdAt,
        mediaUrl: messages.mediaUrl,
        mediaType: messages.mediaType,
        replyToId: messages.replyToId,
        isDeleted: messages.isDeleted,
        senderName: users.username,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          sql`${messages.groupId} IS NULL`,
          or(
            and(eq(messages.senderId, currentUserId), eq(messages.recipientId, recipientId)),
            and(eq(messages.senderId, recipientId), eq(messages.recipientId, currentUserId))
          )
        )
      )
      .orderBy(messages.createdAt);
    } 
    
    return await this.getPublicMessages();
  }

  async getPublicMessages(): Promise<(Message & { senderName: string })[]> {
    return await db.select({
      id: messages.id,
      senderId: messages.senderId,
      recipientId: messages.recipientId,
      groupId: messages.groupId,
      content: messages.content,
      createdAt: messages.createdAt,
      mediaUrl: messages.mediaUrl,
      mediaType: messages.mediaType,
      replyToId: messages.replyToId,
      isDeleted: messages.isDeleted,
      senderName: users.username,
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(sql`${messages.recipientId} IS NULL AND ${messages.groupId} IS NULL`)
    .orderBy(messages.createdAt);
  }

  async createMessage(msg: { senderId: number; recipientId?: number | null; groupId?: number | null; content: string; mediaUrl?: string | null; mediaType?: string | null; replyToId?: number | null }): Promise<Message> {
    const [message] = await db.insert(messages).values(msg).returning();
    return message;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Groups
  async createGroup(data: { name: string; inviteCode: string; ownerId: number }): Promise<any> {
    const [group] = await db.insert(groupChats).values(data).returning();
    // Add owner as member
    await db.insert(groupChatMembers).values({
      groupId: group.id,
      userId: data.ownerId
    });
    
    // Create system message
    await this.createMessage({
      senderId: data.ownerId,
      groupId: group.id,
      content: `[SYSTEM] Group Chat initialized.`
    });
    
    return group;
  }

  async joinGroup(userId: number, groupId: number): Promise<void> {
    // Check if already a member
    const [existing] = await db.select().from(groupChatMembers).where(
      and(eq(groupChatMembers.groupId, groupId), eq(groupChatMembers.userId, userId))
    );
    if (!existing) {
      await db.insert(groupChatMembers).values({ groupId, userId });
    }
  }

  async getGroupByCode(code: string): Promise<any> {
    const [group] = await db.select().from(groupChats).where(eq(groupChats.inviteCode, code));
    return group;
  }

  async getUserGroups(userId: number): Promise<any[]> {
    return await db.select({
      id: groupChats.id,
      name: groupChats.name,
      inviteCode: groupChats.inviteCode,
      ownerId: groupChats.ownerId
    })
    .from(groupChats)
    .innerJoin(groupChatMembers, eq(groupChatMembers.groupId, groupChats.id))
    .where(eq(groupChatMembers.userId, userId));
  }
}

export const storage = new DatabaseStorage();
