DEPT.OS → Production SaaS Transformation Plan
Context
DEPT.OS is an AI-powered organizational analysis tool that maps institutional workflows, identifies AI transformation opportunities, and designs agent architectures. It currently exists as a single 2,015-line React component with no persistence, auth, or tests. The goal is to transform it into a multi-tenant production SaaS deployed on Vercel, prioritizing deeper AI features and better visualization.

Tech Stack Decisions
Concern	Choice	Rationale
Database + Auth	Supabase (Postgres + Auth + RLS)	One service for DB, auth, and row-level security. Vercel-native integration.
ORM	Drizzle	Lightweight, no generated client, fast serverless cold starts
Billing	Stripe	Industry standard, Checkout + Customer Portal
CSS	Keep inline styles initially, adopt Tailwind for new components	Avoids massive diff during decomposition
Canvas	Raw SVG (no library)	Only 4-8 nodes; ReactFlow/D3 are overkill. Zoom/pan is ~50 lines.
AI streaming	Vercel AI SDK (ai package)	Replaces manual SSE parsing; provides useChat hook with Anthropic provider
Phase 0: Foundation — TypeScript + Decomposition (no behavior change)
Break the monolith into ~20 files while keeping the app working identically.

Project Structure

app/
  (auth)/login/ signup/ callback/
  (dashboard)/
    layout.tsx                    # Auth-gated layout
    page.tsx                      # Department list / dashboard
    departments/[id]/page.tsx     # Main department viewer
    departments/new/page.tsx      # Create/generate
    departments/compare/page.tsx  # Comparative analysis
    conversations/[id]/page.tsx
    settings/ billing/
  api/
    chat/route.ts
    departments/route.ts, [id]/route.ts, [id]/analyze/route.ts, compare/route.ts
    conversations/route.ts, [id]/route.ts
    webhooks/stripe/route.ts
components/
  canvas/    → OperationalMap, AgentMap, NodeRenderer, EdgeRenderer, CanvasControls
  panels/    → DetailPanel, SensorPanel, KnowledgeTable, ValueFlowPanel, AIImpactPanel
  sidebar/   → Sidebar, AdvisorPanel, DepartmentList
  builder/   → DepartmentBuilder, GeneratePanel
  agents/    → AgentPrototypeModal, AgentChat, AgentScaffold
  conversations/ → ConversationPanel, ConversationHistory
hooks/       → useStreamingResponse, useDepartment, useConversation, useCanvas, useDragDrop, useAdvisors
lib/
  ai/        → prompts.ts, streaming.ts, comparative.ts, recommendations.ts
  db/        → schema.ts, client.ts, queries/
  auth/      → config.ts, middleware.ts
  billing/   → stripe.ts, plans.ts
  export/    → svg-export.ts, png-export.ts, pdf-export.ts
