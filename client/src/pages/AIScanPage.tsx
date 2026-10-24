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
}

export const AIScanPage: React.FC<AIScanPageProps> = ({
  onCommitMeal,
  onNavigateJournal,
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
  const [unit, setUnit] = useState('g');
  const [calories, setCalories] = useState('420');
  const [protein, setProtein] = useState('38');
  const [carbs, setCarbs] = useState('18');
  const [fat, setFat] = useState('22');
  const [confidence, setConfidence] = useState(0.89);
  const [warnings, setWarnings] = useState<string[]>([
    'Estimated portion based on visual bowl plate analysis. Verify dressing volume before confirming.',
  ]);

  const [hasProposal, setHasProposal] = useState(false);

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

    // Simulate AI Vision Extraction (mock simulation labeled as mock)
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasProposal(true);
      setFoodName(selectedFile?.name.includes('label') ? 'Almond Butter Crunch Bar' : 'Mediterranean Grilled Chicken Salad');
      setCalories('420');
      setProtein('38');
      setCarbs('18');
      setFat('22');
      setConfidence(0.89);
      setWarnings([
        'Estimated portion based on visual plate geometry. Olive oil dressing estimated at 1.5 tbsp.',
      ]);
    }, 1200);
  };

  const handleConfirmAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newMeal: MealItem = {
      id: `meal_ai_${Date.now()}`,
      userId: 'user_demo_student',
      foodName: foodName.trim() || 'AI Extracted Meal',
      mealType: mealCategory,
      eatenAt: new Date().toISOString(),
      quantity: {
        amount: Number(amount) || 100,
        unit,
      },
      nutrition: {
        caloriesKcal: Number(calories) || 0,
        proteinG: Number(protein) || 0,
        carbsG: Number(carbs) || 0,
        fatG: Number(fat) || 0,
      },
      source: 'ai',
      notes: `Extracted via AI Vision (${Math.round(confidence * 100)}% confidence). Reviewed and confirmed.`,
    };

    onCommitMeal(newMeal);
    setCommitSuccess(true);
    setTimeout(() => {
      onNavigateJournal();
    }, 1200);
  };

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Multimodal Vision Assistant</div>
          <h1 className="calories-greeting-title">AI Calorie &amp; Macro Extractor</h1>
          <p className="calories-greeting-subtext">
            Upload a meal plate photo or nutrition facts label. AI proposes structured values for your review; records are committed only upon your explicit confirmation.
          </p>
        </div>

        <Badge variant="forest">AI Proposes; User Confirms</Badge>
      </div>

      {/* Safety & Fallback Notice */}
      <div className="calories-demo-notice-bar">
        <Icon name="navigation-leaf" size={18} />
        <div>
          <strong>Privacy &amp; Safety Standard:</strong> Uploaded images are processed in-memory and discarded immediately after feature extraction. Manual logging is always fully available should AI providers experience downtime or network interruption.
        </div>
      </div>

      {commitSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Meal confirmed and committed to your journal! Redirecting to Meal Journal...</span>
        </div>
      )}

      {/* Two Column Layout: Upload on Left, Proposal on Right */}
      <div className="calories-grid-two">
        {/* Upload & Inspection Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="camera" size={24} />
              <CardTitle>Image Intake</CardTitle>
            </div>
            <CardDescription>Select a food photo or nutrition facts packaging label</CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {uploadError && (
                <div className="calories-form-error-box" role="alert">
                  {uploadError}
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="calories-ai-upload-dropzone">
                {previewUrl ? (
                  <div style={{ position: 'relative', width: '100%', maxHeight: '220px', overflow: 'hidden', borderRadius: '8px' }}>
                    <img
                      src={previewUrl}
                      alt="Food preview"
                      style={{ width: '100%', height: '200px', objectFit: 'cover' }}
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
              Mock response in Stage 3: Real Gemini vision microservice connects in Stage 10
            </span>
          </CardFooter>
        </Card>

        {/* Editable Proposal Form Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="ai-scan" size={24} />
                <CardTitle>AI Proposal Review</CardTitle>
              </div>
              {hasProposal && (
                <Badge variant="forest">
                  {Math.round(confidence * 100)}% Confidence
                </Badge>
              )}
            </div>
            <CardDescription>
              Review and adjust the extracted quantities before writing to your journal
            </CardDescription>
          </CardHeader>

          <CardContent>
            {!hasProposal ? (
              <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Icon name="ai-scan" size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                <div>No analysis generated yet. Upload an image on the left to generate a proposal.</div>
              </div>
            ) : (
              <form id="ai-review-form" onSubmit={handleConfirmAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Uncertainty Warnings */}
                {warnings.map((w, i) => (
                  <div key={i} className="calories-editorial-note" style={{ borderLeftColor: 'var(--color-amber)', background: 'var(--color-amber-soft)' }}>
                    <strong>⚠️ Uncertainty Notice:</strong> {w}
                  </div>
                ))}

                <FormField label="Identified Food Item" htmlFor="ai-food-name" required={true}>
                  <Input
                    id="ai-food-name"
                    value={foodName}
                    onChange={(e) => setFoodName(e.target.value)}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <FormField label="Meal Type" htmlFor="ai-meal-type">
                    <Select
                      id="ai-meal-type"
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

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                    <FormField label="Quantity" htmlFor="ai-amount">
                      <Input
                        id="ai-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </FormField>
                    <FormField label="Unit" htmlFor="ai-unit">
                      <Select
                        id="ai-unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        options={[
                          { value: 'g', label: 'g' },
                          { value: 'ml', label: 'ml' },
                          { value: 'serving', label: 'serving' },
                        ]}
                      />
                    </FormField>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <FormField label="Calories" htmlFor="ai-cal" required={true}>
                    <Input
                      id="ai-cal"
                      type="number"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Protein (g)" htmlFor="ai-protein">
                    <Input
                      id="ai-protein"
                      type="number"
                      value={protein}
                      onChange={(e) => setProtein(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Carbs (g)" htmlFor="ai-carbs">
                    <Input
                      id="ai-carbs"
                      type="number"
                      value={carbs}
                      onChange={(e) => setCarbs(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Fat (g)" htmlFor="ai-fat">
                    <Input
                      id="ai-fat"
                      type="number"
                      value={fat}
                      onChange={(e) => setFat(e.target.value)}
                    />
                  </FormField>
                </div>
              </form>
            )}
          </CardContent>

          <CardFooter>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
              <Button variant="ghost" size="md" onClick={() => setHasProposal(false)} disabled={!hasProposal}>
                Discard
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                form="ai-review-form"
                disabled={!hasProposal}
                leftIcon={<Icon name="check" size={16} />}
              >
                Confirm &amp; Commit to Journal
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
