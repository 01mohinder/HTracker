import React from 'react';
import { UserStats } from '../types';
import { ALL_ACHIEVEMENTS, xpForLevel } from '../utils/storage';
import { X, Trophy, Shield, Zap, Award, Lock, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';

interface BadgesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
}

export const BadgesModal: React.FC<BadgesModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  const unlockedIds = stats.achievements || [];
  const nextXpTarget = xpForLevel(stats.level);
  const xpPct = Math.min(Math.round((stats.xp / nextXpTarget) * 100), 100);

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Badges & Rewards Console" maxWidth="max-w-2xl">
      <div className="p-6 overflow-y-auto max-h-[85vh] space-y-6 bg-slate-900 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                BADGES & REWARDS CONSOLE
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {unlockedIds.length} of {ALL_ACHIEVEMENTS.length} Badges Unlocked • Level {stats.level}
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

        {/* Level XP & Streak Freeze Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Level Progress */}
          <div className="dark-card p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-indigo-300 font-extrabold text-sm">
                <Zap className="w-4 h-4 text-indigo-400 shrink-0" />
                Level {stats.level} Grind Warrior
              </span>
              <span className="text-indigo-200 font-mono font-bold bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-500/30">
                {stats.xp} / {nextXpTarget} XP
              </span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-indigo-500/30">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${xpPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-200 leading-normal">
              Earn XP by completing daily habits. Leveling up grants <strong className="text-indigo-300 font-semibold">+1 Streak Freeze 🧊</strong>.
            </p>
          </div>

          {/* Streak Freeze Shield System */}
          <div className="dark-card p-4 rounded-2xl bg-slate-900 border border-blue-500/40 shadow-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-blue-300 font-extrabold text-sm">
                <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                Deduction Protection Shield
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-900/60 text-blue-200 font-mono text-xs font-bold border border-blue-500/40">
                {stats.streakFreezes || 0} Freezes
              </span>
            </div>
            <p className="text-[11px] text-slate-200 leading-relaxed">
              When a habit is unlogged or missed, a <strong className="text-blue-300">Streak Freeze</strong> automatically absorbs the loss, stopping XP & Level deductions completely!
            </p>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Achievement Badges Catalog</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_ACHIEVEMENTS.map((ach) => {
              const isUnlocked = unlockedIds.includes(ach.id);

              return (
                <div
                  key={ach.id}
                  className={`dark-card p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                    isUnlocked
                      ? 'bg-slate-900 border-amber-500/50 text-slate-100 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 opacity-80'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                      isUnlocked
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-slate-800 border-slate-700/80 text-slate-400'
                    }`}
                  >
                    {isUnlocked ? ach.icon : <Lock className="w-4 h-4 text-slate-400" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className={`text-xs font-bold ${isUnlocked ? 'text-amber-300' : 'text-slate-200'}`}>
                        {ach.label}
                      </h5>
                      {isUnlocked && (
                        <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1 bg-emerald-500/20 px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Unlocked
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-snug ${isUnlocked ? 'text-slate-200' : 'text-slate-400'}`}>
                      {ach.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
