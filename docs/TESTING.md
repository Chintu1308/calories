# Calories Testing Strategy & Verification Guide

## 1. Testing Philosophy
- **Never claim a test passed without running it.**
- Automated tests run against real code without mocks wherever practical.
- Ephemeral ports (`port: 0`) and in-memory or isolated test databases ensure tests are non-destructive and isolated.
- Mock external AI providers in automated tests; clearly label mocks as mocks.

## 2. Test Pyramid
1. **Unit Tests:** Pure functions (e.g., date calculations, nutrition aggregations, validation schemas).
2. **API Integration Tests:** Express routes tested with ephemeral HTTP servers verifying status codes, headers, and payload structures.
3. **Cross-User Isolation Tests:** Explicit multi-user tests asserting that User A cannot read, edit, or delete User B's meals or goals.
4. **End-to-End / Smoke Tests:** Health check verification and end-to-end user flows.

## 3. Verification Commands

### All Tests & Quality Checks (Root Workspace)
```powershell
# Run all lints (client + server)
npm run lint

# Run all TypeScript typechecks (client + server)
npm run typecheck

# Run server automated tests
npm test

# Run full production build
npm run build
```

### Server Tests
```powershell
cd server
npm test
npm run typecheck
npm run lint
```

### Client Checks
```powershell
cd client
npm run lint
npm run build
```

## 4. Current Test Suite Status
- `server/src/app.test.ts`:
  - `GET /api/v1/health` -> HTTP 200 OK + payload contract. (PASS)
  - `GET /api/v1/non-existent-endpoint` -> HTTP 404 + error contract. (PASS)
- Client build & lint:
  - Oxlint: 0 errors, 0 warnings. (PASS)
  - TypeScript 6.0 + Vite: Production build clean. (PASS)
