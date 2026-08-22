import React from 'react';
import { Habit } from '../types';
import { AlertTriangle, Trash2, X, Archive } from 'lucide-react';
import { Modal } from './Modal';

interface DeleteHabitModalProps {
  isOpen: boolean;
  habit: Habit | null;
  onClose: () => void;
  onConfirmDelete: (habitId: string) => void;
  onArchiveInstead?: (habitId: string) => void;
}

export const DeleteHabitModal: React.FC<DeleteHabitModalProps> = ({
  isOpen,
  habit,
  onClose,
  onConfirmDelete,
  onArchiveInstead,
}) => {
  if (!habit) return null;

  const totalCompletions = Object.values(habit.completions || {}).reduce((a, b) => a + b, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Delete Habit Confirmation" maxWidth="max-w-md">
      <div className="p-6 space-y-5 bg-slate-900 text-slate-100">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Delete Habit Confirmation
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                This action cannot be undone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Habit Card Details */}
        <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{habit.icon || '📌'}</span>
            <div>
              <h4 className="text-sm font-bold text-slate-100">{habit.name}</h4>
              <p className="text-xs text-slate-400">
                Category: <strong className="text-slate-200">{habit.category}</strong> • Goal: {habit.goal}/wk
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Total completions logged:</span>
            <span className="font-bold text-amber-400">{totalCompletions} times</span>
          </div>
        </div>

        {/* Warning Box */}
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Deleting will permanently remove this habit and all its completion heatmaps from your history. Consider archiving if you want to save your progress!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          {onArchiveInstead && (
            <button
              onClick={() => {
                onArchiveInstead(habit.id);
                onClose();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive Instead</span>
            </button>
          )}

          <button
            onClick={() => {
              onConfirmDelete(habit.id);
              onClose();
            }}
            className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Habit</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
