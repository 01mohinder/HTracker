import React from 'react';
import { Habit } from '../types';
import { Search, Plus, Sparkles, Layers, Download, Moon, X, Check, Zap, Activity } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  habits: Habit[];
  onClose: () => void;
  onLogHabit: (habitId: string) => void;
  onOpenNewHabit: () => void;
  onOpenTemplates: () => void;
  onOpenAICoach: () => void;
  onOpenRoutineFlow?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  habits,
  onClose,
  onLogHabit,
  onOpenNewHabit,
  onOpenTemplates,
  onOpenAICoach,
  onOpenRoutineFlow,
}) => {
  const [query, setQuery] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredHabits = habits.filter((h) =>
    h.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Search Input */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-800">
          <Search className="w-5 h-5 text-indigo-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search habit..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Commands */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Quick Actions
          </div>

          <button
            onClick={() => {
              onClose();
              onOpenNewHabit();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Create New Habit</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenAICoach();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Open AI Habit Coach</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenTemplates();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Browse Habit Templates</span>
          </button>

          {onOpenRoutineFlow && (
            <button
              onClick={() => {
                onClose();
                onOpenRoutineFlow();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
            >
              <Zap className="w-4 h-4 text-indigo-400" />
              <span>Routine Flow & Habit Stacking Matrix</span>
            </button>
          )}

          <div className="my-1 border-t border-slate-800" />

          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Habits (Click to Log Today)
          </div>

          {filteredHabits.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500 text-center font-medium">
              No matching habits found.
            </div>
          ) : (
            filteredHabits.map((habit) => (
              <button
                key={habit.id}
                onClick={() => {
                  onClose();
                  onLogHabit(habit.id);
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-slate-800 text-slate-200 text-xs font-medium transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{habit.icon || '📌'}</span>
                  <span className="font-semibold text-slate-200">{habit.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>Log</span>
                </div>
              </button>
            ))
          )}

        </div>

      </div>
    </div>
  );
};
