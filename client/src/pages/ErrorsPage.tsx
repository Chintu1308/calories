import React, { useState } from 'react';
import { ErrorPage, type HttpErrorCode } from '../components/errors/ErrorPage.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '../components/ui/index.js';

export interface ErrorsPageProps {
  onNavigateDashboard: () => void;
}

export const ErrorsPage: React.FC<ErrorsPageProps> = ({ onNavigateDashboard }) => {
  const [selectedErrorCode, setSelectedErrorCode] = useState<HttpErrorCode>(404);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const errorCatalog: { code: HttpErrorCode; title: string; category: string; description: string }[] = [
    { code: 400, title: 'Bad Request', category: 'Client Input', description: 'Triggered when malformed JSON, negative food portions, or invalid dates are sent to the API.' },
    { code: 401, title: 'Unauthorized', category: 'Authentication', description: 'Triggered when a protected endpoint is accessed without a valid Bearer JWT.' },
    { code: 402, title: 'Payment Required', category: 'Quota / Limits', description: 'Triggered when daily free-tier AI vision extraction quota is exhausted.' },
    { code: 403, title: 'Forbidden', category: 'Tenant Isolation', description: 'Triggered when a user attempts to read, edit, or delete another user’s nutrition record.' },
    { code: 404, title: 'Not Found', category: 'Resource Missing', description: 'Triggered when a requested meal ID, report, or route does not exist.' },
    { code: 500, title: 'Internal Server Error', category: 'Backend Glitch', description: 'Triggered when an unhandled server exception or aggregation failure occurs.' },
    { code: 503, title: 'Service Unavailable', category: 'Infrastructure', description: 'Triggered during platform maintenance or when the free-tier Render container is waking up.' },
  ];

  if (isPreviewMode) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
          <Button variant="secondary" size="sm" onClick={() => setIsPreviewMode(false)}>
            ✕ Exit Error Preview
          </Button>
        </div>
        <ErrorPage
          code={selectedErrorCode}
          onNavigateDashboard={onNavigateDashboard}
          onRetry={() => alert(`Retried request for HTTP ${selectedErrorCode}. Status re-evaluated.`)}
        />
      </div>
    );
  }

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Branded Error Experience</div>
          <h1 className="calories-greeting-title">Custom HTTP Error Pages</h1>
          <p className="calories-greeting-subtext">
            Calories provides bespoke, health-tech branded error pages for all critical HTTP status codes. Click any status code to preview its full-page experience.
          </p>
        </div>

        <Badge variant="sage">7 Custom Error Pages</Badge>
      </div>

      {/* Error Catalog Grid */}
      <div className="calories-error-catalog-grid">
        {errorCatalog.map((err) => (
          <Card key={err.code} className="calories-error-catalog-card">
            <CardHeader>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="calories-error-code-badge">{err.code}</span>
                <Badge variant="neutral">{err.category}</Badge>
              </div>
              <CardTitle style={{ marginTop: '8px', fontSize: 'var(--text-lg)' }}>{err.title}</CardTitle>
              <CardDescription>{err.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <Button
                variant="outline"
                size="sm"
                style={{ width: '100%' }}
                onClick={() => {
                  setSelectedErrorCode(err.code);
                  setIsPreviewMode(true);
                }}
              >
                Preview Full-Page {err.code}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
