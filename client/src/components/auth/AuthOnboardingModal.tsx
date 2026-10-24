import React, { useState } from 'react';
import {
  Button,
  Badge,
  Input,
  Select,
  FormField,
  Icon,
  CaloriesLogo,
} from '../ui/index.js';
import type { UserProfile, SupplementItem } from '../../types/nutrition.js';
import { apiClient } from '../../api/apiClient.js';

export type AuthModalMode = 'login' | 'register' | 'edit_profile';

export interface AuthOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthModalMode;
  currentProfile: UserProfile;
  onSaveProfile: (updatedProfile: UserProfile) => void;
  onAuthSuccess?: (userName: string) => void;
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

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'register',
  currentProfile,
  onSaveProfile,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthModalMode>(initialMode);

  // Auth fields
  const [name, setName] = useState(currentProfile.name);
  const [email, setEmail] = useState(currentProfile.email);
  const [password, setPassword] = useState('••••••••');

  // Body & Goal fields
  const [heightCm, setHeightCm] = useState(String(currentProfile.heightCm));
  const [weightKg, setWeightKg] = useState(String(currentProfile.currentWeightKg));
  const [targetWeightKg, setTargetWeightKg] = useState(String(currentProfile.targetWeightKg));
  const [targetWeeks, setTargetWeeks] = useState(String(currentProfile.targetWeeks || 8));
  const [primaryGoal, setPrimaryGoal] = useState<UserProfile['primaryGoal']>(
    currentProfile.primaryGoal || 'fat_loss'
  );

  // Allergies
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(currentProfile.allergies);
  const [customAllergy, setCustomAllergy] = useState('');

  // Daily Supplements
  const [supplements, setSupplements] = useState<SupplementItem[]>(currentProfile.supplements);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppDosage, setNewSuppDosage] = useState('');
  const [newSuppTiming, setNewSuppTiming] = useState<SupplementItem['timing']>('Morning');

  const [formError, setFormError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!isOpen) return null;

  const handleToggleAllergy = (allergy: string) => {
    if (selectedAllergies.includes(allergy)) {
      setSelectedAllergies(selectedAllergies.filter((a) => a !== allergy));
    } else {
      setSelectedAllergies([...selectedAllergies, allergy]);
    }
  };

  const handleAddCustomAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customAllergy.trim();
    if (trimmed && !selectedAllergies.includes(trimmed)) {
      setSelectedAllergies([...selectedAllergies, trimmed]);
      setCustomAllergy('');
    }
  };

  const handleAddSupplement = () => {
    if (!newSuppName.trim()) {
      setFormError('Please enter a supplement name.');
      return;
    }
    const newSupp: SupplementItem = {
      id: `supp_${Date.now()}`,
      name: newSuppName.trim(),
      dosage: newSuppDosage.trim() || 'Standard serving',
      timing: newSuppTiming,
    };
    setSupplements([...supplements, newSupp]);
    setNewSuppName('');
    setNewSuppDosage('');
    setFormError('');
  };

  const handleRemoveSupplement = (id: string) => {
    setSupplements(supplements.filter((s) => s.id !== id));
  };

  const handleCompleteSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError('');

    const h = Number(heightCm);
    const w = Number(weightKg);
    const tw = Number(targetWeightKg);
    const weeks = Number(targetWeeks);

    if (isNaN(h) || h < 100 || h > 250) {
      setFormError('Please enter a realistic height between 100cm and 250cm.');
      return;
    }
    if (isNaN(w) || w < 30 || w > 300) {
      setFormError('Please enter a valid current weight between 30kg and 300kg.');
      return;
    }
    if (isNaN(tw) || tw < 30 || tw > 300) {
      setFormError('Please enter a valid target weight between 30kg and 300kg.');
      return;
    }

    // Calculate target date by adding weeks
    const d = new Date();
    d.setDate(d.getDate() + (weeks || 8) * 7);

    const updated: UserProfile = {
      ...currentProfile,
      name: name.trim() || currentProfile.name,
      email: email.trim() || currentProfile.email,
      heightCm: h,
      currentWeightKg: w,
      targetWeightKg: tw,
      targetWeeks: weeks || 8,
      targetDate: d.toISOString().split('T')[0],
      allergies: selectedAllergies,
      supplements,
      primaryGoal,
    };

    onSaveProfile(updated);

    // If registering a new user, register in backend API / MongoDB Atlas
    if (mode === 'register') {
      try {
        const res = await apiClient.register({
          name: updated.name,
          email: updated.email,
          password: password && password.length >= 8 && !password.includes('••') ? password : 'Password123!',
          heightCm: updated.heightCm,
          currentWeightKg: updated.currentWeightKg,
          targetWeightKg: updated.targetWeightKg,
          targetWeeks: updated.targetWeeks,
          allergies: updated.allergies,
          supplements: updated.supplements,
          primaryGoal: updated.primaryGoal,
        });
        if (res.user?.name) {
          onAuthSuccess?.(res.user.name);
        }
      } catch (err: unknown) {
        console.warn('Backend registration notice:', err);
      }
    }

    if (onAuthSuccess) onAuthSuccess(updated.name);
    onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFormError('Email is required.');
      return;
    }
    try {
      const res = await apiClient.login({
        email: email.trim(),
        password: password && password.length >= 8 && !password.includes('••') ? password : 'Password123!',
      });
      if (res.user?.name) {
        onAuthSuccess?.(res.user.name);
      }
    } catch (err: unknown) {
      console.warn('Backend login notice:', err);
    }
    if (onAuthSuccess) onAuthSuccess(name || 'Alex Henderson');
    onClose();
  };

  return (
    <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="calories-modal-card" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="calories-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CaloriesLogo size="sm" variant="image" />
            <h3 id="auth-modal-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {mode === 'edit_profile'
                ? 'Edit Health Profile & Supplements'
                : mode === 'login'
                ? 'Sign In to Calories'
                : 'Create Account & Health Setup'}
            </h3>
          </div>
          <button
            type="button"
            className="calories-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher Tabs (when not editing existing profile) */}
        {mode !== 'edit_profile' && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--color-sand-soft)' }}>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: mode === 'register' ? 'var(--surface-card)' : 'transparent',
                fontWeight: mode === 'register' ? 700 : 500,
                color: mode === 'register' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                borderBottom: mode === 'register' ? '2px solid var(--color-forest-green)' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => {
                setMode('register');
                setStep(1);
              }}
            >
              Register &amp; Onboard
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                background: mode === 'login' ? 'var(--surface-card)' : 'transparent',
                fontWeight: mode === 'login' ? 700 : 500,
                color: mode === 'login' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                borderBottom: mode === 'login' ? '2px solid var(--color-forest-green)' : 'none',
                cursor: 'pointer',
              }}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
          </div>
        )}

        <div className="calories-modal-body">
          {formError && (
            <div className="calories-form-error-box" role="alert">
              {formError}
            </div>
          )}

          {/* LOGIN VIEW */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField label="Email Address" htmlFor="login-email" required={true}>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.henderson@example.com"
                  autoFocus={true}
                />
              </FormField>

              <FormField label="Password" htmlFor="login-password" required={true}>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </FormField>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Demo mode: Any password accepted
                </span>
                <Button variant="primary" size="md" type="submit">
                  Sign In
                </Button>
              </div>
            </form>
          )}

          {/* REGISTER & ONBOARDING / EDIT PROFILE VIEW */}
          {(mode === 'register' || mode === 'edit_profile') && (
            <div>
              {/* Stepper indicator if in register mode */}
              {mode === 'register' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Badge variant={step === 1 ? 'forest' : 'neutral'}>1</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: step === 1 ? 700 : 400 }}>Personal &amp; Body</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Badge variant={step === 2 ? 'forest' : 'neutral'}>2</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: step === 2 ? 700 : 400 }}>Food Allergies</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Badge variant={step === 3 ? 'forest' : 'neutral'}>3</Badge>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: step === 3 ? 700 : 400 }}>Stored Supplements</span>
                  </div>
                </div>
              )}

              {/* STEP 1: Body Metrics & Goals */}
              {(step === 1 || mode === 'edit_profile') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: mode === 'edit_profile' ? '24px' : '0' }}>
                  {mode === 'edit_profile' && (
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="profile" size={18} />
                      1. Personal &amp; Physical Metrics
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormField label="Full Name" htmlFor="user-name" required={true}>
                      <Input
                        id="user-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Henderson"
                      />
                    </FormField>

                    <FormField label="Email" htmlFor="user-email" required={true}>
                      <Input
                        id="user-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@example.com"
                      />
                    </FormField>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <FormField label="Height (cm)" htmlFor="user-height" required={true} hint="e.g. 178">
                      <Input
                        id="user-height"
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="178"
                      />
                    </FormField>

                    <FormField label="Current Weight (kg)" htmlFor="user-weight" required={true} hint="e.g. 74.2">
                      <Input
                        id="user-weight"
                        type="number"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="74.2"
                      />
                    </FormField>

                    <FormField label="Target Weight (kg)" htmlFor="user-target-weight" required={true} hint="e.g. 70.0">
                      <Input
                        id="user-target-weight"
                        type="number"
                        step="0.1"
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        placeholder="70.0"
                      />
                    </FormField>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <FormField label="Target Timeline (Weeks)" htmlFor="user-target-weeks" hint="Time to achieve target">
                      <Input
                        id="user-target-weeks"
                        type="number"
                        value={targetWeeks}
                        onChange={(e) => setTargetWeeks(e.target.value)}
                        placeholder="8"
                      />
                    </FormField>

                    <FormField label="Primary Wellness Goal" htmlFor="user-primary-goal">
                      <Select
                        id="user-primary-goal"
                        value={primaryGoal}
                        onChange={(e) => setPrimaryGoal(e.target.value as UserProfile['primaryGoal'])}
                        options={[
                          { value: 'fat_loss', label: 'Fat Loss & Lean Definition' },
                          { value: 'muscle_gain', label: 'Muscle Gain & Hypertrophy' },
                          { value: 'maintenance', label: 'Maintenance & Energy' },
                          { value: 'athletic', label: 'Athletic Endurance & Performance' },
                        ]}
                      />
                    </FormField>
                  </div>

                  {mode === 'register' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                      <Button variant="primary" size="md" onClick={() => setStep(2)}>
                        Next: Food Allergies ›
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Food Allergies */}
              {(step === 2 || mode === 'edit_profile') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: mode === 'edit_profile' ? '24px' : '0', paddingTop: mode === 'edit_profile' ? '16px' : '0', borderTop: mode === 'edit_profile' ? '1px solid var(--border-light)' : 'none' }}>
                  {mode === 'edit_profile' && (
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="heart" size={18} />
                      2. Food Allergies &amp; Sensitivities
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Select Your Known Allergies:
                    </label>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                      Calories cross-checks every manual and AI food log against your allergy profile to prevent adverse reactions.
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {COMMON_ALLERGIES.map((allergy) => {
                        const isSelected = selectedAllergies.includes(allergy);
                        return (
                          <button
                            key={allergy}
                            type="button"
                            onClick={() => handleToggleAllergy(allergy)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 'var(--text-xs)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: isSelected ? '1px solid var(--color-error-red)' : '1px solid var(--border-medium)',
                              backgroundColor: isSelected ? 'rgba(184, 68, 68, 0.12)' : 'var(--color-sand-soft)',
                              color: isSelected ? 'var(--color-error-red)' : 'var(--text-primary)',
                              transition: 'all var(--transition-fast)',
                            }}
                          >
                            {isSelected ? '⚠️ ' : '+ '} {allergy}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Allergy Adder */}
                  <form onSubmit={handleAddCustomAllergy} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginTop: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        placeholder="Add other allergen (e.g. Mustard, Sulfites)..."
                        value={customAllergy}
                        onChange={(e) => setCustomAllergy(e.target.value)}
                      />
                    </div>
                    <Button type="submit" variant="secondary" size="md">
                      Add Allergen
                    </Button>
                  </form>

                  {mode === 'register' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                      <Button variant="outline" size="md" onClick={() => setStep(1)}>
                        ‹ Back
                      </Button>
                      <Button variant="primary" size="md" onClick={() => setStep(3)}>
                        Next: Daily Supplements ›
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Stored Supplements */}
              {(step === 3 || mode === 'edit_profile') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: mode === 'edit_profile' ? '16px' : '0', borderTop: mode === 'edit_profile' ? '1px solid var(--border-light)' : 'none' }}>
                  {mode === 'edit_profile' && (
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-forest-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon name="supplements" size={18} />
                      3. Stored Daily Supplements
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                        Permanent Daily Supplements
                      </label>
                      <Badge variant="sage">Stored in Profile</Badge>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '4px 0 10px 0' }}>
                      Save your recurring supplements once. They are tracked automatically without having to manually log them every day.
                    </p>
                  </div>

                  {/* List of current supplements */}
                  {supplements.length === 0 ? (
                    <div style={{ padding: '16px', background: 'var(--color-sand-soft)', borderRadius: 'var(--radius-md)', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      No supplements added yet. Add items below (e.g. Whey Protein, Creatine, Omega-3).
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                      {supplements.map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: 'var(--surface-card)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{s.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {s.dosage} • <span style={{ color: 'var(--color-forest-green)' }}>{s.timing}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: 'var(--color-error-red)', padding: '2px 8px' }}
                            onClick={() => handleRemoveSupplement(s.id)}
                            aria-label={`Remove ${s.name}`}
                          >
                            ✕ Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Supplement Form Controls */}
                  <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                      + Add New Daily Supplement
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
                      <FormField label="Supplement Name" htmlFor="supp-name">
                        <Input
                          id="supp-name"
                          placeholder="e.g. Creatine Monohydrate"
                          value={newSuppName}
                          onChange={(e) => setNewSuppName(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Dosage" htmlFor="supp-dosage">
                        <Input
                          id="supp-dosage"
                          placeholder="e.g. 5g"
                          value={newSuppDosage}
                          onChange={(e) => setNewSuppDosage(e.target.value)}
                        />
                      </FormField>

                      <FormField label="Timing" htmlFor="supp-timing">
                        <Select
                          id="supp-timing"
                          value={newSuppTiming}
                          onChange={(e) => setNewSuppTiming(e.target.value as SupplementItem['timing'])}
                          options={[
                            { value: 'Morning', label: 'Morning' },
                            { value: 'Pre-Workout', label: 'Pre-Workout' },
                            { value: 'Post-Workout', label: 'Post-Workout' },
                            { value: 'With Meals', label: 'With Meals' },
                            { value: 'Evening', label: 'Evening' },
                          ]}
                        />
                      </FormField>

                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={handleAddSupplement}
                        style={{ height: '38px', marginBottom: '2px' }}
                      >
                        + Add
                      </Button>
                    </div>
                  </div>

                  {/* Modal Footer Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                    {mode === 'register' ? (
                      <>
                        <Button variant="outline" size="md" onClick={() => setStep(2)}>
                          ‹ Back
                        </Button>
                        <Button variant="primary" size="md" onClick={handleCompleteSave}>
                          Complete Setup &amp; Enter Dashboard ›
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="md" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="md" onClick={handleCompleteSave}>
                          Save Health Profile &amp; Supplements
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