types/       → department.ts, conversation.ts, user.ts, billing.ts
data/        → templates.ts, constants.ts
styles/      → tokens.ts, theme.ts
Extraction Map (from dept-os.jsx)
Lines 1–42 → styles/tokens.ts, data/constants.ts
Lines 44–198 → data/templates.ts
Lines 205–281 → lib/ai/prompts.ts, lib/ai/streaming.ts
Lines 287–445 → components/builder/DepartmentBuilder.tsx
Lines 449–598 → components/builder/GeneratePanel.tsx
Lines 600–688 → lib/ai/prompts.ts (buildSystemPrompt, buildScaffold)
Lines 690–919 → components/agents/AgentPrototypeModal.tsx
Lines 920–1270 → components/canvas/AgentMap.tsx
Lines 1272–1289 → hooks/useAdvisors.ts
Lines 1291–1395 → components/sidebar/Sidebar.tsx
Lines 1398–1593 → components/canvas/OperationalMap.tsx
Lines 1597–2015 → page component (layout compositor)
Phase 1: Persistence + Auth
Database Schema (Supabase Postgres)
users — id, email, name, plan, stripe_customer_id
teams — id, name, slug, owner_id, plan
team_members — team_id, user_id, role (owner/admin/member/viewer)
departments — id, owner_id, team_id, slug, source, generation_query, data (JSONB), version
conversations — id, department_id, user_id, agent_id, title, type
messages — id, conversation_id, role, content, metadata
analyses — id, department_id, user_id, type, title, data (JSONB)
usage — id, user_id, team_id, action, tokens_used, created_at
RLS policies enforce: owner_id = auth.uid() OR team_id IN (user's teams).

Tasks
Set up Supabase project, run migrations
Add Supabase Auth (login/signup pages, Next.js middleware)
Build department CRUD API routes
Wire GeneratePanel + DepartmentBuilder to save to DB
Load department list from DB in sidebar
Pre-built templates stay client-side; only user data persists
Phase 2: Conversation Persistence + Multi-Turn AI
Build conversation/message API routes
Modify AgentPrototypeModal to persist conversations to DB
Add conversation history sidebar (resume past chats)
Move system prompt construction server-side (security)
Add auth + usage tracking to /api/chat
Add department-level conversation list
Phase 3: Visualization Upgrades
Zoom/pan — useCanvas hook managing {x, y, scale} transform on SVG <g>. Mouse wheel zoom, drag pan, pinch-to-zoom. Optional: @use-gesture/react (7kb).
Drag-and-drop editing — Edit mode toggle; role nodes become draggable; positions persist to DB on mouseup.
Export — SVG (serialize DOM), PNG (draw SVG to <canvas>), PDF (jsPDF).
Auto-layout — Force-directed algorithm (~40 lines for 4-8 nodes). "Auto-arrange" button.
Canvas controls — Fit-to-view, zoom slider, export buttons.
Phase 4: Advanced AI Features
Comparative analysis — /api/departments/compare accepts 2-3 dept IDs, builds comparison prompt, returns structured insights. Side-by-side UI at /departments/compare.
AI recommendations — /api/departments/[id]/analyze with analysis types (efficiency, risk, AI-readiness, cost-reduction). Deeper than current computeAdvisors.
Department-level analysis chat — Ask questions about the whole department, not just individual agents.
Saved reports — Persist analysis results in analyses table.
Phase 5: Billing + Teams
Stripe Plan Tiers
Free	Pro ($29/mo)	Team ($79/mo)	Enterprise
Departments	3	20	Unlimited	Unlimited
AI generations/mo	5	50	200	Custom
Agent chats/mo	20	500	2,000	Unlimited
Comparisons	0	10	50	Unlimited
Team members	1	1	10	Custom
Export	SVG	SVG/PNG	SVG/PNG/PDF	All
Tasks
Stripe integration: customer creation, Checkout, webhooks
Billing settings page with usage meters
Enforce plan limits in API routes
Team CRUD + member invitations
Role-based permissions
Phase 6: Polish + Launch
Error boundaries throughout
Loading skeletons and optimistic UI
Landing/marketing pages
Onboarding flow for new users
Rate limiting on API routes
Analytics (PostHog or Vercel Analytics)
Integration tests for critical paths (auth, CRUD, AI generation)
Verification Plan
After each phase:

npm run build — must succeed with no errors
npm run dev — manual smoke test of all existing features
Phase 1+: verify auth flow (signup → login → dashboard → logout)
Phase 1+: verify department CRUD (create → view → reload page → still there)
Phase 2+: verify conversation persistence (chat → close → reopen → history intact)
Phase 3+: verify zoom/pan/export on both map views
Phase 5+: verify Stripe checkout flow in test mode
Critical Files to Modify
dept-os.jsx — decompose into 20+ files
app/api/chat/route.js → .ts — add auth, persistence, usage tracking
app/page.js — replace with dashboard routing
app/layout.js — wrap with auth provider
package.json — add supabase, drizzle, stripe, ai, typescript deps
