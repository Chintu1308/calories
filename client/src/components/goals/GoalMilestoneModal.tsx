import React, { useState } from 'react';
import {
  Button,
  Badge,
  Input,
  FormField,
  Icon,
} from '../ui/index.js';
import type { DailyGoal, UserProfile } from '../../types/nutrition.js';

export interface GoalMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: DailyGoal;
  userProfile?: UserProfile | null;
  onUpdateProfileAndGoal: (heightCm: number, currentWeightKg: number, newTargetWeight?: number) => Promise<void>;
}

export const GoalMilestoneModal: React.FC<GoalMilestoneModalProps> = ({
  isOpen,
  onClose,
  goal,
  userProfile,
  onUpdateProfileAndGoal,
}) => {
  const [height, setHeight] = useState<string>(String(userProfile?.heightCm || 175));
  const [weight, setWeight] = useState<string>(String(userProfile?.currentWeightKg || 72));
  const [newTarget, setNewTarget] = useState<string>(String(goal.targetWeight || 70));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const currentHeightNum = Math.max(50, Number(height) || 175);
  const currentWeightNum = Math.max(20, Number(weight) || 70);
  const targetWeightNum = goal.targetWeight || 70;
  const initialWeightNum = userProfile?.currentWeightKg || (targetWeightNum + 5);

  const isWeightLoss = targetWeightNum <= initialWeightNum;
  const isAchieved = isWeightLoss
    ? currentWeightNum <= targetWeightNum
    : currentWeightNum >= targetWeightNum;

  const weightDelta = Math.abs(currentWeightNum - targetWeightNum);
  const totalChanged = Math.abs(currentWeightNum - initialWeightNum);

  // Compute BMI
  const heightInMeters = currentHeightNum / 100;
  const bmi = (currentWeightNum / (heightInMeters * heightInMeters)).toFixed(1);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateProfileAndGoal(
        currentHeightNum,
        currentWeightNum,
        Number(newTarget) || targetWeightNum
      );
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('[GoalMilestoneModal] Failed to update:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calories-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="milestone-title">
      <div className="calories-modal-card" style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div className="calories-modal-header" style={{ backgroundColor: 'var(--color-sand-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🎯</span>
            <div>
              <h3 id="milestone-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>
                Goal Milestone Achievement Check-In
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Let&apos;s check whether you have achieved your target weight!
              </p>
            </div>
          </div>
          <button
            type="button"
            className="calories-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="calories-modal-body" style={{ gap: '14px' }}>
            {saveSuccess && (
              <div
                style={{
                  backgroundColor: 'var(--color-sage-soft)',
                  border: '1px solid rgba(40, 91, 70, 0.3)',
                  color: 'var(--color-forest-green)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  textAlign: 'center',
                }}
              >
                🎉 Progress recorded! Profile and active goals have been synchronized.
              </div>
            )}

            {/* Achievement Status Card */}
            <div
              style={{
                backgroundColor: isAchieved ? 'var(--color-sage-soft)' : 'var(--color-sand-soft)',
                border: `1.5px solid ${isAchieved ? 'var(--color-forest-green)' : 'var(--border-medium)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '6px' }}>
                {isAchieved ? '🏆' : '📈'}
              </div>
              <h4 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: isAchieved ? 'var(--color-forest-green)' : 'var(--text-primary)' }}>
                {isAchieved
                  ? `Goal Achieved! You reached ${currentWeightNum} kg!`
                  : `You are at ${currentWeightNum} kg (${weightDelta.toFixed(1)} kg from target)`}
              </h4>
              <p style={{ margin: '6px 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                {isAchieved
                  ? `Congratulations! You set out to hit ${targetWeightNum} kg and successfully achieved your milestone with ${totalChanged.toFixed(1)} kg of progress. Your new BMI is ${bmi}.`
                  : `Starting: ${initialWeightNum} kg · Target: ${targetWeightNum} kg · Current: ${currentWeightNum} kg. Keep your momentum going! Your current BMI is ${bmi}.`}
              </p>
            </div>

            {/* Inputs: Height & Weight */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <FormField label="Current Height (cm)" htmlFor="checkin-height" required={true}>
                <Input
                  id="checkin-height"
                  type="number"
                  step="any"
                  min="50"
                  max="250"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 175"
                  required={true}
                />
              </FormField>

              <FormField label="Current Measured Weight (kg)" htmlFor="checkin-weight" required={true}>
                <Input
                  id="checkin-weight"
                  type="number"
                  step="any"
                  min="20"
                  max="300"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 70.5"
                  required={true}
                  autoFocus={true}
                />
              </FormField>
            </div>

            {/* Next Target Weight */}
            <FormField
              label={isAchieved ? "Set Next Milestone Target Weight (kg)" : "Adjust Target Weight (kg)"}
              htmlFor="checkin-new-target"
              hint="You can update your future milestone or keep current target."
            >
              <Input
                id="checkin-new-target"
                type="number"
                step="any"
                min="20"
                max="300"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="e.g. 68.0"
              />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--surface-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)' }}>
              <span>Target: <strong>{targetWeightNum} kg</strong></span>
              <span>Logged: <strong>{currentWeightNum} kg</strong></span>
              <span>Calculated BMI: <strong>{bmi}</strong></span>
              <Badge variant={isAchieved ? 'forest' : 'neutral'}>
                {isAchieved ? 'Milestone Met' : 'In Progress'}
              </Badge>
            </div>
          </div>

          <div className="calories-modal-footer">
            <Button variant="ghost" size="md" type="button" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              disabled={isSaving}
              leftIcon={<Icon name="check" size={16} />}
            >
              {isSaving ? 'Updating Profile...' : 'Save & Update Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
