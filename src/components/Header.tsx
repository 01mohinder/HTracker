import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Sparkles,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Layers,
  Flame,
  Zap,
  User,
  Check,
  Palette,
  Activity,
} from 'lucide-react';
import { ThemeMode, UserAccount } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
  onOpenNewModal: () => void;
  onOpenTemplates: () => void;
  onOpenAICoach: () => void;
  onOpenCommandPalette: () => void;
  onOpenRoutineFlow?: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  syncStatus?: 'live' | 'syncing' | 'offline';
  onManualSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onThemeChange,
  currentUser,
  onOpenAuth,
  soundEnabled,
  onSoundToggle,
  onOpenNewModal,
  onOpenTemplates,
  onOpenAICoach,
  onOpenCommandPalette,
  onOpenRoutineFlow,
  onExport,
  onImport,
  syncStatus = 'live',
  onManualSync,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions: { mode: ThemeMode; label: string; icon: string; color: string }[] = [
    { mode: 'dark', label: 'Dark Obsidian', icon: '🌙', color: 'bg-slate-900 border-indigo-500' },
    { mode: 'light', label: 'Ultra Light', icon: '☀️', color: 'bg-amber-100 border-amber-400' },
    { mode: 'midnight', label: 'Midnight Blue', icon: '🌌', color: 'bg-blue-950 border-blue-400' },
    { mode: 'cyberpunk', label: 'Cyberpunk', icon: '⚡', color: 'bg-purple-950 border-pink-500' },
    { mode: 'emerald', label: 'Emerald Zen', icon: '🌿', color: 'bg-emerald-950 border-emerald-400' },
  ];

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-slate-900/80 dark:bg-slate-950/85 border-b border-slate-800/80 shadow-lg shadow-black/20 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
        
        {/* OUTER HEADER BRAND LOGO USING HT GRIND.png */}
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="flex items-center gap-3 group focus:outline-none"
            title="HT GRIND — Advanced Habit & Productivity Platform"
          >
            <div className="relative flex items-center justify-center p-1 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 border border-indigo-500/30 group-hover:border-indigo-400/60 transition-all duration-300 shadow-md shadow-indigo-500/10 min-w-[36px] min-h-[36px]">
              <img
                src="/HT%20GRIND.png"
                alt="HT GRIND"
                className="h-9 sm:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent && !parent.querySelector('.logo-fallback')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'logo-fallback font-black text-sm sm:text-base bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent px-2 tracking-wider';
                    fallback.innerText = 'HT GRIND';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
            
            <div className="hidden sm:flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold tracking-wider text-lg bg-gradient-to-r from-indigo-300 via-purple-200 to-indigo-400 bg-clip-text text-transparent">
                  HT GRIND
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-widest uppercase">
                  v2.0 PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                {currentDateStr} • Master Your Momentum
              </span>
            </div>
          </a>
        </div>

        {/* SEARCH COMMAND TRIGGER */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 text-xs font-medium transition-all shadow-inner"
          title="Search or execute actions (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          <span>Quick Find / Actions...</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-900 border border-slate-700 rounded text-slate-400 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* ACTIONS & TOOLS */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* USER GOOGLE / EMAIL AUTH BADGE & MULTI-DEVICE SYNC */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold transition-all shadow-sm"
              title={currentUser ? `Logged in as ${currentUser.name} (${currentUser.email}) — Real-time Multi-device sync enabled` : 'Sign in with Google or Email'}
            >
              {currentUser ? (
                <div className="flex items-center gap-1.5">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-indigo-400"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {currentUser.name.charAt(0)}
                    </div>
                  )}
                  <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncStatus === 'live'
                        ? 'bg-emerald-400 animate-pulse'
                        : syncStatus === 'syncing'
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-slate-500'
                    }`}
                    title={
                      syncStatus === 'live'
                        ? 'Multi-Device Live Sync Connected'
                        : syncStatus === 'syncing'
                        ? 'Syncing across devices...'
                        : 'Local mode'
                    }
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sign In</span>
                </div>
              )}
            </button>

            {currentUser && onManualSync && (
              <button
                onClick={onManualSync}
                className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-[11px] text-slate-300 font-medium transition-all"
                title="Force refresh & sync with cloud across your devices"
              >
                <Activity className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
                <span className="hidden lg:inline">{syncStatus === 'syncing' ? 'Syncing...' : 'Live Sync'}</span>
              </button>
            )}
          </div>

          {/* AI Habit Coach Button (Matching + New Habit button color style) */}
          <button
            onClick={onOpenAICoach}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all active:translate-y-0"
            title="Ask AI Habit Coach"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden sm:inline">AI Coach</span>
          </button>

          {/* Templates */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium transition-all"
            title="Habit Stacks & Templates"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* Routine Stacking Matrix */}
          {onOpenRoutineFlow && (
            <button
              onClick={onOpenRoutineFlow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
              title="Routine Stacking & Velocity Matrix"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Routine Flow</span>
            </button>
          )}

          {/* Audio FX Toggle */}
          <button
            onClick={onSoundToggle}
            className={`p-2 rounded-full border text-xs transition-all ${
              soundEnabled
                ? 'bg-slate-800 border-indigo-500/40 text-indigo-400'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-500'
            }`}
            title={soundEnabled ? 'Sound Effects Enabled' : 'Sound Effects Muted'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Interactive Theme Selector Dropdown */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold transition-all"
              title="Click to Choose Theme"
            >
              {theme === 'light' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span className="capitalize text-[11px] hidden sm:inline">{theme}</span>
            </button>

            {themeMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 py-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                  Select Theme Color
                </div>
                {themeOptions.map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => {
                      onThemeChange(opt.mode);
                      setThemeMenuOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center justify-between hover:bg-slate-800/90 transition-colors ${
                      theme === opt.mode ? 'text-indigo-400 font-bold bg-slate-800/50' : 'text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-3.5 h-3.5 rounded-full border shadow-sm ${opt.color}`} />
                      <span>{opt.label}</span>
                    </div>
                    {theme === opt.mode && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Backup Export / Import */}
          <button
            onClick={onExport}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-all"
            title="Export Data Backup"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-all"
            title="Import Data JSON"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onImport}
            accept=".json"
            className="hidden"
          />

          {/* Create New Habit Button */}
          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all active:translate-y-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Habit</span>
          </button>
        </div>
      </div>
    </header>
  );
};

