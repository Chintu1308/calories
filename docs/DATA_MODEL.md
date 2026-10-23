# Calories Data Model Specification

## 1. Overview
The database tier uses MongoDB. All domain schemas adhere strictly to:
1. Multi-tenant scoping: Every document has an immutable `userId` reference.
2. UTC timestamps: All date fields (`eatenAt`, `createdAt`, `updatedAt`) are stored in ISO 8601 UTC.
3. Explicit units: All numeric measures store both the magnitude and explicit unit (e.g. `g`, `kcal`, `mg`).
4. Absence semantics: Unknown or missing micronutrients are represented as absent/omitted, not `0`.

---

## 2. Collections & Schemas

### `users` Collection
Stores registered user identities and password hashes.
```typescript
interface UserDocument {
  _id: string; // ObjectId string
  email: string; // Unique, lowercase, indexed
  passwordHash: string; // Argon2 / bcrypt hash
  name: string;
  createdAt: Date; // UTC
  updatedAt: Date; // UTC
}
```
**Indexes:**
- `{ email: 1 }` (unique)

---

### `goals` Collection
Stores user personal nutrition targets.
```typescript
interface GoalDocument {
  _id: string;
  userId: string; // References User._id
  dailyCaloriesKcal: number; // Positive integer (500 .. 10000)
  proteinGrams: number; // Non-negative float (0 .. 500)
  carbohydrateGrams: number; // Non-negative float (0 .. 1000)
  fatGrams: number; // Non-negative float (0 .. 500)
  targetWeight?: number; // Optional positive float (20 .. 500)
  weightUnit?: 'kg' | 'lbs'; // Default 'kg'
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes:**
- `{ userId: 1 }` (unique compound index for active target)

---

### `meals` Collection
Stores logged food entries.
```typescript
type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' | 'Brunch' | 'Intermediate';
type MealSource = 'manual' | 'ai';

interface MicronutrientItem {
  name: string; // e.g. "Fiber", "Sodium", "Calcium"
  amount: number; // Non-negative float
  unit: 'g' | 'mg' | 'mcg' | 'IU';
}

interface MealDocument {
  _id: string;
  userId: string; // Scoped to authenticated user
  foodName: string; // Non-empty string (1 .. 120 chars)
  mealType: MealType;
  eatenAt: Date; // UTC timestamp
  quantity: {
    amount: number; // Positive float
    unit: string; // e.g. "g", "ml", "oz", "serving", "cup"
  };
  nutrition: {
    caloriesKcal: number; // Non-negative float (0 .. 10000)
    proteinG: number; // Non-negative float (0 .. 1000)
    carbsG: number; // Non-negative float (0 .. 1000)
    fatG: number; // Non-negative float (0 .. 1000)
  };
  micronutrients?: MicronutrientItem[]; // Optional array; omitted means unknown
  source: MealSource;
  notes?: string; // Optional user notes
  aiMetadata?: {
    confidence?: number;
    rawExtraction?: Record<string, unknown>;
  };
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes:**
- `{ userId: 1, eatenAt: -1 }` (optimizes date-range lookups and chronological timeline sorting)
- `{ userId: 1, mealType: 1, eatenAt: -1 }` (optimizes meal-category filtering)

---

## 3. Aggregations (Reports)
Reports do not maintain separate collections. They run on-demand aggregation pipelines over the `meals` collection:
- **Weekly Trend:** Aggregates sum of `nutrition.caloriesKcal` grouped by UTC day.
- **Macro Breakdown:** Aggregates sum of `proteinG`, `carbsG`, `fatG` grouped by day or week.
- **Goal Comparison:** Compares day sums against the active user `GoalDocument`.
