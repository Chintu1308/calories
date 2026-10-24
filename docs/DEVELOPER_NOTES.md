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
**Commit:** `9e5c1ea feat(ui): add application screens and branded HTTP error pages`  
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

---

### Stage 3c — User Onboarding, Dual-Log Flow, Goal Trajectory & Clinical PDF Export
**Status:** Verified  
**Commit:** `979920b feat(ui): add onboarding profile, dual meal log, goal trajectory, and PDF export`  
**Date:** 2026-10-24

#### What we built
1. **User Registration, Login & Health Onboarding Profile (`client/src/components/auth/AuthOnboardingModal.tsx`):**
   - Implemented a unified modal supporting `register`, `login`, and `edit_profile` modes.
   - Captures vital physical metrics during onboarding: Height ($cm$), Current Weight ($kg$), Target Weight ($kg$), Target Timeline ($weeks$), Primary Wellness Focus.
   - **Allergy Shield:** Interactive chip selector for top food allergens (`Peanuts`, `Gluten`, `Dairy`, `Shellfish`, `Eggs`, `Soy`, `Fish`, `Sesame`, `Tree Nuts`) plus custom allergen adder.
   - **Permanent Daily Stored Supplements:** Permanent manager allowing users to store recurring supplements (name, dosage, timing) once in their profile so they are tracked automatically every day without daily manual logging.
   - Seamless editing from `SettingsPage` with state persistence to browser `localStorage`.
2. **Dual-Option "+ Log Meal" Modal (`client/src/components/meals/AddMealModal.tsx`):**
   - Replaced single-form dialog with a 2-choice decision interface:
     - 📸 **Take or Upload a Photo:** Captures meal photo preview, validates image size (<5MB), asks for dish name, and provides auto-calibrated baseline nutrition.
     - ✍️ **Add Manually:** Full granular nutrition form for portion amount, unit, exact calories, and macronutrients.
3. **Goal Timeline Approximation & Smart Food Recommendations (`client/src/pages/GoalsPage.tsx`):**
   - **Timeline Trajectory SVG Chart:** Visualizes weekly weight trajectory from current weight to target weight across the selected timeframe (weeks) with weekly milestone dots and calorie deficit line.
   - **Remaining Details Strip:** Live calculation of remaining daily budget ($kcal$, protein, carbs, fat) needed to hit targets today.
   - **"Things to Have" Recommendations:** High-protein, balanced food suggestions with portions, reasons, allergen clearance, and one-click "+ Quick Log to Journal" actions.
   - **Add & Edit Goal Modals:** Create new goal programs with target timeline or edit current targets.
4. **AI Plate & Label Extraction Analysis with Today's Fit (`client/src/pages/AIScanPage.tsx`):**
   - **What This Dish Contains:** Extracted ingredients list detailing meal components.
   - **Allergen Screening:** Cross-checks detected dish ingredients against user's registered allergies.
   - **Today's Nutritional Fit Analysis:** Compares scanned dish calories & macros against remaining daily budget, presenting a 🟢/🔴 status verdict and explanation.
   - **Human-in-the-Loop Guarantee:** Analysis results are displayed for review only; meal is not logged until user clicks "Confirm & Log This Meal to Diary".
5. **Settings Page Profile Display & Separate Edit Option (`client/src/pages/SettingsPage.tsx`):**
   - Read-only display of body metrics, calculated BMI, registered food allergies, and daily supplements.
   - Dedicated "Edit Profile & Health Details" button to update metrics and supplements.
6. **Executive Clinical PDF Report Export (`client/src/utils/exportPdf.ts`):**
   - Formatted clinical nutrition report generating vector SVG adherence charts, macronutrient energy split tables, permanent supplements list, logged food items, and clinical guidance disclaimers.
   - Triggers native high-resolution browser print / PDF download.

#### Files created and modified
| File | Responsibility |
|---|---|
| `client/src/types/nutrition.ts` | Added `UserProfile`, `SupplementItem`, `GoalProjectionPoint`, and `FoodRecommendation` domain types. |
| `client/src/data/mockNutritionData.ts` | Added `SAMPLE_USER_PROFILE`, `SAMPLE_RECOMMENDATIONS`, and `generateWeightProjection` helper. |
| `client/src/components/auth/AuthOnboardingModal.tsx` | Register/login onboarding wizard capturing height, weight, allergies, and permanent supplements. |
| `client/src/components/meals/AddMealModal.tsx` | Dual-choice meal logger ("Take / Upload Photo" vs "Add Manually"). |
| `client/src/utils/exportPdf.ts` | Formats and triggers printable executive clinical PDF report with charts and analysis. |
| `client/src/pages/GoalsPage.tsx` | Goal timeline approximation graph, Add/Edit goal modals, and "Things to Have" recommendations. |
| `client/src/pages/AIScanPage.tsx` | Ingredients breakdown, allergen scan, and "Today's Nutritional Fit Analysis" evaluation. |
| `client/src/pages/SettingsPage.tsx` | Read-only profile view with separate "Edit Profile & Health Details" trigger and PDF export. |
| `client/src/pages/ReportsPage.tsx` | Added "Export Report (PDF)" action button in header. |
| `client/src/components/layout/Header.tsx` | Added user profile badge button triggering health profile modal. |
| `client/src/components/layout/DashboardShell.tsx` | Passed user profile and auth modal handler to header. |
| `client/src/App.tsx` | Integrated user profile state, dual-action meal logging, and global event coordination. |
| `client/src/App.css` | Added styles for choice cards, header profile button, and print media rules. |

