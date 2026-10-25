import React, { useState } from 'react';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '../ui/index.js';
import { apiClient } from '../../api/apiClient.js';

export interface TermsPrivacyModalProps {
  isOpen: boolean;
  userName?: string;
  onAccepted: (termsAcceptedAt: string) => void;
}

export const TermsPrivacyModal: React.FC<TermsPrivacyModalProps> = ({
  isOpen,
  userName = 'User',
  onAccepted,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccept = async () => {
    if (!hasAgreed || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.acceptTerms();
      onAccepted(res.termsAcceptedAt);
    } catch (err: unknown) {
      console.error('[Calories] Error accepting terms:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to record acceptance. Please check your connection.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(21, 34, 56, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
      }}
    >
      <Card
        style={{
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-lg, 12px)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: '1px solid var(--border-medium, #E2E8F0)',
        }}
      >
        {/* Header */}
        <CardHeader
          style={{
            borderBottom: '1px solid var(--border-light, #EDE5D8)',
            backgroundColor: 'var(--color-ivory-warm, #FAF9F6)',
            padding: '20px 24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-forest-green, #285B46)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: 700,
                }}
              >
                🌿
              </div>
              <div>
                <CardTitle style={{ fontSize: '18px', margin: 0, color: 'var(--color-ink-navy, #152238)' }}>
                  Terms &amp; Conditions and Privacy Policy
                </CardTitle>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #6B7280)', marginTop: '2px' }}>
                  Welcome {userName}. Please review and accept our policies to continue using Calories.
                </div>
              </div>
            </div>
            <Badge variant="amber">Required to Proceed</Badge>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'terms' ? 'var(--color-forest-green, #285B46)' : 'var(--color-sand-soft, #EDE5D8)',
                color: activeTab === 'terms' ? '#FFFFFF' : 'var(--color-ink-navy, #152238)',
                transition: 'background-color 0.15s ease',
              }}
            >
              📜 Terms &amp; Conditions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                backgroundColor: activeTab === 'privacy' ? 'var(--color-forest-green, #285B46)' : 'var(--color-sand-soft, #EDE5D8)',
                color: activeTab === 'privacy' ? '#FFFFFF' : 'var(--color-ink-navy, #152238)',
                transition: 'background-color 0.15s ease',
              }}
            >
              🔒 Privacy Policy
            </button>
          </div>
        </CardHeader>

        {/* Content Body */}
        <CardContent
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            fontSize: '13px',
            lineHeight: 1.6,
            color: 'var(--text-primary, #152238)',
            backgroundColor: '#FFFFFF',
          }}
        >
          {activeTab === 'terms' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  1. Clinical &amp; Nutritional Advisory Notice
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  Calories is an educational and personal health-tech tracking application designed to help individuals monitor their daily energy balance and macronutrients. <strong>Calories is not a certified healthcare provider, hospital, or diagnostic medical device.</strong> The platform does not diagnose, treat, cure, or prevent any illness or metabolic condition.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  2. AI-Assisted Nutrition &amp; Ephemeral Vision Invariant
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  The AI meal recognition, tabular batch importer, and chat assistant utilize Google Gemini generative models paired with clinical nutrition datasets. Nutritional values (calories, protein, carbs, fat) are computational estimates. <strong>The user is strictly responsible for reviewing and confirming all logged entries before saving.</strong> AI suggestions do not supersede advice provided by your licensed physician or clinical dietitian.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  3. Emergency Medical Disclaimer
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  If you are experiencing severe allergic reactions, eating disorders, diabetic hypoglycemia, or any acute medical emergency, immediately contact your local emergency services (e.g., 911, 112, 108). Never delay seeking medical advice based on metrics or AI outputs displayed in Calories.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  4. User Responsibility &amp; Account Security
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  You agree to provide accurate biometric information and keep your authentication credentials confidential. You agree not to reverse engineer, abuse, or overload the platform's multi-tenant infrastructure.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  1. Ephemeral Vision Guarantee (Zero Photo Storage)
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  We prioritize your privacy above all else. When you use <strong>AI Scan</strong> to snap or upload meal photos, the image bytes are processed strictly in <strong>ephemeral in-memory RAM buffers</strong>. Raw food photos are <strong>never written to disk, never stored in databases, never sold, and never used to train public machine learning models</strong>.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  2. Identity &amp; Supabase Authentication
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  User identities and passwords are encrypted and managed directly via <strong>Supabase Auth</strong>. Calories stores your terms acceptance status and timestamp securely in your Supabase Auth account profile. Password hashes are never duplicated or stored in plain-text.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  3. Health Data &amp; Clinical PDF Prescriptions
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  Your physical biometrics, meal history, goals, and uploaded clinical diet PDFs are isolated via strict tenant encryption in MongoDB Atlas. Extracted guidelines (target macros, forbidden foods) are accessible exclusively to your authenticated account.
                </p>
              </div>

              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', color: 'var(--color-forest-green, #285B46)' }}>
                  4. Your Rights &amp; Data Portability
                </h4>
                <p style={{ margin: 0, color: 'var(--text-secondary, #4B5563)' }}>
                  You maintain 100% ownership of your data. You may export your entire journal as a JSON file or printable clinical PDF at any time. You can delete individual meals, clear uploaded diet plans, or remove your account permanently.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        {/* Footer & Consent Agreement */}
        <div
          style={{
            borderTop: '1px solid var(--border-light, #EDE5D8)',
            backgroundColor: 'var(--color-ivory-warm, #FAF9F6)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm, 6px)',
                backgroundColor: 'rgba(184, 68, 68, 0.1)',
                color: 'var(--color-error-red, #B84444)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--color-ink-navy, #152238)',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              style={{
                accentColor: 'var(--color-forest-green, #285B46)',
                width: '18px',
                height: '18px',
                marginTop: '2px',
                cursor: 'pointer',
              }}
            />
            <span>
              I have read, understood, and accept the <strong>Terms &amp; Conditions</strong> and <strong>Privacy Policy</strong>. I understand that Calories is an informational tracker and my acceptance timestamp will be securely recorded in Supabase.
            </span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!hasAgreed || isSubmitting}
              onClick={handleAccept}
              style={{ minWidth: '220px' }}
            >
              {isSubmitting ? 'Recording in Supabase...' : 'I Agree & Continue to Calories ✓'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
