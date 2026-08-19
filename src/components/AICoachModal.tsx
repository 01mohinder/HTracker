import React from 'react';
import { Habit, UserStats } from '../types';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  MessageSquare, 
  Paperclip, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  Zap, 
  Brain, 
  Smile, 
  Image as ImageIcon 
} from 'lucide-react';
import Markdown from 'react-markdown';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  attachmentName?: string;
  recommendedHabits?: Array<{
    name: string;
    category: any;
    icon: string;
    goal: number;
  }>;
}

interface AICoachModalProps {
  isOpen: boolean;
  habits: Habit[];
  stats: UserStats;
  onClose: () => void;
  onAddHabitFromAI: (name: string, category: any, icon: string, goal: number) => void;
}

const SUGGESTED_QUESTIONS = [
  "🔍 Analyze my habit consistency & grind score",
  "🌅 How can I optimize my morning routine?",
  "⚡ What habits should I stack for maximum productivity?",
  "🛡️ How do I stay consistent on low energy days?",
];

export const AICoachModal: React.FC<AICoachModalProps> = ({
  isOpen,
  habits,
  stats,
  onClose,
  onAddHabitFromAI,
}) => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [coachMode, setCoachMode] = React.useState<'high-performance' | 'neuroscience' | 'mindful'>('high-performance');
  const [attachedImage, setAttachedImage] = React.useState<{ name: string; base64: string } | null>(null);
  const [addedHabits, setAddedHabits] = React.useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = React.useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = React.useState<string | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleAddHabit = (name: string, category: any, icon: string, goal: number, itemKey: string) => {
    onAddHabitFromAI(name, category, icon, goal);
    setAddedHabits((prev) => ({ ...prev, [itemKey]: true }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (isOpen && messages.length === 0) {
      handleSendMessage('Analyze my current habit tracker and grind score');
    }
  }, [isOpen]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (e.g. screenshot of schedule or note).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage({
        name: file.name,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSpeech = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown tags for speech
    const cleanText = text.replace(/[#*`_~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  if (!isOpen) return null;

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || userQuery.trim();
    if ((!textToSend && !attachedImage) || loading) return;

    const currentImage = attachedImage;
    const userMsg: ChatMessage = {
      id: Date.now() + '_user',
      sender: 'user',
      text: textToSend || 'Analyzing attached document/schedule',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: currentImage?.name,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setUserQuery('');
    setAttachedImage(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/habit-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habits: habits.map((h) => ({
            name: h.name,
            category: h.category,
            goal: h.goal,
            completionsCount: Object.values(h.completions || {}).reduce((a, b) => a + b, 0),
          })),
          userStats: stats,
          userQuery: textToSend,
          coachMode: coachMode,
          imageBase64: currentImage?.base64,
        }),
      });

      let data: any = null;
      if (res.ok) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!data || !data.advice) {
        const lower = (textToSend || '').toLowerCase();
        let fallbackAdvice = `### 💡 High-Momentum Grind Strategy\n\n- **Anchor Habit Stacking**: Pair your toughest daily task directly after an established routine.\n- **Protect Your Streak**: Never miss two days in a row to preserve neural wiring.\n- **Aim for 1% Daily Improvement**: Small wins compound into extraordinary results.`;
        let fallbackRecs = [
          { name: '10m Focus Sprint', category: 'Productivity', icon: '⚡', goal: 5 },
          { name: 'Hydration 2L', category: 'Health', icon: '💧', goal: 7 },
          { name: 'Evening Win Log', category: 'Mind', icon: '📓', goal: 7 }
        ];

        if (lower.includes('morning') || lower.includes('wake')) {
          fallbackAdvice = `### 🌅 Morning Routine Calibration\n\n1. **Immediate Sunlight & Hydration**: Drink 500ml water and view natural light within 15 minutes.\n2. **Zero Phone for 30m**: Delay notifications to keep cortisol and focus balanced.\n3. **Identify Top Priority**: Complete your single hardest task first.`;
          fallbackRecs = [
            { name: 'Morning Sunlight & Water', category: 'Health', icon: '🌅', goal: 7 },
            { name: 'Top Priority Deep Work', category: 'Productivity', icon: '💻', goal: 5 },
            { name: '5m Daily Stretch', category: 'Fitness', icon: '🧘', goal: 7 }
          ];
        }

        data = {
          advice: fallbackAdvice,
          recommendedHabits: fallbackRecs
        };
      }

      const aiMsg: ChatMessage = {
        id: Date.now() + '_ai',
        sender: 'ai',
        text: data.advice,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedHabits: data.recommendedHabits || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      console.warn('AI Coach Fallback activated:', e);
      const errorMsg: ChatMessage = {
        id: Date.now() + '_ai_err',
        sender: 'ai',
        text: '### 💡 Consistency Coaching Strategy\n- **Habit Stacking**: Connect new habits to existing daily triggers (e.g. 5 minutes of reading right after morning coffee).\n- **Friction Reduction**: Prepare your tools and environment the night before.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedHabits: [
          { name: 'Hydration 2L', category: 'Health', icon: '💧', goal: 7 },
          { name: '15m Daily Reading', category: 'Learning', icon: '📚', goal: 5 },
          { name: 'Evening Reflection', category: 'Mind', icon: '🌙', goal: 7 }
        ]
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-[88vh] rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="p-4 px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-amber-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                HT GRIND AI COACH PRO
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  Gemini 3.6
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Personalized habit strategy, routine neuroscience & multi-modal analysis
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Mode Selector Pill */}
            <div className="p-1 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setCoachMode('high-performance')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                  coachMode === 'high-performance'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="High Performance Strategy"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="hidden md:inline">Tactical</span>
              </button>
              <button
                onClick={() => setCoachMode('neuroscience')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                  coachMode === 'neuroscience'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Neuroscience & Habit Loops"
              >
                <Brain className="w-3 h-3 text-purple-300" />
                <span className="hidden md:inline">Neuro</span>
              </button>
              <button
                onClick={() => setCoachMode('mindful')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                  coachMode === 'mindful'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Mindful & Sustainable Growth"
              >
                <Smile className="w-3 h-3 text-emerald-300" />
                <span className="hidden md:inline">Mindful</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 border shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gradient-to-br from-purple-900 to-slate-900 border-purple-500/40 text-purple-300'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-400" />}
              </div>

              {/* Chat Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-none shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-800/80 border border-slate-700/80 text-slate-200 rounded-tl-none space-y-3'
                }`}
              >
                {msg.attachmentName && (
                  <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center gap-2 text-[11px] font-mono text-indigo-200">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="truncate">{msg.attachmentName}</span>
                  </div>
                )}

                {msg.sender === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="prose prose-invert prose-xs max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}

                {/* Recommended Habits Add Action Cards */}
                {msg.recommendedHabits && msg.recommendedHabits.length > 0 && (
                  <div className="pt-3 border-t border-slate-700/60 space-y-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Coach Suggested Habit Additions</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.recommendedHabits.map((rec, i) => {
                        const itemKey = `${msg.id}_${i}_${rec.name}`;
                        const isAdded = addedHabits[itemKey] || habits.some((h) => h.name.toLowerCase() === rec.name.toLowerCase());

                        return (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 flex items-center justify-between gap-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xl shrink-0">{rec.icon}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-200 truncate">{rec.name}</p>
                                <p className="text-[10px] text-slate-400">{rec.category} • {rec.goal}x/wk</p>
                              </div>
                            </div>

                            {isAdded ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Added</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAddHabit(rec.name, rec.category, rec.icon, rec.goal, itemKey)}
                                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm active:scale-95"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Controls for AI Message (Copy & Voice Audio) */}
                <div className={`flex items-center justify-between text-[10px] font-mono mt-2 pt-2 ${
                  msg.sender === 'user' ? 'border-t border-indigo-500/30 text-indigo-200' : 'border-t border-slate-700/50 text-slate-400'
                }`}>
                  <span>{msg.timestamp}</span>

                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        className="hover:text-indigo-300 transition-colors flex items-center gap-1"
                        title="Copy Response"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleSpeech(msg.id, msg.text)}
                        className={`hover:text-amber-300 transition-colors flex items-center gap-1 ${
                          speakingMsgId === msg.id ? 'text-amber-400 font-bold animate-pulse' : ''
                        }`}
                        title="Listen to AI Coach"
                      >
                        {speakingMsgId === msg.id ? (
                          <>
                            <VolumeX className="w-3 h-3 text-amber-400" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-amber-400 animate-bounce" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                <span>HT GRIND AI Coach is compiling custom neuroscience & habit advice...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 relative z-10">
          <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-indigo-400" /> Quick Prompts:
          </span>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium whitespace-nowrap transition-all active:scale-95 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900 shrink-0 relative z-20">
          {attachedImage && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-between text-xs text-indigo-200">
              <div className="flex items-center gap-2 truncate">
                <Paperclip className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Attached: {attachedImage.name}</span>
              </div>
              <button
                onClick={() => setAttachedImage(null)}
                className="p-1 rounded-lg hover:bg-indigo-900 text-indigo-300 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all active:scale-95 shrink-0"
              title="Attach schedule or note image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask AI Coach anything (e.g. How to maintain momentum during busy exams?)"
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              data-lpignore="true"
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />

            <button
              type="submit"
              disabled={(!userQuery.trim() && !attachedImage) || loading}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2 shrink-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

