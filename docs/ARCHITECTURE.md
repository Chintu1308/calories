# Calories Architecture Specification

## 1. System Overview
Calories is an editorial-grade personal nutrition and calorie tracking platform designed to provide transparent, accurate, and privacy-conscious nutrition tracking.

The system is organized as a three-tier architecture with a decoupled AI extraction microservice:
1. **Frontend Client (`client/`):** React 19 + TypeScript + Vite Single-Page Application (SPA) styled using a custom token system based on the Calories brand palette.
2. **Core Backend (`server/`):** Node.js + Express + TypeScript modular monolith exposing REST endpoints under `/api/v1`.
3. **AI Extraction Service (`ai-service/`):** Dedicated microservice boundary for multivariable image processing (nutrition label OCR / plate food recognition) using Google Gemini or alternative vision models. The AI service holds no database credentials and cannot write meals directly.
4. **Database Tier:** MongoDB (Atlas Free tier) with explicit schema validation, UTC timestamps, and compound indexing for multi-tenant data isolation.

## 2. Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (React 19 + TypeScript + Vite)"]
        UI["Branded UI (Editorial Health-Tech)"]
        State["Client State & Forms"]
        APIClient["Typed API Client"]
    end

    subgraph Backend["Core Backend (Node.js + Express Modular Monolith)"]
        CORS["CORS Allowlist & Security Headers"]
        AuthMiddleware["JWT Authentication Middleware"]
        
        subgraph Modules["Domain Modules (/api/v1)"]
            AuthMod["Auth Module (/auth)"]
            GoalsMod["Goals Module (/goals)"]
            MealsMod["Meals Module (/meals)"]
            ReportsMod["Reports Module (/reports)"]
            AIProxyMod["AI Proxy Module (/ai/extract)"]
        end
        
        Validation["Central Input Validation (Zod / Joi)"]
        ErrorHandler["Central Error & Logging Middleware"]
    end

    subgraph AI["AI Tier (Decoupled Microservice)"]
        AIService["AI Extraction Service (POST /extract)"]
        ProviderAdapter["Vision Model Adapter (Gemini)"]
    end

    subgraph Data["Persistence Tier"]
        MongoDB[("MongoDB Atlas (UTC Dates, Indexed)")]
    end

    UI --> State --> APIClient
    APIClient -->|HTTP / JSON + Bearer JWT| CORS
    CORS --> AuthMiddleware
    AuthMiddleware --> Validation
    Validation --> Modules

    MealsMod -->|Mongoose Queries| MongoDB
    GoalsMod -->|Mongoose Queries| MongoDB
    ReportsMod -->|Aggregation Pipeline| MongoDB
    AuthMod -->|User Verification| MongoDB

    AIProxyMod -->|Multipart Image Payload| AIService
    AIService --> ProviderAdapter
    ProviderAdapter -->|Structured Proposal Only| AIService
    AIService -->|Proposed Nutrients + Confidence| AIProxyMod
    AIProxyMod -->|Editable Proposal| APIClient
    APIClient -->|User Confirmed Meal| MealsMod
```

## 3. Core Architectural Boundaries & Principles

### A. Modular Monolith Backend
All primary domain logic (Authentication, Goals, Meals, Reports) resides within the same Express application under `server/src/modules/`. This design minimizes deployment complexity, eliminates distributed transaction overhead, and provides single-process performance while maintaining clean directory boundaries for eventual microservice extraction if needed.

### B. AI Microservice Boundary
- The AI service performs stateless image analysis only.
- The AI service has **no database credentials** and cannot commit records directly to the database.
- AI responses represent a **proposal only** (including estimated calories, macros, quantity, confidence rating, and warnings).
- The proposal must be reviewed and editable by the end user before being saved to MongoDB via the standard `POST /api/v1/meals` endpoint.

### C. Authentication & Tenant Isolation
- Every request to private endpoints must bear a valid JWT.
- User identity (`userId`) is derived **exclusively** from the verified JWT payload on the server.
- The server **never** trusts `userId` supplied in the request body, query parameters, or URL path.
- All MongoDB queries filter on `{ userId: req.user.id }` to guarantee complete multi-tenant data isolation.

### D. Timezone & Timestamp Standard
- All stored dates (`eatenAt`, `createdAt`, `updatedAt`) are stored strictly in ISO 8601 UTC format.
- Timezone offsets are communicated from the client via headers (`X-Timezone`) or query parameters to support accurate localized grouping for daily and weekly reports.

### E. Workspace Scripts & Task Orchestration
The monorepo uses root `package.json` scripts (`--prefix client`, `--prefix server`) to orchestrate tasks without hoisting client browser dependencies and Node backend dependencies into a shared conflict-prone root node_modules directory.
