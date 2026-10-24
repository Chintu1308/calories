import React from 'react';
import { Button, Badge, Card, CardContent, Icon, CaloriesLogo } from '../ui/index.js';

export type HttpErrorCode = 400 | 401 | 402 | 403 | 404 | 500 | 503;

export interface ErrorPageProps {
  code: HttpErrorCode;
  onNavigateDashboard: () => void;
  onRetry?: () => void;
  customMessage?: string;
}

interface ErrorDetails {
  title: string;
  subtitle: string;
  description: string;
  technicalDetails: string;
  badgeVariant: 'amber' | 'destructive' | 'neutral';
  icon: 'settings' | 'ai-scan' | 'heart' | 'meals';
}

const ERROR_CONFIG: Record<HttpErrorCode, ErrorDetails> = {
  400: {
    title: '400 - Bad Request',
    subtitle: 'Invalid Nutrition Request',
    description: 'The server could not process the request because the submitted payload or query parameters failed validation (e.g. non-numeric calories, invalid date format, or negative portion amounts).',
    technicalDetails: 'HTTP 400 Bad Request: Schema validation failed on incoming request parameters.',
    badgeVariant: 'amber',
    icon: 'settings',
  },
  401: {
    title: '401 - Unauthorized',
    subtitle: 'Authentication Required',
    description: 'You must be signed in with a valid JWT token to access this nutrition diary, update targets, or inspect meal aggregations.',
    technicalDetails: 'HTTP 401 Unauthorized: Missing, expired, or malformed Bearer authorization token.',
    badgeVariant: 'amber',
    icon: 'heart',
  },
  402: {
    title: '402 - Payment Required',
    subtitle: 'AI Extraction Quota Reached',
    description: 'You have reached the free-tier daily quota for AI plate and nutrition label image scans. You can continue logging unlimited meals manually, or upgrade to Calories Pro for expanded AI processing.',
    technicalDetails: 'HTTP 402 Payment Required: Daily AI provider quota limit enforced.',
    badgeVariant: 'amber',
    icon: 'ai-scan',
  },
  403: {
    title: '403 - Forbidden',
    subtitle: 'Access Restricted by Isolation Boundary',
    description: 'You do not have permission to access or modify this record. The Calories multi-tenant security boundary guarantees that User A can never inspect or alter User B’s dietary data.',
    technicalDetails: 'HTTP 403 Forbidden: Request user ID does not match target document ownership.',
    badgeVariant: 'destructive',
    icon: 'heart',
  },
  404: {
    title: '404 - Not Found',
    subtitle: 'Nutritional Resource Missing',
    description: 'The page, meal log, or analytical report you are searching for does not exist, has been removed, or was never recorded.',
    technicalDetails: 'HTTP 404 Not Found: The requested URI did not match any active routing endpoint.',
    badgeVariant: 'neutral',
    icon: 'meals',
  },
  500: {
    title: '500 - Internal Server Error',
    subtitle: 'Calculation Service Failure',
    description: 'An unexpected exception occurred while processing nutritional aggregations or querying the database. Our telemetry has logged the incident.',
    technicalDetails: 'HTTP 500 Internal Server Error: Uncaught server-side exception captured by central error middleware.',
    badgeVariant: 'destructive',
    icon: 'settings',
  },
  503: {
    title: '503 - Service Unavailable',
    subtitle: 'Platform Sleeping or Maintenance',
    description: 'The backend service is temporarily offline or spinning up from sleep on free-tier hosting (e.g. Render 15-minute inactivity timeout). Please wait a few seconds and retry.',
    technicalDetails: 'HTTP 503 Service Unavailable: Upstream web process is inactive or completing cold start.',
    badgeVariant: 'amber',
    icon: 'settings',
  },
};

export const ErrorPage: React.FC<ErrorPageProps> = ({
  code,
  onNavigateDashboard,
  onRetry,
  customMessage,
}) => {
  const config = ERROR_CONFIG[code] || ERROR_CONFIG[500];

  return (
    <div className="calories-error-page-layout">
      <Card className="calories-error-card">
        <CardContent style={{ padding: '48px 36px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Brand Identity */}
          <CaloriesLogo size="md" variant="image" />

          {/* Error Status Code Badge */}
          <div style={{ marginTop: '8px' }}>
            <Badge variant={config.badgeVariant} style={{ fontSize: '13px', padding: '4px 14px' }}>
              {config.title}
            </Badge>
          </div>

          {/* Heading & Subtitle */}
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {config.subtitle}
            </h1>
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', marginTop: '8px', maxWidth: '520px', lineHeight: 1.6 }}>
              {customMessage || config.description}
            </p>
          </div>

          {/* Technical Diagnostics Box */}
          <div className="calories-error-diagnostics">
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Diagnostic Context:
            </span>
            <code style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--color-ink-navy)', wordBreak: 'break-all' }}>
              {config.technicalDetails}
            </code>
          </div>

          {/* Action Triggers */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
            <Button
              variant="primary"
              size="md"
              leftIcon={<Icon name="dashboard" size={16} />}
              onClick={onNavigateDashboard}
            >
              Return to Dashboard
            </Button>

            {onRetry && (
              <Button
                variant="outline"
                size="md"
                leftIcon={<Icon name="check" size={16} />}
                onClick={onRetry}
              >
                Retry Request
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
