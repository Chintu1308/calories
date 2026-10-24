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
  Input,
  Select,
  FormField,
  Icon,
} from '../components/ui/index.js';
import type { MealItem, DailyGoal } from '../types/nutrition.js';

export interface SettingsPageProps {
  meals: MealItem[];
  goal: DailyGoal;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  meals,
  goal,
}) => {
  const [userName, setUserName] = useState('Alex Henderson');
  const [userEmail, setUserEmail] = useState('alex.henderson@example.com');
  const [selectedTimezone, setSelectedTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
  );
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    version: string;
    service: string;
    latencyMs: number;
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: { name: userName, email: userEmail, timezone: selectedTimezone },
      goal,
      totalMealsTracked: meals.length,
      meals,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calories-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="calories-page-container">
      {/* Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Preferences &amp; Diagnostics</div>
          <h1 className="calories-greeting-title">Platform Settings</h1>
          <p className="calories-greeting-subtext">
            Configure timezones, unit conventions, inspect server connectivity, and export personal nutrition logs.
          </p>
        </div>

        <Badge variant="neutral">Client Settings</Badge>
      </div>

      {saveSuccess && (
        <div className="calories-success-banner" role="status">
          <Icon name="check" size={18} />
          <span>Profile preferences saved successfully!</span>
        </div>
      )}

      <div className="calories-grid-two">
        {/* Profile & Timezone Card */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="profile" size={24} />
              <CardTitle>Profile &amp; Timezone</CardTitle>
            </div>
            <CardDescription>
              Timezone determines how UTC meal timestamps map to your calendar days
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form id="settings-form" onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FormField label="Full Name" htmlFor="profile-name">
                <Input
                  id="profile-name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </FormField>

              <FormField label="Email Address" htmlFor="profile-email">
                <Input
                  id="profile-email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </FormField>

              <FormField
                label="Primary Timezone"
                htmlFor="profile-tz"
                hint="Dates are stored in UTC and converted dynamically to this timezone"
              >
                <Select
                  id="profile-tz"
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  options={[
                    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST, UTC+5:30)' },
                    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
                    { value: 'America/New_York', label: 'America/New_York (EDT, UTC-4)' },
                    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PDT, UTC-7)' },
                    { value: 'Europe/London', label: 'Europe/London (BST, UTC+1)' },
                  ]}
                />
              </FormField>

              <FormField label="Measurement System" htmlFor="profile-units">
                <Select
                  id="profile-units"
                  value={unitSystem}
                  onChange={(e) => setUnitSystem(e.target.value as 'metric' | 'imperial')}
                  options={[
                    { value: 'metric', label: 'Metric System (grams, kilograms, milliliters)' },
                    { value: 'imperial', label: 'Imperial System (ounces, pounds, cups)' },
                  ]}
                />
              </FormField>
            </form>
          </CardContent>

          <CardFooter>
            <Button variant="primary" size="md" type="submit" form="settings-form">
              Save Preferences
            </Button>
          </CardFooter>
        </Card>

        {/* System Diagnostics & Data Export Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* API Health Monitor */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="settings" size={24} />
                  <CardTitle>Core API Health Monitor</CardTitle>
                </div>
                <Badge variant={healthStatus?.status === 'ok' ? 'forest' : 'amber'}>
                  {healthStatus?.status === 'ok' ? 'Online' : 'Checking / Offline'}
                </Badge>
              </div>
              <CardDescription>Pings <code>/api/v1/health</code> to verify server readiness</CardDescription>
            </CardHeader>

            <CardContent>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-sand-soft)', borderRadius: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Service Name:</span>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>{healthStatus?.service || 'calories-server'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-sand-soft)', borderRadius: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>API Version:</span>
                  <strong style={{ fontSize: 'var(--text-xs)' }}>{healthStatus?.version || '0.1.0'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-sand-soft)', borderRadius: '8px' }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Round-Trip Latency:</span>
                  <strong style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
                    {healthStatus ? `${healthStatus.latencyMs} ms` : 'Testing...'}
                  </strong>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={checkBackendHealth}
                isLoading={isCheckingHealth}
                leftIcon={<Icon name="check" size={14} />}
              >
                Ping API Health
              </Button>
            </CardFooter>
          </Card>

          {/* Privacy & Data Ownership */}
          <Card>
            <CardHeader>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="heart" size={24} />
                <CardTitle>Data Portability</CardTitle>
              </div>
              <CardDescription>Export your complete nutritional records in standard JSON</CardDescription>
            </CardHeader>

            <CardContent>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                You own your nutrition data. Export all logged food items, macro breakdowns, and historical targets anytime for backup or third-party analysis.
              </p>
            </CardContent>

            <CardFooter>
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Icon name="reports" size={16} />}
                onClick={handleExportData}
              >
                Download Nutritional Archive (.json)
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
