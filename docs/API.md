# Calories REST API Specification

**Base URL:** `/api/v1`  
**Standard Format:** JSON (`application/json`)  
**Authentication:** HTTP Bearer Token (`Authorization: Bearer <jwt_token>`)

---

## 1. System Endpoints

### `GET /api/v1/health`
Health check endpoint to verify server status and version.

- **Auth Required:** No
- **Response 200 OK:**
```json
{
  "status": "ok",
  "service": "calories-server",
  "version": "0.1.0",
  "timestamp": "2026-10-23T18:00:00.000Z"
}
```

---

## 2. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Create a new user account.
- **Body:** `{ "email": "user@example.com", "password": "securePassword123!", "name": "Jane Doe" }`
- **Response 201 Created:** `{ "token": "<jwt>", "user": { "id": "...", "email": "...", "name": "..." } }`

### `POST /api/v1/auth/login`
Authenticate existing user.
- **Body:** `{ "email": "user@example.com", "password": "securePassword123!" }`
- **Response 200 OK:** `{ "token": "<jwt>", "user": { "id": "...", "email": "...", "name": "..." } }`

### `GET /api/v1/auth/me`
Retrieve authenticated user profile.
- **Auth Required:** Yes
- **Response 200 OK:** `{ "user": { "id": "...", "email": "...", "name": "..." } }`

---

## 3. Goals Endpoints (`/api/v1/goals`)

### `GET /api/v1/goals`
Retrieve user's active nutritional targets.
- **Auth Required:** Yes
- **Response 200 OK:**
```json
{
  "goal": {
    "id": "67195f1...",
    "userId": "user_123",
    "dailyCaloriesKcal": 2200,
    "proteinGrams": 150,
    "carbohydrateGrams": 220,
    "fatGrams": 70,
    "targetWeight": 72.5,
    "weightUnit": "kg",
    "updatedAt": "2026-10-23T12:00:00.000Z"
  }
}
```

### `PUT /api/v1/goals`
Create or update daily targets.
- **Auth Required:** Yes
- **Body:**
```json
{
  "dailyCaloriesKcal": 2200,
  "proteinGrams": 150,
  "carbohydrateGrams": 220,
  "fatGrams": 70,
  "targetWeight": 72.5,
  "weightUnit": "kg"
}
```
- **Response 200 OK:** Updated goal record.

---

## 4. Meals Endpoints (`/api/v1/meals`)

### `POST /api/v1/meals`
Record a new meal or food item.
- **Auth Required:** Yes
- **Body:**
```json
{
  "foodName": "Oatmeal with Blueberries and Almonds",
  "mealType": "Breakfast",
  "eatenAt": "2026-10-23T08:30:00.000Z",
  "quantity": {
    "amount": 250,
    "unit": "g"
  },
  "nutrition": {
    "caloriesKcal": 380,
    "proteinG": 14,
    "carbsG": 58,
    "fatG": 11
  },
  "micronutrients": [
    { "name": "Fiber", "amount": 8, "unit": "g" },
    { "name": "Vitamin C", "amount": 12, "unit": "mg" }
  ],
  "source": "manual",
  "notes": "Added half a scoop of plant protein"
}
```
- **Response 201 Created:** Created meal object with `_id` and `userId`.

### `GET /api/v1/meals`
List paginated meals with optional filters.
- **Auth Required:** Yes
- **Query Parameters:**
  - `start` (ISO 8601 UTC date string, optional)
  - `end` (ISO 8601 UTC date string, optional)
  - `mealType` (`Breakfast` | `Lunch` | `Dinner` | `Snacks`, optional)
  - `page` (integer >= 1, default `1`)
  - `limit` (integer 1..100, default `20`)
- **Response 200 OK:**
```json
{
  "data": [ /* Array of meal items */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### `GET /api/v1/meals/:id`
Fetch single meal by ID.
- **Auth Required:** Yes
- **Response 200 OK:** Meal object.

### `PATCH /api/v1/meals/:id`
Update an existing meal.
- **Auth Required:** Yes
- **Body:** Partial meal fields to update.
- **Response 200 OK:** Updated meal object.

### `DELETE /api/v1/meals/:id`
Delete a meal by ID.
- **Auth Required:** Yes
- **Response 204 No Content.**

---

## 5. Reports Endpoints (`/api/v1/reports`)

### `GET /api/v1/reports/weekly-calories?weekStart=YYYY-MM-DD`
Aggregated calorie trend over a 7-day period.

### `GET /api/v1/reports/macros?start=YYYY-MM-DD&end=YYYY-MM-DD&groupBy=day|week`
Protein, carbohydrate, and fat breakdown grouped by day or week.

### `GET /api/v1/reports/micronutrients?start=YYYY-MM-DD&end=YYYY-MM-DD`
Summary of tracked micronutrients (Fiber, Sodium, Potassium, etc.). Missing micronutrients are represented as unknown/unrecorded, not zero.

### `GET /api/v1/reports/goals?start=YYYY-MM-DD&end=YYYY-MM-DD`
Goal-versus-actual comparison chart data.

---

## 6. AI Extraction Endpoint (`/api/v1/ai`)

### `POST /api/v1/ai/extract`
Upload a food or nutrition label image for automated extraction.
- **Auth Required:** Yes
- **Content-Type:** `multipart/form-data` (form field: `image`)
- **Response 200 OK (Proposal Only):**
```json
{
  "proposal": {
    "foodName": "Greek Yogurt with Berries",
    "estimatedQuantity": { "amount": 170, "unit": "g" },
    "nutrition": {
      "caloriesKcal": 150,
      "proteinG": 15,
      "carbsG": 18,
      "fatG": 2
    },
    "confidence": 0.88,
    "warnings": ["Estimated serving size based on standard portion."],
    "source": "ai"
  }
}
```
*Note: This endpoint returns a proposal only. The client presents an editable form, and the entry is saved only when the user confirms via `POST /api/v1/meals`.*
