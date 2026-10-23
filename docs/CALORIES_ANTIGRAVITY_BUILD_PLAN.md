# CALORIES — Antigravity Build Plan & Developer Handoff

**Product:** Calories — Personal Nutrition & Calorie Tracking Platform  
**Tagline:** Your nutrition, made clearer.  
**Domain:** `bhhc.me` (proposed app subdomain: `calories.bhhc.me`)  
**Deadline:** Monday, 26 October 2026, 8:00 AM IST

## 0. Instructions to Antigravity

This is a student-owned project. The student must understand and explain the implementation in a live interview. Do not generate an opaque codebase in one pass.

For every stage:
1. State the goal, files to change, reasons, acceptance criteria and verification commands before coding.
2. Implement only that stage.
3. Run lint, type-check, tests and production build as applicable. Fix failures before claiming success.
4. Update `docs/DEVELOPER_NOTES.md`, `docs/PROGRESS.md`, and `docs/DECISIONS.md`.
5. Explain changed code in beginner-friendly detail: imports, types, functions, parameters, return values, control flow, data flow, validation, error paths and alternatives.
6. Give a short interview explanation, 3–5 likely interview questions and one practice modification.
7. Make a separate meaningful Git commit for each verified stage. Show the diff summary and commit hash.
8. Never fabricate test output, deployment success, AI accuracy or security guarantees.
9. Check `git status` before editing and committing. Inspect `git diff --cached`. Never commit secrets, `.env`, private images or credentials. Do not blindly run `git add .`.
10. Keep code conventional and readable. The student wants to learn every important line; do not hide logic behind unnecessary abstractions.
11. Preserve existing work. Start by auditing the workspace and current Git state.
12. Do not move to the next stage until the current stage is verified and explained. Deadline is tight, so prioritize required features over optional ones.

Commit convention: `type(scope): description`, such as `feat(meals): implement meal entry management`. Suggested types: `chore`, `docs`, `feat`, `fix`, `test`, `style`, `refactor`.

## 1. Required product scope

### A. Goal setting
Create and manage daily calorie, protein, carbohydrate, fat and weight targets. Persist targets, validate values, scope them to the authenticated user, and use them in goal-vs-actual reports. Do not imply targets are medical advice.

### B. Meal entry
CRUD food entries grouped by Breakfast, Lunch, Dinner and Snacks. Brunch and Intermediate Meal may be supported as extra categories. Each entry has food name, quantity amount/unit, consumed timestamp, calories (kcal), protein/carbs/fat (grams), optional micronutrients with explicit units, source (`manual` or `ai`), and optional notes. Validate all numeric values as finite and non-negative within sensible bounds. Missing micronutrients are unknown, not zero.

### C. Time-range listing
Filter entries by date range and meal type. Use stable sorting and server-side pagination on every list API. Validate date range and maximum page size. Store timestamps in UTC and document user-timezone handling.

### D. Reports
Implement weekly calorie trend, macro breakdown by day/week, micronutrient summary, and goal-vs-actual charts. Reports must aggregate persisted data, not hardcoded frontend arrays. Clearly represent missing data and units. Charts need legends, accessible text, loading and empty states.

### E. AI-powered calorie extraction
Accept a nutrition-label photo or plate-of-food image. AI returns structured proposed values, estimated quantity, confidence/uncertainty and warnings. Display an editable review form; only save after user confirmation through the normal meal API. Validate upload MIME and size, handle timeouts/provider failures, keep keys server-side, do not log image contents, and do not claim AI is always accurate. If no provider key exists, manual entry must still work and the UI must clearly say AI is unavailable. Mock responses only in tests and label them as mocks.

Optional only after A–E: supplements/medicines, reminders, chat assistant, bulk PDF import. Authentication and ownership must be implemented early enough that user data is safe.

## 2. Brand/design specification

**Brand:** Calories  
**Tagline:** “Your nutrition, made clearer.”  
**Style:** Premium Editorial Health-Tech. Calm, clean, clear, encouraging, privacy-aware. Learn from consistent multi-channel brand systems, but do not copy Typeface's logo, proprietary assets, exact layouts or campaigns.

### Colors
- Ink Navy `#152238` — text, dark surfaces
- Forest Green `#285B46` — primary actions
- Sage Green `#BFD8C2` — progress accents
- Warm Ivory `#FAF9F6` — page background
- White `#FFFFFF` — cards
- Soft Sand `#EDE5D8` — secondary surfaces
- Muted Slate `#6B7280` — secondary text
- Amber `#C88932` — caution/incomplete
- Error Red `#B84444` — errors/destructive state

These are starting tokens; check contrast and accessibility. Never communicate state by color alone.

### Type and components
Use Inter or a system fallback. Body text normally 14–16px. Spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px. Radii: 8, 12, 18, 24px. Use clean surfaces, restrained borders/shadows, responsive layouts, semantic labels, visible keyboard focus, reduced-motion support and chart legends. Avoid excessive gradients, glassmorphism, gratuitous animations and generic “AI glow” visuals.