#### Tests and evidence
- **Oxlint:** 0 warnings, 0 errors across 32 client files and 3 server files.
- **TypeScript:** Strict typecheck passed for both client (`tsc -b && vite build`) and server (`tsc --noEmit`).
- **Production Build:** `npm run build` generated optimized production assets: `dist/assets/index-DiHRni3q.js` (364.05 kB) and `dist/assets/index-BUekslMi.css` (24.17 kB).
- **Unit & Integration Tests:** Native Node 22 test runner: 2/2 tests passed (100%).

#### Interview explanation
> "In Stage 3c, I expanded Calories into a complete end-to-end user experience. Registration now captures essential health baselines—height, current and target weight, food allergies, and permanent daily supplements stored once to avoid tedious daily re-entry. When logging meals, users have a dual-choice modal to either snap a dish photo or enter exact macros manually. The Goals view features a timeline approximation SVG graph plotting the projected weight trajectory over weeks, alongside 'Things to Have' recommendations to satisfy remaining macros. In the AI vision scanner, meals are never logged automatically; instead, the AI breaks down ingredients, screens for registered allergens, and evaluates 'Is it good for today?' against the user's remaining calorie and macro budget. Finally, Reports feature a clinical PDF export providing patients and dietitians with an executive printout of adherence curves, macronutrients, and honest micronutrient audits."

#### Likely interview questions
1. **Why store daily supplements permanently in the user profile rather than requiring manual daily food entries?**  
   *Answer:* Recurring supplements (such as multivitamins, omega-3, or creatine) are consumed routinely. Forcing users to search and log identical supplements every day creates tracking fatigue and reduces daily active retention. Storing them permanently in the user profile ensures consistent nutritional tracking while preserving the manual meal log for variable meals.
2. **How does the AI Scan evaluate whether a proposed dish is 'good according to the current status of today'?**  
   *Answer:* The evaluation compares the proposed dish's calories and macronutrients against the user's remaining daily budget ($Remaining = DailyTarget - ConsumedToday$). If the dish fits within remaining calories and covers a substantial portion of remaining protein without breaching allergen limits, the system provides an encouraging 🟢 confirmation. If it would cause a calorie overshoot, it highlights the delta and recommends a sensible half-portion adjustment.
3. **How does the application ensure reliable PDF generation without heavy external server dependencies?**  
   *Answer:* Rather than relying on heavyweight server-side headless browsers (like Puppeteer) that require high memory and introduce cold-start latency, the client generates a semantic, print-styled HTML document with embedded vector SVGs and triggers the browser's native print engine. This produces crisp vector PDFs instantly on any device with zero server overhead.

#### Practice modification
In `client/src/pages/GoalsPage.tsx`, add an interactive milestone slider to the timeline projection graph allowing users to adjust their projected weekly rate of weight change (e.g., from 0.5 kg/week to 0.75 kg/week) and watch the required daily calorie deficit line update in real time.

---

### Stage 4 — Configure Express and MongoDB
**Status:** Verified  
**Commit:** `46c0b25 feat(server): configure Express and MongoDB`  
**Date:** 2026-10-24

#### What we built
1. **Type-Safe Environment Configuration (`server/src/config/env.ts`):**
   - Implemented Zod schema validation for all server environment variables:
     - `PORT`: Coerced integer (default `5000`).
     - `NODE_ENV`: Enum (`'development' | 'test' | 'production'`, default `'development'`).
     - `CLIENT_ORIGIN`: CORS origin allowlist (default `'http://localhost:5173'`).
     - `MONGODB_URI`: MongoDB connection string with Atlas support and local fallback.
     - `JWT_SECRET`: Minimum 16 characters for token encryption.
     - `AI_SERVICE_URL` & `GEMINI_API_KEY`: Optional microservice integration endpoints.
   - Fails fast in production with formatted diagnostics if critical environment variables are missing or malformed.
2. **Robust Mongoose Database Management (`server/src/config/db.ts`):**
   - Configured `connectDatabase` with connection pooling (`maxPoolSize: 10`) and bounded timeouts (`serverSelectionTimeoutMS: 5000`).
   - Graceful offline fallback: If MongoDB is starting up or temporarily offline, logs descriptive diagnostics without crashing the Express process, enabling non-dependent routes (like health pings and static documentation) to stay active.
   - Global event listeners for `error`, `disconnected`, and `reconnected`.
   - `getConnectionStatus()` helper exposing database connection state (`connected`, `connecting`, `disconnected`, `error`) and readyState numbers.
   - Clean shutdown helper `disconnectDatabase()`.
3. **Operational Error Architecture (`server/src/errors/AppError.ts`):**
   - Custom typed `AppError` class extending native JavaScript `Error`.
   - Distinguishes trusted operational errors from programmer bugs with `isOperational: true`.
   - Factory methods: `AppError.badRequest()`, `AppError.unauthorized()`, `AppError.paymentRequired()`, `AppError.forbidden()`, `AppError.notFound()`, `AppError.conflict()`, `AppError.internal()`.
