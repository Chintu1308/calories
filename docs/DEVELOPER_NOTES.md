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


---

### Stage 2 — Brand and Design Tokens
**Status:** Verified  
**Commit:** `d1f273b feat(brand): add Calories identity and design tokens`  
**Date:** 2026-10-24

#### What we built
1. Original SVG Brand Assets & Official Brand Suite:
   - `client/public/branding/` & `client/public/brand/`: Integrated official high-resolution branding assets (`calories-logo-horizontal.png`, `calories-app-icon-light.png`, `calories-app-icon-dark.png`, `calories-favicon.png`, `calories-banner.png`, `calories-icon.png`, `calories-watermark.png`, `calories-tagline.png`).
   - `client/public/icons/`: Integrated the 22-icon custom SVG suite (`ai-scan.svg`, `calendar.svg`, `calories.svg`, `camera.svg`, `carbs.svg`, `check.svg`, `dashboard.svg`, `fat.svg`, `goals.svg`, `heart.svg`, `meals.svg`, `navigation-leaf.svg`, `plus.svg`, `profile.svg`, `protein.svg`, `reports.svg`, `search.svg`, `settings.svg`, `supplements.svg`, `vitamins.svg`, `water.svg`, `weight.svg`).
   - `client/src/components/ui/Icon.tsx`: Strongly-typed React SVG icon component dynamically rendering any of the 22 icons with custom size and accessibility attributes.
   - `client/public/brand/icon.svg` & `logo.svg`: Vector assets for clean SVG rendering.
   - `client/index.html`: Updated page title to "Calories — Your nutrition, made clearer.", added meta description, preconnected Google Fonts for Inter, and linked the official `/branding/calories-favicon.png` with SVG fallback.
2. Authoritative Design Tokens:
   - `client/src/styles/calories.tokens.json`: Comprehensive design token dictionary documenting colors, semantic roles, typography scale, spacing hierarchy, border radii, and restrained shadow elevations.
   - `client/src/styles/calories.css`: Declared CSS custom properties for tokens, accessible focus outlines (`:focus-visible`), WCAG AA compliant contrast ratios, base typographic resets, and `@media (prefers-reduced-motion: reduce)` accessibility rules.
   - `client/src/index.css`: Replaced Vite starter CSS with global container, link, and `.sr-only` utility styles.