Create original SVG wordmark/icon/favicons if possible. A composite generated style-board is only a visual reference; its cropped PNG elements are not production vector logos. If the reference file isn't in the workspace, use the written tokens rather than claiming to inspect it. Keep assets under `client/public/brand/`.

Dashboard hierarchy: date/greeting, calorie progress, macro progress, meal timeline/Add Meal, weekly trends, secondary insights. AI flow: upload → processing → editable extracted results/uncertainty → user confirmation → normal meal API.

## 3. Architecture

### Frontend
React + TypeScript + Vite. Use React Router only if needed. Use one chart library (e.g. Recharts). Keep components readable and typed. No API secrets in client code.

### Main backend
Node.js + Express + TypeScript modular monolith. Modules: auth, goals, meals, reports, AI proxy/uploads. API prefix `/api/v1`. Central validation and error handling, CORS allowlist, body-size limits, safe logging and rate limits on auth/upload routes where practical.

### Database
MongoDB Atlas Free if an eligible free cluster is available. Choose Mongoose OR the official MongoDB driver; do not mix both. Document why. Store UTC dates and explicit units. Add indexes for user/date/category queries. Every record has owner identity and every query scopes to verified authenticated user ID. Never trust a `userId` from request body/query for authorization. Restrict Atlas network access as narrowly as possible. Never commit connection strings.

### Authentication
Choose a manageable provider after checking current free-tier availability. If using Supabase Auth with MongoDB, Supabase is the identity provider only: Express verifies the JWT and derives user ID from the verified token. Do not create a second password system. If using local password auth, use established password hashing, safe token/cookie handling, validation, rate limits and reset flow. Do not claim multi-user security until cross-user isolation tests pass.

### AI service
Separate `ai-service/` process with a narrow API contract such as `POST /extract`. Main backend is the only caller. AI service has no database credentials and cannot write meals. Use a provider adapter and server-side key. Verify model availability/pricing/quota before selecting a provider. Main backend validates all AI output.

### Deployment
Possible demo setup: Vercel Hobby frontend, Render Free main API/AI service, MongoDB Atlas Free. Verify current terms, quotas and limitations. Render free services can sleep; AI may incur separate costs. HTTPS required. Configure `calories.bhhc.me` only using provider-issued DNS records after inspecting existing DNS. Do not overwrite nameservers or existing records blindly. Do not call the demo production-grade.

## 4. Suggested repository structure

```text
calories/
├── client/
│   ├── public/brand/
│   └── src/
│       ├── app/
│       ├── components/{ui,layout,meals,goals,reports,ai}/
│       ├── features/
│       ├── pages/
│       ├── services/
│       ├── hooks/
│       ├── types/
│       ├── styles/{calories.css,globals.css}
│       ├── App.tsx
│       └── main.tsx
├── server/src/
│   ├── config/
│   ├── middleware/
│   ├── modules/{auth,goals,meals,reports,ai}/
│   ├── db/
│   ├── utils/
│   ├── app.ts
│   └── server.ts
├── ai-service/src/{providers,schemas,routes}/
├── docs/{DEVELOPER_NOTES.md,ARCHITECTURE.md,API.md,DATA_MODEL.md,DECISIONS.md,TESTING.md,DEPLOYMENT.md,PROGRESS.md}
├── .gitignore
├── .env.example
└── README.md
```
Do not create empty directories just to match this diagram; add structure when required.

## 5. Data model outline

**Goal:** `_id`, `userId`, `dailyCaloriesKcal`, `proteinGrams`, `carbohydrateGrams`, `fatGrams`, optional `targetWeight`/`weightUnit`, timestamps. Decide whether goal history is retained; document the choice.

**Meal:** `_id`, `userId`, `eatenAt` (UTC), `mealType`, `foodName`, `quantity:{amount,unit}`, `nutrition:{caloriesKcal,proteinG,carbsG,fatG}`, optional `micronutrients` with name/amount/unit, `source: manual|ai`, optional notes and AI review metadata, timestamps. Do not retain original images by default.

**Indexes:** `{ userId, eatenAt }` and optionally `{ userId, mealType, eatenAt }`.

## 6. API outline

All private endpoints require verified authentication. Every list API is paginated. Use a consistent error format.

Goals:
- `GET /api/v1/goals`
- `PUT /api/v1/goals`

Meals:
- `POST /api/v1/meals`
- `GET /api/v1/meals?start=...&end=...&mealType=...&page=1&limit=20`
- `GET /api/v1/meals/:id`
- `PATCH /api/v1/meals/:id`
- `DELETE /api/v1/meals/:id`

Reports:
- `GET /api/v1/reports/weekly-calories?weekStart=...`
- `GET /api/v1/reports/macros?start=...&end=...&groupBy=day|week`
- `GET /api/v1/reports/micronutrients?start=...&end=...`
- `GET /api/v1/reports/goals?start=...&end=...`

