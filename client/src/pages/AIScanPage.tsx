import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Input,
  Select,
  FormField,
  Icon,
} from '../components/ui/index.js';
import type { MealItem, MealType } from '../types/nutrition.js';

export interface AIScanPageProps {
  onCommitMeal: (meal: MealItem) => void;
  onNavigateJournal: () => void;
  remainingCalories?: number;
  remainingProtein?: number;
  remainingCarbs?: number;
  remainingFat?: number;
  userAllergies?: string[];
}

function generateMealId(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

function getIsoTimestamp(): string {
  return new Date().toISOString();
}

export const AIScanPage: React.FC<AIScanPageProps> = ({
  onCommitMeal,
  onNavigateJournal,
  remainingCalories = 505,
  remainingProtein = 31,
  remainingCarbs = 72,
  remainingFat = 11,
  userAllergies = ['Peanuts', 'Shellfish'],
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [commitSuccess, setCommitSuccess] = useState(false);

  // Editable Proposal Form State
  const [foodName, setFoodName] = useState('Mediterranean Grilled Chicken Salad');
  const [mealCategory, setMealCategory] = useState<MealType>('Lunch');
  const [amount, setAmount] = useState('320');
  const [unit] = useState('g');
  const [calories, setCalories] = useState('420');
  const [protein, setProtein] = useState('38');
  const [carbs, setCarbs] = useState('18');
  const [fat, setFat] = useState('22');
  const [confidence, setConfidence] = useState(0.91);
  const [ingredients, setIngredients] = useState<string[]>([
    'Grilled pasture-raised chicken breast (sliced)',
    'Crisp romaine lettuce & baby spinach',
    'Kalamata olives (pitted)',
    'Cherry tomatoes & English cucumbers',
    'Crumbled feta cheese',
    'Cold-pressed extra virgin olive oil vinaigrette',
  ]);
  const [warnings, setWarnings] = useState<string[]>([
    'Estimated portion based on visual plate geometry. Olive oil dressing estimated at 1.5 tbsp.',
  ]);

  const [hasProposal, setHasProposal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setUploadError('Invalid file format. Please upload a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setHasProposal(false);
    setUploadError('');

    // Simulate AI Vision Extraction
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasProposal(true);
      setFoodName(selectedFile?.name.includes('label') ? 'Almond Butter Crunch Protein Bar' : 'Mediterranean Grilled Chicken Salad');
      setCalories('420');
      setProtein('38');
      setCarbs('18');
      setFat('22');
      setConfidence(0.91);
      setIngredients([
        'Grilled pasture-raised chicken breast (sliced)',
        'Crisp romaine lettuce & baby spinach',
        'Kalamata olives (pitted)',
        'Cherry tomatoes & English cucumbers',
        'Crumbled feta cheese',
        'Cold-pressed extra virgin olive oil vinaigrette',
      ]);
      setWarnings([
        'Estimated portion based on visual plate geometry. Olive oil dressing estimated at 1.5 tbsp.',
      ]);
    }, 1100);
  };

  // Evaluate "Is it good according to today's status?"
  const calNum = Number(calories) || 0;
  const pNum = Number(protein) || 0;
  const cNum = Number(carbs) || 0;
  const fNum = Number(fat) || 0;

  const fitsCalories = calNum <= remainingCalories;
  const calorieDelta = remainingCalories - calNum;
  const proteinCoveragePct = remainingProtein > 0 ? Math.round((pNum / remainingProtein) * 100) : 100;
  const fatExceeds = fNum > remainingFat;

  // Allergy cross-check
  const detectedAllergens: string[] = [];
  ingredients.forEach((ing) => {
    userAllergies.forEach((allergy) => {
      if (ing.toLowerCase().includes(allergy.toLowerCase())) {
        detectedAllergens.push(allergy);
      }
    });
  });

  const handleConfirmAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeal: MealItem = {
      id: generateMealId('meal_ai'),
      userId: 'user_alex_h',
      foodName: foodName.trim() || 'AI Extracted Meal',
      mealType: mealCategory,
      eatenAt: getIsoTimestamp(),
      quantity: {
        amount: Number(amount) || 1,
        unit: unit || 'portion',
      },
      nutrition: {
        caloriesKcal: Number(calories) || 0,
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatG: Number(fat) || 0,
      },
      source: 'ai',
      notes: `AI Extracted dish with ${Math.round(confidence * 100)}% confidence; user reviewed and confirmed`,
    };

    onCommitMeal(newMeal);
    setCommitSuccess(true);
    setTimeout(() => {
      setCommitSuccess(false);
      onNavigateJournal();
    }, 1500);
  };

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Vision AI &amp; Nutritional Analysis</div>
          <h1 className="calories-greeting-title">AI Plate &amp; Label Extraction</h1>
          <p className="calories-greeting-subtext">
            Upload a meal photograph or food label. AI analyzes what the dish contains, provides exact stats, and evaluates whether it fits your targets for today before you decide to log it.
          </p>
        </div>

        <Badge variant="sage">Non-Destructive Proposal Flow</Badge>
      </div>

      {commitSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Meal successfully confirmed and logged into your Calories journal! Redirecting...</span>
        </div>
      )}

      {/* Upload Dropzone & Analysis Trigger Card */}
      <div className="calories-grid-two">
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="camera" size={24} />
              <CardTitle>1. Upload Meal Image</CardTitle>
            </div>
            <CardDescription>
              Accepts JPEG, PNG, or WebP photographs up to 5MB
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {uploadError && (
                <div className="calories-form-error-box" role="alert">
                  {uploadError}
                </div>
              )}

              {/* Dropzone Container */}
              <div
                style={{
                  border: '2px dashed var(--border-medium)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 16px',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-sand-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {previewUrl ? (
                  <div style={{ position: 'relative', width: '100%', maxHeight: '240px', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
                    <img
                      src={previewUrl}
                      alt="Food to analyze"
                      style={{ width: '100%', maxHeight: '240px', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px' }}>
                      <Badge variant="neutral">Image Ready</Badge>
                    </div>
                  </div>
                ) : (
                  <>
                    <Icon name="camera" size={48} />
                    <div style={{ fontWeight: 600, marginTop: '8px', fontSize: 'var(--text-base)' }}>
                      Drag and drop image here, or browse
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Supports JPEG, PNG, and WebP up to 5MB
                    </div>
                  </>
                )}

                <input
                  type="file"
                  id="ai-image-upload"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  style={{ marginTop: '14px' }}
                  onClick={() => document.getElementById('ai-image-upload')?.click()}
                >
                  {previewUrl ? 'Choose Different Image' : 'Select Photo'}
                </Button>
              </div>

              {/* Action Trigger */}
              <Button
                variant="primary"
                size="md"
                leftIcon={<Icon name="ai-scan" size={16} />}
                onClick={handleRunAnalysis}
                isLoading={isAnalyzing}
                disabled={!selectedFile && !previewUrl}
              >
                {isAnalyzing ? 'Extracting Nutritional Data...' : 'Analyze Nutrition with AI'}
              </Button>
            </div>
          </CardContent>

          <CardFooter>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              AI extracts proposals only. No meal is logged automatically without your explicit confirmation.
            </span>
          </CardFooter>
        </Card>

        {/* AI STATS & WHAT IT CONTAINS & TODAY'S FIT ANALYSIS */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="ai-scan" size={24} />
                <CardTitle>2. AI Analysis &amp; Fit for Today</CardTitle>
              </div>

              {hasProposal && (
                <Badge variant="forest">
                  Confidence: {Math.round(confidence * 100)}%
                </Badge>
              )}
            </div>
            <CardDescription>
              {hasProposal
                ? 'Review what this dish contains and how it aligns with your remaining budget.'
                : 'Upload an image on the left and click "Analyze Nutrition with AI" to inspect.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!hasProposal ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Icon name="ai-scan" size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <div>Awaiting food image to extract stats, ingredients, and daily fit.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Detected Dish Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Detected Dish</span>
                    <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: '2px 0 0', color: 'var(--text-primary)' }}>
                      {foodName}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditMode(!isEditMode)}
                  >
                    {isEditMode ? 'Done Editing' : '✏️ Edit Values'}
                  </Button>
                </div>

                {/* Macro Stats Pills */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'var(--color-sand-soft)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Calories</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--action-primary)' }}>
                      {calories} kcal
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-sand-soft)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Protein</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-forest-green)' }}>
                      {protein}g
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-sand-soft)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Carbs</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-sage-green)' }}>
                      {carbs}g
                    </div>
                  </div>
                  <div style={{ background: 'var(--color-sand-soft)', padding: '10px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Fat</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-amber)' }}>
                      {fat}g
                    </div>
                  </div>
                </div>

                {/* Editable drawer if edit mode active */}
                {isEditMode && (
                  <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px' }}>Edit Extracted Values:</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      <FormField label="Calories" htmlFor="e-cal">
                        <Input id="e-cal" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
                      </FormField>
                      <FormField label="Protein (g)" htmlFor="e-p">
                        <Input id="e-p" type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
                      </FormField>
                      <FormField label="Carbs (g)" htmlFor="e-c">
                        <Input id="e-c" type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                      </FormField>
                      <FormField label="Fat (g)" htmlFor="e-f">
                        <Input id="e-f" type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
                      </FormField>
                    </div>
                  </div>
                )}

                {/* WHAT THIS CONTAINS BREAKDOWN */}
                <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Icon name="meals" size={16} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      What This Dish Contains:
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', fontSize: 'var(--text-xs)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {ingredients.map((ing, i) => (
                      <li key={i}>{ing}</li>
                    ))}
                  </ul>

                  {/* Allergen Check */}
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', fontSize: '11px' }}>
                    {detectedAllergens.length > 0 ? (
                      <span style={{ color: 'var(--color-error-red)', fontWeight: 600 }}>
                        ⚠️ Allergen Warning: Contains {detectedAllergens.join(', ')} matching your profile!
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-forest-green)', fontWeight: 600 }}>
                        ✓ Allergen Safe: No registered allergens detected ({userAllergies.join(', ')}).
                      </span>
                    )}
                  </div>
                </div>

                {/* IS IT GOOD ACCORDING TO TODAY'S STATUS? */}
                <div
                  style={{
                    backgroundColor: fitsCalories ? 'var(--color-sage-soft)' : 'rgba(184, 68, 68, 0.08)',
                    border: `1px solid ${fitsCalories ? 'rgba(40, 91, 70, 0.3)' : 'var(--color-error-red)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{fitsCalories ? '🟢' : '🔴'}</span>
                      <strong style={{ fontSize: 'var(--text-sm)', color: fitsCalories ? 'var(--color-forest-green)' : 'var(--color-error-red)' }}>
                        Is it good for today? {fitsCalories ? 'Great Fit!' : 'Exceeds Calorie Budget'}
                      </strong>
                    </div>
                    <Badge variant={fitsCalories ? 'forest' : 'destructive'}>
                      {fitsCalories ? `${calorieDelta} kcal buffer left` : `${Math.abs(calorieDelta)} kcal over`}
                    </Badge>
                  </div>

                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', margin: '6px 0 0', lineHeight: 1.5 }}>
                    {fitsCalories
                      ? `You currently have ${remainingCalories} kcal, ${remainingProtein}g protein, and ${remainingCarbs}g carbs remaining today. This dish supplies ${calories} kcal, ${protein}g protein, and ${cNum}g carbs, covering ${proteinCoveragePct}% of your remaining protein target while leaving you with ${calorieDelta} kcal for snacks!`
                      : `You only have ${remainingCalories} kcal remaining today, so this ${calories} kcal meal will put you ${Math.abs(calorieDelta)} kcal over your daily threshold. Consider enjoying a smaller half-portion (approx ${Math.round(calNum / 2)} kcal).`}
                  </p>

                  {warnings.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      {warnings.map((w, idx) => (
                        <div key={idx} style={{ fontSize: '11px', color: 'var(--color-slate-light)', fontStyle: 'italic' }}>
                          ℹ️ {w}
                        </div>
                      ))}
                    </div>
                  )}

                  {fatExceeds && (
                    <div style={{ fontSize: '11px', color: 'var(--color-amber)', marginTop: '6px', fontWeight: 500 }}>
                      ℹ️ Note: Dietary fat ({fat}g) slightly exceeds remaining fat allowance ({remainingFat}g), but is predominantly heart-healthy unsaturated fat from olive oil.
                    </div>
                  )}
                </div>

                {/* Category Selector for logging */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
                  <FormField label="Assign Category" htmlFor="ai-meal-category">
                    <Select
                      id="ai-meal-category"
                      value={mealCategory}
                      onChange={(e) => setMealCategory(e.target.value as MealType)}
                      options={[
                        { value: 'Breakfast', label: 'Breakfast' },
                        { value: 'Lunch', label: 'Lunch' },
                        { value: 'Dinner', label: 'Dinner' },
                        { value: 'Snacks', label: 'Snacks' },
                      ]}
                    />
                  </FormField>

                  <FormField label="Portion Size" htmlFor="ai-meal-amount">
                    <Input
                      id="ai-meal-amount"
                      value={`${amount} ${unit}`}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </FormField>
                </div>

                {/* Explicit Option to Log Button (Does NOT log automatically) */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <Button
                    variant="primary"
                    size="md"
                    style={{ flex: 1 }}
                    leftIcon={<Icon name="check" size={16} />}
                    onClick={handleConfirmAndSave}
                  >
                    Confirm &amp; Log This Meal to Diary
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