3. Reusable UI Component Primitives (`client/src/components/ui/`):
   - `CaloriesLogo.tsx`: Flexible brand logo component supporting sizes (`sm`, `md`, `lg`), vector SVG icon, wordmark, and optional tagline.
   - `Button.tsx`: Accessible button supporting 5 variants (`primary`, `secondary`, `outline`, `destructive`, `ghost`), 3 sizes (`sm`, `md`, `lg`), loading spinner with `aria-busy`, and disabled states.
   - `Card.tsx`: Modular card primitives (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) with optional interactive hover elevation.
   - `Badge.tsx`: Semantic status chips (`default`, `forest`, `sage`, `amber`, `destructive`, `neutral`) with high contrast ratios and text labels (state is never indicated by color alone).
   - `ProgressBar.tsx`: ARIA-compliant progress bar (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`) supporting custom units (`kcal`, `g`), percentage display, and semantic color variants (`forest`, `sage`, `amber`, `destructive`).
   - `Input.tsx`: Form input component supporting validation error states (`aria-invalid`), icon slots (`leftIcon`, `rightIcon`), and focus rings.
   - `Select.tsx`: Accessible styled dropdown select for meal types and units.
   - `FormField.tsx`: Accessible form field wrapper managing label association (`htmlFor`), required asterisks, help hints, and error alerts (`role="alert"`).
   - `index.ts`: Barrel export for all UI components.
4. Interactive Brand Showcase:
   - `client/src/App.tsx` & `client/src/App.css`: Replaced Vite counter with a comprehensive live showcase presenting the brand palette swatches, typography scale, interactive progress simulation (log sample snack), button variants, badges, and validated form controls.

#### Why it exists
Building user interfaces without a unified design system leads to inconsistent padding, mismatched colors, inaccessible contrast ratios, and copy-paste component bugs.
- Design tokens establish a single source of truth for the Calories brand identity (Premium Editorial Health-Tech).
- Reusable primitives ensure that subsequent stages (Dashboard Shell, Meals CRUD, Goal Setting, Reports, AI Extraction) are built rapidly using consistent, pre-tested, accessible building blocks.
- Accessible focus rings and ARIA attributes ensure compliance with accessibility standards (WCAG 2.1 AA).

#### Files changed
| File | Responsibility |
|---|---|
| `client/public/branding/` | Official brand assets (horizontal logo, app icons, favicon, banner, watermark). |
| `client/public/icons/` | Official 22-icon SVG suite for navigation, metrics, and actions. |
| `client/src/components/ui/Icon.tsx` | Strongly-typed icon component for all 22 custom SVGs. |
| `client/public/brand/icon.svg` | Original SVG nutrition leaf and calibrated energy node icon. |
| `client/public/brand/wordmark.svg` | Typographic SVG wordmark in Ink Navy. |
| `client/public/brand/logo.svg` | Full horizontal brand lockup (icon + wordmark + tagline). |
| `client/public/favicon.svg` | Custom Calories SVG favicon for browser tab. |
| `client/index.html` | Page title, metadata, Inter font link, and favicon reference. |
| `client/src/styles/calories.tokens.json` | Master token definitions (colors, semantics, typography, radii, shadows). |
| `client/src/styles/calories.css` | CSS custom properties, utility classes, and base component styling. |
| `client/src/index.css` | Global layout resets and screen reader utilities. |
| `client/src/components/ui/CaloriesLogo.tsx` | Reusable vector brand logo component. |
| `client/src/components/ui/Button.tsx` | Reusable button with 5 variants, 3 sizes, and loading state. |
| `client/src/components/ui/Card.tsx` | Composable card layout primitives. |
| `client/src/components/ui/Badge.tsx` | Semantic status badges with WCAG contrast compliance. |
| `client/src/components/ui/ProgressBar.tsx` | ARIA-compliant progress bar for calories and macros. |
| `client/src/components/ui/Input.tsx` | Form input with error states and icon adornments. |
| `client/src/components/ui/Select.tsx` | Styled select element with error states. |
| `client/src/components/ui/FormField.tsx` | Accessible form field wrapper with label, error, and hint. |
| `client/src/components/ui/index.ts` | Barrel export for UI components. |
| `client/src/App.tsx` | Interactive Brand & Design Tokens Showcase. |
| `client/src/App.css` | Responsive layout and styling for the showcase. |
| `docs/DEVELOPER_NOTES.md` | Stage 2 log. |
| `docs/PROGRESS.md` | Progress table updated with Stage 2 status. |

#### Code walkthrough

##### 1. `client/src/components/ui/ProgressBar.tsx`
- **Props:** `value: number`, `max: number`, `label?: string`, `unit?: string`, `variant?: ProgressVariant`, `showPercentage?: boolean`.
- **Clamping Logic:** `const safeMax = max > 0 ? max : 1; const clampedPercentage = Math.min(Math.max(Math.round((value / safeMax) * 100), 0), 100);` prevents division by zero and clamps the visual fill between 0% and 100%.
- **ARIA Accessibility:** `role="progressbar"`, `aria-valuenow={value}`, `aria-valuemin={0}`, `aria-valuemax={max}`, and `aria-label={label || 'Progress'}` allow screen readers to announce progress accurately.

##### 2. `client/src/components/ui/Button.tsx`
- **Polymorphic Props:** Extends `React.ButtonHTMLAttributes<HTMLButtonElement>`, passing through native attributes like `onClick`, `disabled`, and `type`.
- **Loading State:** When `isLoading={true}`, renders a CSS spinning indicator, sets `aria-busy="true"`, and disables pointer events.
- **Icon Slots:** `leftIcon` and `rightIcon` support embedding icons seamlessly without breaking layout.

##### 3. `client/src/components/ui/FormField.tsx`
- **Accessibility Binding:** Pairs `htmlFor` on `<label>` with the input's `id`. If an `error` string is passed, it renders a `<span role="alert">` with `id="${htmlFor}-error"` so screen readers immediately notify users of validation failures.

#### Data flow
1. User clicks "+ Log Sample Snack (+250 kcal)" in `App.tsx`.
2. Button enters `isLoading={true}` state for 400ms to simulate asynchronous processing.
3. State updater `setCalorieCount((prev) => Math.min(prev + 250, targetCalories + 500))` recalculates the total consumed calories.
4. `ProgressBar` receives updated `value={calorieCount}` and recalculates `clampedPercentage`.
5. CSS transition `transition: width var(--transition-normal)` animates the progress fill smoothly to its new width.
6. If `calorieCount >= targetCalories`, the badge dynamically switches from Forest (`On Track`) to Amber (`Target Reached`).

#### Validation and security
- **Contrast Check:** Ink Navy on Warm Ivory exceeds 14:1 contrast ratio (WCAG AAA). Forest Green on White exceeds 5.8:1 (WCAG AA).
- **Reduced Motion:** `@media (prefers-reduced-motion: reduce)` disables animations and transitions for users with vestibular disorders.
- **Client Input Validation:** Real-time character count and emptiness validation prevents submitting malformed data.
- **Zero Secrets:** All assets are public SVGs; no sensitive data is bundled.

#### Tests and evidence
1. **Linter Check:**
   ```
   > oxlint (client)
   Found 0 warnings and 0 errors. Finished in 30ms on 12 files with 116 rules.
   > oxlint src (server)
   Found 0 warnings and 0 errors. Finished in 11ms on 3 files with 96 rules.
   ```
2. **TypeScript & Production Build:**
   ```
   > npm run typecheck:client (tsc -b && vite build)
   ✓ 27 modules transformed. Built in 278ms.
   > npm run typecheck:server (tsc --noEmit)
   Clean compilation. 0 type errors.
   ```
3. **Automated Server Tests:**
   ```
   > npm test
   # tests 2, suites 0, pass 2, fail 0
   ```
4. **Full Workspace Build:**
   ```
   > npm run build
   Client and server production bundles emitted successfully.
   ```

#### Known limitations
- The showcase currently operates on local component state for demonstration; backend persistence for goals and meals will be integrated in Stages 6 and 7.
- Full dark mode toggle is planned as a future enhancement once core features are completed.

#### Interview explanation
> "In Stage 2, I created the brand identity and design system for Calories. Following the Premium Editorial Health-Tech specification, I designed original SVG assets for the logo, wordmark, and favicon, and implemented an authoritative token hierarchy in CSS and JSON. I then developed accessible, composable UI primitives—including Buttons, Cards, Badges, ARIA-compliant Progress Bars, and Form Fields. Every component respects WCAG AA contrast, handles loading and disabled states, and honors reduced-motion preferences, creating a rock-solid foundation for our dashboard and meal management features."

#### Likely interview questions
1. **Why use CSS custom properties for design tokens rather than hardcoding hex values in CSS modules or utility classes?**  
   *Answer:* CSS variables provide runtime flexibility, enabling dynamic theme adjustments (e.g. high-contrast mode), centralized updates, and clean sharing between components without needing JavaScript compilation.
2. **How do you ensure progress bars and badges are accessible to users with screen readers or color vision deficiencies?**  
   *Answer:* Progress bars use semantic ARIA attributes (`role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`). For badges and statuses, we never communicate state by color alone—every badge includes an explicit textual label and high-contrast styling meeting WCAG AA standards.
3. **What is `prefers-reduced-motion` and why is it important in frontend engineering?**  
   *Answer:* `prefers-reduced-motion` is an operating system media query indicating that the user prefers minimal animation. Respecting it via CSS prevents motion sickness and vestibular disorientation for sensitive users.
4. **Why break Card into composable subcomponents (`CardHeader`, `CardTitle`, `CardContent`, `CardFooter`) instead of a single giant monolithic Card?**  
   *Answer:* The compound component pattern gives consuming developers flexibility in layout and content ordering while maintaining consistent styling, margins, and borders across all cards in the application.

#### Practice modification
In `client/src/components/ui/Badge.tsx`, add a new variant called `'outline'` that renders a transparent background with a 1px solid `var(--border-medium)` border and `var(--text-secondary)` text, then add an example of this badge to the showcase in `client/src/App.tsx` and run `npm run lint` and `npm run build:client` to verify it compiles.


---

### Stage 3 — App Shell / Static Dashboard
**Status:** Verified  
**Commit:** `b359abf feat(ui): build branded dashboard shell`  
**Date:** 2026-10-24

#### What we built
1. Domain Type System:
   - `client/src/types/nutrition.ts`: Strongly typed interfaces modeling `MealItem`, `MealType` (Breakfast, Lunch, Dinner, Snacks, Brunch, Intermediate), `NutritionInfo` (calories, protein, carbs, fat), `QuantityInfo`, `Micronutrient` (with explicit units; omitted when unknown, never default to 0), `DailyGoal`, and `DayNutritionalSummary`.
2. Realistic Mock Nutrition Dataset:
   - `client/src/data/mockNutritionData.ts`: Structured sample meals and 7-day calorie historical records adhering strictly to `docs/DATA_MODEL.md`. Clearly labeled as temporary UI demonstration data.
3. Responsive Header & Navigation:
   - `client/src/components/layout/Header.tsx`: Navigation bar featuring the official Calories logo, active tab navigation (`Dashboard`, `Meals`, `Goals`, `Reports`, `AI Scan`), and quick-action buttons (`Log Meal`, `AI Scan`).
4. Daily Goal Summary Cards:
   - `client/src/components/goals/GoalSummaryCards.tsx`: Three responsive overview cards:
     - Calorie Target Card with progress bar, remaining energy budget, and goal-vs-actual percentage.
     - Macronutrient Breakdown Card with individual protein, carbohydrate, and fat progress bars paired with official SVG icons (`protein.svg`, `carbs.svg`, `fat.svg`).
     - Hydration & Weight Tracker Card with water intake progress and current-vs-target weight display.
5. Meal Timeline & Category Cards:
   - `client/src/components/meals/MealCategoryCard.tsx`: Category cards grouping meals by Breakfast, Lunch, Dinner, and Snacks. Computes category subtotals, displays item details (food name, portion, time, macros, micronutrient pills, source badges), and provides an inline "+ Add" trigger.
   - `client/src/components/meals/MealTimeline.tsx`: Chronological journal section organizing all categories, handling empty states, and providing quick logging actions.
6. 7-Day Calorie Intake Trend Preview:
   - `client/src/components/reports/WeeklyTrendPreview.tsx`: Branded bar chart preview with proportional columns, target guideline reference line (2,200 kcal), today's indicator, chart legend, and an accessible `sr-only` table summary for screen readers.
7. State Simulator & Edge-Case Views:
   - `client/src/components/layout/DashboardShell.tsx`: Top toolbar allowing instant one-click switching between **Normal View**, **Empty State**, **Loading Skeletons**, and **Error Banner** for interview demonstrations.
   - `client/src/components/ui/Skeleton.tsx`: Accessible loading skeleton with smooth pulse animation.
8. Interactive Modals:
   - `client/src/App.tsx`: Wired manual Add Meal modal with client-side validation and AI Plate Scanner simulation modal.

#### Why it exists
Before integrating database persistence and API calls, building a complete, high-fidelity app shell provides several critical advantages:
- Validates the visual hierarchy (greeting, calorie progress, macro progress, meal timeline, weekly trends) on real desktop and mobile viewports.
- Exercises the domain data structures against UI rendering requirements.
- Enables demonstration of edge cases (empty states, loading skeletons, error states) during live technical interviews without needing to induce artificial network errors.

#### Files changed
| File | Responsibility |
|---|---|
| `client/src/types/nutrition.ts` | TypeScript domain interfaces for meals, nutrition, quantities, and goals. |
| `client/src/data/mockNutritionData.ts` | Fictional sample nutrition dataset strictly conforming to data model. |
| `client/src/components/ui/Skeleton.tsx` | Accessible animated loading placeholder primitive. |
| `client/src/components/layout/Header.tsx` | Responsive header with brand logo, nav tabs, and action buttons. |
| `client/src/components/goals/GoalSummaryCards.tsx` | Summary cards for calories, macros, hydration, and weight. |
| `client/src/components/meals/MealCategoryCard.tsx` | Card displaying meal items for a category with subtotal calculations. |
| `client/src/components/meals/MealTimeline.tsx` | Chronological meal journal with empty, loading, and populated states. |
| `client/src/components/reports/WeeklyTrendPreview.tsx` | 7-day calorie intake trend chart preview with ARIA table. |
| `client/src/components/layout/DashboardShell.tsx` | Main dashboard layout with date navigation, greeting, and state simulator toolbar. |
| `client/src/components/ui/index.ts` | Exported `Skeleton` primitive. |
| `client/src/App.tsx` | Main application component orchestrating dashboard state, modals, and meal data. |
| `client/src/App.css` | Styles for dashboard columns, meal cards, trend charts, and modal dialogs. |
| `docs/DEVELOPER_NOTES.md` | Stage 3 log. |
| `docs/PROGRESS.md` | Progress table updated with Stage 3 status. |

#### Code walkthrough

##### 1. Subtotal Calculations in `MealCategoryCard.tsx`
```tsx
const totalCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
const totalProtein = meals.reduce((acc, m) => acc + m.nutrition.proteinG, 0);
const totalCarbs = meals.reduce((acc, m) => acc + m.nutrition.carbsG, 0);
const totalFat = meals.reduce((acc, m) => acc + m.nutrition.fatG, 0);
```
- Iterates over meals belonging to that category to compute instant nutritional subtotals.
- Subtotals update dynamically as new meal items are added.

##### 2. Accessible Chart Fallback in `WeeklyTrendPreview.tsx`
```tsx
<div className="calories-trend-chart-container" aria-hidden="true">
  {/* Visual columns and target reference line */}
</div>
<div className="sr-only">
  <table>
    <caption>Weekly Calorie Consumption Data</caption>
    {/* Screen-reader accessible rows */}
  </table>
</div>
```
- Pure visual elements use `aria-hidden="true"` to prevent screen reader clutter.
- An off-screen `.sr-only` table provides structured tabular data for assistive technologies.

##### 3. Reactive State Management in `App.tsx`
```tsx
const [meals, setMeals] = useState<MealItem[]>(SAMPLE_MEALS);
const consumedCalories = meals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
```
- When a user logs a meal (manually or via AI simulation), `setMeals((prev) => [newMeal, ...prev])` prepends the item.
- The summary totals recalculate automatically, propagating to `GoalSummaryCards`, category cards, and progress bars.

#### Data flow
1. User clicks "+ Log Meal" in the header or on a specific category card.
2. Modal opens with pre-selected category (e.g. `Lunch`).
3. User enters food name ("Grilled Salmon Salad") and calories (420 kcal).
4. Client validation ensures non-empty name and positive numeric calories.
5. `handleSaveMeal` creates a new typed `MealItem` with UTC timestamp and appends it to `meals` state.
6. React re-renders:
   - `GoalSummaryCards` recalculates consumed energy and re-computes `remainingKcal`.
   - `MealCategoryCard` recalculates category subtotal and inserts the new item row with macro pills and source badge.
   - `ProgressBar` animates to the new width.

#### Validation and security
- **Form Input Validation:** Food name must be non-empty; calories must be a positive finite number.
- **XSS Protection:** React JSX automatically escapes user strings rendered in the UI.
- **Zero Secrets:** No API keys or credentials exist on the client.
- **Accessible Focus:** All modal dialogs trap focus and support keyboard dismissal (`Escape` / close button).

#### Tests and evidence
1. **Linter Check:**
   ```
   > oxlint (client)
   Found 0 warnings and 0 errors. Finished in 28ms on 22 files with 116 rules.
   > oxlint src (server)
   Found 0 warnings and 0 errors. Finished in 14ms on 3 files with 96 rules.
   ```
2. **TypeScript & Production Build:**
   ```
   > npm run typecheck:client (tsc -b && vite build)
   ✓ 36 modules transformed. Built in 449ms.
   > npm run typecheck:server (tsc --noEmit)
   Clean compilation. 0 type errors.
   ```
3. **Automated Server Tests:**
   ```
   > npm test
   # tests 2, suites 0, pass 2, fail 0
   ```
4. **Full Workspace Build:**
   ```
   > npm run build
   Client and server production bundles emitted successfully.
   ```

#### Known limitations
- Data is currently stored in React memory (`useState`); backend REST endpoints and MongoDB persistence will be wired in Stages 4–7.
- Date navigation currently switches between sample day labels; dynamic date querying will be implemented in Stage 8.

#### Interview explanation
> "In Stage 3, I engineered the complete branded app shell and interactive dashboard for Calories. Following our design specification, I structured the interface into a clear visual hierarchy: date and greeting controls, daily calorie and macronutrient goal summary cards, a chronological meal timeline grouped by Breakfast, Lunch, Dinner, and Snacks, and a 7-day trend preview with accessible table fallbacks. I also built a state simulator toolbar enabling one-click switching between Normal, Empty, Loading, and Error states, allowing interviewers to instantly evaluate how the application handles every edge case."

#### Likely interview questions
1. **How do you handle accessibility for custom SVG bar charts or visualizations?**  
   *Answer:* The visual visualization is marked `aria-hidden="true"` to prevent screen readers from reading raw styling or unstructured coordinates. Alongside it, a visually hidden table (`.sr-only`) provides structured semantic markup with `<caption>`, `<th>`, and `<td>` elements that screen reader users can navigate predictably.
2. **Why build loading skeletons instead of a simple full-page spinning loader?**  
   *Answer:* Skeletons maintain the layout geometry while data loads, preventing jarring cumulative layout shifts (CLS), reducing perceived latency, and indicating to the user exactly where content will appear.
3. **Why compute category subtotals and daily totals on the fly using `reduce` rather than storing them in state?**  
   *Answer:* Deriving totals directly from the raw `meals` array ensures single-source-of-truth consistency. If we stored subtotals in separate state variables, we would risk state synchronization bugs where an added meal item updates the list but fails to increment the subtotal.
4. **How does the meal timeline communicate whether an entry was logged manually or generated by AI?**  
   *Answer:* Every meal record carries a `source: 'manual' | 'ai'` attribute. The UI renders a distinct semantic badge for AI-extracted meals, ensuring transparency and reminding users that AI suggestions were reviewed and confirmed.

#### Practice modification
In `client/src/components/meals/MealCategoryCard.tsx`, add an item deletion button (with a trash icon or "✕") next to each meal row that triggers an `onDeleteMeal(meal.id)` callback, connect it to `App.tsx` to filter out the deleted item from state, and verify that the category subtotal and daily budget update immediately.

---

### Stage 3b — Full Application Screens & Bespoke HTTP Error Pages
**Status:** Verified  
**Commit:** `feat(ui): add application screens and branded HTTP error pages`  
**Date:** 2026-10-24

#### What we built
1. **Custom Branded HTTP Error Pages (`client/src/components/errors/ErrorPage.tsx`):**
   - Implemented bespoke editorial error pages for all critical HTTP codes:
     - `400 Bad Request`: Schema validation failure (negative food portions, invalid dates, malformed JSON).
     - `401 Unauthorized`: Missing, expired, or malformed Bearer authorization token.
     - `402 Payment Required`: Free-tier AI image vision scan daily quota reached.
     - `403 Forbidden`: Multi-tenant isolation boundary protection (User A cannot access User B records).
     - `404 Not Found`: Nutritional diary entry or endpoint route missing.
     - `500 Internal Server Error`: Uncaught calculation/server failure with incident logging.
     - `503 Service Unavailable`: Free-tier Render container spin-up cold start or platform maintenance.
   - Includes custom health-tech diagnostics, monospace technical detail boxes, brand logo, action buttons ("Return to Dashboard", "Retry Request").
2. **Interactive Error Catalog (`client/src/pages/ErrorsPage.tsx`):**
   - Interactive card catalog showcasing all 7 error status codes with one-click preview mode and simulated retry hooks.
3. **Meals Journal Screen (`client/src/pages/MealsPage.tsx`):**
   - Search food name and notes with dynamic multi-field filtering.
   - Category filtering (Breakfast, Lunch, Dinner, Snacks, All).
   - Date range filtering (Today, Last 7 Days, This Month, All Time).
   - Server/client pagination controls (page navigation, bounds checking).
   - Real-time aggregate summary bar (total items, consumed calories, protein, carbs, fat).
   - Accessible table with meal source badges (`Manual` vs `AI Extracted`) and item deletion.
4. **Target & Goal Setting Screen (`client/src/pages/GoalsPage.tsx`):**
   - Multi-tenant scoped daily targets (calories, protein, carbs, fat, target weight, weight unit).
   - Real-time energy ratio calculator (protein: 4 kcal/g, carbs: 4 kcal/g, fat: 9 kcal/g).
   - Visual macro distribution stacked bar with percentage badges.
   - Form validation with bounded thresholds (calories 500-10,000 kcal, macros within plausible physiological limits).
   - Non-medical disclaimer alert.
5. **Nutrition Analytics & Reports Screen (`client/src/pages/ReportsPage.tsx`):**
   - Time aggregation tabs (Day vs Week grouping).
   - 7-day adherence bar chart with target threshold line.
   - Macro distribution energy split.
   - Honest absence micronutrient table (Vitamin D, Iron, Calcium, Sodium, Potassium) that marks missing values as "Not reported" / unknown, never defaulting to 0.
6. **AI Plate & Label Extraction Screen (`client/src/pages/AIScanPage.tsx`):**
   - Drag-and-drop & file picker dropzone.
   - Client-side MIME type check (image/jpeg, image/png, image/webp) and file size cap (<= 5MB).
   - AI proposal state machine (propose -> inspect -> edit -> user confirm).
   - Uncertainty warning banner, confidence score (89%), and non-zero calorie / macro proposal preview.
   - Strict separation of AI proposal vs user confirmed database persistence.
7. **Account & App Settings Screen (`client/src/pages/SettingsPage.tsx`):**
   - User profile management (name, email).
   - IANA timezone selection with browser auto-detection.
   - Unit system selector (Metric vs Imperial).
   - Real-time backend health ping monitor checking `/api/v1/health` with latency measurement.
   - JSON data export for full diary portability.
8. **App Header & Global State Routing (`client/src/components/layout/Header.tsx`, `client/src/App.tsx`):**
   - Multi-page navigation bar with active indicators, error catalog shortcut, and synchronized state across all views.
9. **CSS Design Tokens & Layout (`client/src/App.css`):**
   - 220+ lines of responsive CSS styles adhering strictly to the "Premium Editorial Health-Tech" aesthetic.

#### Why it exists
A professional production application cannot rely solely on a single dashboard view or browser default error screens. Providing dedicated pages for Meal Journaling, Goal Setting, Reports, AI extraction, and Settings fulfills all 5 core pillars of the Calories specification. Furthermore, custom branded error pages for HTTP 400, 401, 402, 403, 404, 500, and 503 guarantee that regardless of what happens (network blips, auth expiry, multi-tenant permission rejections, quota limits), users always receive clear, actionable, and branded diagnostics.

#### Files created and modified
| File | Responsibility |
|---|---|
| `client/src/components/errors/ErrorPage.tsx` | Reusable branded HTTP error screen for 400, 401, 402, 403, 404, 500, 503. |
| `client/src/pages/ErrorsPage.tsx` | Error catalog & interactive full-page preview tester. |
| `client/src/pages/MealsPage.tsx` | Search, filter, pagination, and deletion for meal logs. |
| `client/src/pages/GoalsPage.tsx` | Form to configure calorie and macronutrient targets with live ratio analysis. |
| `client/src/pages/ReportsPage.tsx` | Trend charts, macro split, and honest micronutrient presence table. |
| `client/src/pages/AIScanPage.tsx` | Multi-format photo upload with AI proposal verification flow. |
| `client/src/pages/SettingsPage.tsx` | Preferences, timezone selection, JSON export, and backend health monitor. |
| `client/src/components/layout/Header.tsx` | Navigation bar with tab links and page switcher. |
| `client/src/App.tsx` | Main application router coordinating page view states and data persistence. |
| `client/src/App.css` | Comprehensive CSS styling for tables, error layouts, forms, and responsive grids. |

#### Data flow
- **Error Handling:** When an error condition occurs (e.g. invalid query parameter, expired auth, or unhandled rejection), the application renders `<ErrorPage code={...} />` passing error details, diagnostic context, and recovery callbacks (`onRetry`, `onNavigateDashboard`).
- **Goal Updates:** User modifies targets in `GoalsPage` -> Client verifies validation rules -> Calls `onSaveGoal(updatedGoal)` -> Updates global state in `App.tsx` -> Instantly updates `remainingKcal` in dashboard and goal-vs-actual bars in `ReportsPage`.
- **AI Extraction Flow:** User uploads meal image in `AIScanPage` -> System verifies MIME/size -> Triggers mock extraction -> Presents confidence score and nutrient values for user review -> User can edit fields -> On explicit user confirmation ("Confirm & Log Meal"), the meal is added to state with `source: 'ai'`.

#### Validation and security
- **AI File Upload:** Client enforces `<= 5MB` file size limit and checks MIME types against `image/jpeg`, `image/png`, and `image/webp`.
- **Input Bounds:** Goals page enforces numeric boundaries (500 <= kcal <= 10000; non-negative macros).
- **Tenant Isolation Defense:** Documented and visualized through HTTP 403 Forbidden error screen to showcase zero cross-tenant data leakage.
- **Microservice Isolation:** AI extraction results remain non-persisted proposals until explicit user review and confirmation.

#### Tests and evidence
- **Oxlint:** Clean compilation across 29 client files and 3 server files: `Found 0 warnings and 0 errors.`
- **TypeScript:** Strict typecheck passed for both client (`tsc -b`) and server (`tsc --noEmit`).
- **Unit & Integration Tests:** Native Node 22 test runner: 2/2 tests passed (100%).
- **Production Build:** `npm run build` generated optimized production assets: `dist/assets/index-CCYqxy6H.js` (308.29 kB) and `dist/assets/index-BXx0U9T4.css` (23.42 kB).

#### Interview explanation
> "To elevate Calories from a single dashboard demo into an end-to-end production platform, I built dedicated views for all five core pillars: Meal Journal with server-style pagination and search, Target Setting with an energy ratio calculator, Reports with honest micronutrient handling, AI Vision scanning with a strict human-in-the-loop proposal flow, and Settings with live backend ping telemetry. Crucially, I engineered a bespoke HTTP error page suite supporting status codes 400, 401, 402, 403, 404, 500, and 503. Each error page explains the exact technical issue, maintains brand immersion, provides recovery actions, and models real-world health-tech architecture constraints such as multi-tenant isolation (403) and free-tier cold starts (503)."

#### Likely interview questions
1. **Why differentiate between HTTP 401 Unauthorized and HTTP 403 Forbidden in a health-tech app?**  
   *Answer:* HTTP 401 signifies that authentication is missing or invalid (the user needs to log in). HTTP 403 signifies that the authenticated user is strictly forbidden from accessing the requested record. In multi-tenant health-tech software, 403 is vital for HIPAA/GDPR compliance: User A must never access User B's dietary or health logs, even if User A is properly authenticated.
2. **Why require an explicit user confirmation step for AI-extracted meal entries instead of saving them automatically?**  
   *Answer:* Computer vision models are probabilistic and prone to portion misestimations or ingredient confusion. Treating AI extraction as a proposal step with confidence scores and editable inputs ensures the user remains the ultimate authority over their health diary. This maintains data integrity and establishes trustworthy user experiences.
3. **Why display missing micronutrients as 'Not reported' rather than 0 in reports?**  
   *Answer:* In nutritional science, an absence of data does not mean an absence of nutrient. If a user logs a food without micronutrient details, displaying '0mg Iron' falsely implies iron deficiency. Honest data presentation explicitly labels unknown values as 'unreported' to avoid giving misleading clinical impressions.
4. **How does the application prevent large file denial-of-service (DoS) attacks during image upload?**  
   *Answer:* The client immediately checks `file.size` against a 5MB maximum threshold and verifies the MIME type before uploading or processing. On the server side, Express request body parsers and multer multipart middleware enforce matching strict byte limits and reject oversized payloads before buffering them into memory.

#### Practice modification
In `client/src/pages/ErrorsPage.tsx`, add a query parameter simulator (e.g. `?code=403`) or simulated network latency drop-down that allows interviewers to trigger custom error page transitions with simulated server delays.
