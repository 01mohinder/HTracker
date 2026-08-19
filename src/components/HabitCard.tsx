import React from 'react';
import { Habit } from '../types';
import { CustomCountModal } from './CustomCountModal';
import {
  formatDate,
  calcStreak,
  calcRate,
  calcHabitGrindScore,
  getXpForHabit,
  startOfWeek,
  subWeeks,
  addDays,
  isFuture,
  isSameDay,
} from '../utils/storage';
import {
  Flame,
  Check,
  MoreVertical,
  Copy,
  Archive,
  Edit2,
  Trash2,
  BarChart2,
  GripVertical,
  Sparkles,
} from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  index: number;
  weeksToShow: number;
  hasNotes: boolean;
  onLog: (habitId: string) => void;
  onSetCustomCount: (habitId: string, dateKey: string, count: number) => void;
  onOpenInsight: (habitId: string) => void;
  onEdit: (habit: Habit) => void;
  onClone: (habitId: string) => void;
  onArchive: (habitId: string) => void;
  onDelete: (habitId: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  index,
  weeksToShow,
  hasNotes,
  onLog,
  onSetCustomCount,
  onOpenInsight,
  onEdit,
  onClone,
  onArchive,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [customCountTarget, setCustomCountTarget] = React.useState<{
    dateKey: string;
    currentCount: number;
  } | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Heatmap date generation
  const start = startOfWeek(today, 1);
  const weekStarts: Date[] = [];
  for (let i = weeksToShow - 1; i >= 0; i--) {
    weekStarts.push(subWeeks(start, i));
  }

  const allDays: Date[] = [];
  const earliest = weekStarts[0];
  const dayCount = Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  for (let i = 0; i < dayCount; i++) {
    allDays.push(addDays(earliest, i));
  }

  const groupedWeeks: (Date | null)[][] = [];
  let currentGroup: (Date | null)[] = [];
  allDays.forEach((day) => {
    currentGroup.push(day);
    if (currentGroup.length === 7) {
      groupedWeeks.push(currentGroup);
      currentGroup = [];
    }
  });
  if (currentGroup.length > 0) {
    while (currentGroup.length < 7) currentGroup.push(null);
    groupedWeeks.push(currentGroup);
  }

  const streak = calcStreak(habit.completions);
  const rate = calcRate(habit.completions, 30);
  const habitXp = getXpForHabit(habit);

  // Goal calculation for current week
  const weekAgo = addDays(today, -6);
  let weekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekAgo, i);
    const k = formatDate(d);
    if (habit.completions[k]) weekTotal += habit.completions[k];
  }
  const goal = habit.goal || 5;
  const goalPct = Math.min(Math.round((weekTotal / goal) * 100), 100);

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleDotClick = (d: Date, key: string, currentCount: number) => {
    setCustomCountTarget({ dateKey: key, currentCount });
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      className="group relative w-full rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/40 p-4 transition-all duration-200 shadow-md hover:shadow-xl hover:shadow-indigo-500/5"
    >
      {/* HEADER ROW */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-[180px]">
          <span className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors">
            <GripVertical className="w-4 h-4" />
          </span>

          <span className="text-2xl p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
            {habit.icon || '📌'}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h4
                onClick={() => onOpenInsight(habit.id)}
                className="text-sm font-bold text-slate-100 hover:text-indigo-400 cursor-pointer transition-colors"
              >
                {habit.name}
              </h4>
              {hasNotes && (
                <span className="text-[10px] text-indigo-400" title="Has Notes">
                  📝
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium mt-0.5">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                {habit.category}
              </span>
              <span>• Goal {habit.goal}/wk</span>
            </div>
          </div>
        </div>

        {/* METRICS & QUICK ACTIONS */}
        <div className="flex items-center gap-3 flex-wrap ml-auto">
          {/* Goal Progress Bar */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span className="font-mono text-slate-300">
              {weekTotal}/{goal}
            </span>
            <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  goalPct >= 100 ? 'bg-emerald-400' : 'bg-indigo-400'
                }`}
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>

          {/* Streak Pill */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-all ${
              streak > 0
                ? streak >= 7
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60'
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                streak >= 7 ? 'text-amber-400' : streak > 0 ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <span>{streak}d streak</span>
          </div>

          {/* XP & Rate */}
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            ⚡ +{habitXp} XP
          </span>
          <span className="hidden lg:inline-block text-xs font-mono text-slate-400 font-medium">
            {rate}% 30d
          </span>

          {/* Log Today Button */}
          <button
            onClick={() => onLog(habit.id)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Log</span>
          </button>

          {/* Menu Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-40 py-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-20 text-xs font-medium">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenInsight(habit.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Insights</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(habit);
                  }}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                  <span>Edit Habit</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onClone(habit.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clone</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onArchive(habit.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Archive className="w-3.5 h-3.5 text-purple-400" />
                  <span>Archive</span>
                </button>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(habit.id);
                  }}
                  className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HEATMAP GRID MATRIX */}
      <div className="overflow-x-auto pb-1.5 pt-1 scrollbar-none">
        <div
          className="grid gap-1.5 w-max max-w-full"
          style={{
            gridTemplateColumns: `28px repeat(${groupedWeeks.length}, minmax(20px, 28px))`,
          }}
        >
          {/* Header row for week dates */}
          <div className="text-[9px] font-mono text-slate-500 text-right pr-1 self-center" />
          {groupedWeeks.map((week, idx) => {
            const first = week[0];
            const dateStr = first ? `${first.getMonth() + 1}/${first.getDate()}` : '';
            return (
              <div
                key={idx}
                className="text-[9px] font-mono font-semibold text-slate-400 text-center truncate"
              >
                {dateStr}
              </div>
            );
          })}

          {/* Rows for Mon-Sun */}
          {dayLabels.map((dayLabel, rowIdx) => (
            <React.Fragment key={dayLabel}>
              <div className="text-[9px] font-mono text-slate-500 text-right pr-1 self-center font-medium">
                {dayLabel}
              </div>
              {groupedWeeks.map((week, colIdx) => {
                const day = week[rowIdx];
                if (!day) {
                  return <div key={colIdx} className="w-5 h-5 sm:w-6 sm:h-6 aspect-square opacity-0" />;
                }
                const key = formatDate(day);
                const count = habit.completions[key] || 0;
                const isTodayDate = isSameDay(day, today);
                const isFutureDate = isFuture(day);

                let bgStyle = 'unlogged-dot bg-slate-800/60 border-slate-700/60';
                if (count > 0) {
                  bgStyle = ''; // Custom inline style with habit color
                }

                return (
                  <div
                    key={key}
                    onClick={() => !isFutureDate && handleDotClick(day, key, count)}
                    title={`${day.toLocaleDateString()}: ${count} completions`}
                    className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-full border transition-all duration-150 flex items-center justify-center text-[9px] font-bold font-mono ${
                      isFutureDate
                        ? 'opacity-20 cursor-not-allowed border-slate-800'
                        : 'cursor-pointer hover:scale-125 hover:z-10 shadow-sm'
                    } ${
                      isTodayDate
                        ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900 z-1 font-extrabold'
                        : ''
                    } ${bgStyle}`}
                    style={
                      count > 0
                        ? {
                            backgroundColor: habit.color,
                            borderColor: habit.color,
                            boxShadow: `0 0 8px ${habit.color}60`,
                          }
                        : {}
                    }
                  >
                    {count > 1 ? (
                      <span className="text-white drop-shadow-md text-[9px]">
                        {count}
                      </span>
                    ) : count === 1 ? (
                      <Check className="w-3 h-3 text-white stroke-[3] drop-shadow-sm" />
                    ) : null}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Heatmap Legend Bar */}
        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium mt-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
            <span>Unlogged</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-indigo-400 bg-indigo-600" />
            <span>Today</span>
          </div>
        </div>
      </div>

      <CustomCountModal
        isOpen={Boolean(customCountTarget)}
        dateKey={customCountTarget?.dateKey || ''}
        currentCount={customCountTarget?.currentCount || 0}
        habitName={habit.name}
        onClose={() => setCustomCountTarget(null)}
        onSave={(count) => {
          if (customCountTarget) {
            onSetCustomCount(habit.id, customCountTarget.dateKey, count);
          }
        }}
      />
    </div>
  );
};
