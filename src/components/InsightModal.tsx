import React from 'react';
import { Habit } from '../types';
import {
  calcStreak,
  calcBestStreak,
  calcMissed,
  calcRate,
  calcHabitGrindScore,
  getXpForHabit,
  addDays,
  formatDate,
} from '../utils/storage';
import { X, Flame, Trophy, BarChart2, Calendar, FileText, Sparkles, Pencil, Trash2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface InsightModalProps {
  habit: Habit | null;
  noteText: string;
  allNotes?: Record<string, string>;
  isOpen: boolean;
  onClose: () => void;
  onSaveNote: (habitId: string, note: string, dateKey?: string) => void;
  onDeleteNote?: (habitId: string, dateKey?: string, specificKey?: string) => void;
}

export const InsightModal: React.FC<InsightModalProps> = ({
  habit,
  noteText,
  allNotes = {},
  isOpen,
  onClose,
  onSaveNote,
  onDeleteNote,
}) => {
  const todayKey = formatDate(new Date());
  const [selectedDate, setSelectedDate] = React.useState<string>(todayKey);
  const [localNote, setLocalNote] = React.useState('');

  // Default entry date should always be today when opening modal or changing habit
  React.useEffect(() => {
    if (isOpen) {
      setSelectedDate(todayKey);
    }
  }, [isOpen, habit?.id, todayKey]);

  // Extract all dated reflection notes for this habit (Strict 1 Date = 1 Note)
  const datedEntries = React.useMemo(() => {
    if (!habit) return [];
    const entryMap = new Map<string, { key: string; dateKey: string; note: string }>();
    const prefix = `${habit.id}_`;

    // 1. Process explicit habit.id_dateKey entries
    Object.entries(allNotes).forEach(([key, val]) => {
      const noteStr = typeof val === 'string' ? val : String(val || '');
      if (!noteStr || !noteStr.trim()) return;

      if (key.startsWith(prefix)) {
        const dateKey = key.replace(prefix, '');
        entryMap.set(dateKey, { key, dateKey, note: noteStr });
      }
    });

    // 2. Process legacy habit.id entry for todayKey ONLY if no habit.id_todayKey exists
    const legacyNote = allNotes[habit.id];
    if (legacyNote && typeof legacyNote === 'string' && legacyNote.trim()) {
      if (!entryMap.has(todayKey)) {
        entryMap.set(todayKey, { key: habit.id, dateKey: todayKey, note: legacyNote });
      }
    }

    const entries = Array.from(entryMap.values());
    return entries.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [habit, allNotes, todayKey]);

  React.useEffect(() => {
    if (!habit) return;
    const datedKey = `${habit.id}_${selectedDate}`;
    const existing = allNotes[datedKey] || (selectedDate === todayKey ? allNotes[habit.id] : '') || '';
    setLocalNote(existing);
  }, [habit, selectedDate, allNotes, todayKey]);

  if (!isOpen || !habit) return null;

  const currentStreak = calcStreak(habit.completions);
  const bestStreak = calcBestStreak(habit.completions);
  const totalCompletions = Object.values(habit.completions).reduce((a: number, b: number) => a + b, 0);
  const missedDays = calcMissed(habit.completions, 30);
  const rate = calcRate(habit.completions, 30);
  const grindScore = calcHabitGrindScore(habit);
  const xpEarned = getXpForHabit(habit);

  // Generate 30 days of data for Recharts line graph
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lineData = [];
  const dateOptions: { key: string; label: string }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = formatDate(d);
    lineData.push({
      date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      count: habit.completions[key] || 0,
    });

    dateOptions.push({
      key,
      label: d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) + (key === todayKey ? ' (Today)' : ''),
    });
  }

  // Day-of-week breakdown (Sun-Sat mapped to Mon-Sun)
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 60; i++) {
    const d = addDays(today, -i);
    const key = formatDate(d);
    const count = habit.completions[key] || 0;
    if (count > 0) {
      let dayIdx = d.getDay() - 1; // convert Sun(0) to 6, Mon(1) to 0
      if (dayIdx < 0) dayIdx = 6;
      dowCounts[dayIdx] += count;
    }
  }

  const dowData = dayNames.map((name, idx) => ({
    day: name,
    count: dowCounts[idx],
  }));

  const handleNoteSave = () => {
    onSaveNote(habit.id, localNote, selectedDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-2xl bg-slate-800 border border-slate-700">
              {habit.icon || '📌'}
            </span>
            <div>
              <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                {habit.name}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {habit.category} • Goal: {habit.goal}/week
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Insights Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Current Streak
            </span>
            <span className="text-2xl font-black font-mono text-amber-400 mt-0.5 block">
              🔥 {currentStreak}d
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Best Streak
            </span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
              🏆 {bestStreak}d
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Logs
            </span>
            <span className="text-2xl font-black font-mono text-indigo-400 mt-0.5 block">
              {totalCompletions}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-800 text-center">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Grind Score
            </span>
            <span className="text-2xl font-black font-mono text-purple-400 mt-0.5 block">
              {grindScore}%
            </span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          
          {/* 30-day completions trend */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              <span>30-Day Completion Trend</span>
            </h4>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={habit.color || '#818cf8'}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Day of Week Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Day-of-Week Distribution</span>
            </h4>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill={habit.color || '#818cf8'}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Reflection & Notes Journal (Dated Entries) */}
        <div className="mt-4 p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Habit Reflection & Journal Notes</span>
            </label>

            {/* Date Selector for Entry */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-semibold">Entry Date:</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
              >
                {dateOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    📅 {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <textarea
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            placeholder={`Add reflection notes for ${selectedDate}... (e.g. 'Completed 20 mins after morning coffee, felt focused')`}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors resize-vertical"
          />

          <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
            <p className="text-[11px] text-slate-400 font-medium">
              {localNote.trim() ? `Note active for ${selectedDate}` : `No reflection recorded for ${selectedDate} yet.`}
            </p>
            <div className="flex items-center gap-2">
              {localNote.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    if (habit && onDeleteNote) {
                      onDeleteNote(habit.id, selectedDate, `${habit.id}_${selectedDate}`);
                      setLocalNote('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                  title="Delete note for selected date"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete ({selectedDate})</span>
                </button>
              ) : null}
              <button
                onClick={handleNoteSave}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                Save Reflection ({selectedDate})
              </button>
            </div>
          </div>

          {/* DATED JOURNAL HISTORY TIMELINE */}
          {datedEntries.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Journal History Timeline ({datedEntries.length})</span>
                </span>
                <span className="text-[10px] text-slate-500">1 note per date</span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {datedEntries.map((item) => {
                  const isSelected = selectedDate === item.dateKey;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setSelectedDate(item.dateKey)}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500/60 shadow-sm'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-[10px]">
                            📅 {item.dateKey}
                          </span>
                          {item.dateKey === todayKey && (
                            <span className="text-[10px] font-bold text-emerald-400">Today</span>
                          )}
                          {isSelected && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">
                          {item.note}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDeleteNote && habit) {
                              onDeleteNote(habit.id, item.dateKey, item.key);
                              if (selectedDate === item.dateKey) {
                                setLocalNote('');
                              }
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95"
                          title="Delete note for this date"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
