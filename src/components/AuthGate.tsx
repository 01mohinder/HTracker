import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Flame,
  Download,
} from 'lucide-react';
import { UserAccount } from '../types';
import { syncUserRecordToMongoDB } from '../lib/userService';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from '../lib/firebase';

interface AuthGateProps {
  onLogin: (user: UserAccount, options: { importGuestData: boolean }) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configure Google Provider to force account selection for security
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  const executeLoginAndSyncMongo = async (user: UserAccount) => {
    try {
      const synced = await syncUserRecordToMongoDB(user.name, user.email);
      const enrichedUser: UserAccount = {
        ...user,
        returningVisitors: synced.returningVisitors,
        dateOfFirstJoin: synced.dateOfFirstJoin || user.createdAt,
      };
      onLogin(enrichedUser, { importGuestData: false });
    } catch (err) {
      onLogin(user, { importGuestData: false });
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const gName = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
      const googleUser: UserAccount = {
        id: fbUser.uid,
        email: fbUser.email || '',
        name: gName,
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(gName)}`,
        provider: 'google',
        createdAt: new Date().toISOString(),
      };
      setIsSubmitting(false);
      await executeLoginAndSyncMongo(googleUser);
    } catch (err: any) {
      setIsSubmitting(false);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled for this project. Please sign in with email and password.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign-in popup was closed before completion.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup was blocked by browser. Please allow popups or use email sign-in.');
      } else {
        console.warn('Google Sign In notice:', err.message || err);
        setError(err.message || 'Failed to sign in with Google.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (tab === 'signup') {
      if (!name || name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
    } else {
      if (!password || password.length < 4) {
        setError('Please enter your password.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (tab === 'signup') {
        const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = res.user;
        if (name) {
          await updateProfile(fbUser, { displayName: name });
        }
        const displayName = name || email.split('@')[0];
        const emailUser: UserAccount = {
          id: fbUser.uid,
          email: fbUser.email || email,
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          provider: 'email',
          createdAt: new Date().toISOString(),
        };
        setIsSubmitting(false);
        await executeLoginAndSyncMongo(emailUser);
      } else {
        const res = await signInWithEmailAndPassword(auth, email.trim(), password);
        const fbUser = res.user;
        const displayName = fbUser.displayName || email.split('@')[0];
        const emailUser: UserAccount = {
          id: fbUser.uid,
          email: fbUser.email || email,
          name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
          avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`,
          provider: 'email',
          createdAt: new Date().toISOString(),
        };
        setIsSubmitting(false);
        await executeLoginAndSyncMongo(emailUser);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password authentication is not enabled in this Firebase project.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid credentials. Please check your email and password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Minimum 6 characters required.');
      } else {
        console.warn('Authentication notice:', err.message || err);
        setError(err.message || 'Authentication failed. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-4 overflow-y-auto">
      <div className="w-full max-w-4xl my-auto grid grid-cols-1 md:grid-cols-12 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Branding Panel */}
        <div className="md:col-span-5 p-6 sm:p-8 dark-surface bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Flame className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-wider flex items-center gap-1.5">
                  HT GRIND
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                    PRO
                  </span>
                </h1>
                <p className="text-xs text-slate-300 font-medium">Habit Mastery & Daily Performance</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Mandatory Security Guard</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sign in required to access your habit tracking dashboard, stats, AI coach, and custom routines.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Real-time Google Cloud & Local Device Sync</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Gemini 3.6 AI Coach & Suggested Habit Additions</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                  <Download className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Instant JSON Data Backup & Seamless Export/Import</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                  <BarChart3 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Advanced Grind Score & Streak Protection</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-slate-800/80 mt-6">
            <p className="text-[10px] text-slate-400 font-mono">
              Protected by Firebase Authentication & Encrypted Cloud Infrastructure
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-6 sm:p-8 bg-slate-900 flex flex-col justify-center space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 dark:text-white tracking-tight">
              {tab === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {tab === 'signin'
                ? 'Sign in to access your personal habits and progress'
                : 'Register your account to unlock full HT GRIND features'}
            </p>
          </div>

          {/* Google 1-Click Sign-In (Primary & Secure) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-white font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/20 active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.1 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.1-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span className="text-white">Continue securely with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[10px] font-mono text-slate-400 uppercase tracking-widest shrink-0">
              OR USE EMAIL
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{tab === 'signin' ? 'Sign In to HT GRIND' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Tab */}
          <div className="text-center pt-3 border-t border-slate-800/60 space-y-2.5">
            <p className="text-xs text-slate-400">
              {tab === 'signin' ? "Don't have an account?" : 'Already registered?'}
              <button
                type="button"
                onClick={() => {
                  setTab(tab === 'signin' ? 'signup' : 'signin');
                  setError('');
                }}
                className="ml-2 font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              >
                {tab === 'signin' ? 'Register Now' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
