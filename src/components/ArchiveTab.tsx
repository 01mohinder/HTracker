import React from 'react';
import { Habit } from '../types';
import { calcBestStreak } from '../utils/storage';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';

interface ArchiveTabProps {
  archivedHabits: Habit[];
  onUnarchive: (habitId: string) => void;
  onPermanentDelete: (habitId: string) => void;
}

export const ArchiveTab: React.FC<ArchiveTabProps> = ({
  archivedHabits,
  onUnarchive,
  onPermanentDelete,
}) => {
  if (archivedHabits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl bg-slate-900 border border-slate-800 p-8">
        <Archive className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
        <h3 className="text-base font-bold text-slate-300 mb-1">Archive is Empty</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Habits you archive will be safely stored here. You can restore them anytime.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Archive className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-bold text-slate-300">
          Archived Habits ({archivedHabits.length})
        </h3>
      </div>

      {archivedHabits.map((h) => {
        const totalCompletions = Object.values(h.completions).reduce(
          (a: number, b: number) => a + b,
          0
        );
        const bestStreak = calcBestStreak(h.completions);

        return (
          <div
            key={h.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all gap-4 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700">
                {h.icon || '📌'}
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-200">{h.name}</h4>
                <p className="text-xs text-slate-400">
                  {h.category} • {totalCompletions} total logs • Best streak: {bestStreak}d
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onUnarchive(h.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Restore</span>
              </button>
              <button
                onClick={() => onPermanentDelete(h.id)}
                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                title="Delete Permanently"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
