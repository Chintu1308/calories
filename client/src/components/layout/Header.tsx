import React from 'react';
import { CaloriesLogo, Button, Icon, type IconName } from '../ui/index.js';

export type NavTabId = 'dashboard' | 'meals' | 'goals' | 'reports' | 'ai-scan';

export interface HeaderProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  onOpenAddMeal: () => void;
  onOpenAIScan: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenAddMeal,
  onOpenAIScan,
}) => {
  const navItems: { id: NavTabId; label: string; icon: IconName }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'meals', label: 'Meal Journal', icon: 'meals' },
    { id: 'goals', label: 'Nutrition Goals', icon: 'goals' },
    { id: 'reports', label: 'Reports & Analytics', icon: 'reports' },
    { id: 'ai-scan', label: 'AI Calorie Scan', icon: 'ai-scan' },
  ];

  return (
    <header className="calories-header">
      <div className="calories-header-container">
        {/* Brand Lockup */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Global Quick Action Buttons */}
        <div className="calories-header-actions">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="ai-scan" size={16} />}
            onClick={onOpenAIScan}
            title="Scan nutrition label or meal photo"
          >
            AI Scan
          </Button>

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
