# Calories — Personal Nutrition & Calorie Tracking Platform

> **"Your nutrition, made clearer."**  
> Editorial Health-Tech design with complete nutritional clarity, transparent tracking, and privacy-conscious AI assistance.

---

## 1. Project Overview
Calories is a full-stack personal nutrition and calorie tracking platform built for high reliability, multi-tenant security, and real-time nutritional insights. Unlike generic calorie counters, Calories pairs precise macro/micronutrient tracking with editable AI-assisted logging, clear goal-versus-actual reporting, and robust cross-user data isolation.

Target Subdomain: `calories.bhhc.me`  
Target Delivery Deadline: Monday, 26 October 2026, 8:00 AM IST

---

## 2. Core Feature Scope

1. **Goal Setting:** Create and persist custom daily calorie, protein, carbohydrate, fat, and target weight goals. Scoped strictly to the authenticated user.
2. **Meal Entry Management:** CRUD food entries categorized by Breakfast, Lunch, Dinner, and Snacks (with Brunch and Intermediate support). Full macro breakdown, explicit units, optional micronutrients (missing = unknown, not zero), and manual or AI source attribution.
3. **Time-Range Listing & Filtering:** Filter entries by UTC date ranges and meal types with stable server-side pagination.
4. **Nutritional Reports & Aggregations:** Aggregates real MongoDB records into weekly calorie trends, macro distribution charts, micronutrient summaries, and goal-vs-actual comparison charts.
5. **AI-Powered Calorie Extraction:** Upload food photos or nutrition labels to receive structured nutrient proposals with uncertainty warnings. Entries are saved only after user review and confirmation.

---

## 3. Brand Identity & Design System

The visual design is rooted in the **Premium Editorial Health-Tech** design aesthetic:
- **Ink Navy (`#152238`):** High-contrast text, borders, dark cards.
- **Forest Green (`#285B46`):** Primary actions, call-to-actions, confirmation states.
- **Sage Green (`#BFD8C2`):** Progress bars, active status accents, soft indicators.
- **Warm Ivory (`#FAF9F6`):** Primary page background, editorial paper feel.
- **White (`#FFFFFF`):** Surface card backgrounds, input backings.
- **Soft Sand (`#EDE5D8`):** Secondary chips, neutral separators, subtle highlights.
- **Muted Slate (`#6B7280`):** Secondary metadata, timestamps, captions.
- **Amber (`#C88932`):** Warnings, incomplete goals, AI confidence notices.
- **Error Red (`#B84444`):** Error banners, destructive actions.

---

## 4. Architecture & Stack Rationale

```
calories/
├── client/          # React 19 + TypeScript + Vite SPA
├── server/          # Node.js + Express + TypeScript modular monolith
├── ai-service/      # Dedicated AI extraction microservice boundary
├── docs/            # Architecture, API, Data Model, Testing, Developer Notes
├── .env.example     # Template environment variables
└── package.json     # Root orchestration scripts
```

- **Frontend:** React 19, TypeScript, Vite. Ensures fast iteration, standard hooks, and sub-second HMR.
- **Backend:** Node.js, Express, TypeScript modular monolith. Minimizes deployment complexity while cleanly organizing domains (`auth`, `goals`, `meals`, `reports`, `ai`).
- **Database:** MongoDB Atlas with Mongoose. Dynamic schemas support optional micronutrients while compound indexes ensure fast user-scoped queries.
- **AI Microservice:** Isolated microservice with no direct database access. Protects the core API from external AI latency and failures.

---

## 5. Prerequisites

- **Node.js:** v22.16.0 or higher
- **npm:** 10.9.2 or higher
- **Git:** 2.40 or higher
- **MongoDB:** MongoDB Atlas Free Cluster or local MongoDB instance (v7.0+)

---

## 6. Local Setup & Execution

### 1. Clone & Install Dependencies
```powershell
# Clone repository
git clone <repo-url>
cd calories

# Install backend dependencies
cd server
npm install
cd ..

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env` and adjust settings:
```powershell
Copy-Item .env.example server\.env
```

### 3. Run Development Servers
From the root workspace directory:
```powershell
# Run frontend dev server (http://localhost:5173)
npm run dev:client

# Run backend API server (http://localhost:5000)
npm run dev:server
```

---

## 7. Verification & Quality Scripts

Run from the root directory:
```powershell
# Run linters across client and server
npm run lint

# Run strict TypeScript typechecks across client and server
npm run typecheck

# Run automated backend test suite
npm test

# Build production bundles
npm run build
```

---

## 8. API Summary (`/api/v1`)

| Method | Route | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health check | No |
| `POST` | `/api/v1/auth/register` | Register new user account | No |
| `POST` | `/api/v1/auth/login` | Authenticate user & get JWT | No |
| `GET` | `/api/v1/goals` | Fetch active user nutrition targets | Yes |
| `PUT` | `/api/v1/goals` | Update daily nutrition targets | Yes |
| `POST` | `/api/v1/meals` | Record a new meal | Yes |
| `GET` | `/api/v1/meals` | List meals (paginated & filtered) | Yes |
| `GET` | `/api/v1/meals/:id` | Get single meal by ID | Yes |
| `PATCH` | `/api/v1/meals/:id` | Update meal | Yes |
| `DELETE` | `/api/v1/meals/:id` | Delete meal | Yes |
| `GET` | `/api/v1/reports/*` | Weekly calorie, macro, micronutrient aggregations | Yes |
| `POST` | `/api/v1/ai/extract` | Extract nutrients from image (proposal only) | Yes |

---

## 9. Security & Privacy Guarantees
- **Zero Secrets in Frontend:** API keys and database credentials reside strictly on the backend.
- **Tenant Isolation:** All database queries are filtered by `req.user.id` derived from verified JWTs. `userId` from request bodies is never trusted.
- **AI Safety:** Image uploads are processed ephemerally in-memory. AI extracts proposals only; records are written only when the user reviews and confirms.
- **Sanitized Errors:** Internal stack traces and database details are suppressed in production responses.

---

## 10. Known Limitations
- AI extraction accuracy depends on image lighting and angle; all AI suggestions are presented with confidence ratings and must be confirmed.
- Free-tier Render web services sleep after 15 minutes of inactivity; initial cold starts may take up to 45 seconds.
