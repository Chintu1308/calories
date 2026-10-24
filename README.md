# Calories — Personal Nutrition & Calorie Tracking Platform

> **"Your nutrition, made clearer."**  
> Editorial Health-Tech design with complete nutritional clarity, transparent tracking, and privacy-conscious AI assistance.

---

## 1. Project Overview
Calories is a full-stack personal nutrition and calorie tracking platform engineered for high reliability, multi-tenant security, and real-time nutritional insights. Built adhering to the **Premium Editorial Health-Tech** design aesthetic, Calories pairs precise macro and micronutrient tracking with editable AI-assisted vision logging, goal-versus-actual compliance charting, and strict multi-tenant cryptographic isolation.

- **Target Domain:** `calories.bhhc.me`
- **Target Deadline:** Monday, 26 October 2026, 8:00 AM IST
- **Current Test Coverage:** 45/45 automated integration tests passing (Node 22 native test runner)

---

## 2. Core Pillars & Features

1. **Onboarding & Baseline Health Profile:**
   - Captures height ($cm$), weight ($kg$), target timeframe, food allergies, and stored daily supplements.
   - Profile supplements persist permanently to eliminate tedious daily re-entry.
2. **Personal Nutrition Targets (Goal Setting):**
   - Configures daily calories ($500 \le \text{kcal} \le 10,000$), protein, carbohydrates, fat, target weight, and weight unit.
   - Supports idempotent upserting (`PUT /api/v1/goals`) and chronological milestone archiving (`POST /api/v1/goals`).
   - Browser refresh persistence guarantees customized targets load automatically.
3. **Dual-Option Meal Logging & CRUD:**
   - Option A: "Take / Upload Photo" (dish name + photo review).
   - Option B: "Add Manually" (exact portion quantities and macronutrients).
   - Category filtering (Breakfast, Lunch, Dinner, Snacks, Brunch, Intermediate) and UTC date boundaries.
4. **Deterministic Server-Side Pagination:**
   - Multi-page cursor stability with compound tie-breaker `{ eatenAt: -1, _id: -1 }`.
   - Hard cap of 100 items per page to prevent denial-of-service memory exhaustion.
5. **Real-Time Database Aggregations & Analytics:**
   - 7-day dense calorie trajectory with goal threshold comparison.
   - Atwater energy percentage distribution ($4\text{ kcal/g}$ protein/carbs, $9\text{ kcal/g}$ fat) grouped by day or week.
   - Honest absence micronutrient aggregation: omitted vitamins/minerals are never falsified as zero.
6. **Reviewed AI Nutrition Extraction & Contextual Fit:**
   - Multipart photo uploads processed entirely in ephemeral memory buffers (no images stored on disk).
   - Evaluates: "Is it good according to the current status of today?" by checking remaining calories and screening profile allergies.
   - Strict safety invariant: extraction returns an uncommitted proposal only; saves occur exclusively after user confirmation.
7. **Executive Clinical PDF & Data Export:**
   - Printable PDF clinical nutrition report with adherence charts, macro split, supplements, and logged meals.
   - JSON export for complete user data portability.
8. **Bespoke Health-Tech HTTP Error Suite:**
   - Branded diagnostic error pages for HTTP 400, 401, 402, 403, 404, 500, and 503 with technical detail boxes and recovery action buttons.

---

## 3. Brand Identity & Design System

The platform strictly uses the **Premium Editorial Health-Tech** color palette:
- **Ink Navy (`#152238`):** Deep editorial typography, borders, high-contrast containers.
- **Forest Green (`#285B46`):** Primary branding, CTA buttons, success indicators.
- **Sage Green (`#BFD8C2`):** Calorie progress rings, active tab accents, secondary fills.
- **Warm Ivory (`#FAF9F6`):** Main application canvas, paper feel.
- **White (`#FFFFFF`):** High-density cards, modal dialog surfaces.
- **Soft Sand (`#EDE5D8`):** Divider rules, category tags, subtle borders.
- **Muted Slate (`#6B7280`):** Timestamps, macro units, secondary captions.
- **Amber (`#C88932`):** Approaching calorie budget warnings, AI confidence notices.
- **Error Red (`#B84444`):** Allergen collisions, validation errors, budget overruns.

---

## 4. Architecture & Stack Rationale

```
calories/
├── client/          # React 19 + TypeScript + Vite SPA
├── server/          # Node.js 22 + Express 4 + TypeScript modular monolith
├── docs/            # Architecture, Data Model, API, Progress, Developer Notes
├── render.yaml      # Infrastructure as Code deployment descriptor
├── Dockerfile       # Production multi-stage container build
├── .env.example     # Template environment variables
└── package.json     # Workspace orchestration scripts
```

- **Frontend (Client):** React 19, TypeScript, Vite. Sub-second Hot Module Replacement (HMR), zero CSS framework overhead, bespoke SVG iconography.
- **Backend (Server):** Node.js 22, Express, TypeScript. Clean domain-driven modular routing (`auth`, `goals`, `meals`, `reports`, `ai`).
- **Database:** MongoDB Atlas with Mongoose. Schemas enforce multi-tenant scoping and compound indexes for fast timeline queries.
- **Testing:** Node 22 native test runner (`node:test`, `node:assert/strict`) paired with `mongodb-memory-server` for genuine isolated in-memory database testing without Docker or network dependencies.
- **Linter:** `oxlint` (runs 116 strict rules in under 40ms across 56 files).

---

## 5. Environment Variables

