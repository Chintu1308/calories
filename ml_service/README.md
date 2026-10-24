# Calories Standalone ML Recommendation Microservice

This folder contains the independent FastAPI microservice for our custom nutrition recommendation model.

## Standalone Deployment (Render / Docker)
1. Build the image:
   ```bash
   docker build -t calories-ml-service .
   ```
2. Run container:
   ```bash
   docker run -p 8000:8000 calories-ml-service
   ```
3. Set environment variable in the primary Express backend on Render:
   ```env
   ML_SERVICE_URL=http://calories-ml-worker:8000
   ```
If `ML_SERVICE_URL` is omitted, the Express backend automatically executes the high-performance local TypeScript engine with identical weights and zero extra hosting costs.
