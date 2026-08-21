import React from 'react';
import { Habit } from '../types';
import {
  calcStreak,
  addDays,
  formatDate,
} from '../utils/storage';
import {
  BarChart2,
  Calendar,
  Flame,
  TrendingUp,
  Cpu,
  Zap,
  ShieldCheck,
  BrainCircuit,
  Activity,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
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
  const [backendAudit, setBackendAudit] = React.useState<any>(null);
  const [loadingAudit, setLoadingAudit] = React.useState<boolean>(false);

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

  // Fetch backend statistical audit
  const fetchAudit = React.useCallback(async () => {
    if (habits.length === 0) return;
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/analytics/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits, lookbackDays: periodDays }),
      });
      if (res.ok) {
        const data = await res.json();
        setBackendAudit(data);
      }
    } catch (e) {
      console.warn('Backend analytics fetch note:', e);
    } finally {
      setLoadingAudit(false);
    }
  }, [habits, periodDays]);

  React.useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

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

      {/* ADVANCED BACKEND STATISTICAL AUDIT METRICS */}
      {backendAudit && (
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Backend Mathematical Engine (Float64 Precision)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                    Active
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Exponential decay weighting, Shannon entropy balance, and Markov chain forecasting
                </p>
              </div>
            </div>

            <button
              onClick={fetchAudit}
              disabled={loadingAudit}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <RefreshCw className={`w-3 h-3 ${loadingAudit ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Recalculate</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1 font-medium">
                <span>Decay Grind Score</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-black text-slate-100">{backendAudit.grindScore}%</div>
              <div className="text-[10px] text-slate-400 font-mono">
                Trend: <span className={backendAudit.trend === 'improving' ? 'text-emerald-400' : 'text-slate-300'}>{backendAudit.trend}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1 font-medium">
                <span>Entropy Balance</span>
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="text-xl font-black text-purple-300">
                {Math.round((backendAudit.categoryEntropy?.score || 1) * 100)}%
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {backendAudit.categoryEntropy?.balanceQuality} ({backendAudit.categoryEntropy?.dominantCategory || 'Even'})
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1 font-medium">
                <span>Burnout Risk</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-black capitalize text-slate-100 flex items-center gap-1">
                {backendAudit.burnoutRisk === 'high' ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> High
                  </span>
                ) : (
                  <span className="text-emerald-400">Low</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Avg {backendAudit.weeklyVelocity?.averagePerDay || 0}/day
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between text-slate-400 text-[11px] mb-1 font-medium">
                <span>Peak Velocity</span>
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-black text-cyan-300">
                {backendAudit.weeklyVelocity?.peakDay || 'Mon'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Lowest: {backendAudit.weeklyVelocity?.lowestDay || 'Sun'}
              </div>
            </div>
          </div>

          {/* Top Habit Pearson Correlations */}
          {backendAudit.topCorrelations && backendAudit.topCorrelations.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                <span>Habit Synergy & Pearson Correlations (r)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {backendAudit.topCorrelations.map((corr: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-200 truncate">
                        {corr.habitA} ↔ {corr.habitB}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{corr.insight}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold shrink-0 ${
                        corr.correlationCoefficient >= 0.4
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : corr.correlationCoefficient <= -0.3
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      r={corr.correlationCoefficient > 0 ? `+${corr.correlationCoefficient}` : corr.correlationCoefficient}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
