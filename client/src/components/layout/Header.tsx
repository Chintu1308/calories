import React from 'react';
import { CaloriesLogo, Button, Icon, type IconName } from '../ui/index.js';

export type NavTabId =
  | 'dashboard'
  | 'meals'
  | 'goals'
  | 'reports'
  | 'ai-scan'
  | 'settings';

export interface HeaderProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onOpenAddMeal: () => void;
  onOpenAIScan?: () => void;
  userName?: string;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenAddMeal,
  onOpenAIScan,
  userName = 'User',
  onOpenAuthModal,
  onLogout: _onLogout,
}) => {
  const navItems: { id: NavTabId; label: string; icon: IconName }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'meals', label: 'Meal Journal', icon: 'meals' },
    { id: 'goals', label: 'Goals', icon: 'goals' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  return (
    <header className="calories-header">
      <div className="calories-header-container">
        {/* Brand Lockup */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
          onClick={() => onTabChange('dashboard')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onTabChange('dashboard');
          }}
        >
          <CaloriesLogo size="md" variant="image" />
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="calories-header-nav" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`calories-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Global Quick Action Buttons */}
        <div className="calories-header-actions">
          {onOpenAuthModal && (
            <button
              type="button"
              className="calories-profile-header-btn"
              onClick={onOpenAuthModal}
              title="Profile & Onboarding Setup"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Icon name="profile" size={16} />
              <span>{userName}</span>
            </button>
          )}

          {onOpenAIScan && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="leaf" size={14} />}
              onClick={onOpenAIScan}
            >
              AI Scan
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" size={14} />}
            onClick={onOpenAddMeal}
          >
            Log Meal
          </Button>
        </div>
      </div>
    </header>
  );
};
