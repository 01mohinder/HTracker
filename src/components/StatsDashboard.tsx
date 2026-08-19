import React from 'react';
import { Habit } from '../types';
import {
  calcStreak,
  calcBestStreak,
  calcRate,
  calcMissed,
  addDays,
  formatDate,
} from '../utils/storage';
import { BarChart2, Calendar, Flame, TrendingUp, Layers } from 'lucide-react';
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

interface StatsDashboardProps {
  habits: Habit[];
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ habits }) => {
  const [selectedHabitId, setSelectedHabitId] = React.useState<string>('all');
  const [periodDays, setPeriodDays] = React.useState<number>(30);

  const filteredHabits =
    selectedHabitId === 'all'
      ? habits
      : habits.filter((h) => h.id === selectedHabitId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Time trend data
  const trendData = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const key = formatDate(d);
    let totalCount = 0;
    filteredHabits.forEach((h) => {
      totalCount += h.completions[key] || 0;
    });
    trendData.push({
      date: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      completions: totalCount,
    });
  }

  // Per habit breakdown
  const habitBreakdownData = habits.map((h) => {
    let sum = 0;
    for (let i = 0; i < periodDays; i++) {
      const d = addDays(today, -i);
      const key = formatDate(d);
      sum += h.completions[key] || 0;
    }
    return {
      name: h.name,
      icon: h.icon || '📌',
      color: h.color || '#818cf8',
      total: sum,
      streak: calcStreak(h.completions),
    };
  });

  // Day of week pattern
  const dowCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < periodDays; i++) {
    const d = addDays(today, -i);
    const key = formatDate(d);
    let dayIdx = d.getDay() - 1;
    if (dayIdx < 0) dayIdx = 6;
    filteredHabits.forEach((h) => {
      dowCounts[dayIdx] += h.completions[key] || 0;
    });
  }

  const dowData = dayNames.map((name, idx) => ({
    day: name,
    count: dowCounts[idx],
  }));

  return (
    <div className="space-y-6">
      
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400">Filter Habit:</span>
          <select
            value={selectedHabitId}
            onChange={(e) => setSelectedHabitId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-semibold focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Habits</option>
            {habits.map((h) => (
              <option key={h.id} value={h.id}>
                {h.icon} {h.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Period:</span>
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setPeriodDays(d)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                periodDays === d
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {d === 365 ? '1 Year' : `${d}D`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Trend Line Chart */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Completions Over Time ({periodDays} Days)</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #0f172a)',
                    color: 'var(--tooltip-color, #f8fafc)',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completions"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Total Completions by Habit */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Total Logs Per Habit ({periodDays} Days)</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitBreakdownData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #0f172a)',
                    color: 'var(--tooltip-color, #f8fafc)',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Streaks Leaderboard */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Streak Leaderboard</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitBreakdownData} layout="vertical">
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #0f172a)',
                    color: 'var(--tooltip-color, #f8fafc)',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="streak" fill="#fbbf24" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Day of Week Pattern */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-md">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span>Weekly Day-of-Week Distribution</span>
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dowData}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #0f172a)',
                    color: 'var(--tooltip-color, #f8fafc)',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
