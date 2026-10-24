import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Icon,
} from '../ui/index.js';
import type { SupplementItem, SupplementLogEntry } from '../../types/nutrition.js';

export interface SupplementCategoryCardProps {
  userSupplements: SupplementItem[];
  supplementLogs: SupplementLogEntry[];
  onToggleSupplement: (supplement: SupplementItem) => void;
  onAddSupplement?: () => void;
}

export const SupplementCategoryCard: React.FC<SupplementCategoryCardProps> = ({
  userSupplements,
  supplementLogs,
  onToggleSupplement,
  onAddSupplement,
}) => {
  const totalCount = userSupplements.length;
  const takenCount = userSupplements.filter((s) =>
    supplementLogs.some((log) => log.supplementId === s.id && log.taken)
  ).length;

  const isAllTaken = totalCount > 0 && takenCount === totalCount;

  const formatLogTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getTimingBadgeVariant = (timing: SupplementItem['timing']) => {
    switch (timing) {
      case 'Morning':
        return 'sage';
      case 'Pre-Workout':
        return 'amber';
      case 'Post-Workout':
        return 'forest';
      case 'Evening':
        return 'neutral';
      default:
        return 'default';
    }
  };

  return (
    <Card className="calories-meal-category-card calories-supplement-category-card">
      <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-sage-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="supplements" size={18} />
            </div>
            <div>
              <CardTitle style={{ fontSize: 'var(--text-base)', margin: 0 }}>Daily Supplements</CardTitle>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Track daily vitamins, minerals &amp; performance supplements
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Badge variant={isAllTaken ? 'forest' : takenCount > 0 ? 'sage' : 'neutral'}>
              {totalCount === 0
                ? 'No items'
                : isAllTaken
                ? 'All Taken ✓'
                : `${takenCount} of ${totalCount} Taken`}
            </Badge>

            {onAddSupplement && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="plus" size={14} />}
                onClick={onAddSupplement}
                title="Add or configure daily supplements"
              >
                Add
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent style={{ paddingTop: 'var(--space-2)' }}>
        {userSupplements.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
            <p style={{ margin: '0 0 10px' }}>
              No recurring supplements in your profile yet. Add Creatine, Vitamin D, Whey, or Omega-3 to track them daily.
            </p>
            {onAddSupplement && (
              <Button variant="secondary" size="sm" onClick={onAddSupplement} leftIcon={<Icon name="plus" size={14} />}>
                Configure Supplements
              </Button>
            )}
          </div>
        ) : (
          <div className="calories-meal-items-list" style={{ gap: '8px' }}>
            {userSupplements.map((supp) => {
              const logEntry = supplementLogs.find((l) => l.supplementId === supp.id && l.taken);
              const isTaken = Boolean(logEntry);

              return (
                <div
                  key={supp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: isTaken ? 'rgba(40, 91, 70, 0.05)' : 'var(--surface-subtle)',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => onToggleSupplement(supp)}
                      aria-label={`Mark ${supp.name} as ${isTaken ? 'uncompleted' : 'taken'}`}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: isTaken ? 'none' : '2px solid var(--border-medium)',
                        backgroundColor: isTaken ? 'var(--color-forest-green)' : 'transparent',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {isTaken ? '✓' : ''}
                    </button>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 600,
                            color: isTaken ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isTaken ? 'line-through' : 'none',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          {supp.name}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          {supp.dosage}
                        </span>
                        <Badge variant={getTimingBadgeVariant(supp.timing)} style={{ fontSize: '10px', height: '18px' }}>
                          {supp.timing}
                        </Badge>
                      </div>

                      {supp.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {supp.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isTaken ? (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-forest-green)', fontWeight: 600 }}>
                        Logged {formatLogTime(logEntry?.loggedAt)}
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onToggleSupplement(supp)}
                        style={{ fontSize: '11px', height: '28px', padding: '0 10px' }}
                      >
                        Mark Taken
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
