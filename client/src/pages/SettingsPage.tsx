import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
  Select,
  FormField,
  Icon,
} from '../components/ui/index.js';
import type { MealItem, DailyGoal, UserProfile } from '../types/nutrition.js';
import { apiClient, type DietInstructionItem } from '../api/apiClient.js';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  getReminderPreferences,
  setReminderPreferences,
  type ReminderPreferences,
} from '../utils/notificationService.js';

const DEFAULT_SETTINGS_PROFILE: UserProfile = {
  id: '',
  name: 'User',
  email: '',
  heightCm: 175,
  currentWeightKg: 75,
  targetWeightKg: 70,
  targetWeeks: 8,
  targetDate: new Date().toISOString().split('T')[0],
  activityLevel: 'moderate',
  allergies: [],
  supplements: [],
  primaryGoal: 'fat_loss',
};

export interface SettingsPageProps {
  meals: MealItem[];
  goal: DailyGoal;
  userProfile?: UserProfile;
  onEditProfile?: () => void;
  onExportPdf?: () => void;
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  meals,
  goal,
  userProfile = DEFAULT_SETTINGS_PROFILE,
  onEditProfile,
  onExportPdf,
  onLogout,
}) => {
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    getNotificationPermission()
  );
  const [reminderPrefs, setReminderPrefsState] = useState<ReminderPreferences>(() =>
    getReminderPreferences()
  );
  const [testSuccessMessage, setTestSuccessMessage] = useState('');

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(granted ? 'granted' : 'denied');
  };

  const handleSendTest = () => {
    const sent = sendTestNotification();
    if (sent) {
      setTestSuccessMessage('Test notification dispatched! Check your desktop/browser.');
      setTimeout(() => setTestSuccessMessage(''), 4000);
    }
  };

  const handleTogglePref = (key: keyof ReminderPreferences) => {
    const updated = {
      ...reminderPrefs,
      [key]: !reminderPrefs[key],
    };
    setReminderPrefsState(updated);
    setReminderPreferences(updated);
  };

  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    version: string;
    service: string;
    latencyMs: number;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Compute BMI
  const heightM = userProfile.heightCm / 100;
  const bmi = heightM > 0 ? (userProfile.currentWeightKg / (heightM * heightM)).toFixed(1) : '23.4';

  const checkBackendHealth = async () => {
    setIsCheckingHealth(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/v1/health');
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus({
          status: data.status || 'ok',
          version: data.version || '0.1.0',
          service: data.service || 'calories-server',
          latencyMs: elapsed,
        });
      } else {
        setHealthStatus({ status: 'unreachable', version: 'unknown', service: 'offline', latencyMs: elapsed });
      }
    } catch {
      const elapsed = Math.round(performance.now() - start);
      setHealthStatus({ status: 'offline', version: '0.1.0', service: 'offline', latencyMs: elapsed });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const runInitialCheck = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/v1/health');
        const elapsed = Math.round(performance.now() - start);
        if (isMounted) {
          if (res.ok) {
            const data = await res.json();
            setHealthStatus({
              status: data.status || 'ok',
              version: data.version || '0.1.0',
              service: data.service || 'calories-server',
              latencyMs: elapsed,
            });
          } else {
            setHealthStatus({ status: 'unreachable', version: 'unknown', service: 'offline', latencyMs: elapsed });
          }
        }
      } catch {
        const elapsed = Math.round(performance.now() - start);
        if (isMounted) {
          setHealthStatus({ status: 'offline', version: '0.1.0', service: 'offline', latencyMs: elapsed });
        }
      }
    };
    runInitialCheck();
    return () => {
      isMounted = false;
    };
  }, []);

  // Stored Diet Plan / Prescription PDFs from MongoDB
  const [dietInstructions, setDietInstructions] = useState<DietInstructionItem[]>([]);
  const [isLoadingDietInstructions, setIsLoadingDietInstructions] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchDietInstructions = async () => {
    setIsLoadingDietInstructions(true);
    try {
      const res = await apiClient.getDietInstructions();
      if (res?.instructions) {
        setDietInstructions(res.instructions);
      }
    } catch (err) {
      console.warn('Failed to fetch diet instructions:', err);
    } finally {
      setIsLoadingDietInstructions(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getDietInstructions()
      .then((res) => {
        if (isMounted && res?.instructions) {
          setDietInstructions(res.instructions);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch diet instructions on mount:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPdfError(null);
    setPdfMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
        setSelectedPdf(file);
      } else {
        setPdfError('Please choose a valid PDF file (.pdf).');
      }
    }
  };

  const handleUploadPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPdf) return;
    setIsUploadingPdf(true);
    setPdfError(null);
    setPdfMessage(null);

    try {
      const res = await apiClient.uploadDietPlanPdf(selectedPdf);
      setPdfMessage(res.message || 'Diet plan analyzed & guidelines saved to your profile!');
      setSelectedPdf(null);
      await fetchDietInstructions();
      setTimeout(() => setPdfMessage(null), 4000);
    } catch (err: unknown) {
      setPdfError((err as { message?: string })?.message || 'Failed to upload diet plan PDF.');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    try {
      await apiClient.deleteDietInstruction(id);
      setDietInstructions((prev) => prev.filter((item) => item._id !== id));
      setPdfMessage('Diet instruction removed from profile.');
      setTimeout(() => setPdfMessage(null), 3000);
    } catch (err: unknown) {
      console.warn('Failed to delete diet instruction:', err);
    }
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: userProfile,
      goal,
      totalMealsLogged: meals.length,
      meals,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calories-health-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Account, Health Profile &amp; Preferences</div>
          <h1 className="calories-greeting-title">User Settings &amp; Health Profile</h1>
          <p className="calories-greeting-subtext">
            View your personal physical metrics, registered food allergies, permanent daily supplements, and telemetry status.
          </p>
        </div>

        {onEditProfile && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="settings" size={16} />}
            onClick={onEditProfile}
          >
            Edit Profile &amp; Health Details
          </Button>
        )}
      </div>

      <div className="calories-grid-two">
        {/* Profile & Physical Baseline Details */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="profile" size={22} />
                <CardTitle>Physical Metrics &amp; Body Stats</CardTitle>
              </div>
              <Badge variant="forest">Active Profile</Badge>
            </div>
            <CardDescription>
              Your biological and goal settings used for calorie calculations
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Full Name</div>
                  <strong style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{userProfile.name}</strong>
                </div>

                <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Email Address</div>
                  <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{userProfile.email}</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Height</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                    {userProfile.heightCm} cm
                  </div>
                </div>

                <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Current Weight</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                    {userProfile.currentWeightKg} kg
                  </div>
                </div>

                <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-forest-green)' }}>Target Weight</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-forest-green)' }}>
                    {goal?.targetWeight || userProfile.targetWeightKg} kg
                  </div>
                </div>

                <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>BMI</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                    {bmi}
                  </div>
                </div>
              </div>

              {/* Food Allergies */}
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Registered Food Allergies:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {userProfile.allergies.length === 0 ? (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>None registered</span>
                  ) : (
                    userProfile.allergies.map((allergy) => (
                      <Badge key={allergy} variant="destructive">
                        ⚠️ {allergy}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            {onEditProfile && (
              <Button variant="outline" size="sm" onClick={onEditProfile}>
                Edit Physical Metrics &amp; Allergies
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* Permanent Daily Stored Supplements */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="supplements" size={22} />
                <CardTitle>Permanent Stored Supplements</CardTitle>
              </div>
              <Badge variant="sage">Stored in Profile</Badge>
            </div>
            <CardDescription>
              Supplements stored here are tracked automatically every day without manual re-entry.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {userProfile.supplements.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--color-sand-soft)', borderRadius: 'var(--radius-md)' }}>
                No permanent supplements configured. Click "Edit Profile" to add Whey, Creatine, Multivitamins, etc.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {userProfile.supplements.map((supp) => (
                  <div
                    key={supp.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'var(--color-sand-soft)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                        {supp.name}
                      </strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Dosage: <strong>{supp.dosage}</strong> • Timing: <span style={{ color: 'var(--color-forest-green)', fontWeight: 600 }}>{supp.timing}</span>
                      </div>
                      {supp.notes && (
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                          {supp.notes}
                        </div>
                      )}
                    </div>
                    <Badge variant="neutral">{supp.timing}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter>
            {onEditProfile && (
              <Button variant="outline" size="sm" onClick={onEditProfile}>
                Manage Daily Supplements
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Prescriptions & Clinical Diet Plans in Profile */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="ai-scan" size={22} />
              <CardTitle>Prescription &amp; Clinical Diet Plans (PDF)</CardTitle>
            </div>
            <Badge variant="sage">{dietInstructions.length} Active in Profile</Badge>
          </div>
          <CardDescription>
            Doctor prescriptions and dietitian charts saved in MongoDB. The AI recommendation engine automatically aligns meals with these active guidelines.
          </CardDescription>
        </CardHeader>

        <CardContent style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pdfError && (
            <div className="calories-form-error-box" role="alert">
              {pdfError}
            </div>
          )}

          {pdfMessage && (
            <div className="calories-success-banner" role="status">
              <Icon name="check" size={16} />
              <span>{pdfMessage}</span>
            </div>
          )}

          {isLoadingDietInstructions ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
              Loading stored diet instructions...
            </div>
          ) : dietInstructions.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--color-sand-soft)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-xs)' }}>
              No clinical diet plans or prescriptions saved in your profile yet. Upload one below to incorporate clinical rules into your food recommendations!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dietInstructions.map((instruction) => (
                <div
                  key={instruction._id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '14px',
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '22px' }}>📄</span>
                      <div>
                        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          {instruction.fileName}
                        </strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Uploaded {new Date(instruction.createdAt).toLocaleDateString()} • {(instruction.fileSizeBytes / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      style={{ color: 'var(--color-error-red)', borderColor: 'rgba(184, 68, 68, 0.4)' }}
                      onClick={() => handleDeleteInstruction(instruction._id)}
                    >
                      🗑️ Remove From Profile
                    </Button>
                  </div>

                  {instruction.summary && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', backgroundColor: 'var(--color-sand-soft)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                      <strong>Summary:</strong> {instruction.summary}
                    </div>
                  )}

                  {instruction.clinicalObservations && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      <strong>Doctor Notes:</strong> {instruction.clinicalObservations}
                    </div>
                  )}

                  {/* Target macros if present */}
                  {instruction.targetCaloriesKcal && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Prescribed Targets:</span>
                      <Badge variant="forest">{instruction.targetCaloriesKcal} kcal</Badge>
                      {instruction.targetProteinGrams && <Badge variant="sage">{instruction.targetProteinGrams}g Protein</Badge>}
                      {instruction.targetCarbsGrams && <Badge variant="neutral">{instruction.targetCarbsGrams}g Carbs</Badge>}
                      {instruction.targetFatGrams && <Badge variant="amber">{instruction.targetFatGrams}g Fat</Badge>}
                    </div>
                  )}

                  {/* Forbidden & Recommended Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    {instruction.forbiddenFoods && instruction.forbiddenFoods.length > 0 && (
                      <div style={{ backgroundColor: 'rgba(184, 68, 68, 0.05)', border: '1px solid rgba(184, 68, 68, 0.2)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-error-red)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          🚫 Avoid Foods:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {instruction.forbiddenFoods.map((f, i) => (
                            <span key={i} style={{ backgroundColor: 'rgba(184, 68, 68, 0.12)', color: 'var(--color-error-red)', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
                              ✕ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {instruction.recommendedFoods && instruction.recommendedFoods.length > 0 && (
                      <div style={{ backgroundColor: 'var(--color-sage-soft)', border: '1px solid rgba(40, 91, 70, 0.2)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-forest-green)', textTransform: 'uppercase', marginBottom: '4px' }}>
                          🌿 Recommended Foods:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {instruction.recommendedFoods.map((r, i) => (
                            <span key={i} style={{ backgroundColor: 'rgba(40, 91, 70, 0.15)', color: 'var(--color-forest-green)', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
                              ✓ {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload New Diet PDF */}
          <form onSubmit={handleUploadPdf} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--color-sand-soft)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>
              + Upload New Prescription or Diet Chart (PDF)
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                id="settings-diet-pdf-input"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handlePdfSelect}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('settings-diet-pdf-input')?.click()}
              >
                {selectedPdf ? `Change PDF (${selectedPdf.name})` : 'Browse PDF Prescription'}
              </Button>

              {selectedPdf && (
                <span style={{ fontSize: '11px', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                  {selectedPdf.name} ({(selectedPdf.size / 1024).toFixed(0)} KB)
                </span>
              )}

              {selectedPdf && (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isUploadingPdf}
                  leftIcon={<Icon name="ai-scan" size={14} />}
                >
                  {isUploadingPdf ? 'Analyzing PDF with AI...' : 'Save Guideline to Profile'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* System Preferences & Data Management */}
      <div className="calories-grid-two">
        {/* App Preferences */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="settings" size={20} />
              <CardTitle>Regional Preferences</CardTitle>
            </div>
            <CardDescription>Configure timezone and unit measurement system</CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <FormField label="Timezone" htmlFor="settings-tz">
                <Select
                  id="settings-tz"
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  options={[
                    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
                    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                    { value: 'America/New_York', label: 'America/New_York (EST, UTC-5)' },
                    { value: 'Europe/London', label: 'Europe/London (GMT, UTC+0)' },
                  ]}
                />
              </FormField>

              <FormField label="Unit Measurement" htmlFor="settings-units">
                <Select
                  id="settings-units"
                  value={unitSystem}
                  onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                  options={[
                    { value: 'metric', label: 'Metric (grams, milliliters, kilograms)' },
                    { value: 'imperial', label: 'Imperial (ounces, cups, pounds)' },
                  ]}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Browser Reminders & Notifications */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                <CardTitle>Browser Reminders &amp; Alerts</CardTitle>
              </div>
              <Badge variant={notificationPermission === 'granted' ? 'forest' : notificationPermission === 'denied' ? 'amber' : 'neutral'}>
                {notificationPermission === 'granted' ? 'Alerts Active ✓' : notificationPermission === 'denied' ? 'Blocked by Browser' : 'Permission Required'}
              </Badge>
            </div>
            <CardDescription>
              Receive desktop browser notifications when you miss logging a meal, supplement, or daily hydration.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {testSuccessMessage && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-sage-soft)', color: 'var(--color-forest-green)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  {testSuccessMessage}
                </div>
              )}

              {notificationPermission !== 'granted' ? (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-sand-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Browser permissions are needed to pop alerts when meals or supplements are missed.
                  </div>
                  <Button variant="primary" size="sm" onClick={handleRequestPermission}>
                    Enable Alerts
                  </Button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={reminderPrefs.meals}
                      onChange={() => handleTogglePref('meals')}
                      style={{ accentColor: 'var(--color-forest-green)', width: '16px', height: '16px' }}
                    />
                    <span>Missed Meal Reminders (Breakfast 10:30 AM, Lunch 2:00 PM, Dinner 8:30 PM)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={reminderPrefs.supplements}
                      onChange={() => handleTogglePref('supplements')}
                      style={{ accentColor: 'var(--color-forest-green)', width: '16px', height: '16px' }}
                    />
                    <span>Daily Supplement Reminders (Morning 11:00 AM, Evening 8:30 PM)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={reminderPrefs.water}
                      onChange={() => handleTogglePref('water')}
                      style={{ accentColor: 'var(--color-forest-green)', width: '16px', height: '16px' }}
                    />
                    <span>Afternoon Hydration Check (&lt; 1,500ml by 3:00 PM)</span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <Button variant="outline" size="sm" onClick={handleSendTest}>
                  Send Test Notification
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Portability & Health Ping */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="reports" size={20} />
              <CardTitle>Data Export &amp; Telemetry</CardTitle>
            </div>
            <CardDescription>Export complete health reports or check backend service health</CardDescription>
          </CardHeader>

          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Telemetry Ping */}
              <div style={{ background: 'var(--color-sand-soft)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Backend Service Status:</div>
                  <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: healthStatus?.status === 'ok' ? 'var(--color-forest-green)' : 'var(--color-amber)' }}>
                    {healthStatus ? `${healthStatus.status.toUpperCase()} (${healthStatus.latencyMs}ms)` : 'Checking...'}
                  </strong>
                </div>
                <Button variant="ghost" size="sm" onClick={checkBackendHealth} isLoading={isCheckingHealth}>
                  Ping Server
                </Button>
              </div>

              {/* PDF & JSON Export Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {onExportPdf && (
                  <Button
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    leftIcon={<Icon name="reports" size={16} />}
                    onClick={onExportPdf}
                  >
                    Export Report (PDF)
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  onClick={handleExportData}
                >
                  Download JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACCOUNT & SESSION (SIGN OUT) */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="profile" size={20} />
              <CardTitle>Account &amp; Active Session</CardTitle>
            </div>
            <CardDescription>
              Manage your active login session and sign out of the Calories platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                  Signed in as {userProfile.name || 'User'}
                </strong>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {userProfile.email || 'Current active session'}
                </div>
              </div>

              {onLogout && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onLogout}
                  title="Sign Out of Calories"
                >
                  Sign Out of Calories
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
