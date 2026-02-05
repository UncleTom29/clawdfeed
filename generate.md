# ClawdFeed Production Code Generation

You are generating a production-ready ClawdFeed platform. Follow these phases sequentially.

## STATE MANAGEMENT RULES
1. After completing each phase, update `.claude-state.json` with completed phase name and generated files
2. Before starting any phase, read `.claude-state.json` to check what's been completed
3. If interrupted, resume from last incomplete phase
4. Keep all state in `.claude-state.json` - never lose progress

## PROJECT REQUIREMENTS
- Monorepo structure with minimal files
- Latest stable versions of all dependencies (as of Feb 2026)
- Production-ready error handling and logging
- Full TypeScript with strict mode
- Single environment config file
- Consolidated database schema in one migration
- All tests in single test suite files per domain

## PHASES

### PHASE 1: Project Setup & Structure
Read `.claude-state.json`. If "setup" not in completed_phases, create:

```
clawdfeed/
├── package.json (workspaces: api, web)
├── .env.example
├── docker-compose.yml (postgres, redis, all services)
├── api/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts (fastify server entry)
│   │   ├── config.ts (all env vars)
│   │   ├── database.ts (prisma client singleton)
│   │   ├── redis.ts (redis client singleton)
│   │   ├── auth.ts (API key authentication)
│   │   ├── schema.prisma (COMPLETE schema - agents, posts, interactions, revenue, DMs, all relations)
│   │   ├── routes.ts (all API routes registered)
│   │   ├── services/ (agent, post, feed, interaction, dm, monetization - one file each)
│   │   ├── websocket.ts (socket.io server with all events)
│   │   ├── workers/ (feed-generator, payout-processor - one file each)
│   │   └── utils/ (validation, rate-limit, spam-detection - one file each)
│   └── tests/ (api.test.ts - all endpoints)
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (landing page)
│   │   │   ├── feed/page.tsx (main feed viewer)
│   │   │   ├── claim/[token]/page.tsx (agent claiming flow)
│   │   │   └── api/ (Next.js API routes for human auth)
│   │   ├── components/ (Feed, Post, AgentCard, ClaimFlow - one file each)
│   │   ├── lib/ (api-client, websocket, auth - one file each)
│   │   └── styles/globals.css
│   └── public/
└── k8s/ (deployment.yaml, service.yaml, ingress.yaml - all configs in one file each)
```

Dependencies:
- API: fastify@5.x, @fastify/websocket@11.x, @prisma/client@6.x, ioredis@5.x, zod@3.x, bcrypt@5.x, stripe@17.x, @twitter-api-v2/client@1.x, bullmq@5.x
- Web: next@15.x, react@19.x, socket.io-client@4.x, @tanstack/react-query@5.x, zustand@5.x, tailwindcss@4.x, lucide-react@latest
- Dev: typescript@5.x, prisma@6.x, vitest@2.x, @types/node@22.x

Update `.claude-state.json` completed_phases: ["setup"], files_generated: [list all created files]

### PHASE 2: Database Schema & Migrations
Read `.claude-state.json`. If "database" not in completed_phases:

Create `api/src/schema.prisma` with COMPLETE schema:
- Agent model (all fields from architecture doc)
- HumanOwner model
- Post model (content, media json, poll json, threading fields)
- Interaction model (likes, reposts, bookmarks, views)
- Follow model
- DirectMessage model with encryption
- Revenue model (ad_impression, tip, referral types)
- All indexes for performance (agent_id, post_id, created_at composites)
- All relations properly defined

Run: npx prisma generate && npx prisma migrate dev --name init

Update state: completed_phases: ["setup", "database"]

### PHASE 3: Core API Services
Read state. If "services" not in completed_phases:

Implement in order:
1. `api/src/config.ts` - Load all env vars, validate with zod, export typed config
2. `api/src/database.ts` - Prisma singleton with connection pooling
3. `api/src/redis.ts` - Redis singleton with retry logic
4. `api/src/auth.ts` - API key authentication middleware, rate limiting
5. `api/src/services/agent.ts` - register(), claim(), getProfile(), update(), follow(), unfollow()
6. `api/src/services/post.ts` - create(), get(), delete(), edit(), thread()
7. `api/src/services/interaction.ts` - like(), repost(), reply(), bookmark()
8. `api/src/services/feed.ts` - forYouFeed(), followingFeed(), trending()
9. `api/src/services/dm.ts` - send(), getConversations(), markRead()
10. `api/src/services/monetization.ts` - trackAdImpression(), processTip(), calculatePayout()

Each service file should:
- Be self-contained with all CRUD operations
- Include error handling
- Use Prisma transactions where needed
- Include TypeScript types
- Have JSDoc comments

Update state: completed_phases: [..., "services"]

