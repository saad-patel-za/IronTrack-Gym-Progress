/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { 
  Dumbbell, 
  History, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2,
  X,
  Sparkles,
  Mic,
  MicOff,
  Image as ImageIcon,
  Brain,
  Send,
  Loader2,
  Download
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
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

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

type Tab = 'log' | 'history' | 'progress' | 'coach';

export default function App() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('log');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Form State
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState<Set[]>([{ reps: 0, weight: 0 }]);

  // AI State
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  
  // Voice State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // AI Logic
  const askCoach = async (deep: boolean = false) => {
    if (!aiMessage && !deep) return;
    setIsAiLoading(true);
    setIsThinking(deep);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const modelName = deep ? "gemini-3.1-pro-preview" : "gemini-3-flash-preview";
      
      const historyContext = workouts.length > 0 
        ? `User's recent workout history: ${JSON.stringify(workouts.slice(0, 5))}`
        : "User has no history yet.";

      const prompt = deep 
        ? `Perform a deep biomechanical and progress analysis based on this history: ${historyContext}. Provide a comprehensive long-term training plan.`
        : `As a gym coach, answer this: ${aiMessage}. Context: ${historyContext}`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: deep ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : undefined
      });

      setAiResponse(response.text || "I'm not sure how to answer that.");
      setAiMessage('');
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("Sorry, I encountered an error. Please check your API key.");
    } finally {
      setIsAiLoading(false);
      setIsThinking(false);
    }
  };

  const generatePoster = async () => {
    setIsAiLoading(true);
    try {
      // Check for API key selection for Imagen models
      if (!(await window.aistudio.hasSelectedApiKey())) {
        await window.aistudio.openSelectKey();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: `A high-quality, cinematic motivational gym poster for ${exerciseList[0] || 'bodybuilding'}, dark atmosphere, neon accents, 8k resolution.` }],
        },
        config: {
          imageConfig: {
            aspectRatio: "9:16",
            imageSize: imageSize
          }
        },
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (error) {
      console.error("Image Gen Error:", error);
      alert("Failed to generate image. Please ensure you have a paid API key selected.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Voice Mode (Simplified Mock for UI/Logic flow)
  const toggleVoice = async () => {
    if (isVoiceActive) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setIsVoiceActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setIsVoiceActive(true);
      setTranscription("Listening...");
      
      // In a real implementation, we would connect to the Live API here.
      // For this demo, we'll simulate a response after 3 seconds.
      setTimeout(() => {
        setTranscription("Coach: 'Keep your back straight and focus on the squeeze!'");
      }, 3000);

    } catch (err) {
      console.error("Mic Error:", err);
      alert("Microphone access denied.");
    }
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
      <header className="p-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            IronTrack
          </h1>
        </div>
        <button 
          onClick={toggleVoice}
          className={cn(
            "p-3 rounded-full transition-all active:scale-95",
            isVoiceActive ? "bg-red-500 shadow-lg shadow-red-900/40" : "bg-slate-800"
          )}
        >
          {isVoiceActive ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-slate-400" />}
        </button>
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

          {activeTab === 'coach' && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* AI Chat Section */}
              <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h2 className="font-bold text-slate-200">AI Coach Assistant</h2>
                </div>
                
                <div className="min-h-[100px] bg-slate-800/30 rounded-2xl p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {isAiLoading ? (
                    <div className="flex items-center gap-2 text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {isThinking ? "Performing Deep Analysis..." : "Coach is thinking..."}
                    </div>
                  ) : aiResponse || "Ask me for advice on your form, routine, or progress!"}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask the coach..."
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && askCoach()}
                    className="flex-1 bg-slate-800 border-none rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button 
                    onClick={() => askCoach()}
                    disabled={isAiLoading}
                    className="p-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>

                <button
                  onClick={() => askCoach(true)}
                  disabled={isAiLoading || workouts.length === 0}
                  className="w-full bg-slate-800 border border-blue-500/30 text-blue-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-500/10 transition-colors"
                >
                  <Brain className="w-5 h-5" />
                  DEEP PROGRESS ANALYSIS
                </button>
              </section>

              {/* Motivation Lab */}
              <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-bold text-slate-200">Motivation Lab</h2>
                  </div>
                  <select 
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as any)}
                    className="bg-slate-800 text-xs font-bold text-slate-400 p-1 rounded border-none outline-none"
                  >
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                    <option value="4K">4K</option>
                  </select>
                </div>

                {generatedImage ? (
                  <div className="relative group">
                    <img src={generatedImage} alt="Motivation" className="w-full rounded-2xl shadow-2xl" />
                    <button 
                      onClick={() => setGeneratedImage(null)}
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="aspect-[9/16] bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                    <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Generate a high-quality motivational poster based on your top exercise.</p>
                  </div>
                )}

                <button
                  onClick={generatePoster}
                  disabled={isAiLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  GENERATE POSTER
                </button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Voice Overlay */}
      <AnimatePresence>
        {isVoiceActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[60] flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative mb-12">
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-32 h-32 bg-blue-500/20 rounded-full absolute -inset-4 blur-2xl"
              />
              <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center relative z-10">
                <Mic className="w-12 h-12 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">Voice Coach Active</h2>
            <p className="text-blue-400 font-medium italic max-w-xs">{transcription}</p>
            <button 
              onClick={toggleVoice}
              className="mt-12 px-8 py-4 bg-slate-800 rounded-2xl font-bold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              END SESSION
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
        <NavButton 
          active={activeTab === 'coach'} 
          onClick={() => setActiveTab('coach')}
          icon={<Sparkles className="w-6 h-6" />}
          label="Coach"
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
