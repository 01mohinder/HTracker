import React from 'react';
import { Habit } from '../types';
import { formatDate } from '../utils/storage';
import { CheckCircle2, Circle, Flame, Sparkles, Check } from 'lucide-react';

interface TodayGrindProps {
  habits: Habit[];
  onLogHabit: (habitId: string) => void;
  onOpenInsight: (habitId: string) => void;
  onOpenAICoach?: () => void;
}

export const TodayGrind: React.FC<TodayGrindProps> = ({
  habits,
  onLogHabit,
  onOpenInsight,
  onOpenAICoach,
}) => {
  const todayKey = formatDate(new Date());

  const completedCount = habits.filter(
    (h) => h.completions[todayKey] && h.completions[todayKey] > 0
  ).length;

  const totalCount = habits.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="w-full rounded-2xl bg-slate-900/70 border border-slate-800 p-4 mb-6 shadow-md transition-all">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-200 tracking-wide">
            TODAY'S QUICK GRIND
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAICoach && (
            <button
              onClick={onOpenAICoach}
              className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI Coach Suggestions</span>
            </button>
          )}
          <div className="w-24 sm:w-32 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300">
            {completedCount} / {totalCount} ({progressPct}%)
          </span>
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-4 text-xs text-slate-500 font-medium">
          No habits added yet. Click "+ New Habit" to start your grind!
        </div>
      ) : (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
          {habits.map((habit) => {
            const count = habit.completions[todayKey] || 0;
            const isDone = count > 0;

            return (
              <div
                key={habit.id}
                onClick={() => onLogHabit(habit.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all duration-200 select-none group ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:border-indigo-500/40'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">
                  {habit.icon || '📌'}
                </span>

                <div className="flex flex-col">
                  <span className="text-xs font-semibold leading-tight max-w-[120px] truncate">
                    {habit.name}
                  </span>
                  {count > 1 && (
                    <span className="text-[10px] font-mono text-indigo-300 font-bold">
                      {count}x completed
                    </span>
                  )}
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                    isDone
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                      : 'border-slate-600 group-hover:border-indigo-400 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
