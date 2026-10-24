import React from 'react';
import { Header, type NavTabId } from './Header.js';
import { GoalSummaryCards } from '../goals/GoalSummaryCards.js';
import { MealTimeline } from '../meals/MealTimeline.js';
import { WeeklyTrendPreview, type DayTrendPoint } from '../reports/WeeklyTrendPreview.js';
import { Button, Card, CardContent, Icon, CaloriesLogo } from '../ui/index.js';
import type { DayNutritionalSummary, MealItem, MealType } from '../../types/nutrition.js';

export type DashboardViewState = 'normal' | 'empty' | 'loading' | 'error';

export interface DashboardShellProps {
  activeTab: NavTabId;
  onTabChange: (tab: NavTabId) => void;
  viewState: DashboardViewState;
  onViewStateChange: (state: DashboardViewState) => void;
  currentDateLabel: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  summary: DayNutritionalSummary;
  meals: MealItem[];
  weeklyTrend: DayTrendPoint[];
  onAddMeal: (category: MealType) => void;
  onOpenAIScan: () => void;
  userName?: string;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  activeTab,
  onTabChange,
  viewState,
  onViewStateChange,
  currentDateLabel,
  onPrevDay,
  onNextDay,
  onToday,
  summary,
  meals,
  weeklyTrend,
  onAddMeal,
  onOpenAIScan,
  userName = 'User',
  onOpenAuthModal,
  onLogout,
}) => {
  const isLoading = viewState === 'loading';
  const displayedMeals = viewState === 'empty' ? [] : meals;
  const displayedSummary: DayNutritionalSummary =
    viewState === 'empty'
      ? {
          ...summary,
          consumedCalories: 0,
          consumedProtein: 0,
          consumedCarbs: 0,
          consumedFat: 0,
          waterIntakeMl: 0,
        }
      : summary;

  const displayGreetingName = userName && userName !== 'User' ? userName.split(' ')[0] : 'there';

  return (
    <div className="calories-showcase-layout">
      {/* 1. Primary Responsive Header */}
      <Header
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenAddMeal={() => onAddMeal('Breakfast')}
        onOpenAIScan={onOpenAIScan}
        userName={userName}
        onOpenAuthModal={onOpenAuthModal}
        onLogout={onLogout}
      />

      {/* 2. Main Dashboard Canvas */}
      <main className="calories-main">
        {/* Error State Banner */}
        {viewState === 'error' && (
          <div className="calories-error-banner" role="alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="calories-error-icon" aria-hidden="true">⚠️</span>
              <div>
                <strong>Unable to synchronize daily nutrition records.</strong>
                <div style={{ fontSize: 'var(--text-xs)', opacity: 0.9 }}>
                  Network connection failed or backend service is unreachable.
                </div>
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onViewStateChange('normal')}
            >
              Retry Connection
            </Button>
          </div>
        )}

        {/* Date & Greeting Hierarchy Header */}
        <section className="calories-greeting-section">
          <div className="calories-greeting-left">
            <div className="calories-greeting-tagline">Your nutrition, made clearer.</div>
            <h1 className="calories-greeting-title">Welcome back, {displayGreetingName}</h1>
            <p className="calories-greeting-subtext">
              Here is your nutritional overview. You have consumed{' '}
              <strong>{displayedSummary.consumedCalories.toLocaleString()} kcal</strong> of your{' '}
              {displayedSummary.targetCalories.toLocaleString()} kcal daily target.
            </p>
          </div>

          <div className="calories-date-controls">
            <Button variant="ghost" size="sm" onClick={onPrevDay} aria-label="Previous day">
              ‹
            </Button>
            <div className="calories-current-date-chip">
              <Icon name="calendar" size={16} />
              <span>{currentDateLabel}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onNextDay} aria-label="Next day">
              ›
            </Button>
            <Button variant="secondary" size="sm" onClick={onToday}>
              Today
            </Button>
          </div>
        </section>

        {/* 3. Goal Summary Cards (Calorie Budget, Macros, Hydration & Weight) */}
        <section aria-label="Daily Nutrition Goals">
          <GoalSummaryCards summary={displayedSummary} isLoading={isLoading} />
        </section>

        {/* 4. Two-Column Layout: Meal Timeline (Left) & Weekly Reports / AI Action (Right) */}
        <div className="calories-dashboard-columns">
          {/* Left Column: Meal Timeline */}
          <div className="calories-timeline-column">
            <MealTimeline
              meals={displayedMeals}
              isLoading={isLoading}
              dateLabel={currentDateLabel}
              onAddMeal={onAddMeal}
              onOpenAIScan={onOpenAIScan}
            />
          </div>

          {/* Right Column: Weekly Trend & Quick Actions */}
          <div className="calories-insights-column">
            <WeeklyTrendPreview trendData={weeklyTrend} isLoading={isLoading} />

            {/* AI Scanner Promo Card */}
            <Card className="calories-ai-teaser-card">
              <CardContent style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--color-sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="ai-scan" size={28} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    AI Calorie Extraction
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    Snap a plate photo or nutrition label. AI proposes macros for your review before saving.
                  </p>
                </div>
              </CardContent>
              <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Icon name="ai-scan" size={14} />}
                  onClick={onOpenAIScan}
                >
                  Launch Scanner
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* 5. Editorial Footer */}
      <footer className="calories-footer">
        <div className="calories-footer-container">
          <CaloriesLogo size="sm" variant="image" />
          <span className="calories-footer-text">
            Calories Platform - Premium Editorial Health-Tech Dashboard Shell.
          </span>
          <span className="calories-footer-domain">calories.bhhc.me</span>
        </div>
      </footer>
    </div>
  );
};
