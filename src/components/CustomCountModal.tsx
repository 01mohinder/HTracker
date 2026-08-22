import React from 'react';
import { X, CheckCircle2, Minus, Plus } from 'lucide-react';
import { Modal } from './Modal';

interface CustomCountModalProps {
  isOpen: boolean;
  dateKey: string;
  currentCount: number;
  habitName: string;
  onClose: () => void;
  onSave: (count: number) => void;
}

export const CustomCountModal: React.FC<CustomCountModalProps> = ({
  isOpen,
  dateKey,
  currentCount,
  habitName,
  onClose,
  onSave,
}) => {
  const [count, setCount] = React.useState<number>(currentCount);

  React.useEffect(() => {
    setCount(currentCount);
  }, [currentCount, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Set Completion Count" maxWidth="max-w-sm">
      <div className="p-6 space-y-5 bg-slate-900 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Set Completion Count
            </h3>
            <p className="text-xs text-slate-400">
              {habitName} • <span className="text-indigo-400 font-mono font-bold">{dateKey}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter controls */}
        <div className="flex items-center justify-center gap-4 py-3">
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(0, c - 1))}
            className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center transition-all active:scale-90"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="text-center min-w-[80px]">
            <input
              type="number"
              min={0}
              max={99}
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCount(isNaN(val) ? 0 : Math.max(0, val));
              }}
              className="w-20 py-2 text-center text-3xl font-black font-mono text-indigo-400 bg-slate-800/80 border border-indigo-500/30 rounded-2xl focus:outline-none focus:border-indigo-500"
            />
            <span className="block text-[10px] uppercase font-bold text-slate-500 mt-1">
              Completions
            </span>
          </div>

          <button
            type="button"
            onClick={() => setCount((c) => Math.min(99, c + 1))}
            className="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center transition-all active:scale-90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Action button */}
        <button
          onClick={() => {
            onSave(count);
            onClose();
          }}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Entry ({count})</span>
        </button>
      </div>
    </Modal>
  );
};
