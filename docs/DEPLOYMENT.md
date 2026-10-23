# Calories Deployment Specification

## 1. Hosting Architecture

| Component | Target Provider | Tier | Notes |
|---|---|---|---|
| Frontend (`client/`) | Vercel | Hobby / Free | Static SPA with Vite build output (`dist/`) |
| Backend (`server/`) | Render | Free | Node.js Express web service; sleeps after inactivity |
| AI Service (`ai-service/`) | Render | Free | Python/Node microservice with isolated environment |
| Database | MongoDB Atlas | M0 Free Cluster | Encrypted at rest, TLS in transit |

## 2. Domain & DNS Configuration
- Primary Domain: `bhhc.me`
- Application Subdomain: `calories.bhhc.me`
- **DNS Rules:**
  - Never overwrite existing root DNS records or nameservers blindly.
  - Inspect current DNS configuration before applying provider-issued CNAME or A records.
  - Enforce HTTPS and HSTS across all endpoints.

## 3. Production Environment Variables Checklist

### Backend Service (`server/`)
- `PORT`: Automatically assigned by Render or default 5000.
- `NODE_ENV`: `production`
- `CLIENT_ORIGIN`: `https://calories.bhhc.me`
- `MONGODB_URI`: Production connection string with Atlas network allowlist configured.
- `JWT_SECRET`: High-entropy 256-bit random string.
- `AI_SERVICE_URL`: Internal or external HTTPS URL of the AI microservice.

### Client Service (`client/`)
- `VITE_API_BASE_URL`: `https://api-calories.bhhc.me/api/v1` (or relative if proxied).

## 4. Security & Privacy Constraints
- All database connections require TLS 1.3.
- Sensitive environment variables are kept server-side; zero secrets in frontend builds.
- User images uploaded for AI extraction are processed in memory and discarded immediately after extraction; never persisted without explicit consent.
