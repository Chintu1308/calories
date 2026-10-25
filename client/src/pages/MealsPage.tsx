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
  onDeleteMeal,
  onOpenAIScan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('today');
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

      {/* Meals Table / List */}
      <Card>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <CardTitle>Recorded Entries</CardTitle>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              Showing {paginatedMeals.length} of {filteredMeals.length} results
            </span>
          </div>
          <CardDescription>
            All timestamps are stored in ISO 8601 UTC and rendered in your local timezone.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {paginatedMeals.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Icon name="meals" size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>No food items match your filter criteria.</div>
            </div>
          ) : (
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
                        {meal.quantity.amount} {meal.quantity.unit}
                      </td>
                      <td>
                        <strong style={{ fontFamily: 'var(--font-mono)' }}>{meal.nutrition.caloriesKcal} kcal</strong>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {meal.nutrition.proteinG}g / {meal.nutrition.carbsG}g / {meal.nutrition.fatG}g
                      </td>
                      <td>
                        <Badge variant={meal.source === 'ai' ? 'forest' : 'neutral'}>
                          {meal.source === 'ai' ? 'AI Extracted' : 'Manual'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ color: 'var(--color-error-red)', padding: '2px 8px' }}
                          onClick={() => onDeleteMeal(meal.id || (meal as any)._id)}
                          aria-label={`Delete ${meal.foodName}`}
                        >
                          ✕ Delete
                        </Button>
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
