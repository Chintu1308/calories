import React, { useState } from 'react';
import {
  CaloriesLogo,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  ProgressBar,
  Input,
  Select,
  FormField,
} from './components/ui/index.js';
import './App.css';

export const App: React.FC = () => {
  // Interactive demo states
  const [calorieCount, setCalorieCount] = useState<number>(1650);
  const [proteinGrams, setProteinGrams] = useState<number>(120);
  const [carbsGrams, setCarbsGrams] = useState<number>(185);
  const [fatGrams, setFatGrams] = useState<number>(54);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedMealType, setSelectedMealType] = useState<string>('Breakfast');
  const [testFoodInput, setTestFoodInput] = useState<string>('Greek Yogurt Bowl with Honey');
  const [inputError, setInputError] = useState<string>('');

  const targetCalories = 2200;
  const targetProtein = 150;
  const targetCarbs = 220;
  const targetFat = 70;

  const handleSimulateQuickAdd = () => {
    setIsLoading(true);
    setTimeout(() => {
      setCalorieCount((prev) => Math.min(prev + 250, targetCalories + 500));
      setProteinGrams((prev) => Math.min(prev + 18, targetProtein + 50));
      setCarbsGrams((prev) => Math.min(prev + 30, targetCarbs + 50));
      setFatGrams((prev) => Math.min(prev + 6, targetFat + 30));
      setIsLoading(false);
    }, 400);
  };

  const handleReset = () => {
    setCalorieCount(1650);
    setProteinGrams(120);
    setCarbsGrams(185);
    setFatGrams(54);
    setInputError('');
  };

  const handleValidateInput = (val: string) => {
    setTestFoodInput(val);
    if (!val.trim()) {
      setInputError('Food item name cannot be empty.');
    } else if (val.length < 3) {
      setInputError('Food item name must be at least 3 characters.');
    } else {
      setInputError('');
    }
  };

  const brandSwatches = [
    { name: 'Ink Navy', hex: '#152238', variable: '--color-ink-navy', role: 'Primary text & dark surfaces', darkText: false },
    { name: 'Forest Green', hex: '#285B46', variable: '--color-forest-green', role: 'Primary actions & brand anchor', darkText: false },
    { name: 'Sage Green', hex: '#BFD8C2', variable: '--color-sage-green', role: 'Progress fills & active accents', darkText: true },
    { name: 'Warm Ivory', hex: '#FAF9F6', variable: '--color-warm-ivory', role: 'Page editorial canvas', darkText: true, border: true },
    { name: 'White', hex: '#FFFFFF', variable: '--color-white', role: 'Card surface & clean backings', darkText: true, border: true },
    { name: 'Soft Sand', hex: '#EDE5D8', variable: '--color-soft-sand', role: 'Secondary surfaces & separators', darkText: true },
    { name: 'Muted Slate', hex: '#6B7280', variable: '--color-muted-slate', role: 'Secondary metadata & labels', darkText: false },
    { name: 'Amber', hex: '#C88932', variable: '--color-amber', role: 'Incomplete goals & AI caution', darkText: false },
    { name: 'Error Red', hex: '#B84444', variable: '--color-error-red', role: 'Validation errors & destructive', darkText: false },
  ];

  return (
    <div className="calories-showcase-layout">
      {/* Editorial Header */}
      <header className="calories-header">
        <div className="calories-header-container">
          <CaloriesLogo size="lg" showTagline={true} />
          <div className="calories-header-actions">
            <Badge variant="forest">Stage 2: Verified</Badge>
            <Badge variant="neutral">Editorial Health-Tech</Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="calories-main">
        {/* Hero Section */}
        <section className="calories-hero-card">
          <div className="calories-hero-badge">Design System & Brand Foundation</div>
          <h1 className="calories-hero-title">Your nutrition, made clearer.</h1>
          <p className="calories-hero-subtitle">
            Calories pairs editorial clarity with rigorous health metrics. Below is the verified Stage 2 design system foundation, featuring our custom SVG identity, WCAG AA compliant palette tokens, and reusable component primitives.
          </p>
        </section>

        {/* Brand Tokens Palette Section */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">1. Master Color Palette Tokens</h2>
              <p className="calories-section-subtitle">Single source of truth defined in CSS variables and tokens JSON.</p>
            </div>
            <Badge variant="sage">WCAG AA Contrast Compliant</Badge>
          </div>

          <div className="calories-swatches-grid">
            {brandSwatches.map((swatch) => (
              <div key={swatch.name} className="calories-swatch-card">
                <div
                  className="calories-swatch-preview"
                  style={{
                    backgroundColor: swatch.hex,
                    border: swatch.border ? '1px solid rgba(21, 34, 56, 0.12)' : 'none',
                    color: swatch.darkText ? '#152238' : '#FFFFFF',
                  }}
                >
                  <span className="calories-swatch-hex">{swatch.hex}</span>
                </div>
                <div className="calories-swatch-info">
                  <div className="calories-swatch-name">{swatch.name}</div>
                  <div className="calories-swatch-var">{swatch.variable}</div>
                  <div className="calories-swatch-role">{swatch.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Progress & Metrics Section */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">2. Accessible Progress Bars & Metrics</h2>
              <p className="calories-section-subtitle">ARIA-compliant progress tracking with clear numerical units and safe bounds.</p>
            </div>
            <div className="calories-inline-actions">
              <Button variant="outline" size="sm" onClick={handleSimulateQuickAdd} isLoading={isLoading}>
                + Log Sample Snack (+250 kcal)
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          <div className="calories-grid-two">
            {/* Daily Calorie Goal Card */}
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle>Daily Calorie Target</CardTitle>
                  <Badge variant={calorieCount >= targetCalories ? 'amber' : 'forest'}>
                    {calorieCount >= targetCalories ? 'Target Reached' : 'On Track'}
                  </Badge>
                </div>
                <CardDescription>Target: {targetCalories.toLocaleString()} kcal / day</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  value={calorieCount}
                  max={targetCalories}
                  label="Calorie Budget"
                  unit="kcal"
                  variant={calorieCount > targetCalories ? 'amber' : 'forest'}
                  showPercentage={true}
                />
                <div className="calories-metric-details">
                  <div className="calories-metric-stat">
                    <span className="calories-stat-label">Consumed</span>
                    <span className="calories-stat-val">{calorieCount.toLocaleString()} kcal</span>
                  </div>
                  <div className="calories-metric-stat">
                    <span className="calories-stat-label">Remaining</span>
                    <span className="calories-stat-val">
                      {Math.max(targetCalories - calorieCount, 0).toLocaleString()} kcal
                    </span>
                  </div>
                  <div className="calories-metric-stat">
                    <span className="calories-stat-label">Goal-vs-Actual</span>
                    <span className="calories-stat-val">
                      {Math.round((calorieCount / targetCalories) * 100)}%
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Stored in UTC; evaluated against personal goal
                </span>
              </CardFooter>
            </Card>

            {/* Macro Distribution Card */}
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle>Macronutrient Targets</CardTitle>
                  <Badge variant="sage">Balanced Ratio</Badge>
                </div>
                <CardDescription>Daily protein, carbs, and fat progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ProgressBar
                    value={proteinGrams}
                    max={targetProtein}
                    label="Protein"
                    unit="g"
                    variant="forest"
                    showPercentage={true}
                  />
                  <ProgressBar
                    value={carbsGrams}
                    max={targetCarbs}
                    label="Carbohydrates"
                    unit="g"
                    variant="sage"
                    showPercentage={true}
                  />
                  <ProgressBar
                    value={fatGrams}
                    max={targetFat}
                    label="Fats"
                    unit="g"
                    variant="amber"
                    showPercentage={true}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Explicit units in grams (g); missing values never default to 0
                </span>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Reusable UI Components Section */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">3. Reusable Component Primitives</h2>
              <p className="calories-section-subtitle">Buttons, Form Fields, Badges, and Semantic States.</p>
            </div>
          </div>

          <div className="calories-grid-three">
            {/* Button Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Button Primitives</CardTitle>
                <CardDescription>5 semantic variants with 3 size tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="calories-component-stack">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Button variant="primary" size="sm">Primary SM</Button>
                    <Button variant="primary" size="md">Primary MD</Button>
                    <Button variant="primary" size="lg">Primary LG</Button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Button variant="secondary" size="md">Secondary</Button>
                    <Button variant="outline" size="md">Outline</Button>
                    <Button variant="destructive" size="md">Destructive</Button>
                    <Button variant="ghost" size="md">Ghost</Button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Button variant="primary" size="md" isLoading={true}>Loading</Button>
                    <Button variant="primary" size="md" disabled={true}>Disabled</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges & Indicators */}
            <Card>
              <CardHeader>
                <CardTitle>Badge System</CardTitle>
                <CardDescription>Semantic status chips with WCAG contrast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="calories-component-stack">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <Badge variant="default">Default Neutral</Badge>
                    <Badge variant="forest">Forest (Completed)</Badge>
                    <Badge variant="sage">Sage (In Progress)</Badge>
                    <Badge variant="amber">Amber (Review Needed)</Badge>
                    <Badge variant="destructive">Destructive (Over Limit)</Badge>
                    <Badge variant="neutral">Source: Manual</Badge>
                  </div>
                  <div className="calories-editorial-note">
                    <strong>Accessibility Rule:</strong> State is never communicated by color alone; clear text labels accompany all badges.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Fields & Inputs */}
            <Card>
              <CardHeader>
                <CardTitle>Form Fields & Inputs</CardTitle>
                <CardDescription>Label, error, hint, and validation wiring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="calories-component-stack">
                  <FormField
                    label="Food Item Name"
                    htmlFor="food-name-input"
                    required={true}
                    error={inputError}
                    hint="e.g. Oatmeal with Almond Milk"
                  >
                    <Input
                      id="food-name-input"
                      value={testFoodInput}
                      onChange={(e) => handleValidateInput(e.target.value)}
                      placeholder="Enter food name..."
                    />
                  </FormField>

                  <FormField label="Meal Category" htmlFor="meal-select" required={true}>
                    <Select
                      id="meal-select"
                      value={selectedMealType}
                      onChange={(e) => setSelectedMealType(e.target.value)}
                      options={[
                        { value: 'Breakfast', label: 'Breakfast' },
                        { value: 'Lunch', label: 'Lunch' },
                        { value: 'Dinner', label: 'Dinner' },
                        { value: 'Snacks', label: 'Snacks' },
                        { value: 'Brunch', label: 'Brunch (Intermediate)' },
                      ]}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="calories-footer">
        <div className="calories-footer-container">
          <CaloriesLogo size="sm" showTagline={false} />
          <span className="calories-footer-text">
            Calories Platform — Stage 2: Brand Identity & Design Tokens Verified.
          </span>
          <span className="calories-footer-domain">calories.bhhc.me</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