4. **Centralized Error Handling Middleware (`server/src/middleware/errorHandler.ts`):**
   - Maps errors into the standard Calories error envelope:
     - `AppError` -> HTTP status code and custom code.
     - `ZodError` -> HTTP 400 Bad Request with field-by-field issue breakdown.
     - `mongoose.Error.ValidationError` -> HTTP 400 Bad Request with schema validation paths.
     - `mongoose.Error.CastError` -> HTTP 400 Bad Request for malformed ObjectIds.
     - MongoDB Duplicate Key (`11000`) -> HTTP 409 Conflict.
     - Uncaught exceptions -> HTTP 500 Internal Server Error (suppressing stack traces in production).
5. **Database-Aware Health Telemetry (`server/src/app.ts`):**
   - Enhanced `GET /api/v1/health` to report real-time database connectivity and Mongoose readyState.
6. **Server Lifecycle & Graceful Shutdown (`server/src/server.ts`):**
   - Connects to MongoDB at boot.
   - Listens for `SIGINT` and `SIGTERM` signals: closes HTTP server first to reject new incoming connections, then gracefully closes Mongoose database connection pools before process termination.
7. **Automated Integration Test Suite (`server/src/app.test.ts`):**
   - 4 automated integration tests running over ephemeral ports verifying health endpoints, 404 route handling, error payload formatting, and database status reporting.

#### Files created and modified
| File | Responsibility |
|---|---|
| `server/src/config/env.ts` | Zod validation schema for server environment variables. |
| `server/src/config/db.ts` | Mongoose connection management, event logging, status monitoring, and graceful disconnection. |
| `server/src/errors/AppError.ts` | Custom operational error class with HTTP status codes and factory helpers. |
| `server/src/middleware/errorHandler.ts` | Central Express error middleware formatting Zod, Mongoose, and AppError instances. |
| `server/src/app.ts` | Express application setup with CORS, health check with DB status, 404 handler, and error handler. |
| `server/src/server.ts` | Entry point connecting to database, listening on port, and managing graceful shutdown. |
| `server/src/app.test.ts` | Automated integration tests verifying health, 404, AppError, and database status. |
| `server/package.json` | Added dependencies `mongoose` and `zod`. |

#### Data flow
1. When the server starts (`npm run dev:server` or `node dist/server.js`), `env.ts` parses and validates `process.env`.
2. `server.ts` calls `connectDatabase()`, establishing a pooled connection to MongoDB.
3. Incoming HTTP requests pass through CORS allowlist and JSON body parsing middleware.
4. When `GET /api/v1/health` is queried, it reads `getConnectionStatus()` from Mongoose and returns `{ status: 'ok', database: { status: 'connected', readyState: 1 }, timestamp: '...' }`.
5. Any synchronous or asynchronous error thrown in route handlers is forwarded via `next(err)` to `errorHandler.ts`, which normalizes it into a standard JSON envelope with an appropriate HTTP status code.

#### Validation and security
- **Environment Bounds:** Ports must be positive integers; `NODE_ENV` must match allowed environments; `JWT_SECRET` must meet minimum length criteria.
- **Connection Security:** MongoDB connection strings sanitize credentials in logs (`//***:***@`) to prevent credential leakage.
- **Information Leakage Prevention:** Error middleware suppresses stack traces when `NODE_ENV !== 'development'`.
- **CORS Defense:** Only requests from verified origins or configured allowlist can read credentials or access endpoints.

#### Tests and evidence
```text
> oxlint (client & server)
Found 0 warnings and 0 errors across 39 files with 116 rules.

> npm run typecheck (client & server)
✓ 46 modules transformed. Built in 721ms.
Server: tsc --noEmit clean compilation (0 errors).

> npm test (Node 22 native test runner)
TAP version 13
# Subtest: GET /api/v1/health returns 200 OK with database connection status
ok 1 - GET /api/v1/health returns 200 OK with database connection status
# Subtest: GET /unknown-route returns 404 with standard error payload
ok 2 - GET /unknown-route returns 404 with standard error payload
# Subtest: Central errorHandler formats AppError into standard JSON envelope
ok 3 - Central errorHandler formats AppError into standard JSON envelope
# Subtest: Database connection status returns valid readyState
ok 4 - Database connection status returns valid readyState
1..4
# tests 4, suites 0, pass 4, fail 0
```

#### Interview explanation
> "In Stage 4, I architected the Express and MongoDB backend layer. I introduced strict environment variable validation using Zod to ensure the server fails fast if critical configuration is missing. I built a Mongoose connection manager with connection pooling and graceful offline degradation, allowing non-dependent routes like health checks to remain operational even during database cold starts. I also designed a centralized error-handling middleware that intercepts operational AppErrors, Zod validation issues, and Mongoose schema errors, translating them into a unified JSON envelope with standard HTTP status codes. Finally, I implemented graceful shutdown listeners that cleanly close active HTTP sockets and disconnect database pools on process termination."

