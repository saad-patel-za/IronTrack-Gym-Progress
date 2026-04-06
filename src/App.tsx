/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { 
  Dumbbell, 
  History, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Calendar, 
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Set {
  reps: number;
  weight: number;
}

interface Workout {
  id: string;
  date: string;
  exercise: string;
  sets: Set[];
}

type Tab = 'log' | 'history' | 'progress';

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form State
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState<Set[]>([{ reps: 0, weight: 0 }]);

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('iron_track_workouts');
    if (saved) {
      try {
        setWorkouts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse workouts', e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('iron_track_workouts', JSON.stringify(workouts));
  }, [workouts]);

  const addSet = () => {
    setSets([...sets, { reps: 0, weight: 0 }]);
  };

  const removeSet = (index: number) => {
    setSets(sets.filter((_, i) => i !== index));
  };

  const updateSet = (index: number, field: keyof Set, value: number) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const saveWorkout = () => {
    if (!exercise || sets.length === 0) return;

    const newWorkout: Workout = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      exercise,
      sets: sets.filter(s => s.reps > 0 || s.weight > 0)
    };

    if (newWorkout.sets.length === 0) return;

    setWorkouts([newWorkout, ...workouts]);
    setExercise('');
    setSets([{ reps: 0, weight: 0 }]);
    
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const deleteWorkout = (id: string) => {
    setWorkouts(workouts.filter(w => w.id !== id));
  };

  // Progress Data
  const exerciseList = useMemo(() => {
    return Array.from(new Set(workouts.map(w => w.exercise))).sort();
  }, [workouts]);

  const [selectedExercise, setSelectedExercise] = useState(exerciseList[0] || '');

  useEffect(() => {
    if (!selectedExercise && exerciseList.length > 0) {
      setSelectedExercise(exerciseList[0]);
    }
  }, [exerciseList, selectedExercise]);

  const chartData = useMemo(() => {
    if (!selectedExercise) return [];
    
    return workouts
      .filter(w => w.exercise === selectedExercise)
      .map(w => ({
        date: new Date(w.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        timestamp: new Date(w.date).getTime(),
        maxWeight: Math.max(...w.sets.map(s => s.weight))
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [workouts, selectedExercise]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 pb-20">
      {/* Header */}
      <header className="p-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            IronTrack
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400 ml-1">Exercise Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Bench Press"
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value)}
                    className="w-full bg-slate-800 border-none rounded-2xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between ml-1">
                    <h3 className="text-sm font-medium text-slate-400">Sets</h3>
                    <button 
                      onClick={addSet}
                      className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:text-blue-300 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> ADD SET
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sets.map((set, idx) => (
                      <motion.div 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={idx} 
                        className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400">
                          {idx + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="Weight"
                              value={set.weight || ''}
                              onChange={(e) => updateSet(idx, 'weight', parseFloat(e.target.value))}
                              className="w-full bg-slate-700/50 border-none rounded-xl p-3 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 pointer-events-none">KG</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="Reps"
                              value={set.reps || ''}
                              onChange={(e) => updateSet(idx, 'reps', parseInt(e.target.value))}
                              className="w-full bg-slate-700/50 border-none rounded-xl p-3 text-center focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 pointer-events-none">REPS</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeSet(idx)}
                          className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={saveWorkout}
                  disabled={!exercise || sets.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  SAVE WORKOUT
                </button>
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {workouts.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                    <History className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-medium">No workouts logged yet.</p>
                </div>
              ) : (
                workouts.map((workout) => (
                  <div key={workout.id} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg">
                          <Calendar className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-100">{workout.exercise}</h3>
                          <p className="text-xs text-slate-500">
                            {new Date(workout.date).toLocaleDateString(undefined, { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteWorkout(workout.id)}
                        className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {workout.sets.map((set, i) => (
                        <div key={i} className="bg-slate-800/40 rounded-xl p-2 text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase">Set {i+1}</p>
                          <p className="text-sm font-bold text-slate-200">{set.weight}kg × {set.reps}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Select Exercise</label>
                <select
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                >
                  {exerciseList.length === 0 && <option>No data available</option>}
                  {exerciseList.map(ex => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>

              {chartData.length > 1 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 pt-8 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(val) => `${val}kg`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid #1e293b',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                        itemStyle={{ color: '#3b82f6' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="maxWeight" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                        name="Max Weight"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                  <TrendingUp className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 px-10">Log at least two sessions of the same exercise to see your progress trend.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-emerald-900/20 flex items-center gap-2 z-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            Workout Saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 px-6 py-4 flex justify-around items-center z-40">
        <NavButton 
          active={activeTab === 'log'} 
          onClick={() => setActiveTab('log')}
          icon={<Plus className="w-6 h-6" />}
          label="Log"
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={<History className="w-6 h-6" />}
          label="History"
        />
        <NavButton 
          active={activeTab === 'progress'} 
          onClick={() => setActiveTab('progress')}
          icon={<TrendingUp className="w-6 h-6" />}
          label="Progress"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300 relative",
        active ? "text-blue-400" : "text-slate-500"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-glow"
          className="absolute -top-4 w-12 h-1 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"
        />
      )}
      <div className={cn(
        "p-1 rounded-xl transition-colors",
        active ? "bg-blue-400/10" : ""
      )}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
