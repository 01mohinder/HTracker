import React from 'react';
import { Habit, Category } from '../types';
import { CATEGORIES, DEFAULT_EMOJIS } from '../utils/storage';
import { X, Check } from 'lucide-react';

interface EditHabitModalProps {
  isOpen: boolean;
  editingHabit: Habit | null;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
}

export const EditHabitModal: React.FC<EditHabitModalProps> = ({
  isOpen,
  editingHabit,
  onClose,
  onSave,
}) => {
  const [name, setName] = React.useState('');
  const [icon, setIcon] = React.useState('❤️');
  const [color, setColor] = React.useState('#818cf8');
  const [goal, setGoal] = React.useState(5);
  const [category, setCategory] = React.useState<Category>('Health');
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const colorPresets = [
    '#818cf8', '#34d399', '#fbbf24', '#f472b6',
    '#60a5fa', '#f87171', '#a78bfa', '#fb923c',
    '#38bdf8', '#a3e635', '#e879f9', '#2dd4bf'
  ];

  React.useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setIcon(editingHabit.icon || '❤️');
      setColor(editingHabit.color || '#818cf8');
      setGoal(editingHabit.goal || 5);
      setCategory(editingHabit.category || 'Health');
    } else {
      setName('');
      setIcon('❤️');
      setColor('#818cf8');
      setGoal(5);
      setCategory('Health');
    }
  }, [editingHabit, isOpen]);

  // Draw Color Wheel Canvas
  React.useEffect(() => {
    if (!canvasRef.current || !isOpen) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 2;

    ctx.clearRect(0, 0, w, h);
    for (let angle = 0; angle < 360; angle++) {
      const rad = (angle * Math.PI) / 180;
      for (let r = 0; r < radius; r += 1) {
        const x = cx + Math.cos(rad) * r;
        const y = cy + Math.sin(rad) * r;
        ctx.fillStyle = `hsl(${angle}, 90%, ${50 + 25 * (1 - r / radius)}%)`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }, [isOpen]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(px, py, 1, 1).data;
    if (imgData[3] === 0) return;

    const hex =
      '#' +
      [imgData[0], imgData[1], imgData[2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
    setColor(hex);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      icon,
      color,
      goal: Number(goal) || 5,
      category,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold">
              {editingHabit ? '✎' : '+'}
            </span>
            <h3 className="text-lg font-bold text-slate-100">
              {editingHabit ? 'Edit Habit' : 'New Habit'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Habit Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Workout, Read 25 pages..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Icon / Emoji
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs text-slate-400 font-medium">
                    Click to choose icon
                  </span>
                </div>
                <span className="text-xs text-slate-500">▼</span>
              </button>

              {showEmojiPicker && (
                <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-30 grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto">
                  {DEFAULT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setIcon(emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="p-2 text-xl hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color Wheel & Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-slate-700 cursor-crosshair flex-shrink-0 shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={80}
                  height={80}
                  onClick={handleCanvasClick}
                  className="w-full h-full"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-lg border border-white/20 shadow-md"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    {color}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-125"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Goal & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Days / Week
              </label>
              <input
                type="number"
                min={1}
                max={21}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{editingHabit ? 'Save Changes' : 'Create Habit'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
