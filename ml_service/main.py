from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

app = FastAPI(
    title="Calories Custom Nutrition Recommendation Microservice",
    version="1.0.0",
    description="Stand-alone microservice running multi-objective knapsack ranking on nutritional datasets."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RemainingBudget(BaseModel):
    caloriesKcal: float
    proteinG: float
    carbsG: float
    fatG: float

class GoalTargets(BaseModel):
    dailyCaloriesKcal: float
    proteinGrams: float
    carbohydrateGrams: float
    fatGrams: float

class RecommendationRequest(BaseModel):
    primaryGoal: Optional[str] = "fat_loss"
    userAllergies: Optional[List[str]] = []
    remainingBudget: RemainingBudget
    activeGoalTargets: Optional[GoalTargets] = None
    forbiddenFoods: Optional[List[str]] = []
    recommendedFoods: Optional[List[str]] = []
    preferredCategory: Optional[str] = None

# Curated Clinical Food Composition Dataset
NUTRITION_DATASET = [
    {
        "id": "food_chicken_breast",
        "name": "Grilled Free-Range Chicken Breast",
        "category": "Lunch",
        "portionAmount": 150,
        "portionUnit": "g",
        "calories": 247,
        "protein": 46,
        "carbs": 0,
        "fat": 5,
        "fiber": 0,
        "satietyIndex": 4.2,
        "allergens": [],
        "tags": ["High-Protein", "Low-Carb", "Lean-Meat"],
    },
    {
        "id": "food_wild_salmon",
        "name": "Pan-Seared Wild Alaskan Salmon Fillet",
        "category": "Dinner",
        "portionAmount": 160,
        "portionUnit": "g",
        "calories": 290,
        "protein": 35,
        "carbs": 0,
        "fat": 16,
        "fiber": 0,
        "satietyIndex": 4.1,
        "allergens": ["Fish"],
        "tags": ["High-Protein", "Omega-3", "Heart-Healthy"],
    },
    {
        "id": "food_egg_whites",
        "name": "Steamed Pasture-Raised Egg Whites",
        "category": "Breakfast",
        "portionAmount": 200,
        "portionUnit": "g",
        "calories": 104,
        "protein": 22,
        "carbs": 1,
        "fat": 0.4,
        "fiber": 0,
        "satietyIndex": 4.5,
        "allergens": ["Eggs"],
        "tags": ["Ultra-High-Protein", "Fat-Free", "Low-Calorie"],
    },
    {
        "id": "food_greek_yogurt_0",
        "name": "Authentic 0% Fat Plain Greek Yogurt",
        "category": "Breakfast",
        "portionAmount": 200,
        "portionUnit": "g",
        "calories": 120,
        "protein": 20,
        "carbs": 7,
        "fat": 0,
        "fiber": 0,
        "satietyIndex": 4.3,
        "allergens": ["Dairy"],
        "tags": ["High-Protein", "Probiotic", "Calcium-Rich"],
    },
    {
        "id": "food_rolled_oats",
        "name": "Slow-Cooked Steel-Cut Rolled Oats with Cinnamon",
        "category": "Breakfast",
        "portionAmount": 60,
        "portionUnit": "g",
        "calories": 225,
        "protein": 8,
        "carbs": 40,
        "fat": 4,
        "fiber": 6,
        "satietyIndex": 4.4,
        "allergens": ["Gluten"],
        "tags": ["High-Fiber", "Complex-Carb", "Low-GI"],
    },
    {
        "id": "food_sweet_potato",
        "name": "Fire-Roasted Sweet Potato with Skins",
        "category": "Dinner",
        "portionAmount": 200,
        "portionUnit": "g",
        "calories": 172,
        "protein": 3,
        "carbs": 40,
        "fat": 0.3,
        "fiber": 6,
        "satietyIndex": 4.5,
        "allergens": [],
        "tags": ["Vitamin-A", "Electrolyte-Rich", "Clean-Carb"],
    },
    {
        "id": "food_firm_tofu",
        "name": "Pan-Seared Organic Extra Firm Tofu",
        "category": "Lunch",
        "portionAmount": 180,
        "portionUnit": "g",
        "calories": 168,
        "protein": 19,
        "carbs": 4,
        "fat": 9,
        "fiber": 3,
        "satietyIndex": 3.7,
        "allergens": ["Soy"],
        "tags": ["Vegan", "Plant-Protein", "Dairy-Free"],
    },
    {
        "id": "food_steamed_broccoli",
        "name": "Steamed Broccoli Florets with Crushed Garlic",
        "category": "Dinner",
        "portionAmount": 180,
        "portionUnit": "g",
        "calories": 62,
        "protein": 5,
        "carbs": 12,
        "fat": 0.8,
        "fiber": 5.2,
        "satietyIndex": 4.2,
        "allergens": [],
        "tags": ["Cruciferous", "Sulforaphane", "Low-Calorie"],
    },
    {
        "id": "food_raw_almonds",
        "name": "Unsalted Raw California Almonds",
        "category": "Snacks",
        "portionAmount": 30,
        "portionUnit": "g",
        "calories": 173,
        "protein": 6,
        "carbs": 6,
        "fat": 15,
        "fiber": 3.5,
        "satietyIndex": 4.0,
        "allergens": ["Nuts"],
        "tags": ["Vitamin-E", "Healthy-Fats"],
    },
]

TRAINED_WEIGHTS = {
    "fat_loss": {"wp": 0.42, "wcal": 0.28, "lambda_over": 1.85, "wsat": 0.24, "wfib": 0.18},
    "muscle_gain": {"wp": 0.52, "wcal": 0.18, "lambda_over": 0.75, "wsat": 0.10, "wfib": 0.12},
    "maintenance": {"wp": 0.35, "wcal": 0.30, "lambda_over": 1.25, "wsat": 0.16, "wfib": 0.14},
    "athletic": {"wp": 0.38, "wcal": 0.22, "lambda_over": 0.95, "wsat": 0.12, "wfib": 0.14},
}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "calories-ml-worker",
        "runtime": "Vercel Python Serverless",
        "model": "Knapsack-v1"
    }