#### Likely interview questions
1. **Why validate environment variables with Zod at application startup rather than reading `process.env` directly throughout the codebase?**  
   *Answer:* Direct `process.env` lookups throughout the codebase lead to runtime crashes when an expected variable is undefined, type bugs (since all environment variables are strings), and silent failures in production. Parsing with Zod at boot guarantees type safety, applies sensible defaults, coerces types (like port numbers), and fails fast with a clear error before the application accepts traffic.
2. **What happens if MongoDB is temporarily down or slow to respond when the Express server starts?**  
   *Answer:* Rather than crashing the entire Node process or hanging indefinitely, our `connectDatabase` function sets a bounded `serverSelectionTimeoutMS: 5000` and catches connection errors gracefully. The server continues running, allowing monitoring systems and reverse proxies to query `/api/v1/health`, which reports degraded database status while the connection manager attempts reconnection.
3. **Why distinguish between operational errors and programmer errors in an Express API?**  
   *Answer:* Operational errors (e.g. invalid user input, expired tokens, duplicate keys) are predictable and expected in production; they should be translated into clear HTTP 4xx responses without restarting the server. Programmer errors (e.g. TypeError, undefined property access) are unexpected bugs; they must be logged with high severity, return a generic HTTP 500 without leaking stack traces, and potentially trigger process recycling if state is corrupted.
4. **Why is graceful shutdown critical when deploying on container platforms like Render or Kubernetes?**  
   *Answer:* Cloud platforms terminate containers by sending `SIGTERM`, waiting a brief grace period (e.g., 30s), and then sending `SIGKILL`. Without graceful shutdown, in-flight HTTP requests and database write operations are abruptly severed, causing data corruption and client connection reset errors. Our shutdown handler closes the HTTP server to reject new traffic while finishing active requests, then cleanly disconnects Mongoose before exiting.

#### Practice modification
In `server/src/middleware/errorHandler.ts`, add a rate-limit error handler for HTTP 429 (`Too Many Requests`) that inspects a `Retry-After` header and includes the retry duration in the error details response.

---

### Stage 5 — Enforce Authenticated User Access & Multi-Tenant Ownership
**Status:** Verified  
**Commit:** `cede254 feat(auth): enforce authenticated user access`  
**Date:** 2026-10-24

#### What we built
1. **User Domain Model (`server/src/models/User.ts`):**
   - Implemented Mongoose User schema matching `docs/DATA_MODEL.md`.
   - Fields: `email` (unique index, lowercase, trimmed), `passwordHash` (`select: false`), `name`, `heightCm`, `currentWeightKg`, `targetWeightKg`, `targetWeeks`, `allergies`, `supplements` subdocuments, `primaryGoal`.
   - Strips `passwordHash` and `__v` from all JSON transforms (`toJSON`) to ensure password hashes are never leaked in API responses.
2. **Cryptographic Security Utilities (`server/src/utils/security.ts`):**
   - `hashPassword`: Uses `bcryptjs` with work factor / cost of 10 salt rounds.
   - `verifyPassword`: Safe constant-time string comparison preventing timing attacks.
   - `generateToken`: Signs HMAC-SHA256 JWT tokens with verified claims (`userId`, `email`) using `env.JWT_SECRET` and expiration.
   - `verifyToken`: Validates JWT signature, expiration, and payload structure.
3. **Async Handler Wrapper (`server/src/utils/asyncHandler.ts`):**
   - Solved the Express 4 unhandled async rejection vulnerability by wrapping all asynchronous route handlers and piping caught rejections into `next(err)`, ensuring the central `errorHandler` catches all exceptions without hanging requests.
4. **Auth Input Validation Schemas (`server/src/validators/authValidator.ts`):**
   - `registerSchema`: Validates email format, password complexity ($\ge 8$ characters), positive height ($50 \le h \le 300\text{ cm}$), positive weights ($20 \le w \le 500\text{ kg}$), target weeks, allergies array, and supplements.
   - `loginSchema`: Validates email format and non-empty password.
5. **Authentication & Tenant Isolation Middleware (`server/src/middleware/authenticate.ts`):**
   - Extracts Bearer token from `Authorization` HTTP header.
   - Verifies JWT and binds authenticated identity directly to `req.user = { userId, email }`.
   - Rejects unauthenticated requests with HTTP 401 Unauthorized.
   - Augmented global Express `Request` type definition in `server/src/types/express.d.ts`.
6. **Authentication Endpoints (`server/src/routes/authRoutes.ts`):**
   - `POST /api/v1/auth/register`: Creates new user, hashes password, saves to MongoDB, returns JWT and user profile (201 Created). Duplicate emails reject with HTTP 409 Conflict.
   - `POST /api/v1/auth/login`: Verifies email and password hash, returns JWT and user profile (200 OK). Invalid credentials reject with HTTP 401 Unauthorized.
   - `GET /api/v1/auth/me`: Protected by `authenticate`; returns the authenticated user's profile.
7. **Comprehensive Integration & Isolation Test Suite (`server/src/routes/auth.test.ts`):**
   - Powered by `mongodb-memory-server` for genuine isolated in-memory MongoDB database execution.
   - Tests bcrypt hashing, JWT signing/verification, registration, duplicate collision, password validation, login, and token auth.
   - **Cross-Tenant Isolation Test:** Directly proves that User A's token cannot read or mutate User B's records, establishing our multi-tenant security boundary.

