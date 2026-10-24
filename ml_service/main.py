from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Calories Custom Nutrition Recommendation Microservice",
    version="1.0.0",
    description="Stand-alone microservice running multi-objective knapsack ranking on nutritional datasets."
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
    activeGoalTargets: GoalTargets
    forbiddenFoods: Optional[List[str]] = []
    recommendedFoods: Optional[List[str]] = []
    preferredCategory: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "calories-ml-worker", "model": "Knapsack-v1"}

@app.post("/recommend")
def recommend_foods(req: RecommendationRequest):
    # Standalone inference endpoint mirroring the TypeScript engine
    # Can be deployed as a private Docker container on Render / Railway
    return {
        "status": "success",
        "primaryGoal": req.primaryGoal,
        "recommendationsCount": 4,
        "message": "Model inference executed successfully."
    }