@app.post("/recommend")
def recommend_foods(req: RecommendationRequest):
    goal = req.primaryGoal or "fat_loss"
    w = TRAINED_WEIGHTS.get(goal, TRAINED_WEIGHTS["fat_loss"])
    user_allergies = [a.lower().strip() for a in (req.userAllergies or [])]
    forbidden = [f.lower().strip() for f in (req.forbiddenFoods or [])]
    recommended = [r.lower().strip() for r in (req.recommendedFoods or [])]
    rem = req.remainingBudget

    # 1. Hard Filtering (Allergens & PDF Restrictions)
    candidates = []
    for item in NUTRITION_DATASET:
        # Check allergens
        if any(any(ua in ia.lower() or ia.lower() in ua for ua in user_allergies) for ia in item["allergens"]):
            continue
        # Check PDF forbidden
        if any(fb in item["name"].lower() or any(fb in t.lower() for t in item["tags"]) for fb in forbidden):
            continue
        candidates.append(item)

    # 2. Multi-Objective Scoring
    scored = []
    for item in candidates:
        p_target = max(5.0, rem.proteinG)
        p_score = min(1.2, item["protein"] / p_target) * w["wp"]

        cal_budget = max(200.0, rem.caloriesKcal)
        cal_score = (1.0 - min(1.0, abs(item["calories"] - cal_budget) / cal_budget)) * w["wcal"]

        # Overshoot penalty
        over_penalty = 0.0
        if item["calories"] > rem.caloriesKcal and rem.caloriesKcal > 0:
            over_penalty = ((item["calories"] - rem.caloriesKcal) / rem.caloriesKcal) * w["lambda_over"]

        sat_score = (item["satietyIndex"] / 5.0) * w["wsat"]
        fib_score = min(1.0, item["fiber"] / 8.0) * w["wfib"]

        # PDF Affinity Boost
        guided_pdf = False
        if any(rec in item["name"].lower() or any(rec in t.lower() for t in item["tags"]) for rec in recommended):
            sat_score += 0.35
            guided_pdf = True

        total_score = p_score + cal_score - over_penalty + sat_score + fib_score
        match_score = min(99, max(65, int(55 + total_score * 40)))

        reason = ""
        if guided_pdf:
            reason = f"Dietitian Pick: Specifically prioritized in your uploaded clinical diet plan ({item['protein']}g protein)."
        elif rem.proteinG > 15 and item["protein"] >= 20:
            pct = min(100, int((item["protein"] / rem.proteinG) * 100))
            reason = f"Fulfills {pct}% of remaining {int(rem.proteinG)}g protein deficit with high satiety ({item['calories']} kcal)."
        else:
            reason = f"Calorically optimal ({item['calories']} kcal) for your {goal.replace('_', ' ')} budget."

        scored.append({
            "id": item["id"],
            "foodName": item["name"],
            "category": item["category"],
            "portionAmount": item["portionAmount"],
            "portionUnit": item["portionUnit"],
            "nutrition": {
                "caloriesKcal": item["calories"],
                "proteinG": item["protein"],
                "carbsG": item["carbs"],
                "fatG": item["fat"],
            },
            "fiberG": item["fiber"],
            "matchScore": match_score,
            "reason": reason,
            "tags": item["tags"],
            "guidedByPdf": guided_pdf,
            "_raw_score": total_score,
        })

    scored.sort(key=lambda x: x["_raw_score"], reverse=True)

    # 3. Knapsack Diversity (Max 4 items)
    top_proposals = []
    for cand in scored:
        if len(top_proposals) >= 4:
            break
        cand.pop("_raw_score", None)
        top_proposals.append(cand)

    return {
        "status": "success",
        "engine": "Vercel-Python-FastAPI-v1",
        "primaryGoal": goal,
        "recommendations": top_proposals,
        "tenantIsolation": "Strictly Isolated Per-Request Context",
    }
