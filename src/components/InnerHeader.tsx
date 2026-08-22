import React from 'react';
import { UserStats } from '../types';
import { xpForLevel } from '../utils/storage';
import { Flame, Shield, Trophy, Zap, Award, Target } from 'lucide-react';

interface InnerHeaderProps {
  stats: UserStats;
  activeStreakCount: number;
  onOpenBadges?: () => void;
}

export const InnerHeader: React.FC<InnerHeaderProps> = ({
  stats,
  activeStreakCount,
  onOpenBadges,
}) => {
  const currentXpTarget = xpForLevel(stats.level);
  const xpPct = Math.min(Math.round((stats.xp / currentXpTarget) * 100), 100);

  // Radial Grind Score Ring calculation (radius 22 -> circumference ~ 138.23)
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (stats.grindScore / 100) * circumference;

  return (
    <div className="relative overflow-hidden w-full rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-950/90 border border-slate-800/80 p-4 sm:p-5 shadow-xl mb-6 transition-all duration-300">
      {/* Subtle Background Glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        
        {/* INNER HEADER BRAND BADGE WITH HT GRIND.png */}
        <div className="flex items-center gap-3">
          <div className="relative p-1 rounded-xl bg-slate-800/80 border border-slate-700/80 shadow-md flex items-center justify-center min-w-[40px] min-h-[40px]">
            <img
              src="/ht-grind.png"
              alt="HT GRIND Inner Logo"
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
                INNER GRIND OVERVIEW
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Level {stats.level} Grind Warrior • {activeStreakCount} Active Streak{activeStreakCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* METRICS & RADIAL RINGS */}
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          
          {/* LEVEL & XP BAR */}
          <div
            onClick={onOpenBadges}
            className="flex items-center gap-2.5 bg-slate-800/60 hover:bg-slate-800/90 border border-slate-800 rounded-xl p-2.5 px-3.5 cursor-pointer transition-all hover:border-indigo-500/40"
            title="View Level & EXP Progress"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-black text-sm">
              <Zap className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Level {stats.level}
                </span>
                <span className="text-[10px] font-mono text-indigo-300 font-semibold">
                  {stats.xp} / {currentXpTarget} XP
                </span>
              </div>
              <div className="w-28 sm:w-36 h-2 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* RADIAL GRIND SCORE RING */}
          <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-800 rounded-xl p-2 px-3.5">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-slate-800 fill-none"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r={radius}
                  className="stroke-indigo-400 fill-none transition-all duration-700 ease-out"
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute font-mono font-bold text-xs text-slate-100">
                {stats.grindScore}
              </span>
            </div>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Grind Score
              </span>
              <span className="text-xs font-bold text-slate-200">
                {stats.grindScore >= 80
                  ? '🔥 Peak Momentum'
                  : stats.grindScore >= 50
                  ? '⚡ Steady Progress'
                  : '🌱 Building Up'}
              </span>
            </div>
          </div>

          {/* ACHIEVEMENTS & FREEZE COUNTER */}
          <div className="flex items-center gap-2">
            {/* BADGES BUTTON */}
            <button
              onClick={onOpenBadges}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/40 transition-all text-left group"
              title="Click to view Badges & Achievements"
            >
              <Trophy className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <div>
                <span className="block text-[9px] font-bold uppercase text-slate-400">Badges</span>
                <span className="text-xs font-bold text-amber-300 font-mono">{stats.achievements?.length || 0}</span>
              </div>
            </button>

            {/* FREEZE SHIELD BUTTON (ALWAYS VISIBLE) */}
            <button
              onClick={onOpenBadges}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 transition-all text-left group"
              title="Streak Freeze Protection Shield (Earn +1 on Level Up)"
            >
              <Shield className="w-4 h-4 text-blue-400 animate-pulse group-hover:scale-110 transition-transform" />
              <div>
                <span className="block text-[9px] font-bold uppercase text-blue-400">Freeze</span>
                <span className="text-xs font-bold text-blue-200 font-mono">{stats.streakFreezes || 0}</span>
              </div>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
