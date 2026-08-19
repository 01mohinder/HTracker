import React, { useState } from 'react';
import { Habit, Category } from '../types';
import { X, Layers, Plus, Check, Search, Sparkles } from 'lucide-react';

export interface TemplateItem {
  icon: string;
  name: string;
  goal: number;
  category: Category;
  color: string;
  desc: string;
}

const TEMPLATE_PRESETS: TemplateItem[] = [
  {
    icon: '🏋️',
    name: 'Morning Workout',
    goal: 5,
    category: 'Fitness',
    color: '#818cf8',
    desc: '30 min physical exercise & stretching stack',
  },
  {
    icon: '📖',
    name: 'Read 25 Pages',
    goal: 7,
    category: 'Mind',
    color: '#fbbf24',
    desc: 'Daily reading for continuous mental expansion',
  },
  {
    icon: '🧘',
    name: '10 Min Meditation',
    goal: 5,
    category: 'Mind',
    color: '#a78bfa',
    desc: 'Mindfulness breathing for stress reduction & focus',
  },
  {
    icon: '💼',
    name: '4 Hours Deep Work',
    goal: 5,
    category: 'Work',
    color: '#34d399',
    desc: 'Uninterrupted deep focus productivity session',
  },
  {
    icon: '💧',
    name: '2L Hydration',
    goal: 7,
    category: 'Health',
    color: '#60a5fa',
    desc: 'Optimal daily water intake tracker',
  },
  {
    icon: '💰',
    name: 'Track Expenses',
    goal: 7,
    category: 'Finance',
    color: '#38bdf8',
    desc: 'Log daily spending & stay on budget',
  },
  {
    icon: '🏃',
    name: '10k Daily Steps',
    goal: 6,
    category: 'Fitness',
    color: '#f472b6',
    desc: 'Active movement and cardio goal',
  },
  {
    icon: '🌙',
    name: 'Night Sleep Routine',
    goal: 7,
    category: 'Health',
    color: '#e879f9',
    desc: 'No screen time 30 mins before sleep',
  },
  {
    icon: '💻',
    name: 'Daily Code Grind',
    goal: 5,
    category: 'Learning',
    color: '#6366f1',
    desc: 'Master software engineering & problem solving',
  },
  {
    icon: '✍️',
    name: 'Creative Reflection',
    goal: 5,
    category: 'Creativity',
    color: '#f59e0b',
    desc: 'Journal 15 mins of ideas and brain dump',
  },
  {
    icon: '📞',
    name: 'Connect with Loved Ones',
    goal: 3,
    category: 'Social',
    color: '#ec4899',
    desc: 'Call or message family or a close friend',
  },
  {
    icon: '⚡',
    name: 'Evening Reset Routine',
    goal: 7,
    category: 'Routine',
    color: '#10b981',
    desc: 'Tidy workspace and prepare for tomorrow',
  },
  {
    icon: '🥗',
    name: 'Healthy Meal Prep',
    goal: 5,
    category: 'Health',
    color: '#10b981',
    desc: 'Eat whole foods & balanced nutrients',
  },
  {
    icon: '🎯',
    name: 'Goal & KPI Review',
    goal: 2,
    category: 'Work',
    color: '#3b82f6',
    desc: 'Weekly milestone tracking & task planning',
  },
  {
    icon: '🧠',
    name: 'Learn Language / Flashcards',
    goal: 6,
    category: 'Learning',
    color: '#8b5cf6',
    desc: '15 mins vocabulary practice & skill building',
  },
  {
    icon: '🌿',
    name: 'Posture & Mobility Break',
    goal: 7,
    category: 'Fitness',
    color: '#06b6d4',
    desc: '5 min ergonomics stretch every 2 hours',
  },
];

const CATEGORIES: ('All' | Category)[] = [
  'All',
  'Health',
  'Mind',
  'Work',
  'Fitness',
  'Finance',
  'Learning',
  'Creativity',
  'Social',
  'Routine',
];

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTemplate: (template: TemplateItem) => void;
  existingHabitNames?: string[];
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onAddTemplate,
  existingHabitNames = [],
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | Category>('All');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filtered = TEMPLATE_PRESETS.filter((tmpl) => {
    if (selectedCategory !== 'All' && tmpl.category !== selectedCategory) return false;
    if (
      searchQuery.trim() &&
      !tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !tmpl.desc.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Habit Templates & Routine Stacks
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {TEMPLATE_PRESETS.length} Presets
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Click any preset stack to add it directly to your HT GRIND active habits dashboard.
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

        {/* Filter & Search Bar */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search templates by keyword or goal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {filtered.length === 0 ? (
            <div className="col-span-2 p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              No habit templates match "{searchQuery}" under {selectedCategory}. Try another filter!
            </div>
          ) : (
            filtered.map((tmpl) => {
              const isAlreadyAdded = existingHabitNames.some(
                (n) => n.toLowerCase() === tmpl.name.toLowerCase()
              );

              return (
                <div
                  key={tmpl.name}
                  onClick={() => {
                    onAddTemplate(tmpl);
                    onClose();
                  }}
                  className="p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 cursor-pointer transition-all duration-200 group flex items-start justify-between gap-3 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="text-2xl p-2.5 rounded-xl bg-slate-900 border border-slate-800 group-hover:scale-110 transition-transform shrink-0">
                      {tmpl.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                          {tmpl.name}
                        </h4>
                        {isAlreadyAdded && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {tmpl.desc}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                          {tmpl.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          {tmpl.goal} days/wk
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
