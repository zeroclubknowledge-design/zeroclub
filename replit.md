# Zero Club — Builder Community App

## Overview

Zero Club is a premium social learning mobile app for senior secondary school students / builders. Members share builds, join bootcamps, earn XP, refer friends, and connect via real-time chat.

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
- `profiles` — user profile (username, display_name, avatar_url, bio, track, xp_balance, school, referral_code)
- `posts` — community feed posts (body, image_url, track, is_proof_project, xp_awarded)
- `likes` — post likes (composite PK: user_id + post_id)
- `bookmarks` — saved posts (composite PK: user_id + post_id)
- `comments` — post comments
- `bootcamps` — learning bootcamps (title, track, difficulty, modules_count, xp_reward)
- `enrollments` — user bootcamp enrollments (progress 0-100)
- `channels` — chat channels
- `messages` — channel messages
- `xp_events` — XP transaction history (source, amount)
- `referrals` — referral records (referrer_id, referee_id, same_school, xp_awarded)

### Enums
- `track`: product_design, frontend, growth, branding, mentorship
- `difficulty`: beginner, intermediate, advanced
- `xp_source`: build_posted, proof_project, bootcamp_module, bootcamp_completed, referral_bonus

## API Routes (`/api/...`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register new user (accepts school + referral_code) |
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
| GET | `/referrals/stats` | Yes | My referral code, count, XP earned |
| POST | `/seed` | No | Seed DB with bootcamps + channels |

## Auth

- JWT via `jsonwebtoken`, 30-day expiry
- Passwords hashed with `bcryptjs` (10 rounds)
- JWT secret via `JWT_SECRET` env var (falls back to dev default)
- Token stored in AsyncStorage on mobile
- AuthGate uses `usePathname` to protect routes

## XP System

- Post build: +15 XP
- Proof project post: +50 XP
- Complete bootcamp module: +25 XP
- Complete full bootcamp: bootcamp.xpReward XP (250–750)
- Welcome bonus (used referral code): +50 XP
- Referral bonus same-school: +250 XP to referrer
- Referral bonus cross-school: +400 XP to referrer
- Level formula: Level N requires `100 * N * (N+1) / 2` total XP

## Referral System

- Each user gets a unique referral code on registration (3-char username prefix + 5 random alphanumeric chars, e.g. `ADMK7R2PQ`)
- `school` field on profiles enables same-school vs cross-school detection
- New user enters referral code during registration → welcome bonus awarded
- Referrer gets higher XP for bringing in students from other schools

## Mobile Screens

- **`app/login.tsx`** — Login screen
- **`app/register.tsx`** — Registration with track selector, school, and referral code fields
- **`app/(tabs)/index.tsx`** — Community feed with track filters + profile avatar in header
- **`app/(tabs)/bootcamps.tsx`** — Bootcamp browser
- **`app/(tabs)/create.tsx`** — Create post + proof project toggle
- **`app/(tabs)/chat.tsx`** — Channel list
- **`app/(tabs)/wallet.tsx`** — XP balance, level progress, XP history
- **`app/channel/[id].tsx`** — Real-time chat (3s polling)
- **`app/profile.tsx`** — User profile: avatar, XP/level, school badge, referral code, copy/share link, referral stats

## Key Files

- `artifacts/mobile/context/AuthContext.tsx` — JWT auth state + AsyncStorage persistence
- `artifacts/mobile/constants/colors.ts` — Zero Club design tokens
- `artifacts/mobile/hooks/useColors.ts` — Color scheme hook
- `artifacts/mobile/components/PostCard.tsx` — Feed post card
- `artifacts/mobile/components/BootcampCard.tsx` — Bootcamp card
- `artifacts/api-server/src/routes/auth.ts` — JWT middleware, registration with referral logic
- `artifacts/api-server/src/routes/referrals.ts` — Referral stats endpoint
- `artifacts/api-server/src/lib/auth.ts` — JWT middleware + `AuthRequest` type
- `artifacts/api-server/src/lib/ids.ts` — ID generation utility
- `lib/db/src/schema/index.ts` — All DB table exports
- `lib/db/src/schema/profiles.ts` — Profiles table (school + referral_code)
- `lib/db/src/schema/referrals.ts` — Referrals table
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
