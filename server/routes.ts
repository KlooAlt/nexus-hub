
import { db } from "./db";
import { users, accessKeys, searchHistory, messages, groupChats, groupChatMembers } from "@shared/schema";
import { eq, desc, and, or, gt, sql } from "drizzle-orm";
import type { Express, Request } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import createMemoryStore from "memorystore";
import { randomBytes } from "crypto";

const MemoryStore = createMemoryStore(session);
const OWNER_KEY = "TSHSKDB163)#(";

// Extend session type
declare module "express-session" {
  interface SessionData {
    userId: number;
    role: string;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session middleware
  app.use(
    session({
      cookie: { maxAge: 86400000 },
      store: new MemoryStore({
        checkPeriod: 86400000,
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "super secret hacker key",
    })
  );

  // Middleware to check auth
  const requireAuth = (req: Request, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized: Login required" });
    }
    next();
  };

  const requireOwner = (req: Request, res: any, next: any) => {
    if (!req.session.userId || req.session.role !== "owner") {
      return res.status(403).json({ message: "Forbidden: Owner access only" });
    }
    next();
  };

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { serialKey, username } = api.auth.login.input.parse(req.body);
      
      let user = await storage.getUserBySerial(serialKey);
      
      // Check if it's the owner key
      if (serialKey === OWNER_KEY) {
        if (!user) {
          user = await storage.createUser({
            username: username || "Owner",
            serialKey,
            role: "owner",
          });
        }
      } else {
        // Standard user login via Access Key
        if (!user) {
          // Check if it's a valid access key
          const accessKey = await storage.getAccessKey(serialKey);
          if (!accessKey) {
            return res.status(401).json({ message: "Invalid serial key" });
          }
          if (accessKey.isUsed && accessKey.type !== 'permanent') {
             // If key is single-use and used (NOTE: Schema implies keys create accounts, 
             // we might want to allow re-login if account exists. 
             // But let's assume keys are "invites" to create an account OR purely reusable keys.
             // For simplicity: keys map to Users. If User exists for key, they log in.
             // If not, we create user.)
          }
          
          // Create the user
          let expiresAt: Date | undefined;
          if (accessKey.type === 'limited' && accessKey.durationMinutes) {
            expiresAt = new Date(Date.now() + accessKey.durationMinutes * 60000);
          }

          user = await storage.createUser({
            username: username || `User-${randomBytes(2).toString('hex')}`,
            serialKey,
            role: "user",
            expiresAt
          });
          
          await storage.markKeyAsUsed(accessKey.id);
        }
      }
      
      // Check expiration
      if (user.expiresAt && new Date() > user.expiresAt) {
        return res.status(401).json({ message: "Account expired" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.role = user.role;
      
      res.json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get(api.auth.me.path, requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    res.json(user);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // === ADMIN ===
  app.post(api.admin.generateKey.path, requireOwner, async (req, res) => {
    const input = api.admin.generateKey.input.parse(req.body);
    // Generate a random key
    const key = `KEY-${randomBytes(4).toString('hex').toUpperCase()}`;
    
    const newKey = await storage.createAccessKey({
      key,
      type: input.type,
      durationMinutes: input.durationMinutes,
      createdBy: req.session.userId!
    });
    
    res.status(201).json(newKey);
  });

  app.get(api.admin.listKeys.path, requireOwner, async (req, res) => {
    const keys = await storage.listAccessKeys();
    res.json(keys);
  });

  app.delete(api.admin.deleteKey.path, requireOwner, async (req, res) => {
    await storage.deleteAccessKey(Number(req.params.id));
    res.status(204).send();
  });

  // === HISTORY ===
  app.get(api.history.list.path, requireAuth, async (req, res) => {
    const history = await storage.getHistory(req.session.userId!);
    res.json(history);
  });

  app.post(api.history.create.path, requireAuth, async (req, res) => {
    const input = api.history.create.input.parse(req.body);
    const entry = await storage.createHistory({
      userId: req.session.userId!,
      url: input.url,
      query: input.query ?? undefined
    });
    res.status(201).json(entry);
  });

  app.delete(api.history.clear.path, requireAuth, async (req, res) => {
    await storage.clearHistory(req.session.userId!);
    res.status(204).send();
  });

  // === CHAT ===
  app.get(api.chat.list.path, requireAuth, async (req, res) => {
    const recipientId = req.query.recipientId ? Number(req.query.recipientId) : undefined;
    const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;
    const messages = await storage.getMessages(req.session.userId!, recipientId, groupId);
    res.json(messages);
  });

  app.post(api.chat.send.path, requireAuth, async (req, res) => {
    const input = api.chat.send.input.parse(req.body);
    const message = await storage.createMessage({
      senderId: req.session.userId!,
      recipientId: input.recipientId,
      groupId: input.groupId,
      content: input.content
    });
    res.status(201).json(message);
  });

  app.post(api.chat.createGroup.path, requireAuth, async (req, res) => {
    const { name } = api.chat.createGroup.input.parse(req.body);
    const inviteCode = `GC-${randomBytes(3).toString('hex').toUpperCase()}`;
    const group = await storage.createGroup({
      name,
      inviteCode,
      ownerId: req.session.userId!
    });
    res.status(201).json(group);
  });

  app.post(api.chat.joinGroup.path, requireAuth, async (req, res) => {
    const { inviteCode } = api.chat.joinGroup.input.parse(req.body);
    const group = await storage.getGroupByCode(inviteCode);
    if (!group) {
      return res.status(404).json({ message: "Invalid group code" });
    }
    await storage.joinGroup(req.session.userId!, group.id);
    res.json(group);
  });

  app.get(api.chat.listGroups.path, requireAuth, async (req, res) => {
    const groups = await storage.getUserGroups(req.session.userId!);
    res.json(groups);
  });

  app.patch("/api/user/settings", requireAuth, async (req, res) => {
    const { ringtoneUrl, muteNotifications } = req.body;
    await db.update(users)
      .set({ ringtoneUrl, muteNotifications })
      .where(eq(users.id, req.session.userId!));
    res.json({ success: true });
  });

  app.get(api.chat.users.path, requireAuth, async (req, res) => {
    const usersList = await storage.getAllUsers();
    res.json(usersList);
  });

  // === VOICE CALL SIGNALING (ENHANCED) ===
  const signals = new Map<number, any[]>();
  const activeCalls = new Map<string, Set<number>>(); // key: targetId (user or group), value: set of userIds

  app.post(api.chat.voice.offer.path, requireAuth, (req, res) => {
    const { recipientId, offer, isGroup } = req.body;
    const s = signals.get(recipientId) || [];
    s.push({ type: 'offer', from: req.session.userId, offer, isGroup });
    signals.set(recipientId, s);
    res.json({ success: true });
  });

  app.get('/api/chat/voice/active', requireAuth, (req, res) => {
    const { id, isGroup } = req.query;
    const key = `${isGroup ? 'g' : 'u'}${id}`;
    const participants = activeCalls.get(key) || new Set();
    res.json(Array.from(participants));
  });

  app.post('/api/chat/voice/join', requireAuth, (req, res) => {
    const { id, isGroup } = req.body;
    const key = `${isGroup ? 'g' : 'u'}${id}`;
    const participants = activeCalls.get(key) || new Set();
    participants.add(req.session.userId!);
    activeCalls.set(key, participants);
    res.json({ success: true });
  });

  app.post('/api/chat/voice/leave', requireAuth, (req, res) => {
    const { id, isGroup } = req.body;
    const key = `${isGroup ? 'g' : 'u'}${id}`;
    const participants = activeCalls.get(key);
    if (participants) {
      participants.delete(req.session.userId!);
      if (participants.size === 0) activeCalls.delete(key);
    }
    res.json({ success: true });
  });

  app.post(api.chat.voice.answer.path, requireAuth, (req, res) => {
    const { recipientId, answer } = api.chat.voice.answer.input.parse(req.body);
    const s = signals.get(recipientId) || [];
    s.push({ type: 'answer', from: req.session.userId, answer });
    signals.set(recipientId, s);
    res.json({ success: true });
  });

  app.post(api.chat.voice.ice.path, requireAuth, (req, res) => {
    const { recipientId, candidate } = api.chat.voice.ice.input.parse(req.body);
    const s = signals.get(recipientId) || [];
    s.push({ type: 'ice', from: req.session.userId, candidate });
    signals.set(recipientId, s);
    res.json({ success: true });
  });

  app.get('/api/chat/voice/poll', requireAuth, (req, res) => {
    const userId = req.session.userId!;
    const s = signals.get(userId) || [];
    signals.set(userId, []); // Clear after polling
    res.json(s);
  });

  // === PROXY ===
  app.get(api.proxy.fetch.path, requireAuth, async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).send("Missing URL");

      // Validate URL
      new URL(targetUrl); // Throws if invalid

      // Simple fetch proxy
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const contentType = response.headers.get('content-type');
      const text = await response.text();
      
      // Basic rewriting (Very primitive)
      // Ideally we'd use a robust rewriter, but for this MVP:
      // We just pass the HTML. Images/Assets might break if they are relative paths.
      // A full proxy is complex. We'll do a simple "view source" style or basic render.
      // To make it slightly better, we could inject a base tag.
      
      let processedHtml = text;
      if (contentType?.includes('text/html')) {
        const baseUrl = new URL(targetUrl).origin;
        // Inject base tag to fix relative links
        processedHtml = processedHtml.replace('<head>', `<head><base href="${targetUrl}">`);
      }

      res.set('Content-Type', contentType || 'text/html');
      res.send(processedHtml);

      // Log history asynchronously
      storage.createHistory({
        userId: req.session.userId!,
        url: targetUrl,
        query: "Proxy Visit"
      }).catch(console.error);

    } catch (err) {
      console.error("Proxy error:", err);
      // For cross-origin/CORS issues or blocked sites, we try a more robust approach
      res.status(500).send(`
        <div style="background: #1a1a1a; color: #00ff00; padding: 20px; font-family: monospace; border: 1px solid #00ff00;">
          [ERROR] ACCESS DENIED OR CONNECTION RESET<br/>
          [TARGET] ${req.query.url}<br/>
          [REASON] High-security site (Cloudflare/Google) or timeout.<br/>
          [ADVICE] Try a different URL or check if the site allows proxying.
        </div>
      `);
    }
  });

  return httpServer;
}
