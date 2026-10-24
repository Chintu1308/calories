# Calories Architecture Decisions

Record date, options, rationale, trade-offs and reconsideration trigger for each decision.

## D-001 — Modular monolith for core API
**Proposed decision:** Keep goals, meals, reports and auth in one Express backend; AI extraction is a separate service boundary.  
**Rationale:** Deadline, simpler deployment/debugging, clear modules.  
**Trade-off:** Core modules do not scale independently.

## D-002 — MongoDB Atlas as primary database
**Proposed decision:** Use one MongoDB database for meals, goals and related records.  
**Rationale:** Flexible optional nutrition data.  
**Trade-off:** Reports and relationships require careful schema/index design and aggregation tests.

## D-003 — AI proposes; backend validates; user confirms
AI returns structured suggestions only. Main API validates; the user confirms before a meal is saved.

## D-004 — UTC timestamps
Store timestamps in UTC and convert for display/filtering using the user's timezone.

## D-005 — Brand
Calories; “Your nutrition, made clearer.” Premium Editorial Health-Tech. Initial palette: #152238, #285B46, #BFD8C2, #FAF9F6, #FFFFFF, #EDE5D8, #6B7280, #C88932, #B84444. Verify accessibility and use original logo assets.

## D-006 — Root Orchestration with Clean Package Isolation
**Date:** 2026-10-23  
**Decision:** Maintain distinct package boundaries for `client/` and `server/`, orchestrated via root workspace npm scripts (`npm run build`, `npm run lint`, `npm run typecheck`, `npm test`) using `--prefix`.  
**Rationale:** Prevents runtime dependency collisions (such as DOM types interfering with Node.js backend types), eliminates hoist conflicts with Vite 8 / Oxlint / TypeScript, and keeps each tier independently buildable and deployable (Vercel for client, Render for server).  
**Trade-off:** Dependencies must be installed in their respective directories (`client/` and `server/`).

## D-007 — Context-Grounded AI Nutrition Chat Assistant Architecture
**Date:** 2026-10-25  
**Decision:** Implement the bonus AI chat assistant via a dedicated endpoint (`POST /api/v1/ai/chat`) that injects real-time authenticated server-side state (daily targets, today's consumed nutrients, active dietary restrictions, and clinical PDF rules from MongoDB) into Gemini Generative AI, accompanied by a resilient contextual rule fallback.  
**Rationale:** Client devices should not carry or compose raw database queries or API secrets. By assembling the context snapshot server-side and enforcing tenant isolation, the AI assistant delivers accurate, personalized dietary advice that adheres strictly to user allergens and targets without hallucinating user context or leaking cross-tenant data. If the external AI API is rate-limited, the local fallback engine guarantees uninterrupted user utility.  
**Trade-off:** Multi-turn chat requires sending recent turns in the request payload, which slightly increases network payload size.