Create `server/.env` based on `.env.example`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `5000` | HTTP port for the backend server |
| `NODE_ENV` | String | `development` | Runtime environment (`development`, `test`, `production`) |
| `CLIENT_ORIGIN` | String | `http://localhost:5173` | Allowed CORS origins (comma-separated for multiple) |
| `MONGODB_URI` | String | `mongodb://127.0.0.1:27017/calories` | MongoDB connection URI (local or Atlas) |
| `JWT_SECRET` | String | Required | Minimum 32-character secret for HMAC-SHA256 JWT signing |
| `GEMINI_API_KEY` | String | Optional | Google Gemini Vision API key for AI food extraction |
| `AI_SERVICE_URL` | String | Optional | URL for isolated AI microservice (if running externally) |

> [!CAUTION]
> Never commit `.env` or real API keys to version control. The repository `.gitignore` strictly excludes `.env` files.

---

## 6. Local Setup & Execution

### Prerequisites
- **Node.js:** v22.16.0 or higher
- **npm:** 10.9.2 or higher
- **Git:** 2.40 or higher

### Step 1: Install Dependencies
```powershell
# From root workspace directory:
npm install --prefix client
npm install --prefix server
```

### Step 2: Configure Environment
```powershell
Copy-Item .env.example server\.env
```

### Step 3: Run Development Servers
```powershell
# Terminal 1: Frontend SPA (http://localhost:5173)
npm run dev:client

# Terminal 2: Backend API (http://localhost:5000)
npm run dev:server
```

---

## 7. Verification & Automated Quality Suite

Run from the root directory:
```powershell
# 1. Run ultra-fast linters across client & server (0 warnings, 0 errors)
npm run lint

# 2. Run TypeScript strict typecheck & bundle production builds
npm run typecheck

# 3. Run all 45 automated integration and multi-tenant isolation tests
npm test

# 4. Build both client and server for production deployment
npm run build
```

---

## 8. API Summary (`/api/v1`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Health ping & live MongoDB readyState | No |
| `POST` | `/api/v1/auth/register` | Register user with onboarding metrics | No |
| `POST` | `/api/v1/auth/login` | Login and receive Bearer JWT | No |
| `GET` | `/api/v1/auth/me` | Retrieve authenticated user profile | Yes |
| `GET` | `/api/v1/goals` | Retrieve active nutrition targets | Yes |
| `PUT` | `/api/v1/goals` | Idempotent atomic upsert of active goal | Yes |
| `POST` | `/api/v1/goals` | Archive prior goal & create new active goal | Yes |
| `GET` | `/api/v1/goals/history` | Chronological list of historical goals | Yes |
| `POST` | `/api/v1/meals` | Record a new meal entry | Yes |
| `GET` | `/api/v1/meals` | Paginated meal entries (`page`, `limit`, filters) | Yes |
| `GET` | `/api/v1/meals/:id` | Fetch single meal (tenant ownership verified) | Yes |
| `PATCH` | `/api/v1/meals/:id` | Update meal entry | Yes |
| `DELETE` | `/api/v1/meals/:id` | Delete meal entry | Yes |
| `GET` | `/api/v1/reports/weekly-calories` | 7-day dense calorie trajectory | Yes |
| `GET` | `/api/v1/reports/macros` | Macro totals & Atwater energy split (day/week) | Yes |
| `GET` | `/api/v1/reports/micronutrients` | Honest absence micronutrient aggregation | Yes |
| `GET` | `/api/v1/reports/goals` | Actual averages vs goal compliance rate | Yes |
| `POST` | `/api/v1/ai/extract` | Multipart image vision extraction (proposal only) | Yes |

---

## 9. Data Model & Index Strategy

All collections enforce tenant isolation via `userId`. Timestamps are in ISO 8601 UTC.

- **`users` Collection:**
  - `email` (unique index), `passwordHash` (`select: false`), `name`, `heightCm`, `currentWeightKg`, `targetWeightKg`, `targetWeeks`, `allergies[]`, `supplements[]`.
- **`goals` Collection:**
  - `userId` (ref `User`), `dailyCaloriesKcal` ($500..10000$), `proteinGrams`, `carbohydrateGrams`, `fatGrams`, `targetWeight`, `weightUnit`, `isActive`.
  - **Index:** `{ userId: 1, isActive: 1 }` (compound index for instant active-goal resolution).
- **`meals` Collection:**
  - `userId`, `foodName`, `mealType`, `eatenAt`, `quantity:{amount, unit}`, `nutrition:{caloriesKcal, proteinG, carbsG, fatG}`, `micronutrients[]`, `source: 'manual'|'ai'`.
  - **Indexes:** `{ userId: 1, eatenAt: -1 }` (diary timeline) & `{ userId: 1, mealType: 1, eatenAt: -1 }` (category filtering).

---

## 10. Deployment

### Render Infrastructure as Code (`render.yaml`)
The project includes a `render.yaml` blueprint defining:
1. **Web Service (`calories-server`):** Node.js 22 server running `npm start --prefix server`.
2. **Static Site (`calories-client`):** Static React bundle built via `npm run build --prefix client`.

### Vercel / Netlify Deployment
The `client/vercel.json` provides rewrite routing rules redirecting all routes to `/index.html` for client-side routing.

---

## 11. Security, Privacy & AI Caveats

- **Zero Secrets in Frontend:** API keys and database credentials reside strictly on the backend.
- **Tenant Isolation:** All database queries are filtered by `req.user.userId` derived from verified JWT claims. Request body `userId` is never trusted.
- **Ephemeral Image Processing:** Uploaded food photos are processed in RAM memory buffers and immediately dropped. Raw images are never saved to disk or database.
- **AI Proposal Invariant:** AI extraction returns uncommitted proposals only. Entries are committed to MongoDB exclusively when the user confirms via `POST /api/v1/meals`.
- **Honest Absence:** Unreported micronutrients are omitted rather than defaulted to zero.
- **Asset Attribution:** Calories logo and icons were created for this platform in accordance with the brand specification.
