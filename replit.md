# Zero Club — Builder Community App

## Overview

Zero Club is a premium social learning mobile app for builders. Members share builds, join bootcamps, earn XP, and connect via real-time chat.

## Architecture

### Artifacts

- **`artifacts/mobile`** — Expo (React Native) mobile app, preview at `/`
- **`artifacts/api-server`** — Express + TypeScript API server, mounted at `/api`
- **`artifacts/mockup-sandbox`** — Vite component preview server (canvas mockups)

### Libraries

- **`lib/db`** — Drizzle ORM schema + PostgreSQL client (`@workspace/db`)
- **`lib/api-spec`** — OpenAPI specification (`lib/api-spec/openapi.yaml`)
- **`lib/api-client-react`** — Auto-generated React Query hooks from OpenAPI spec (`@workspace/api-client-react`)
- **`lib/api-zod`** — Auto-generated Zod schemas (`@workspace/api-zod`)

## Brand & Design Tokens

| Token | Value |
|---|---|
| Background | `#0D0D0D` |
| Primary (magenta) | `#D4387C` |
| Card | `#1A1A1A` |
| Muted | `#2A2A2A` |
| XP Gold | `#F59E0B` |
| Success | `#10B981` |

Fonts: Inter (400, 500, 600, 700 via `@expo-google-fonts/inter`)

## Database (PostgreSQL via Drizzle ORM)

### Tables
- `users` — auth credentials (id, email, password_hash)
- `profiles` — user profile (username, display_name, avatar_url, bio, track, xp_balance)
- `posts` — community feed posts (body, image_url, track, is_proof_project, xp_awarded)
- `likes` — post likes (composite PK: user_id + post_id)
- `bookmarks` — saved posts (composite PK: user_id + post_id)
- `comments` — post comments
- `bootcamps` — learning bootcamps (title, track, difficulty, modules_count, xp_reward)
- `enrollments` — user bootcamp enrollments (progress 0-100)
- `channels` — chat channels
- `messages` — channel messages
- `xp_events` — XP transaction history (source, amount)

### Enums
- `track`: product_design, frontend, growth, branding, mentorship
- `difficulty`: beginner, intermediate, advanced
- `xp_source`: build_posted, proof_project, bootcamp_module, bootcamp_completed

## API Routes (`/api/...`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns JWT |
| GET | `/auth/me` | Yes | Get current user profile |
| GET | `/profiles/:userId` | No | Get any profile |
| PUT | `/profiles/:userId/update` | Yes | Update own profile |
| GET | `/posts` | Yes | Feed (paginated, optional track filter) |
| POST | `/posts` | Yes | Create post (+XP awarded) |
| POST | `/posts/:postId/like` | Yes | Toggle like |
| POST | `/posts/:postId/bookmark` | Yes | Toggle bookmark |
| GET | `/posts/:postId/comments` | Yes | List comments |
| POST | `/posts/:postId/comments` | Yes | Add comment |
| GET | `/bootcamps` | Yes | List bootcamps (with enrollment status) |
| POST | `/bootcamps/:id/enroll` | Yes | Enroll in bootcamp |
| PUT | `/bootcamps/:id/progress` | Yes | Update module progress (+XP) |
| GET | `/channels` | Yes | List channels (with last message) |
| GET | `/channels/:id/messages` | Yes | List messages |
| POST | `/channels/:id/messages` | Yes | Send message |
| GET | `/wallet` | Yes | XP balance + level info |
| GET | `/wallet/events` | Yes | XP history |
| GET | `/feed/summary` | Yes | Active members count, posts today |
| POST | `/seed` | No | Seed DB with bootcamps + channels |

## Auth

- JWT via `jsonwebtoken`, 30-day expiry
- Passwords hashed with `bcryptjs` (10 rounds)
- JWT secret via `JWT_SECRET` env var (falls back to dev default)
- Token stored in AsyncStorage on mobile

## XP System

- Post build: +15 XP
- Proof project post: +50 XP
- Complete bootcamp module: +25 XP
- Complete full bootcamp: bootcamp.xpReward XP (250–750)
- Level formula: Level N requires `100 * N * (N+1) / 2` total XP

## Mobile Screens

- **`app/login.tsx`** — Login screen
- **`app/register.tsx`** — Registration with track selector
- **`app/(tabs)/index.tsx`** — Community feed with track filters
- **`app/(tabs)/bootcamps.tsx`** — Bootcamp browser
- **`app/(tabs)/create.tsx`** — Create post + proof project toggle
- **`app/(tabs)/chat.tsx`** — Channel list
- **`app/(tabs)/wallet.tsx`** — XP balance, level progress, XP history
- **`app/channel/[id].tsx`** — Real-time chat (3s polling)

## Key Files

- `artifacts/mobile/context/AuthContext.tsx` — JWT auth state + AsyncStorage persistence
- `artifacts/mobile/constants/colors.ts` — Zero Club design tokens
- `artifacts/mobile/hooks/useColors.ts` — Color scheme hook
- `artifacts/mobile/components/PostCard.tsx` — Feed post card
- `artifacts/mobile/components/BootcampCard.tsx` — Bootcamp card
- `artifacts/api-server/src/lib/auth.ts` — JWT middleware + `AuthRequest` type
- `artifacts/api-server/src/lib/ids.ts` — ID generation utility
- `lib/db/src/schema/index.ts` — All DB table exports
- `lib/api-spec/openapi.yaml` — Full API contract

## Codegen

To regenerate API client after changing `openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## DB Push

To sync schema changes to PostgreSQL:
```bash
pnpm --filter @workspace/db run push
```

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `JWT_SECRET` — JWT signing secret (use a strong secret in production)
- `EXPO_PUBLIC_DOMAIN` — Replit dev domain for API calls from mobile
- `SESSION_SECRET` — Session secret (available)
