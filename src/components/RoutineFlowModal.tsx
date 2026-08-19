/**
 * RoutineFlowModal.tsx
 * Novel Feature 1 UI: Routine Stacking & Flow Matrix Dashboard
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  Sparkles,
  Plus,
  RotateCcw,
  Flame,
  Award,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Routine, RoutineStep, RoutineEngine } from '../core/engine/RoutineEngine';
import { RoutineService } from '../services/RoutineService';
import { soundFx } from '../utils/audio';

interface RoutineFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: Routine[];
  onUpdateRoutines: (updated: Routine[]) => void;
}

export const RoutineFlowModal: React.FC<RoutineFlowModalProps> = ({
  isOpen,
  onClose,
  routines,
  onUpdateRoutines,
}) => {
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);
  const [newStepTitle, setNewStepTitle] = useState<string>('');
  const [newStepDuration, setNewStepDuration] = useState<number>(5);

  useEffect(() => {
    if (routines.length > 0 && !activeRoutine) {
      setActiveRoutine(routines[0]);
    }
  }, [routines]);

  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timeLeftSeconds > 0) {
      timer = setInterval(() => {
        setTimeLeftSeconds((prev) => prev - 1);
      }, 1000);
    } else if (isTimerRunning && timeLeftSeconds === 0) {
      setIsTimerRunning(false);
      soundFx.playLevelUp();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeftSeconds]);

  if (!isOpen) return null;

  const handleSelectRoutine = (rt: Routine) => {
    setActiveRoutine(rt);
    setActiveStepIndex(0);
    setIsTimerRunning(false);
    setTimeLeftSeconds(0);
  };

  const handleToggleStep = (stepId: string) => {
    if (!activeRoutine) return;
    const updated = RoutineService.toggleStepCompletion(activeRoutine, stepId);
    setActiveRoutine(updated);

    const newRoutines = routines.map((r) => (r.id === updated.id ? updated : r));
    onUpdateRoutines(newRoutines);
    soundFx.playClick();
  };

  const handleStartStepTimer = (step: RoutineStep, index: number) => {
    setActiveStepIndex(index);
    setTimeLeftSeconds(step.durationMinutes * 60);
    setIsTimerRunning(true);
    soundFx.playClick();
  };

  const handleResetRoutine = () => {
    if (!activeRoutine) return;
    const reset = RoutineService.resetRoutine(activeRoutine);
    setActiveRoutine(reset);
    const newRoutines = routines.map((r) => (r.id === reset.id ? reset : r));
    onUpdateRoutines(newRoutines);
    setIsTimerRunning(false);
    setTimeLeftSeconds(0);
  };

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoutine || !newStepTitle.trim()) return;

    const updated = RoutineService.addRoutineStep(activeRoutine, {
      title: newStepTitle.trim(),
      durationMinutes: newStepDuration,
      icon: '✨',
    });
    setActiveRoutine(updated);
    const newRoutines = routines.map((r) => (r.id === updated.id ? updated : r));
    onUpdateRoutines(newRoutines);
    setNewStepTitle('');
  };

  const currentStep = activeRoutine?.steps[activeStepIndex];
  const completionRate = activeRoutine ? RoutineEngine.calculateCompletionRate(activeRoutine) : 0;
  const totalDuration = activeRoutine ? RoutineEngine.getEstimatedDuration(activeRoutine) : 0;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Routine Flow & Habit Stacking Matrix</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Feature 1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stack habits into seamless power routines with step-by-step velocity timers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Panel: Routine Selector */}
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Select Power Routine
              </span>
              <span className="text-[11px] font-bold text-indigo-400">{routines.length} Routines</span>
            </div>

            <div className="space-y-2.5">
              {routines.map((rt) => {
                const isActive = activeRoutine?.id === rt.id;
                const rate = RoutineEngine.calculateCompletionRate(rt);
                return (
                  <button
                    key={rt.id}
                    onClick={() => handleSelectRoutine(rt)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-900/40 to-slate-800 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rt.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{rt.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{rt.timeOfDay}</span>
                          <span className="text-[10px] text-indigo-400 font-semibold">• {rt.steps.length} steps</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-indigo-400">{rate}%</span>
                      <ChevronRight className="w-4 h-4 text-slate-500 ml-auto mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Routine Execution & Timer */}
          <div className="md:col-span-8 space-y-5">
            {activeRoutine && (
              <>
                {/* Routine Overview Card */}
                <div className="dark-card p-5 rounded-2xl bg-slate-900 border border-indigo-500/40 shadow-xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{activeRoutine.icon}</span>
                        <h3 className="text-lg font-extrabold text-white">{activeRoutine.title}</h3>
                      </div>
                      <p className="text-xs text-slate-200 mt-1 font-medium">
                        Est. Duration: <span className="font-bold text-indigo-300">{totalDuration} mins</span> • Target Velocity: <span className="font-bold text-indigo-300">{activeRoutine.targetVelocityMinutes} mins</span>
                      </p>
                    </div>

                    <button
                      onClick={handleResetRoutine}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold border border-slate-700 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-300" />
                      <span>Reset Steps</span>
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1.5">
                      <span className="text-slate-100 font-bold">Routine Matrix Completion</span>
                      <span className="text-indigo-300 font-mono text-sm font-extrabold">{completionRate}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden border border-slate-700/80">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Active Step Timer Box */}
                  {timeLeftSeconds > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-900/40 border border-indigo-500/40 flex items-center justify-between animate-in fade-in">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-indigo-300 tracking-wider block">
                          Step Sprint Timer
                        </span>
                        <h5 className="text-sm font-bold text-slate-100 mt-0.5">
                          {currentStep?.title || 'Active Step'}
                        </h5>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-mono font-extrabold text-indigo-400">
                          {formatTimer(timeLeftSeconds)}
                        </span>
                        <button
                          onClick={() => setIsTimerRunning(!isTimerRunning)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                        >
                          {isTimerRunning ? 'Pause' : 'Resume'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Steps List */}
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Chained Routine Steps
                  </span>

                  {activeRoutine.steps.map((step, idx) => (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                        step.completed
                          ? 'bg-emerald-950/20 border-emerald-500/30 opacity-80'
                          : 'bg-slate-800/60 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleStep(step.id)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            step.completed
                              ? 'bg-emerald-500 text-slate-950'
                              : 'border-2 border-slate-600 hover:border-indigo-400 text-transparent'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <span className="text-lg">{step.icon}</span>
                        <div>
                          <h5
                            className={`text-xs font-bold ${
                              step.completed ? 'text-slate-400 line-through' : 'text-slate-100'
                            }`}
                          >
                            {step.title}
                          </h5>
                          <span className="text-[10px] text-slate-400">{step.durationMinutes} minutes</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleStartStepTimer(step, idx)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Start Sprint</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Step Form */}
                <form onSubmit={handleAddStep} className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    placeholder="Add step to routine stack..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    value={newStepDuration}
                    onChange={(e) => setNewStepDuration(Number(e.target.value))}
                    min={1}
                    max={120}
                    className="w-16 px-2 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs text-center focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">m</span>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Step</span>
                  </button>
                </form>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
