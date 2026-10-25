import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Icon,
} from '../components/ui/index.js';
import type { MealItem, MealType } from '../types/nutrition.js';

export interface MealsPageProps {
  meals: MealItem[];
  onOpenAddMeal: (category: MealType) => void;
  onEditMeal?: (meal: MealItem) => void;
  onDeleteMeal: (mealId: string) => void;
  onOpenAIScan: () => void;
}

function checkMealDateFilter(eatenAt: string, filter: string): boolean {
  if (filter === 'all') return true;
  const mealDate = new Date(eatenAt);
  const now = new Date();
  if (filter === 'today') {
    return (
      mealDate.getFullYear() === now.getFullYear() &&
      mealDate.getMonth() === now.getMonth() &&
      mealDate.getDate() === now.getDate()
    );
  }
  if (filter === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return mealDate >= sevenDaysAgo;
  }
  if (filter === 'month') {
    return (
      mealDate.getFullYear() === now.getFullYear() &&
      mealDate.getMonth() === now.getMonth()
    );
  }
  return true;
}

export const MealsPage: React.FC<MealsPageProps> = ({
  meals,
  onOpenAddMeal,
  onEditMeal,
  onDeleteMeal,
  onOpenAIScan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter meals based on search, category, and date range
  const filteredMeals = meals.filter((meal) => {
    const matchesSearch =
      meal.foodName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (meal.notes && meal.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || meal.mealType === selectedCategory;
    const matchesDate = checkMealDateFilter(meal.eatenAt, dateFilter);

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredMeals.length / itemsPerPage) || 1;
  const paginatedMeals = filteredMeals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Compute aggregate totals for the filtered results
  const totalCalories = filteredMeals.reduce((acc, m) => acc + m.nutrition.caloriesKcal, 0);
  const totalProtein = filteredMeals.reduce((acc, m) => acc + m.nutrition.proteinG, 0);
  const totalCarbs = filteredMeals.reduce((acc, m) => acc + m.nutrition.carbsG, 0);
  const totalFat = filteredMeals.reduce((acc, m) => acc + m.nutrition.fatG, 0);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="calories-page-container">
      {/* Page Header */}
      <div className="calories-page-header">
        <div>
          <div className="calories-greeting-tagline">Meal Management &amp; History</div>
          <h1 className="calories-greeting-title">Meal Journal</h1>
          <p className="calories-greeting-subtext">
            Search, filter, and inspect your full nutritional history with server-side pagination and UTC date filtering.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outline"
            size="md"
            leftIcon={<Icon name="leaf" size={16} />}
            onClick={onOpenAIScan}
          >
            AI Extract
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Icon name="plus" size={16} />}
            onClick={() => onOpenAddMeal('Breakfast')}
          >
            + Log Food
          </Button>
        </div>
      </div>

      {/* Aggregate Metrics Header Bar */}
      <div className="calories-meals-summary-bar">
        <div className="calories-summary-stat">
          <span className="calories-stat-label">Results</span>
          <span className="calories-stat-val">{filteredMeals.length} items</span>
        </div>
        <div className="calories-summary-stat">
          <span className="calories-stat-label">Total Calories</span>
          <span className="calories-stat-val">{totalCalories.toLocaleString()} kcal</span>
        </div>
        <div className="calories-summary-stat">
          <span className="calories-stat-label">Total Protein</span>
          <span className="calories-stat-val">{totalProtein}g</span>
        </div>
        <div className="calories-summary-stat">
          <span className="calories-stat-label">Total Carbs</span>
          <span className="calories-stat-val">{totalCarbs}g</span>
        </div>
        <div className="calories-summary-stat">
          <span className="calories-stat-label">Total Fat</span>
          <span className="calories-stat-val">{totalFat}g</span>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent style={{ padding: '20px' }}>
          <div className="calories-filters-row">
            {/* Search Input */}
            <div style={{ flex: 2, minWidth: '220px' }}>
              <Input
                placeholder="Search by food name or notes..."
                leftIcon={<Icon name="search" size={16} />}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Category Filter */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <Select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: 'All', label: 'All Categories' },
                  { value: 'Breakfast', label: 'Breakfast' },
                  { value: 'Lunch', label: 'Lunch' },
                  { value: 'Dinner', label: 'Dinner' },
                  { value: 'Snacks', label: 'Snacks' },
                ]}
              />
            </div>

            {/* Date Range Filter */}
            <div style={{ flex: 1, minWidth: '160px' }}>
              <Select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                options={[
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'month', label: 'This Month' },
                  { value: 'all', label: 'All Recorded Time' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meals Timeline / Table Card */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="meals" size={22} />
                <CardTitle>Journal Meal Timeline</CardTitle>
              </div>
              <CardDescription>
                Chronological nutrition timeline of logged meals with macro totals and quick actions.
              </CardDescription>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Showing {paginatedMeals.length} of {filteredMeals.length} results
              </span>

              {/* View Switcher Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: 'var(--color-sand-soft)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: viewMode === 'timeline' ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: viewMode === 'timeline' ? 'var(--surface-card)' : 'transparent',
                    color: viewMode === 'timeline' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                    boxShadow: viewMode === 'timeline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  🕒 Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: viewMode === 'table' ? 700 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: viewMode === 'table' ? 'var(--surface-card)' : 'transparent',
                    color: viewMode === 'table' ? 'var(--color-forest-green)' : 'var(--text-secondary)',
                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  📋 Table
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {paginatedMeals.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Icon name="meals" size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>No food items match your filter criteria.</div>
            </div>
          ) : viewMode === 'timeline' ? (
            /* Interactive Chronological Meal Timeline */
            <div style={{ position: 'relative', paddingLeft: '28px', margin: '8px 0' }}>
              {/* Vertical Timeline Spine */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '16px',
                  bottom: '16px',
                  width: '2px',
                  backgroundColor: 'var(--border-medium)',
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {paginatedMeals.map((meal) => {
                  const mealId = meal.id || (meal as any)._id;
                  const isAi = meal.source === 'ai';
                  return (
                    <div key={mealId} style={{ position: 'relative', display: 'flex', alignItems: 'flex-start' }}>
                      {/* Timeline Dot Node */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-23px',
                          top: '16px',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          backgroundColor: isAi ? 'var(--color-forest-green, #285B46)' : 'var(--action-primary)',
                          border: '2px solid var(--surface-card)',
                          boxShadow: '0 0 0 2px var(--border-medium)',
                          zIndex: 2,
                        }}
                      />

                      {/* Timeline Entry Card */}
                      <div
                        style={{
                          flex: 1,
                          backgroundColor: 'var(--surface-card)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 18px',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {meal.foodName}
                              </span>
                              <Badge variant="default">{meal.mealType}</Badge>
                              <Badge variant={isAi ? 'forest' : 'neutral'}>
                                {isAi ? '🌱 AI Extracted' : '✏️ Manual'}
                              </Badge>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                              <span>🕒 {formatTime(meal.eatenAt)}</span>
                              <span>•</span>
                              <span>🍽️ {meal.quantity?.amount || 1} {meal.quantity?.unit || 'serving'}</span>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {onEditMeal && (
                              <Button
                                variant="outline"
                                size="sm"
                                style={{ color: 'var(--color-forest-green)', padding: '2px 8px' }}
                                onClick={() => onEditMeal(meal)}
                                aria-label={`Edit ${meal.foodName}`}
                              >
                                ✎ Edit
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ color: 'var(--color-error-red)', padding: '2px 8px' }}
                              onClick={() => onDeleteMeal(mealId)}
                              aria-label={`Delete ${meal.foodName}`}
                            >
                              ✕ Remove
                            </Button>
                          </div>
                        </div>

                        {/* Nutrition Breakdown Banner */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            padding: '6px 10px',
                            backgroundColor: 'var(--color-sand-soft)',
                            borderRadius: 'var(--radius-sm)',
                            alignItems: 'center',
                          }}
                        >
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginRight: '6px' }}>
                            🔥 {meal.nutrition?.caloriesKcal || 0} kcal
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                            P: {meal.nutrition?.proteinG || 0}g
                          </span>
                          <span>•</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-ink-navy)', fontWeight: 600 }}>
                            C: {meal.nutrition?.carbsG || 0}g
                          </span>
                          <span>•</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-amber)', fontWeight: 600 }}>
                            F: {meal.nutrition?.fatG || 0}g
                          </span>
                        </div>

                        {/* Notes */}
                        {meal.notes && (
                          <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            💬 {meal.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Traditional Table View */
            <div className="calories-journal-table-wrap">
              <table className="calories-journal-table">
                <thead>
                  <tr>
                    <th>Food Item</th>
                    <th>Category</th>
                    <th>Time</th>
                    <th>Portion</th>
                    <th>Calories</th>
                    <th>Macros (P/C/F)</th>
                    <th>Source</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMeals.map((meal) => (
                    <tr key={meal.id || (meal as any)._id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{meal.foodName}</div>
                        {meal.notes && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{meal.notes}</div>}
                      </td>
                      <td>
                        <Badge variant="default">{meal.mealType}</Badge>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {formatTime(meal.eatenAt)}
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)' }}>
                        {meal.quantity?.amount || 1} {meal.quantity?.unit || 'serving'}
                      </td>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{meal.nutrition?.caloriesKcal || 0} kcal</strong>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {meal.nutrition?.proteinG || 0}g / {meal.nutrition?.carbsG || 0}g / {meal.nutrition?.fatG || 0}g
                      </td>
                      <td>
                        <Badge variant={meal.source === 'ai' ? 'forest' : 'neutral'}>
                          {meal.source === 'ai' ? '🌱 AI Extracted' : '✏️ Manual'}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {onEditMeal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              style={{ color: 'var(--color-forest-green)', padding: '2px 8px' }}
                              onClick={() => onEditMeal(meal)}
                              aria-label={`Edit ${meal.foodName}`}
                            >
                              ✎ Edit
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: 'var(--color-error-red)', padding: '2px 8px' }}
                            onClick={() => onDeleteMeal(meal.id || (meal as any)._id)}
                            aria-label={`Delete ${meal.foodName}`}
                          >
                            ✕ Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="calories-pagination-bar">
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
              >
                ‹ Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Next ›
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