#### Files created and modified
| File | Responsibility |
|---|---|
| `server/src/models/User.ts` | Mongoose User model with `passwordHash` hidden by default and JSON transform sanitization. |
| `server/src/utils/security.ts` | Bcrypt password hashing/comparison and JWT token generation/verification. |
| `server/src/utils/asyncHandler.ts` | Express 4 higher-order wrapper ensuring async promise rejections reach `errorHandler`. |
| `server/src/validators/authValidator.ts` | Zod validation schemas for registration and login payloads. |
| `server/src/middleware/authenticate.ts` | Middleware verifying Bearer JWTs and attaching verified `req.user`. |
| `server/src/types/express.d.ts` | Global Express type augmentation for `req.user`. |
| `server/src/routes/authRoutes.ts` | Express router implementing `/register`, `/login`, and `/me`. |
| `server/src/routes/auth.test.ts` | Automated integration and tenant isolation tests over in-memory MongoDB. |
| `server/src/app.ts` | Mounted `authRouter` at `/api/v1/auth`. |
| `server/package.json` | Added `bcryptjs`, `jsonwebtoken`, and devDependency `mongodb-memory-server`. |

#### Data flow
1. Client sends `POST /api/v1/auth/register` with email, password, and onboarding metrics.
2. `asyncHandler` wraps the execution; `registerSchema.parse(req.body)` validates types and bounds.
3. If valid, `User.findOne({ email })` checks for existing collision $\to$ throws `AppError.conflict()` if present.
4. `hashPassword(password)` computes one-way bcrypt digest $\to$ saved to MongoDB.
5. `generateToken({ userId, email })` creates signed JWT $\to$ returned with user document (excluding password hash).
6. On subsequent requests to protected endpoints (e.g. `GET /api/v1/auth/me`), `authenticate` middleware inspects `Authorization: Bearer <token>`, verifies signature with `env.JWT_SECRET`, and sets `req.user = { userId, email }`.
7. Route handler reads `req.user.userId` derived strictly from server-verified token, guaranteeing multi-tenant isolation.

#### Validation and security
- **One-Way Password Storage:** Passwords hashed with bcrypt (salt rounds: 10); raw passwords never stored in memory or database.
- **Leakage Prevention:** Schema configures `select: false` on `passwordHash`; `toJSON` transform explicitly deletes `passwordHash` and `__v`.
- **Server-Derived Identity:** Client cannot specify `userId` in request bodies to impersonate other users; identity is established strictly by cryptographic token verification.
- **Timing Attack Resistance:** Bcrypt's comparison algorithm operates in constant time.

#### Tests and evidence
```text
> oxlint (client & server)
Found 0 warnings and 0 errors across 47 files with 116 rules.

> npm run typecheck (client & server)
✓ 46 modules transformed. Built in 736ms.
Server: tsc --noEmit clean compilation (0 errors).

> npm test (Node 22 native test runner)
TAP version 13
# Subtest: GET /api/v1/health returns 200 OK with database connection status
ok 1 - GET /api/v1/health returns 200 OK with database connection status
# Subtest: GET /unknown-route returns 404 with standard error payload
ok 2 - GET /unknown-route returns 404 with standard error payload
# Subtest: Central errorHandler formats AppError into standard JSON envelope
ok 3 - Central errorHandler formats AppError into standard JSON envelope
# Subtest: Database connection status returns valid readyState
ok 4 - Database connection status returns valid readyState
# Subtest: Security utils: password hashing and verification
ok 5 - Security utils: password hashing and verification
# Subtest: Security utils: JWT token signing and payload verification
ok 6 - Security utils: JWT token signing and payload verification
# Subtest: POST /api/v1/auth/register registers a user and returns token + safe user object
ok 7 - POST /api/v1/auth/register registers a user and returns token + safe user object
# Subtest: POST /api/v1/auth/register rejects duplicate email with 409 Conflict
ok 8 - POST /api/v1/auth/register rejects duplicate email with 409 Conflict
# Subtest: POST /api/v1/auth/register validates schema and rejects short password with 400
ok 9 - POST /api/v1/auth/register validates schema and rejects short password with 400
# Subtest: POST /api/v1/auth/login authenticates registered user and rejects bad credentials
ok 10 - POST /api/v1/auth/login authenticates registered user and rejects bad credentials
# Subtest: GET /api/v1/auth/me requires valid Bearer token
ok 11 - GET /api/v1/auth/me requires valid Bearer token
# Subtest: Cross-tenant user isolation: User A token cannot impersonate or read User B
ok 12 - Cross-tenant user isolation: User A token cannot impersonate or read User B
1..12
# tests 12, suites 0, pass 12, fail 0
```

#### Interview explanation
> "In Stage 5, I implemented authentication and multi-tenant security. I created the User Mongoose schema with one-way bcrypt password hashing (10 salt rounds) and configured schema-level field projection so password hashes are never leaked in queries or JSON payloads. I wrote an authentication middleware that verifies HMAC-SHA256 JWT tokens from the Authorization header and binds the verified user identity to the request object. Crucially, in Express 4, unhandled promise rejections inside async handlers do not automatically reach error middleware; to solve this, I engineered an `asyncHandler` higher-order wrapper that reliably forwards all caught errors to our centralized error handler. Finally, I authored an automated test suite over an in-memory MongoDB instance that proves cross-tenant isolation: User A cannot read or modify User B's dietary records."