AI:
- `POST /api/v1/ai/extract` (multipart)
- Return a proposal only; save only via normal `POST /api/v1/meals` after review.

## 7. Stages and meaningful commits

**Stage 0 — Audit existing workspace**
Inspect current directory, `git status`, Node/npm/Git, existing files. Preserve user work. Record baseline. Commit only if there is meaningful change.
Potential commit: `docs(setup): record project baseline`

**Stage 1 — Scaffold and docs**
Set up client/server if missing, strict TS, scripts, `.gitignore`, `.env.example`, README, architecture/docs templates. Run install, lint, typecheck and build.
Commit: `chore(setup): scaffold client and server`

**Stage 2 — Brand and tokens**
Original SVG logo/favicon, CSS tokens, base styles, reusable buttons/fields/cards/badges/progress. Test build and responsive views.
Commit: `feat(brand): add Calories identity and design tokens`

**Stage 3 — App shell/static dashboard**
Responsive navigation, fictional sample data clearly marked temporary, summary cards, progress, meal timeline, chart placeholder, empty/loading/error states.
Commit: `feat(ui): build branded dashboard shell`

**Stage 4 — Express/MongoDB**
Environment validation, Express app, DB connection, health endpoint, error middleware, CORS allowlist, indexes.
Commit: `feat(server): configure Express and MongoDB`

**Stage 5 — Auth and ownership**
Verified identity, user ID derived server-side, cross-user isolation tests.
Commit: `feat(auth): enforce authenticated user access`

**Stage 6 — Goals**
Schema, validation, service, routes, UI form and persisted goal summary.
Commit: `feat(goals): add personal nutrition targets`

**Stage 7 — Meal CRUD**
Schema, service, validation, routes, add/edit/delete form, units and daily totals.
Commit: `feat(meals): implement meal entry management`

**Stage 8 — Filters/pagination**
Date/category filters, stable sorting, max page size and pagination UI.
Commit: `feat(meals): add date filters and pagination`

**Stage 9 — Reports**
Real database aggregates, weekly calories, macro day/week, micronutrients and goal comparisons; test fixtures and empty states.
Commit: `feat(reports): add nutrition charts and summaries`

**Stage 10 — AI extraction**
Separate provider adapter/service, validated upload, timeout/failure handling, editable preview and confirm-to-save.
Commit: `feat(ai): add reviewed nutrition image extraction`

**Stage 11 — Polish/docs/deploy**
Accessibility, responsive review, docs, env example, smoke tests, deploy and domain only after verified local build.
Commits: `docs(project): complete developer and setup documentation`, `chore(deploy): add deployment configuration`

## 8. Acceptance checklist

- [ ] Goals create/edit/persist and load after refresh.
- [ ] Meal create/list/edit/delete works.
- [ ] Categories, quantities, numeric values and units are validated.
- [ ] Date range and meal filters work together.
- [ ] All list APIs paginate on the server.
- [ ] Weekly calorie chart uses persisted data.
- [ ] Macro chart supports day/week grouping.
- [ ] Micronutrient summary handles missing values honestly.
- [ ] Goal-versus-actual chart uses saved goals and meals.
- [ ] Label and plate uploads prefill an editable form.
- [ ] AI output is never saved without validation and confirmation.
- [ ] User A cannot access User B's records.
- [ ] Manual logging works when AI is unavailable.
- [ ] Desktop/mobile layouts and keyboard navigation work.
- [ ] README has real setup commands and all environment variables.
- [ ] No secrets or private images in Git.
- [ ] Every commit has actual verification evidence.

## 9. Developer notes requirement

For every stage update `docs/DEVELOPER_NOTES.md` with:

- What was built and why.
- Every changed file and its responsibility.
- Imports and why they are used.
- Important variables, interfaces, functions, parameters and return types.
- Line-by-line or small-block explanation for non-trivial code.
- Request/data flow from UI through API to DB and back.
- Validation, authorization, error paths and debugging.
- Exact commands run and actual results.
- Known limitations.
- A 30–90 second interview explanation.
- 3–5 likely interview questions with answers.
- One small practice change for the student.

Comments should explain intent, non-obvious behavior and security constraints, not mechanically repeat syntax on every line. Put detailed teaching in developer notes.

## 10. README must contain

Overview, features, screenshots, architecture, stack rationale, prerequisites, local setup, environment variables, how to run each service, API summary, pagination, data model, tests, deployment, security/privacy decisions, limitations, AI model/cost caveats, asset attribution.

## 11. Start instruction

Begin by auditing the workspace and Git status. Do not overwrite existing files. Report the current state, then propose Stage 1 with the exact files and commands. Implement only Stage 1. Run actual checks, update docs, explain the code, and make one verified commit. Continue in small stages; prioritize the five required features over optional bonuses because of the deadline.
