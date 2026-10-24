import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Icon,
  Skeleton,
} from '../ui/index.js';

export interface DayTrendPoint {
  day: string;
  date: string;
  consumedKcal: number;
  targetKcal: number;
  status: string;
}

export interface WeeklyTrendPreviewProps {
  trendData: DayTrendPoint[];
  isLoading?: boolean;
}

export const WeeklyTrendPreview: React.FC<WeeklyTrendPreviewProps> = ({
  trendData,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton width="40%" height="24px" />
          <Skeleton width="30%" height="16px" />
        </CardHeader>
        <CardContent>
          <Skeleton width="100%" height="160px" />
        </CardContent>
      </Card>
    );
  }

  const maxCalorieScale = 2600; // Visual ceiling for bars

  const getBarColor = (point: DayTrendPoint) => {
    if (point.status === 'in_progress') return 'var(--color-sage-green)';
    if (point.consumedKcal > point.targetKcal + 100) return 'var(--color-amber)';
    return 'var(--color-forest-green)';
  };

  const weeklyAverage = Math.round(
    trendData.reduce((acc, p) => acc + p.consumedKcal, 0) / trendData.length
  );

  return (
    <Card>
      <CardHeader>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Icon name="reports" size={24} />
            <CardTitle>7-Day Calorie Intake Trend</CardTitle>
          </div>
          <Badge variant="forest">7-Day Avg: {weeklyAverage.toLocaleString()} kcal</Badge>
        </div>
        <CardDescription>
          Daily consumed calories against your 2,200 kcal budget target
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Visual Bar Chart Preview */}
        <div className="calories-trend-chart-container" aria-hidden="true">
          {/* Target Reference Guideline */}
          <div
            className="calories-chart-target-line"
            style={{ bottom: `${(2200 / maxCalorieScale) * 100}%` }}
          >
            <span className="calories-target-line-tag">Target: 2,200 kcal</span>
          </div>

          {/* Day Columns */}
          <div className="calories-trend-bars-row">
            {trendData.map((item) => {
              const heightPercent = Math.min(
                Math.round((item.consumedKcal / maxCalorieScale) * 100),
                100
              );
              const isToday = item.day === 'Sat';

              return (
                <div key={item.date} className="calories-trend-col">
                  <div className="calories-trend-bar-track">
                    <div
                      className="calories-trend-bar-fill"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: getBarColor(item),
                        outline: isToday ? '2px solid var(--color-ink-navy)' : 'none',
                      }}
                      title={`${item.day} (${item.date}): ${item.consumedKcal} kcal`}
                    />
                  </div>
                  <span className={`calories-trend-day-label ${isToday ? 'today' : ''}`}>
                    {item.day}
                  </span>
                  <span className="calories-trend-kcal-label">
                    {item.consumedKcal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Accessible Data Summary for Screen Readers */}
        <div className="sr-only">
          <table>
            <caption>Weekly Calorie Consumption Data</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Date</th>
                <th scope="col">Calories (kcal)</th>
                <th scope="col">Target (kcal)</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((d) => (
                <tr key={d.date}>
                  <td>{d.day}</td>
                  <td>{d.date}</td>
                  <td>{d.consumedKcal}</td>
                  <td>{d.targetKcal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart Legend */}
        <div className="calories-chart-legend">
          <div className="calories-legend-item">
            <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-forest-green)' }} />
            <span>Target Met / On Track</span>
          </div>
          <div className="calories-legend-item">
            <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-amber)' }} />
            <span>Over Budget (&gt;+100 kcal)</span>
          </div>
          <div className="calories-legend-item">
            <span className="calories-legend-swatch" style={{ backgroundColor: 'var(--color-sage-green)' }} />
            <span>Current Day In Progress</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Aggregated across UTC calendar days; dynamic aggregation endpoint connects in Stage 9
        </span>
      </CardFooter>
    </Card>
  );
};