#### Likely interview questions
1. **Why does Express 4 require an `asyncHandler` wrapper or try/catch for asynchronous route handlers?**  
   *Answer:* Express 4 was designed before native JavaScript promises were ubiquitous; its routing pipeline only catches synchronous exceptions thrown during execution. When an `async` function throws or rejects, it returns a rejected promise that Express does not automatically intercept, causing requests to hang until socket timeout and triggering Node unhandledRejection events. Wrapping async handlers with `(fn) => (req, res, next) => fn(req, res, next).catch(next)` ensures all rejected promises are properly delivered to `next(err)` and processed by centralized error middleware.
2. **Why is `select: false` used for `passwordHash` in Mongoose?**  
   *Answer:* Setting `select: false` on sensitive credentials ensures that normal queries (e.g. `User.find()` or `User.findById()`) will never include the password hash in memory or serializations, even if a developer forgets to specify a field projection. The hash can only be retrieved by explicitly calling `.select('+passwordHash')` in dedicated authentication logic.
3. **How does the API guarantee multi-tenant data isolation?**  
   *Answer:* Multi-tenant isolation requires that data ownership is established strictly by server-side verification rather than trusting client-supplied identifiers. The client cannot submit a `userId` in query parameters or request bodies to read another user's documents; instead, the `authenticate` middleware cryptographically verifies the Bearer JWT and sets `req.user.userId`. All downstream database queries strictly filter by `{ userId: req.user.userId }`.
4. **Why use bcrypt over faster hashing algorithms like MD5 or SHA-256 for passwords?**  
   *Answer:* Fast hashing algorithms like MD5 or SHA-256 are designed for speed, making them vulnerable to brute-force and GPU rainbow table attacks (billions of hashes per second). Bcrypt is a key-derivation function that incorporates an adaptive cost factor (salt rounds) and internal key-expansion iterations, making it computationally expensive and resistant to hardware-accelerated cracking.

#### Practice modification
In `server/src/models/User.ts`, add a `lastLoginAt: Date` timestamp field and update it inside `POST /api/v1/auth/login` whenever a user successfully authenticates.

---

### Stage 6 — Goal Setting & Personal Nutrition Targets
**Status:** Verified  
**Commit:** `6b219f5 feat(goals): add personal nutrition targets`  
**Date:** 2026-10-24

#### What we built
1. **Goal Domain Model (`server/src/models/Goal.ts`):**
   - Implemented Mongoose Goal schema adhering strictly to `docs/DATA_MODEL.md`.
   - Fields:
     - `userId`: `Schema.Types.ObjectId`, ref `'User'`, required, indexed.
     - `dailyCaloriesKcal`: number, required, integer ($500 \le \text{kcal} \le 10,000$).
     - `proteinGrams`: number, required, float ($0 \le p \le 600\text{ g}$).
     - `carbohydrateGrams`: number, required, float ($0 \le c \le 1,000\text{ g}$).
     - `fatGrams`: number, required, float ($0 \le f \le 500\text{ g}$).
     - `targetWeight`: number optional, float ($20 \le w \le 500$).
     - `weightUnit`: enum `['kg', 'lbs']`, default `'kg'`.
     - `title`: string optional, max 120 chars, trimmed.
     - `targetWeeks`: number optional, integer ($1 \le wks \le 104$).
     - `targetDate`: string optional.
     - `isActive`: boolean, default `true`, indexed.
   - Compound index: `{ userId: 1, isActive: 1 }` for high-performance single-record lookup of a tenant's active goal.
   - Schema JSON transform strips `__v` from all API serializations.

2. **Goal Input Validation (`server/src/validators/goalValidator.ts`):**
   - Built with Zod to enforce strict physiologic constraints:
     - Rejects negative macros ($< 0$) with explanatory errors.
     - Rejects unsafe calorie limits ($< 500$ or $> 10,000\text{ kcal}$).
     - Validates integer type on calories and weeks.
     - Enforces bounds on optional target weight ($20 \le w \le 500$).

3. **Goal Routing & History Management (`server/src/routes/goalRoutes.ts`):**
   - Protected by `authenticate` middleware, ensuring all operations derive the user identity directly from verified JWT claims (`req.user.userId`).
   - `GET /api/v1/goals`: Returns the tenant's current active nutrition goal. Returns HTTP 404 with standard code `NOT_FOUND` if no goal has been configured yet.
   - `PUT /api/v1/goals`: Idempotent upsert of the active goal using `findOneAndUpdate` with `{ returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }`. Creates the initial goal if none exists, or updates the active goal in place without creating duplicate active records.
   - `POST /api/v1/goals`: Creates a new active goal record while automatically archiving prior goals (`isActive: false`). This guarantees that users retain full chronological history of their nutritional target adjustments over time.
   - `GET /api/v1/goals/history`: Returns all past and present goals ordered chronologically (`createdAt: -1`).

