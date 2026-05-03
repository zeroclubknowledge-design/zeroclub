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

## Tutor Studio (Mobile — verified tutors only)

Users with `tutorVerified >= 1` see a **Studio** tab in the mobile app. All others see a "Become a Tutor" placeholder.

### Studio Tab Sections
- **Overview** — stat cards (bootcamps, students, modules, XP distributed) + quick actions
- **Bootcamps** — list of tutor's own bootcamps, create button, link to detail
- **Community** — per-bootcamp channel list (admin view)

### Stack Screens
- `/tutor/create` — full bootcamp creation form (title, subtitle, description, track, difficulty, delivery medium, XP reward, pricing, cover image/video upload)
- `/tutor/[id]` — bootcamp detail with 4 tabs: Info (edit), Modules (CRUD with per-module `isPreview` free/paid toggle), Students (enrolled list with progress bar), Community (channels)

### Tutor API (`/api/tutor/*`)
All routes require `Authorization: Bearer <token>`. All bootcamp mutations require the tutor to own the resource.
- `GET /tutor/my-stats` — aggregate stats
- `GET /tutor/my-bootcamps` — list with enrollment counts + modules
- `GET /tutor/bootcamps/:id` — single bootcamp detail
- `POST /tutor/bootcamps` — create bootcamp
- `PUT /tutor/bootcamps/:id` — update bootcamp
- `DELETE /tutor/bootcamps/:id` — delete bootcamp
- `GET /tutor/bootcamps/:id/students` — enrolled students
- `POST /tutor/bootcamps/:id/modules` — add module with `isPreview`
- `PUT /tutor/modules/:id` — edit module (title, duration, XP, `isPreview`)
- `DELETE /tutor/modules/:id` — delete module

### DB Schema Update
- `bootcamp_modules.is_preview` (boolean, default false) — marks a module as free preview for non-enrolled students

## Database (PostgreSQL via Drizzle ORM)

### Tables
- `users` — auth credentials (id, email, password_hash)
- `profiles` — user profile (username, display_name, avatar_url, bio, track, xp_balance, school, referral_code, push_token, tutor_verified)
- `posts` — community feed posts (body, image_url, track, is_proof_project, xp_awarded)
- `likes` — post likes (composite PK: user_id + post_id)
- `bookmarks` — saved posts (composite PK: user_id + post_id)
- `comments` — post comments
- `bootcamps` — learning bootcamps (title, track, difficulty, modules_count, xp_reward, price_cents)
- `bootcamp_modules` — individual modules per bootcamp (title, description, duration_minutes, xp_reward, order_index)
- `enrollments` — user bootcamp enrollments (progress 0-100, paid, payment_ref)
- `channels` — chat channels
- `messages` — channel messages
- `xp_events` — XP transaction history (source, amount)
- `referrals` — referral records (referrer_id, referee_id, same_school, xp_awarded)

### Enums
- `track`: product_design, frontend, growth, branding, mentorship, backend, full_stack, vibe_coding, video_editing, motion_design
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
| PUT | `/profiles/me/push-token` | Yes | Register/update Expo push token |
| GET | `/posts` | Yes | Feed (paginated, optional track filter) |
| POST | `/posts` | Yes | Create post (+XP awarded) |
| POST | `/posts/:postId/like` | Yes | Toggle like |
| POST | `/posts/:postId/bookmark` | Yes | Toggle bookmark |
| GET | `/posts/:postId/comments` | Yes | List comments |
| POST | `/posts/:postId/comments` | Yes | Add comment |
| GET | `/bootcamps` | Yes | List bootcamps (with enrollment status) |
| GET | `/bootcamps/:id` | Yes | Bootcamp detail with modules array |
| POST | `/bootcamps/:id/enroll` | Yes | Enroll (accepts paymentRef for paid) |
| PUT | `/bootcamps/:id/progress` | Yes | Update module progress (+XP + push notification) |
| GET | `/channels` | Yes | List channels (with last message) |
| GET | `/channels/:id/messages` | Yes | List messages |
| POST | `/channels/:id/messages` | Yes | Send message |
| GET | `/wallet` | Yes | XP balance + level info |
| GET | `/wallet/events` | Yes | XP history |
| GET | `/feed/summary` | Yes | Active members count, posts today |
| GET | `/referrals/stats` | Yes | My referral code, count, XP earned |
| POST | `/payments/bootcamp/:id/initiate` | Yes | Initiate payment intent (Stripe or simulated) |
| POST | `/seed` | No | Seed DB with bootcamps + channels + modules |

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

- Each user gets a unique referral code on registration
- `school` field enables same-school vs cross-school detection for bonus XP
- New user enters code during registration → welcome bonus awarded
- Referrer gets higher XP for cross-school referrals

## Push Notifications

- `expo-notifications` in mobile app
- On login: requests permission, gets Expo push token, sends to API
- Server `sendPushToUser()` helper calls Expo push API
- Triggers: module completed, bootcamp completed
- Token stored in `profiles.push_token`

## Bootcamp Detail & Modules

- 6 bootcamps seeded with 40 total modules (5–10 per bootcamp)
- Free bootcamps: UI/UX Fundamentals, Growth Hacking 101, Brand Identity
- Paid bootcamps: React & TypeScript (₦29.99), Mentorship Masterclass (₦19.99), Advanced Frontend Architecture (₦49.99)
- Detail screen shows: gradient hero, module list, progress tracking, "Mark Complete" per module

## Payment System

- `priceCents` field on bootcamps (0 = free)
- `POST /payments/bootcamp/:id/initiate` endpoint
  - If `STRIPE_SECRET_KEY` env var set: creates real Stripe Payment Intent
  - Otherwise: returns simulated payment ref for development
- `PaymentModal` component: card number, expiry, CVV, name on card inputs
- Enrollment created with `paid: true` + `paymentRef` after payment

## Mobile Screens

- **`app/login.tsx`** — Login screen
- **`app/register.tsx`** — Registration with track selector, school, and referral code fields
- **`app/(tabs)/index.tsx`** — Community feed with track filters + profile avatar in header
- **`app/(tabs)/bootcamps.tsx`** — Bootcamp browser with price/free badges
- **`app/(tabs)/create.tsx`** — Create post + proof project toggle
- **`app/(tabs)/chat.tsx`** — Channel list
- **`app/(tabs)/wallet.tsx`** — XP balance, level progress, XP history
- **`app/channel/[id].tsx`** — Real-time chat (3s polling)
- **`app/profile.tsx`** — User profile: avatar, XP/level, school badge, referral code, copy/share
- **`app/bootcamp/[id].tsx`** — Bootcamp detail: hero, module list, progress, enroll/pay CTA

## Key Files

- `artifacts/mobile/context/AuthContext.tsx` — JWT auth state + AsyncStorage persistence
- `artifacts/mobile/services/notifications.ts` — Push notification registration (client)
- `artifacts/mobile/constants/colors.ts` — Zero Club design tokens
- `artifacts/mobile/components/BootcampCard.tsx` — Bootcamp card with price badge
- `artifacts/mobile/components/PaymentModal.tsx` — Card payment UI
- `artifacts/api-server/src/lib/notifications.ts` — Push notification sender (server)
- `artifacts/api-server/src/routes/payments.ts` — Payment intent creation (Stripe or simulated)
- `lib/db/src/schema/bootcamp-modules.ts` — Bootcamp modules table
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
- `STRIPE_SECRET_KEY` — (optional) Stripe secret key to enable real payments
