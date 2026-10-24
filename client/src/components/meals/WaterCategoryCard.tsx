import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Icon,
  ProgressBar,
  Input,
} from '../ui/index.js';
import type { WaterLogEntry } from '../../types/nutrition.js';

export interface WaterCategoryCardProps {
  waterLogs: WaterLogEntry[];
  targetWaterMl?: number;
  onLogWater: (amountMl: number, note?: string) => void;
  onDeleteWaterLog: (id: string) => void;
}

export const WaterCategoryCard: React.FC<WaterCategoryCardProps> = ({
  waterLogs,
  targetWaterMl = 3000,
  onLogWater,
  onDeleteWaterLog,
}) => {
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const totalWaterMl = waterLogs.reduce((acc, log) => acc + log.amountMl, 0);
  const percentage = Math.min(100, Math.round((totalWaterMl / targetWaterMl) * 100));

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(customAmount);
    if (!isNaN(amount) && amount > 0) {
      onLogWater(amount, 'Custom intake');
      setCustomAmount('');
      setShowCustomInput(false);
    }
  };

  return (
    <Card className="calories-meal-category-card calories-water-category-card">
      <CardHeader style={{ paddingBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-sand-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="water" size={18} />
            </div>
            <div>
              <CardTitle style={{ fontSize: 'var(--text-base)', margin: 0 }}>Water &amp; Hydration</CardTitle>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {waterLogs.length} {waterLogs.length === 1 ? 'log' : 'logs'} today · Daily Target: {(targetWaterMl / 1000).toFixed(1)}L
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Badge variant={percentage >= 100 ? 'forest' : percentage >= 50 ? 'sage' : 'neutral'}>
              {percentage >= 100 ? 'Goal Reached ✓' : `${percentage}% of Daily Goal`}
            </Badge>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {(totalWaterMl / 1000).toFixed(2)} / {(targetWaterMl / 1000).toFixed(1)} L
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: '8px' }}>
          <ProgressBar value={totalWaterMl} max={targetWaterMl} unit="ml" variant="sage" />
        </div>
      </CardHeader>

      <CardContent style={{ paddingTop: 'var(--space-2)' }}>
        {/* Quick Log Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '4px' }}>
            Quick Log:
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogWater(250, 'Glass of water')}
            title="Log 250ml glass"
          >
            +250 ml (Glass)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogWater(500, 'Standard water bottle')}
            title="Log 500ml bottle"
          >
            +500 ml (Bottle)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogWater(750, 'Large shaker')}
            title="Log 750ml shaker"
          >
            +750 ml
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onLogWater(1000, '1 Liter jug')}
            title="Log 1000ml jug"
          >
            +1000 ml (1L)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCustomInput((prev) => !prev)}
            style={{ fontSize: 'var(--text-xs)' }}
          >
            {showCustomInput ? 'Cancel' : '+ Custom Amount'}
          </Button>
        </div>

        {/* Custom Amount Form */}
        {showCustomInput && (
          <form
            onSubmit={handleCustomSubmit}
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '14px',
              padding: '10px 12px',
              backgroundColor: 'var(--color-sand-soft)',
              borderRadius: 'var(--radius-md)',
              alignItems: 'center',
            }}
          >
            <Input
              type="number"
              placeholder="Enter amount in ml (e.g. 330)"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              style={{ maxWidth: '220px' }}
              autoFocus={true}
            />
            <Button variant="primary" size="sm" type="submit">
              Log Water
            </Button>
          </form>
        )}

        {/* Logged Water History */}
        {waterLogs.length === 0 ? (
          <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
            No water logged yet for this day. Click a button above to record your hydration.
          </div>
        ) : (
          <div className="calories-meal-items-list" style={{ gap: '6px' }}>
            {waterLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>💧</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    +{log.amountMl} ml
                  </span>
                  {log.note && (
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      ({log.note})
                    </span>
                  )}
                  <span style={{ color: 'var(--text-secondary)' }}>{formatTime(log.loggedAt)}</span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteWaterLog(log.id)}
                  style={{ color: 'var(--color-error-red)', padding: '2px 6px', fontSize: '11px', height: '24px' }}
                  title="Remove this water log"
                >
                  ✕ Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