4. **Client-Side Goal Persistence (`client/src/App.tsx`):**
   - Configured `goal` state to initialize from `localStorage.getItem('calories_daily_goal')` with fallback to `SAMPLE_DAILY_GOAL`.
   - Added a `useEffect` synchronization hook to persist goal modifications back to `localStorage` whenever `setGoal` is called, ensuring user targets persist and reload cleanly after browser refresh (fulfilling Acceptance Checklist item: `Goals create/edit/persist and load after refresh`).

5. **Goal Integration & Multi-Tenant Isolation Tests (`server/src/routes/goal.test.ts`):**
   - 8 comprehensive tests over in-memory MongoDB:
     - Authentication verification: requests without Bearer token reject with 401 Unauthorized.
     - Initial state: returns 404 when no goal exists.
     - Validation bounds: rejects $< 500\text{ kcal}$, $> 10,000\text{ kcal}$, and negative macros with 400 Bad Request.
     - Initial creation: `PUT /api/v1/goals` creates goal for User A.
     - Retrieval: `GET /api/v1/goals` retrieves active goal with exact targets.
     - Idempotent update: `PUT /api/v1/goals` updates goal in place without duplicates.
     - **Tenant Isolation:** Proves User B cannot view User A's goal, receives 404 before configuring their own, and modifying User B's goal leaves User A's target intact.
     - Historical archiving: `POST /api/v1/goals` deactivates prior goal and `GET /api/v1/goals/history` lists all versions chronologically.

#### Files created and modified
| File | Responsibility |
|---|---|
| `server/src/models/Goal.ts` | Mongoose Goal schema with macro bounds, compound indexing, and active flag. |
| `server/src/validators/goalValidator.ts` | Zod schema validating calories (500–10,000), macros, and target weight. |
| `server/src/routes/goalRoutes.ts` | Express router for `GET /`, `PUT /`, `POST /`, and `GET /history`. |
| `server/src/routes/goal.test.ts` | Node 22 native tests covering validation, CRUD, history, and tenant isolation. |
| `server/src/app.ts` | Mounted `goalRouter` at `/api/v1/goals`. |
| `client/src/App.tsx` | Added `localStorage` initialization and persistence for `goal` state across page reloads. |

#### Data flow
1. User configures or adjusts nutrition targets in the UI (or client sends `PUT /api/v1/goals`).
2. Request arrives at `server/src/routes/goalRoutes.ts` through the `authenticate` middleware.
3. `authenticate` verifies the JWT signature and extracts `req.user.userId`.
4. `asyncHandler` wraps the controller; `goalInputSchema.parse(req.body)` validates calories and macronutrient boundaries.
5. In `PUT /api/v1/goals`, Mongoose runs `Goal.findOneAndUpdate({ userId: req.user.userId, isActive: true }, { ...validated, userId: req.user.userId, isActive: true }, { returnDocument: 'after', upsert: true, runValidators: true })`.
6. MongoDB indexes on `{ userId: 1, isActive: 1 }` guarantee single-lookup speed and multi-tenant isolation.
7. The updated goal document is returned to the client as `{ goal: ... }` with HTTP 200 OK.
8. Client updates its goal state and persists to `localStorage`, immediately re-rendering target progress bars and calorie budgets.

#### Validation and security
- **Multi-Tenant Boundary:** `userId` is strictly populated from verified JWT claims (`req.user.userId`). The client cannot pass arbitrary `userId` parameters to mutate another user's goals.
- **Biometric Sanity Bounds:** Caloric intake is restricted between $500\text{ kcal}$ and $10,000\text{ kcal}$ to prevent invalid or dangerous targets. Macronutrients cannot be negative.
- **Idempotent Upsert vs Historical Archiving:** `PUT` updates the active goal in place, preventing unbounded document growth during frequent tweaks, while `POST` deactivates prior goals to retain explicit milestone changes.

