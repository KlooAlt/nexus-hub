# NEXUS - Cyberpunk Proxy & Communication Platform

## Overview

NEXUS is a cyberpunk-themed web application that provides secure proxy browsing, real-time chat with group functionality, and browsing history tracking. The application uses a serial key authentication system where users gain access through pre-generated keys (either permanent or time-limited). The owner role has administrative capabilities to generate and manage access keys.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state and caching
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Design Theme**: Cyberpunk/terminal aesthetic with neon green accents, monospace fonts (JetBrains Mono, Orbitron), and sharp edges

**Key Design Decisions**:
- Custom cyber-themed components (CyberButton, CyberCard, CyberInput) wrap base functionality with consistent visual styling
- Protected routes redirect unauthenticated users to login
- Polling-based real-time updates for chat (3-second intervals) rather than WebSockets for simplicity

### Backend Architecture
- **Framework**: Express 5 on Node.js with TypeScript
- **Build Tool**: Vite for development with HMR, esbuild for production bundling
- **Session Management**: Express-session with MemoryStore (development) or connect-pg-simple (production-ready)

**API Design**:
- RESTful JSON API under `/api/*` prefix
- Centralized route contracts in `shared/routes.ts` using Zod schemas for validation
- Session-based authentication with role-based access control (owner vs user)

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema sync

**Core Tables**:
- `users` - User accounts with serial key authentication, role, optional expiration
- `accessKeys` - Generated keys (permanent or time-limited) for user registration
- `searchHistory` - User browsing history through proxy
- `messages` - Chat messages supporting public, direct, and group conversations
- `groupChats` - Private group chat rooms with invite codes
- `groupChatMembers` - Group membership junction table

### Authentication Flow
1. Owner has a hardcoded master key for initial access
2. Owner generates access keys (permanent or time-limited)
3. Users submit a serial key to login, which creates their account
4. Session cookie maintains authentication state
5. Time-limited users have an `expiresAt` timestamp

### Project Structure
```
client/           # React frontend
  src/
    components/   # Reusable UI components
    hooks/        # Custom React hooks (use-auth, use-chat, etc.)
    pages/        # Route page components
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route handlers
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared between client/server
  schema.ts       # Drizzle table definitions
  routes.ts       # API contract with Zod schemas
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching
- **shadcn/ui + Radix UI**: Accessible component primitives
- **lucide-react**: Icon library
- **date-fns**: Date formatting
- **wouter**: Client-side routing

### Backend Libraries
- **express-session**: Session management
- **memorystore**: In-memory session store for development
- **connect-pg-simple**: PostgreSQL session store (available for production)
- **zod**: Runtime validation for API inputs/outputs

### Build & Development
- **Vite**: Frontend dev server with HMR
- **esbuild**: Production bundling for server
- **tsx**: TypeScript execution for development
- **@replit/vite-plugin-***: Replit-specific development plugins