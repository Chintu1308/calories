# Developer Notes — Calories

Update this file after every stage. Never document unverified behavior as complete.

---

### Stage 0 — Audit Existing Workspace
**Status:** Verified  
**Commit:** `329f72b docs(setup): record project baseline`  
**Date:** 2026-10-23

#### What we built / audited
Inspected the workspace at `C:\Project Files\Typeface\Calories` and the handoff package at `C:\Users\bhhc1\Downloads\calories-antigravity-handoff`. Specifically verified:
1. Git repository state: Branch `master`, initial state before commits, no secrets or untracked sensitive files.
2. Runtime environment: Node.js `v22.16.0`, npm `10.9.2`.
3. Client directory structure: A React 19 + TypeScript + Vite project under `client/`.
4. Linting and TypeScript build status: oxlint runs cleanly (0 errors, 0 warnings); `tsc -b && vite build` completes successfully.
5. Brand tokens and styling: An initial `calories.tokens.json` and `calories.css` exist with brand palette (#152238 ink navy, #285B46 forest green, #BFD8C2 sage green, #FAF9F6 warm ivory, #FFFFFF white, #EDE5D8 soft sand, #6B7280 muted slate, #C88932 amber, #B84444 error red).

#### Why it exists
Before developing features in an existing codebase or inheriting a handoff, a disciplined software engineer must inspect and verify the existing workspace. This ensures:
- Pre-existing files and user progress are preserved rather than overwritten.
- System prerequisites (Node, npm, TypeScript, bundlers) are verified and documented.
- The build and lint pipeline is proven healthy before introducing changes, preventing false attribution of bugs.

#### Files audited
| File | Responsibility |
|---|---|
| `client/package.json` | Client dependencies (React 19.3.1, Vite 8.3.4, oxlint 1.88.0, TypeScript 6.0.3). |
| `client/vite.config.ts` | Vite configuration with `@vitejs/plugin-react`. |
| `client/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Project reference TypeScript config targeting ES2023 with bundler resolution. |
| `client/.oxlintrc.json` | Oxlint linter configuration. |
| `client/src/App.tsx`, `client/src/main.tsx` | Standard Vite + React starter template with counter demo. |
| `client/src/styles/calories.tokens.json` | Master design tokens for Calories palette, radii, spacing, typography. |
| `client/src/styles/calories.css` | CSS custom property mappings for design tokens. |
| `client/public/favicon.svg`, `client/public/icons.svg` | SVG icons and favicon assets. |

#### Code walkthrough
- `client/src/styles/calories.tokens.json`: Defines the design constants.
- `client/src/styles/calories.css`: Declares `:root` CSS variables (e.g. `--color-ink-navy: #152238; --color-forest-green: #285B46; --color-warm-ivory: #FAF9F6;`) and basic resets (`box-sizing: border-box`, standard system font stacks).
- `client/src/App.tsx`: Currently hosts the starter counter button and Vite documentation links. This will be replaced by the branded Calories app shell in subsequent stages.

#### Data flow
No live data flow exists yet. The client operates purely in-memory as a static single-page application.

#### Validation and security
- Verified that no `.env` files or hardcoded credentials exist in client code.
- Confirmed that build artifacts (`client/dist/`) and dependencies (`client/node_modules/`) are properly ignored by Git.

#### Tests and evidence
- Node version: `node -v` -> `v22.16.0`
- npm version: `npm -v` -> `10.9.2`
- Client lint: `cd client; npm run lint` -> `Found 0 warnings and 0 errors.`
- Client build: `cd client; npm run build` -> `✓ 21 modules transformed. built in 375ms`
- Git status: `git status` -> Branch `master`, untracked files identified and clean.

#### Known limitations
- Root workspace lacks orchestration scripts to build/test both client and server from the root directory.
- No backend server (`server/`) exists yet.
- No automated test suite exists yet.
- `client/tsconfig.app.json` does not explicitly enable `"strict": true`.

#### Interview explanation
> "When starting on the Calories project, the first step was a Stage 0 workspace audit. Rather than blindly running commands or overwriting files, I audited the Git tree, validated Node v22 and npm 10, inspected the existing React 19/Vite setup in `client/`, verified the initial design tokens in `calories.tokens.json`, and ran both Oxlint and the TypeScript build to establish a green baseline. This prevented accidental regressions and established clean boundary lines for Stage 1 scaffolding."

#### Likely interview questions
1. **Why is it important to audit an existing workspace before writing new features?**  
   *Answer:* Auditing prevents regressions, avoids overwriting prior work, verifies runtime versions (Node/npm), ensures build tools are already green, and identifies missing security configurations (such as missing `.gitignore` rules) before sensitive files are committed.
2. **What role do `package-lock.json` and strict engine versions play across different machines?**  
   *Answer:* `package-lock.json` locks the exact dependency tree resolved during install, ensuring reproducible builds across developer machines and CI/CD pipelines. Documenting Node/npm versions prevents subtle runtime incompatibilities (e.g. ESM loader differences or API deprecations).
3. **Why are design tokens stored in JSON and CSS variables rather than hardcoded in components?**  
   *Answer:* Centralizing tokens provides a single source of truth for colors, spacing, and typography. If brand guidelines evolve or dark mode is introduced, values are updated in one place without touching hundreds of individual component files.

#### Practice modification
Open `client/src/styles/calories.tokens.json`, inspect the color hex codes against the master plan specification in `docs/CALORIES_ANTIGRAVITY_BUILD_PLAN.md`, and verify that the color tokens match the specified palette.

---

### Stage 1 — Scaffold and Docs
**Status:** Verified  
**Commit:** `f59bb92 chore(setup): scaffold client and server`  
**Date:** 2026-10-23

#### What we built
1. Root Workspace Orchestration: Created root `package.json` with unified multi-project scripts (`npm run dev:client`, `npm run dev:server`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`).
2. Server Tier Scaffolding: Initialized Node.js + Express + TypeScript modular monolith under `server/` with:
   - Strict TypeScript configuration (`target: ES2022`, `module: NodeNext`, `strict: true`, `noImplicitAny: true`, `rootDir: ./src`, `outDir: ./dist`).
   - Express 4 application (`server/src/app.ts`) with JSON body parsing (`limit: 1mb`), configurable CORS middleware, standard `/api/v1/health` endpoint, 404 handler, and centralized error handler.
   - Server entry point (`server/src/server.ts`) with dotenv loading, port configuration, and graceful shutdown handling (`SIGINT`, `SIGTERM`).
   - Automated server integration test (`server/src/app.test.ts`) using Node 22 native test runner (`node:test`) and strict assertions (`node:assert/strict`) over ephemeral ports.
3. Client Type Safety Hardening: Updated `client/tsconfig.app.json` with explicit `"strict": true`.
4. Environment Variable Templates: Created root `.env.example` and `server/.env.example` documenting all configuration keys (`PORT`, `CLIENT_ORIGIN`, `MONGODB_URI`, `JWT_SECRET`, `AI_SERVICE_URL`, `GEMINI_API_KEY`) without committing secrets.
5. Complete Architecture & Specifications Documentation:
   - `docs/ARCHITECTURE.md`: Monolith structure, AI microservice boundary, tenant isolation, and data flow diagram.
   - `docs/API.md`: Comprehensive REST API specification for all `/api/v1` routes with request/response payloads.
   - `docs/DATA_MODEL.md`: Full schema definitions for User, Goal, Meal, and Aggregations with index strategies.
   - `docs/TESTING.md`: Test pyramid, execution commands, and verification criteria.
   - `docs/DEPLOYMENT.md`: Hosting targets (Vercel, Render, MongoDB Atlas), domain setup, and security constraints.
   - `README.md`: Master project guide meeting all criteria from Section 10 of the master plan.
   - `docs/DECISIONS.md`: Recorded Decision D-006 (root orchestration with clean package isolation).

#### Why it exists
A scalable full-stack application requires a predictable developer experience and strict architectural contracts before business logic is introduced.
- Strict TypeScript catches type mismatches, null pointer exceptions, and unhandled edge cases at compile time.
- Centralized root scripts enable a single command to test, lint, and build the entire codebase.
- Decoupling package dependencies between `client/` and `server/` avoids version collisions between browser and Node environments.
- Architectural specifications align the code structure directly with interview evaluation standards.

#### Files changed
| File | Responsibility |
|---|---|
| `package.json` | Root orchestration scripts for dev, build, lint, typecheck, and test. |
| `.env.example` | Root template for all environment variables. |
| `server/.env.example` | Server-specific environment variable template. |
| `server/package.json` | Backend dependencies (`express`, `cors`, `dotenv`) and dev tools (`tsx`, `typescript`, `oxlint`). |
| `server/tsconfig.json` | Strict NodeNext TypeScript configuration for server code. |
| `server/src/app.ts` | Express application instance, CORS, body parser, health endpoint, 404 handler, error middleware. |
| `server/src/server.ts` | Server process entry point with environment loading and graceful shutdown. |
| `server/src/app.test.ts` | Automated integration tests for `/api/v1/health` and 404 handling via Node's native test runner. |
| `client/tsconfig.app.json` | Client TypeScript compiler options updated with explicit `"strict": true`. |
| `docs/ARCHITECTURE.md` | System topology, component diagram, microservice boundaries, security model. |
| `docs/API.md` | Complete REST API contract for all endpoints. |
| `docs/DATA_MODEL.md` | MongoDB schemas, validation boundaries, explicit units, compound indexes. |
| `docs/TESTING.md` | Verification strategy, execution commands, and test documentation. |
| `docs/DEPLOYMENT.md` | Target deployment specifications for Vercel, Render, MongoDB Atlas, and DNS. |
| `docs/DECISIONS.md` | Added architectural decision D-006. |
| `docs/PROGRESS.md` | Progress tracking updated for Stages 0 and 1. |
| `README.md` | Production-grade project documentation. |

#### Code walkthrough

##### 1. `server/src/app.ts`
- **Imports:** `express`, types `{ Request, Response, NextFunction }`, and `cors`.
- **Parsing Middleware:** `app.use(express.json({ limit: '1mb' }))` parses JSON request bodies up to 1MB, guarding against denial-of-service memory exhaustion.
- **CORS Configuration:** Reads `CLIENT_ORIGIN` (defaulting to `http://localhost:5173`). An origin validator callback allows requests matching the allowlist or requests with no origin (such as server-to-server or curl calls).
- **Health Check Endpoint:** `GET /api/v1/health` returns HTTP 200 with `{ status: 'ok', service: 'calories-server', version: '0.1.0', timestamp: new Date().toISOString() }`.
- **404 Handler:** Catches unmatched routes and returns standard JSON `{ error: { code: 'NOT_FOUND', message: '...' } }`.
- **Central Error Handler:** 4-parameter Express middleware `(err, req, res, next)`. Formats uncaught exceptions into `{ error: { code: 'INTERNAL_SERVER_ERROR', message: ... } }` and responds with HTTP 500.

##### 2. `server/src/server.ts`
- **Imports:** `dotenv` and the exported `app` from `./app.js`.
- **Configuration:** Calls `dotenv.config()` to populate `process.env`.
- **Binding:** `app.listen(PORT, ...)` starts listening on the configured port.
- **Graceful Shutdown:** Subscribes to `process.on('SIGINT')` and `process.on('SIGTERM')`. When triggered, it stops accepting new connections and safely finishes inflight requests before exiting.

##### 3. `server/src/app.test.ts`
- **Native Test Runner:** Uses `node:test` and `node:assert/strict` via `tsx --test`.
- **Ephemeral Port Binding:** Calls `app.listen(0)` inside each test. Port `0` instructs the operating system kernel to allocate an available high-numbered port dynamically.
- **HTTP Verification:** Uses native `fetch` to request `/api/v1/health` and verifies status 200, string properties, and ISO 8601 date parsing.
- **Teardown:** `server.close()` is executed in a `finally` block to guarantee socket cleanup regardless of test outcome.

#### Data flow
1. Test or Client sends an HTTP GET request to `http://127.0.0.1:<PORT>/api/v1/health`.
2. Request passes through CORS middleware. Origin is evaluated against `allowedOrigins`.
3. Request matches `GET /api/v1/health` route handler.
4. Handler constructs JSON payload with current ISO 8601 timestamp.
5. Response is serialized with HTTP 200 status code and `Content-Type: application/json`.
6. Client receives and deserializes the response.

#### Validation and security
- **Body limits:** Limited to 1MB to prevent memory exhaustion attacks.
- **CORS allowlist:** Restricts browser-based cross-origin calls to authorized frontends.
- **Strict TypeScript:** Enforces null checks, eliminates `any` leaks, and ensures type compliance across all routes.
- **Safe error messages:** Error handler avoids leaking database connection strings or internals to clients.
- **Ephemeral ports in tests:** Prevents port collision and eliminates test order dependencies.

#### Tests and evidence
1. **Server Unit & Integration Tests:**
   ```
   > tsx --test src/**/*.test.ts
   # Subtest: GET /api/v1/health returns 200 OK with expected JSON structure
   ok 1 - GET /api/v1/health returns 200 OK with expected JSON structure
   # Subtest: GET /unknown-route returns 404 with standard error payload
   ok 2 - GET /unknown-route returns 404 with standard error payload
   # tests 2, suites 0, pass 2, fail 0
   ```
2. **Server Linting:**
   ```
   > oxlint src
   Found 0 warnings and 0 errors. Finished in 62ms on 3 files with 96 rules.
   ```
3. **Server TypeScript Compilation:**
   ```
   > tsc --noEmit && tsc
   Clean exit with 0 errors. Compiled JavaScript emitted to server/dist/.
   ```
4. **Client Production Build & Strict Typecheck:**
   ```
   > npm run build:client
   ✓ 21 modules transformed. built in 273ms.
   ```
5. **Root Orchestration Script Verification:**
   - `npm run lint` -> 0 errors across client and server.
   - `npm run typecheck` -> Clean compilation across client and server.
   - `npm test` -> 2 tests passed, 0 failed.

#### Known limitations
- Database connection to MongoDB Atlas is not yet wired (scheduled for Stage 4).
- Domain routes (`/api/v1/goals`, `/api/v1/meals`, `/api/v1/reports`, `/api/v1/auth`) are documented and stubbed but not yet implemented (scheduled for Stages 5–9).
- AI extraction service process is not yet initiated (scheduled for Stage 10).

#### Interview explanation
> "For Stage 1, I set up the architectural foundation for the Calories platform. Rather than mixing backend and frontend dependencies into a single brittle root, I established clean package boundaries for `client/` and `server/` orchestrated via root npm scripts. I built the Express modular monolith with strict TypeScript, configured CORS and JSON body limits, created a standard `/api/v1/health` endpoint, and verified it with integration tests using Node's native test runner on ephemeral ports. I also authored the complete system architecture, data models, and API specifications to ensure strict contract adherence."

#### Likely interview questions
1. **Why bind to port 0 during integration testing instead of port 5000?**  
   *Answer:* Binding to port `0` instructs the operating system kernel to allocate an unused ephemeral port. This prevents port collisions when tests run in parallel, in CI/CD environments, or when a local dev server is already running on port 5000.
2. **Why separate `client/package.json` and `server/package.json` instead of hoisting everything into one root?**  
   *Answer:* The client runs in a browser DOM environment (React, Vite, browser globals), whereas the server runs in Node.js (Express, Node globals, Buffers). Isolating their packages prevents TypeScript global type collisions, keeps deployment bundles small and decoupled, and simplifies Docker container builds.
3. **What is graceful shutdown and why is it important in production?**  
   *Answer:* When a hosting platform like Render or Kubernetes redeploys or restarts a container, it sends `SIGTERM` or `SIGINT`. Graceful shutdown intercepts these signals, stops accepting new incoming HTTP connections, and allows in-flight database writes and requests to complete before exiting. This prevents truncated database writes and user 502 errors.
4. **Why is a health-check endpoint (`/api/v1/health`) essential in cloud deployments?**  
   *Answer:* Cloud load balancers (Render, AWS ALB, Kubernetes) periodically query health check endpoints to assess service readiness. If the service fails to respond or crashes, the load balancer reroutes traffic away from the unhealthy instance and triggers a container restart.

#### Practice modification
In `server/src/app.ts`, add an `uptimeSeconds: Math.floor(process.uptime())` property to the `/api/v1/health` response JSON payload, update `server/src/app.test.ts` to assert that `uptimeSeconds` is a non-negative number, and run `npm test` to verify the assertion passes.