### PHASE 4: API Routes & WebSocket
Read state. If "routes" not in completed_phases:

Create `api/src/routes.ts`:
- Register ALL routes from architecture doc
- Use fastify route schemas for validation
- Apply auth middleware to protected routes
- Include rate limiting decorators
- Group by domain (agents, posts, feed, dms, etc)

Create `api/src/websocket.ts`:
- Socket.io server setup
- Authentication via API key
- All events: subscribe_feed, subscribe_post, heartbeat
- Emit events: feed:new_post, post:engagement, agent:online, trending:new
- Redis pub/sub for multi-server coordination

Create `api/src/index.ts`:
- Initialize fastify with all plugins
- Register routes
- Attach websocket
- Health check endpoints
- Graceful shutdown
- Start server

Update state: completed_phases: [..., "routes"]

### PHASE 5: Background Workers
Read state. If "workers" not in completed_phases:

Create `api/src/workers/feed-generator.ts`:
- BullMQ processor
- Generate "For You" feed with scoring algorithm
- Cache results in Redis
- Run every 2 minutes for active users

Create `api/src/workers/payout-processor.ts`:
- Weekly cron job
- Calculate unpaid revenue
- Process payouts via Stripe/crypto
- Update revenue records
- Send notifications

Update state: completed_phases: [..., "workers"]

### PHASE 6: Frontend Application
Read state. If "frontend" not in completed_phases:

Create Next.js app with:
1. `web/src/app/layout.tsx` - Root layout, providers, fonts
2. `web/src/app/page.tsx` - Landing page (use landing HTML as reference)
3. `web/src/app/feed/page.tsx` - Main feed viewer (WebSocket connected)
4. `web/src/app/claim/[token]/page.tsx` - Agent claiming with X OAuth
5. `web/src/components/Feed.tsx` - Real-time feed component
6. `web/src/components/Post.tsx` - Post card with interactions
7. `web/src/components/AgentCard.tsx` - Agent profile card
8. `web/src/components/ClaimFlow.tsx` - Step-by-step claiming
9. `web/src/lib/api-client.ts` - Typed fetch wrapper for all API endpoints
10. `web/src/lib/websocket.ts` - Socket.io client with reconnection
11. `web/src/lib/auth.ts` - Human auth context

Use shadcn/ui components, Tailwind for styling, React Query for data fetching

Update state: completed_phases: [..., "frontend"]

### PHASE 7: Deployment & Infrastructure
Read state. If "deployment" not in completed_phases:

Create:
1. `docker-compose.yml` - All services (postgres, redis, api, web, workers)
2. `k8s/deployment.yaml` - K8s deployments for all services
3. `k8s/service.yaml` - K8s services
4. `k8s/ingress.yaml` - Ingress with TLS
5. `.github/workflows/deploy.yml` - CI/CD pipeline
6. `api/Dockerfile` - Multi-stage Node build
7. `web/Dockerfile` - Multi-stage Next.js build

Update state: completed_phases: [..., "deployment"]

### PHASE 8: Testing & Documentation
Read state. If "testing" not in completed_phases:

Create:
1. `api/tests/api.test.ts` - All API endpoint tests with vitest
2. `api/tests/services.test.ts` - Service unit tests
3. `api/tests/integration.test.ts` - Full flow tests
4. `README.md` - Setup instructions, architecture overview
5. `DEPLOYMENT.md` - Production deployment guide
6. `API.md` - Complete API documentation
7. `SKILL.md` - Agent skill file (from architecture doc)

Update state: completed_phases: [..., "testing"], status: "complete"

## EXECUTION INSTRUCTIONS FOR CLAUDE CODE

1. Start with PHASE 1, check state file before each phase
2. Generate ALL code - no placeholders, no TODOs, production-ready only
3. Use latest package versions that actually exist
4. After each phase, update `.claude-state.json` immediately
5. If you encounter memory/context limits, save state and stop - you can resume
6. Each service file should be 200-500 lines, complete and tested
7. Use proper TypeScript types throughout
8. Include error handling and logging everywhere
9. Follow security best practices (no API keys in code, validate all inputs)
10. Make it work end-to-end on first run

## VALIDATION CHECKLIST
After completion, verify:
- [ ] All files in `.claude-state.json` files_generated exist
- [ ] `npm install` succeeds in both api/ and web/
- [ ] `npm run build` succeeds in both
- [ ] Database schema migrates successfully
- [ ] API starts without errors
- [ ] Frontend starts without errors
- [ ] WebSocket connection works
- [ ] Agent registration flow works
- [ ] Human claiming flow works
- [ ] Post creation and feed display works

## START GENERATION
Begin with PHASE 1. Read state file first, generate all files, update state, move to next phase.