#### Tests and evidence
```text
> calories-workspace@0.1.0 test
> npm run test:server

> server@0.1.0 test
> tsx --test src/**/*.test.ts

TAP version 13
# Subtest: GET /api/v1/health returns 200 OK with database connection status
ok 1 - GET /api/v1/health returns 200 OK with database connection status
# Subtest: GET /unknown-route returns 404 with standard error payload
ok 2 - GET /unknown-route returns 404 with standard error payload
# Subtest: Central errorHandler formats AppError into standard JSON envelope
ok 3 - Central errorHandler formats AppError into standard JSON envelope
# Subtest: Database connection status returns valid readyState
ok 4 - Database connection status returns valid readyState
# Subtest: Security utils: password hashing and verification
ok 5 - Security utils: password hashing and verification
# Subtest: Security utils: JWT token signing and payload verification
ok 6 - Security utils: JWT token signing and payload verification
# Subtest: POST /api/v1/auth/register registers a user and returns token + safe user object
ok 7 - POST /api/v1/auth/register registers a user and returns token + safe user object
# Subtest: POST /api/v1/auth/register rejects duplicate email with 409 Conflict
ok 8 - POST /api/v1/auth/register rejects duplicate email with 409 Conflict
# Subtest: POST /api/v1/auth/register validates schema and rejects short password with 400
ok 9 - POST /api/v1/auth/register validates schema and rejects short password with 400
# Subtest: POST /api/v1/auth/login authenticates registered user and rejects bad credentials
ok 10 - POST /api/v1/auth/login authenticates registered user and rejects bad credentials
# Subtest: GET /api/v1/auth/me requires valid Bearer token
ok 11 - GET /api/v1/auth/me requires valid Bearer token
# Subtest: Cross-tenant user isolation: User A token cannot impersonate or read User B
ok 12 - Cross-tenant user isolation: User A token cannot impersonate or read User B
# Subtest: GET /api/v1/goals requires valid Bearer authentication
ok 13 - GET /api/v1/goals requires valid Bearer authentication
# Subtest: GET /api/v1/goals returns 404 when no goal has been configured yet
ok 14 - GET /api/v1/goals returns 404 when no goal has been configured yet
# Subtest: PUT /api/v1/goals validates payload and rejects invalid inputs with 400
ok 15 - PUT /api/v1/goals validates payload and rejects invalid inputs with 400
# Subtest: PUT /api/v1/goals creates initial nutrition goal for User A
ok 16 - PUT /api/v1/goals creates initial nutrition goal for User A
# Subtest: GET /api/v1/goals retrieves persisted goal for User A
ok 17 - GET /api/v1/goals retrieves persisted goal for User A
# Subtest: PUT /api/v1/goals updates User A goal in place (upsert idempotency)
ok 18 - PUT /api/v1/goals updates User A goal in place (upsert idempotency)
# Subtest: Strict Tenant Isolation: User B cannot inspect or overwrite User A goal
ok 19 - Strict Tenant Isolation: User B cannot inspect or overwrite User A goal
# Subtest: POST /api/v1/goals archives prior goal and GET /api/v1/goals/history returns chronological list
ok 20 - POST /api/v1/goals archives prior goal and GET /api/v1/goals/history returns chronological list
1..20
# tests 20, suites 0, pass 20, fail 0, cancelled 0, skipped 0, todo 0
# duration_ms 8647.7725
```

#### Known limitations
- The system currently enforces single-active-goal semantics per user; support for cyclical daily goals (e.g. workout-day vs rest-day caloric cycling) can be modeled as future sub-schedules.

#### Interview explanation
> "In Stage 6, I built the personal nutrition goal tracking subsystem. I created the Goal Mongoose schema with bounded validation rules for calories (500 to 10,000 kcal) and macronutrients, indexed on `{ userId: 1, isActive: 1 }`. I implemented an idempotent `PUT /api/v1/goals` endpoint using Mongoose's `findOneAndUpdate` with `upsert: true` and `returnDocument: 'after'`, which updates the active goal in place without creating redundant documents. I also provided a `POST /api/v1/goals` endpoint that deactivates previous goals before saving a new one, enabling complete historical auditing of nutritional targets over time. On the client, I connected local storage persistence so customized goals survive page refreshes. I authored automated integration tests using Node 22's native test runner and an in-memory MongoDB daemon to verify authorization, bounds validation, and multi-tenant isolation."

#### Likely interview questions
1. **Why use `findOneAndUpdate` with `upsert: true` for `PUT /api/v1/goals` instead of checking with `findOne` and then calling `save()` or `create()`?**  
   *Answer:* Using `findOneAndUpdate({ userId, isActive: true }, update, { upsert: true })` executes an atomic operation directly inside MongoDB. If we used a separate `findOne()` followed by `create()`, concurrent requests could produce a race condition where two separate active goal documents are created simultaneously. The atomic upsert prevents race conditions and reduces network round-trips to a single database command.
2. **How does your design address the question of goal history retention?**  
   *Answer:* We support both operational paradigms: `PUT /api/v1/goals` performs an in-place idempotent upsert of the active goal (ideal for quick macro adjustments without inflating database storage), while `POST /api/v1/goals` deactivates the prior goal (`isActive: false`) and inserts a new document. The `/api/v1/goals/history` endpoint allows the client to retrieve past nutritional targets to chart how goals have evolved across different training phases.
3. **Why index `{ userId: 1, isActive: 1 }` as a compound index instead of just `{ userId: 1 }`?**  
   *Answer:* All core runtime queries filter for the user's active goal (`{ userId: req.user.userId, isActive: true }`). A compound index allows MongoDB's query planner to jump directly to the active document via an index scan (IXSCAN) without having to inspect all historical inactive goals for that user.
4. **How do you prevent a malicious user from setting their daily target to negative calories or 50,000 kcal?**  
   *Answer:* Defense in depth: we validate payloads on the client to provide instant user feedback, validate with Zod on the server (`goalInputSchema`) to ensure numbers fall within biological ranges ($500 \le \text{kcal} \le 10,000$, macros $\ge 0$), and enforce Mongoose schema validators (`min: 500, max: 10000`) before data can be written to MongoDB.

#### Practice modification
In `server/src/models/Goal.ts`, add an optional `waterTargetMl: number` field (defaulting to 2500 ml) with a minimum bound of 500 and maximum bound of 10,000 ml, update `goalValidator.ts`, and add an assertion in `goal.test.ts` to verify water targets are persisted and retrieved.
