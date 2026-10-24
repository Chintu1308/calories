import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Button,
  FormField,
  Input,
  Select,
  Badge,
  CaloriesLogo,
} from '../components/ui/index.js';
import { apiClient, type AuthResponse } from '../api/apiClient.js';
import type { UserProfile, SupplementItem } from '../types/nutrition.js';

export interface AuthPageProps {
  onAuthSuccess: (user: UserProfile, token: string) => void;
}

const COMMON_ALLERGIES = [
  'Peanuts',
  'Tree Nuts',
  'Gluten',
  'Dairy',
  'Shellfish',
  'Eggs',
  'Soy',
  'Fish',
  'Sesame',
];

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register state
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: Biometrics
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [targetWeightKg, setTargetWeightKg] = useState('70');
  const [targetWeeks, setTargetWeeks] = useState('8');
  const [primaryGoal, setPrimaryGoal] = useState<UserProfile['primaryGoal']>('fat_loss');

  // Step 3: Allergies & Supplements
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [supplements, setSupplements] = useState<SupplementItem[]>([]);
  const [suppName, setSuppName] = useState('');
  const [suppDosage, setSuppDosage] = useState('');
  const [suppTiming, setSuppTiming] = useState<SupplementItem['timing']>('Morning');

  const handleToggleAllergy = (allergy: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const handleAddCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !selectedAllergies.includes(trimmed)) {
      setSelectedAllergies((prev) => [...prev, trimmed]);
      setCustomAllergy('');
    }
  };

  const handleAddSupplement = () => {
    if (!suppName.trim()) return;
    const newSupp: SupplementItem = {
      id: `supp_${Date.now()}`,
      name: suppName.trim(),
      dosage: suppDosage.trim() || 'Standard serving',
      timing: suppTiming,
    };
    setSupplements((prev) => [...prev, newSupp]);
    setSuppName('');
    setSuppDosage('');
  };

  const handleRemoveSupplement = (id: string) => {
    setSupplements((prev) => prev.filter((s) => s.id !== id));
  };

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res: AuthResponse = await apiClient.login({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      const mappedSupplements: SupplementItem[] = (res.user.supplements || []).map((s) => ({
        id: s.id,
        name: s.name,
        dosage: s.dosage,
        timing: (s.timing as SupplementItem['timing']) || 'Morning',
        notes: s.notes,
      }));

      const profile: UserProfile = {
        id: res.user._id,
        name: res.user.name,
        email: res.user.email,
        heightCm: res.user.heightCm || 175,
        currentWeightKg: res.user.currentWeightKg || 75,
        targetWeightKg: res.user.targetWeightKg || 70,
        targetWeeks: res.user.targetWeeks || 8,
        targetDate: new Date().toISOString().split('T')[0],
        activityLevel: 'moderate',
        allergies: res.user.allergies || [],
        supplements: mappedSupplements,
        primaryGoal: (res.user.primaryGoal as UserProfile['primaryGoal']) || 'fat_loss',
      };

      onAuthSuccess(profile, res.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const h = Number(heightCm);
    const w = Number(weightKg);
    const tw = Number(targetWeightKg);
    const weeks = Number(targetWeeks);

    if (isNaN(h) || h < 100 || h > 250) {
      setErrorMessage('Please enter a realistic height between 100cm and 250cm.');
      return;
    }
    if (isNaN(w) || w < 30 || w > 300) {
      setErrorMessage('Please enter a valid current weight between 30kg and 300kg.');
      return;
    }
    if (isNaN(tw) || tw < 30 || tw > 300) {
      setErrorMessage('Please enter a valid target weight between 30kg and 300kg.');
      return;
    }

    setIsLoading(true);
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (weeks || 8) * 7);

      const res: AuthResponse = await apiClient.register({
        name: name.trim() || 'User',
        email: email.trim(),
        password: password.trim(),
        heightCm: h,
        currentWeightKg: w,
        targetWeightKg: tw,
        targetWeeks: weeks || 8,
        targetDate: targetDate.toISOString().split('T')[0],
        allergies: selectedAllergies,
        supplements,
        primaryGoal,
      });

      const profile: UserProfile = {
        id: res.user._id,
        name: res.user.name,
        email: res.user.email,
        heightCm: h,
        currentWeightKg: w,
        targetWeightKg: tw,
        targetWeeks: weeks || 8,
        targetDate: targetDate.toISOString().split('T')[0],
        activityLevel: 'moderate',
        allergies: selectedAllergies,
        supplements,
        primaryGoal,
      };

      onAuthSuccess(profile, res.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please check your information.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--color-sand-soft)',
        padding: '24px 16px',
      }}
    >
      <div style={{ maxWidth: '520px', width: '100%' }}>
        {/* Brand Lockup */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <CaloriesLogo size="lg" variant="image" />
          <h1
            style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '12px 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome to Calories
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
            Personal Clinical Nutrition &amp; Calorie Tracking Engine
          </p>
        </div>

        {/* Auth Card */}
        <Card style={{ overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                background: tab === 'login' ? 'var(--surface-card)' : 'var(--color-sand-soft)',
                fontWeight: tab === 'login' ? 700 : 500,
                color: tab === 'login' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                borderBottom: tab === 'login' ? '2.5px solid var(--color-forest-green)' : 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
              }}
              onClick={() => {
                setTab('login');
                setErrorMessage('');
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                background: tab === 'register' ? 'var(--surface-card)' : 'var(--color-sand-soft)',
                fontWeight: tab === 'register' ? 700 : 500,
                color: tab === 'register' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                borderBottom: tab === 'register' ? '2.5px solid var(--color-forest-green)' : 'none',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
              }}
              onClick={() => {
                setTab('register');
                setErrorMessage('');
              }}
            >
              Create Account
            </button>
          </div>

          <CardContent style={{ padding: '24px' }}>
            {/* Error Message Banner */}
            {errorMessage && (
              <div
                role="alert"
                style={{
                  background: 'rgba(217, 83, 79, 0.1)',
                  border: '1px solid var(--color-error-red)',
                  color: 'var(--color-error-red)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SIGN IN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FormField label="Email Address" htmlFor="auth-login-email" required={true}>
                  <Input
                    id="auth-login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required={true}
                    disabled={isLoading}
                  />
                </FormField>

                <FormField label="Password" htmlFor="auth-login-password" required={true}>
                  <Input
                    id="auth-login-password"
                    type="password"
                    placeholder="Enter your account password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required={true}
                    disabled={isLoading}
                  />
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Your Dashboard'}
                </Button>

                <div style={{ textAlign: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Don't have an account yet?{' '}
                  </span>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-forest-green)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onClick={() => {
                      setTab('register');
                      setErrorMessage('');
                    }}
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* CREATE ACCOUNT / ONBOARDING FORM */}
            {tab === 'register' && (
              <div>
                {/* Step Indicator */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: registerStep >= 1 ? 'var(--color-forest-green)' : 'var(--border-medium)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      1
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: registerStep === 1 ? 700 : 500 }}>
                      Account
                    </span>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border-light)', flex: 1, margin: '12px 8px 0' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: registerStep >= 2 ? 'var(--color-forest-green)' : 'var(--border-medium)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      2
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: registerStep === 2 ? 700 : 500 }}>
                      Biometrics
                    </span>
                  </div>

                  <div style={{ height: '1px', background: 'var(--border-light)', flex: 1, margin: '12px 8px 0' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: registerStep >= 3 ? 'var(--color-forest-green)' : 'var(--border-medium)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      3
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: registerStep === 3 ? 700 : 500 }}>
                      Allergies
                    </span>
                  </div>
                </div>

                {/* Step 1: Account credentials */}
                {registerStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <FormField label="Full Name" htmlFor="reg-name" required={true}>
                      <Input
                        id="reg-name"
                        placeholder="e.g. John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={true}
                      />
                    </FormField>

                    <FormField label="Email Address" htmlFor="reg-email" required={true}>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required={true}
                      />
                    </FormField>

                    <FormField
                      label="Password"
                      htmlFor="reg-password"
                      required={true}
                      hint="Minimum 8 characters"
                    >
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Choose a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={true}
                      />
                    </FormField>

                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      style={{ marginTop: '8px' }}
                      onClick={() => {
                        if (!name.trim()) {
                          setErrorMessage('Please enter your full name.');
                          return;
                        }
                        if (!email.trim() || !email.includes('@')) {
                          setErrorMessage('Please enter a valid email address.');
                          return;
                        }
                        if (password.length < 8) {
                          setErrorMessage('Password must be at least 8 characters long.');
                          return;
                        }
                        setErrorMessage('');
                        setRegisterStep(2);
                      }}
                    >
                      Next: Health Biometrics →
                    </Button>
                  </div>
                )}

                {/* Step 2: Body Biometrics & Goals */}
                {registerStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <FormField label="Height (cm)" htmlFor="reg-height" required={true}>
                        <Input
                          id="reg-height"
                          type="number"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          min={100}
                          max={250}
                        />
                      </FormField>

                      <FormField label="Current Weight (kg)" htmlFor="reg-weight" required={true}>
                        <Input
                          id="reg-weight"
                          type="number"
                          step="0.1"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value)}
                          min={30}
                          max={300}
                        />
                      </FormField>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <FormField label="Target Weight (kg)" htmlFor="reg-target-weight" required={true}>
                        <Input
                          id="reg-target-weight"
                          type="number"
                          step="0.1"
                          value={targetWeightKg}
                          onChange={(e) => setTargetWeightKg(e.target.value)}
                          min={30}
                          max={300}
                        />
                      </FormField>

                      <FormField label="Target Horizon (Weeks)" htmlFor="reg-weeks" required={true}>
                        <Input
                          id="reg-weeks"
                          type="number"
                          value={targetWeeks}
                          onChange={(e) => setTargetWeeks(e.target.value)}
                          min={1}
                          max={52}
                        />
                      </FormField>
                    </div>

                    <FormField label="Primary Health Goal" htmlFor="reg-goal">
                      <Select
                        id="reg-goal"
                        value={primaryGoal}
                        onChange={(e) => setPrimaryGoal(e.target.value as UserProfile['primaryGoal'])}
                        options={[
                          { value: 'fat_loss', label: 'Fat Loss & Lean Definition' },
                          { value: 'muscle_gain', label: 'Muscle Gain & Hypertrophy' },
                          { value: 'maintenance', label: 'Weight Maintenance & Metabolic Health' },
                          { value: 'endurance', label: 'Athletic Endurance & Performance' },
                        ]}
                      />
                    </FormField>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        style={{ flex: 1 }}
                        onClick={() => setRegisterStep(1)}
                      >
                        ← Back
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        style={{ flex: 2 }}
                        onClick={() => {
                          setErrorMessage('');
                          setRegisterStep(3);
                        }}
                      >
                        Next: Allergies &amp; Supplements →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Allergies & Daily Supplements */}
                {registerStep === 3 && (
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                        Known Allergies &amp; Dietary Sensitivities
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {COMMON_ALLERGIES.map((allergy) => {
                          const isSelected = selectedAllergies.includes(allergy);
                          return (
                            <button
                              key={allergy}
                              type="button"
                              onClick={() => handleToggleAllergy(allergy)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-full)',
                                border: isSelected ? '1px solid var(--color-forest-green)' : '1px solid var(--border-medium)',
                                background: isSelected ? 'var(--color-forest-green)' : 'transparent',
                                color: isSelected ? '#fff' : 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {allergy} {isSelected ? '✓' : '+'}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <Input
                          placeholder="Other allergy (e.g. Corn, Sesame)"
                          value={customAllergy}
                          onChange={(e) => setCustomAllergy(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomAllergy();
                            }
                          }}
                          style={{ flex: 1 }}
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={handleAddCustomAllergy}>
                          + Add
                        </Button>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                      <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                        Daily Supplements (Optional)
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: '6px' }}>
                        <Input
                          placeholder="Name (e.g. Creatine)"
                          value={suppName}
                          onChange={(e) => setSuppName(e.target.value)}
                        />
                        <Input
                          placeholder="Dose (5g)"
                          value={suppDosage}
                          onChange={(e) => setSuppDosage(e.target.value)}
                        />
                        <Select
                          value={suppTiming}
                          onChange={(e) => setSuppTiming(e.target.value as SupplementItem['timing'])}
                          options={[
                            { value: 'Morning', label: 'Morning' },
                            { value: 'Pre-Workout', label: 'Pre-Workout' },
                            { value: 'Post-Workout', label: 'Post-Workout' },
                            { value: 'Evening', label: 'Evening' },
                            { value: 'With Meals', label: 'With Meals' },
                          ]}
                        />
                        <Button type="button" variant="secondary" size="sm" onClick={handleAddSupplement}>
                          + Add
                        </Button>
                      </div>

                      {supplements.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                          {supplements.map((s) => (
                            <Badge key={s.id} variant="neutral">
                              {s.name} ({s.dosage} • {s.timing})
                              <button
                                type="button"
                                onClick={() => handleRemoveSupplement(s.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '6px' }}
                              >
                                ✕
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        style={{ flex: 1 }}
                        onClick={() => setRegisterStep(2)}
                        disabled={isLoading}
                      >
                        ← Back
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        style={{ flex: 2 }}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Creating Account...' : 'Complete & Launch Dashboard ✓'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer info */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          Calories Health-Tech Platform • Data persisted directly to MongoDB Atlas with multi-tenant isolation.
        </div>
      </div>
    </div>
  );
};
