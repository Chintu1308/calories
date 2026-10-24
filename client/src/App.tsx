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
  Icon,
  type IconName,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'goals' | 'reports' | 'ai-scan'>('dashboard');

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

  const officialIcons: { name: IconName; label: string }[] = [
    { name: 'dashboard', label: 'Dashboard' },
    { name: 'meals', label: 'Meals' },
    { name: 'goals', label: 'Goals' },
    { name: 'reports', label: 'Reports' },
    { name: 'ai-scan', label: 'AI Scan' },
    { name: 'calories', label: 'Calories' },
    { name: 'protein', label: 'Protein' },
    { name: 'carbs', label: 'Carbs' },
    { name: 'fat', label: 'Fat' },
    { name: 'weight', label: 'Weight' },
    { name: 'water', label: 'Water' },
    { name: 'heart', label: 'Vitals' },
    { name: 'calendar', label: 'Calendar' },
    { name: 'camera', label: 'Camera' },
    { name: 'plus', label: 'Add' },
    { name: 'check', label: 'Success' },
    { name: 'search', label: 'Search' },
    { name: 'profile', label: 'Profile' },
    { name: 'settings', label: 'Settings' },
    { name: 'supplements', label: 'Supplements' },
    { name: 'vitamins', label: 'Vitamins' },
    { name: 'navigation-leaf', label: 'Editorial Leaf' },
  ];

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
          <CaloriesLogo size="md" variant="image" />

          {/* Navigation with official icons */}
          <nav className="calories-header-nav" aria-label="Main Navigation">
            <button
              type="button"
              className={`calories-nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <Icon name="dashboard" size={18} />
              <span>Dashboard</span>
            </button>
            <button
              type="button"
              className={`calories-nav-tab ${activeTab === 'meals' ? 'active' : ''}`}
              onClick={() => setActiveTab('meals')}
            >
              <Icon name="meals" size={18} />
              <span>Meals</span>
            </button>
            <button
              type="button"
              className={`calories-nav-tab ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              <Icon name="goals" size={18} />
              <span>Goals</span>
            </button>
            <button
              type="button"
              className={`calories-nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <Icon name="reports" size={18} />
              <span>Reports</span>
            </button>
            <button
              type="button"
              className={`calories-nav-tab ${activeTab === 'ai-scan' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-scan')}
            >
              <Icon name="ai-scan" size={18} />
              <span>AI Scan</span>
            </button>
          </nav>

          <div className="calories-header-actions">
            <Badge variant="forest" icon={<Icon name="check" size={12} />}>
              Branding Active
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="calories-main">
        {/* Hero Section with Official Brand Banner */}
        <section className="calories-hero-card">
          <div className="calories-hero-badge">
            <Icon name="navigation-leaf" size={14} style={{ marginRight: '6px' }} />
            Official Branding & Icons Integrated
          </div>
          <div className="calories-hero-content-split">
            <div>
              <h1 className="calories-hero-title">Your nutrition, made clearer.</h1>
              <p className="calories-hero-subtitle">
                The Calories brand assets and official 22-icon SVG suite are now loaded from <code>/icons/</code> and <code>/branding/</code>. Every icon is color-calibrated to our editorial palette and integrated into our reusable UI primitives.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <Button
                  variant="primary"
                  leftIcon={<Icon name="plus" size={16} />}
                  onClick={handleSimulateQuickAdd}
                  isLoading={isLoading}
                >
                  Quick Log Meal
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Icon name="ai-scan" size={16} />}
                  onClick={() => setActiveTab('ai-scan')}
                >
                  AI Nutrition Scan
                </Button>
              </div>
            </div>
            <div className="calories-hero-banner-wrap">
              <img
                src="/branding/calories-app-icon-light.png"
                alt="Calories App Icon"
                className="calories-hero-app-icon"
                width={120}
                height={120}
              />
            </div>
          </div>
        </section>

        {/* Official 22-Icon Suite Section */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">1. Official 22-Icon SVG Suite</h2>
              <p className="calories-section-subtitle">
                Custom vector SVG icons loaded dynamically via <code>&lt;Icon name="..." /&gt;</code>.
              </p>
            </div>
            <Badge variant="sage">22 Custom SVGs</Badge>
          </div>

          <div className="calories-icons-gallery-grid">
            {officialIcons.map((ic) => (
              <div key={ic.name} className="calories-icon-gallery-card">
                <div className="calories-icon-wrapper">
                  <Icon name={ic.name} size={32} />
                </div>
                <span className="calories-icon-title">{ic.label}</span>
                <code className="calories-icon-code">{ic.name}</code>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Progress & Metrics Section */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">2. Macro & Calorie Tracking with Brand Icons</h2>
              <p className="calories-section-subtitle">
                Pairing nutritional metrics with official SVG indicators.
              </p>
            </div>
            <div className="calories-inline-actions">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="plus" size={14} />}
                onClick={handleSimulateQuickAdd}
                isLoading={isLoading}
              >
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="calories" size={26} />
                    <CardTitle>Daily Calorie Target</CardTitle>
                  </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="goals" size={26} />
                    <CardTitle>Macronutrient Targets</CardTitle>
                  </div>
                  <Badge variant="sage">Balanced Ratio</Badge>
                </div>
                <CardDescription>Daily protein, carbs, and fat progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Icon name="protein" size={18} />
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Protein</span>
                    </div>
                    <ProgressBar
                      value={proteinGrams}
                      max={targetProtein}
                      unit="g"
                      variant="forest"
                      showPercentage={true}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Icon name="carbs" size={18} />
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Carbohydrates</span>
                    </div>
                    <ProgressBar
                      value={carbsGrams}
                      max={targetCarbs}
                      unit="g"
                      variant="sage"
                      showPercentage={true}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Icon name="fat" size={18} />
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Fats</span>
                    </div>
                    <ProgressBar
                      value={fatGrams}
                      max={targetFat}
                      unit="g"
                      variant="amber"
                      showPercentage={true}
                    />
                  </div>
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

        {/* Master Color Palette Section */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">3. Master Color Palette Tokens</h2>
              <p className="calories-section-subtitle">Single source of truth defined in CSS variables and tokens JSON.</p>
            </div>
            <Badge variant="sage">WCAG AA Compliant</Badge>
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

        {/* Form Fields & Interactive Actions */}
        <section className="calories-section">
          <div className="calories-section-header">
            <div>
              <h2 className="calories-section-title">4. Form Controls with Icon Integration</h2>
              <p className="calories-section-subtitle">Inputs and select dropdowns styled with the brand design system.</p>
            </div>
          </div>

          <div className="calories-grid-two">
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="meals" size={22} />
                  <CardTitle>Sample Meal Form</CardTitle>
                </div>
                <CardDescription>Simulates entering a food item</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="calories-component-stack">
                  <FormField
                    label="Food Item Name"
                    htmlFor="food-name-input"
                    required={true}
                    error={inputError}
                    hint="e.g. Oatmeal with Blueberries"
                  >
                    <Input
                      id="food-name-input"
                      leftIcon={<Icon name="search" size={16} />}
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
              <CardFooter>
                <Button
                  variant="primary"
                  leftIcon={<Icon name="check" size={16} />}
                  onClick={() => alert(`Validated: ${testFoodInput} for ${selectedMealType}`)}
                  disabled={!!inputError || !testFoodInput.trim()}
                >
                  Save Entry
                </Button>
              </CardFooter>
            </Card>

            {/* Official Branding Assets Card */}
            <Card>
              <CardHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="heart" size={22} />
                  <CardTitle>Official Brand Lockups</CardTitle>
                </div>
                <CardDescription>High-resolution brand assets from <code>/branding/</code></CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ padding: '12px', background: 'var(--color-sand-soft)', borderRadius: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                      Horizontal Logo
                    </span>
                    <div style={{ marginTop: '8px' }}>
                      <img
                        src="/branding/calories-logo-horizontal.png"
                        alt="Calories Horizontal Logo"
                        style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'var(--color-sand-soft)', borderRadius: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        App Icon Light
                      </span>
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src="/branding/calories-app-icon-light.png"
                          alt="Calories Light App Icon"
                          style={{ height: '56px', width: '56px', objectFit: 'contain', borderRadius: '12px' }}
                        />
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: '#152238', borderRadius: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#FAF9F6', textTransform: 'uppercase' }}>
                        App Icon Dark
                      </span>
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src="/branding/calories-app-icon-dark.png"
                          alt="Calories Dark App Icon"
                          style={{ height: '56px', width: '56px', objectFit: 'contain', borderRadius: '12px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="calories-footer">
        <div className="calories-footer-container">
          <CaloriesLogo size="sm" variant="image" />
          <span className="calories-footer-text">
            Calories Platform — Official Brand Assets &amp; 22-Icon SVG Suite Verified.
          </span>
          <span className="calories-footer-domain">calories.bhhc.me</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
