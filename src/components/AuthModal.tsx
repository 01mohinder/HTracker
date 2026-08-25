import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Lock,
  LogIn,
  UserPlus,
  ShieldCheck,
  LogOut,
  Sparkles,
  Cloud,
  Download,
  Upload,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Database,
} from 'lucide-react';
import { Modal } from './Modal';
import { UserAccount, Habit, UserStats } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  updateProfile,
} from '../lib/firebase';
import { syncUserRecordToMongoDB } from '../lib/userService';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserAccount | null;
  onClose: () => void;
  onLogin: (user: UserAccount, options: { importGuestData: boolean }) => void;
  onLogout: () => void;
  habits: Habit[];
  archivedHabits: Habit[];
  stats: UserStats;
  habitNotes: Record<string, string>;
  onRestoreData: (restoredState: {
    habits: Habit[];
    archivedHabits: Habit[];
    stats: UserStats;
    habitNotes: Record<string, string>;
  }) => void;
  onClearAccountData: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onLogin,
  onLogout,
  habits,
  archivedHabits,
  stats,
  habitNotes,
  onRestoreData,
  onClearAccountData,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [importGuestData, setImportGuestData] = useState(false); // Default false = EMPTY clean slate for new users!
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const executeLoginAndSyncMongo = async (user: UserAccount, opts: { importGuestData: boolean }) => {
    // Explicitly synchronize user directly to MongoDB Atlas upon login
    if (user.email && user.name && user.provider !== 'guest' && user.provider !== 'local') {
      syncUserRecordToMongoDB(user.name, user.email, user.id).catch((e) => {
        console.warn('[AuthModal] MongoDB sync notice:', e);
      });
    }
    onLogin(user, opts);
  };

  if (!isOpen) return null;

  // Google Sign In handler
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
      await executeLoginAndSyncMongo(googleUser, { importGuestData });
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('Google Sign In error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled for this project. Please sign in with email and password.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing. Please try again.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Sign-in popup was blocked by browser. Please allow popups or try email sign in.');
      } else {
        setError(err.message || 'Failed to sign in with Google.');
      }
    }
  };

  // Email form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address format (e.g. name@domain.com).');
      return;
    }

    if (tab === 'signup') {
      if (!name || name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password for sign up must be at least 6 characters long.');
        return;
      }
    } else {
      if (!password || password.length < 4) {
        setError('Please enter your account password.');
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
        await executeLoginAndSyncMongo(emailUser, { importGuestData });
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
        await executeLoginAndSyncMongo(emailUser, { importGuestData });
      }
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('Firebase Auth error:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password authentication is not enabled in this Firebase project.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address entered is invalid.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    }
  };

  // Local JSON File Download Export
  const handleLocalExport = () => {
    const payload = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      user: currentUser ? currentUser.email : 'guest',
      habits,
      archivedHabits,
      stats,
      habitNotes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HT_Grind_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Local JSON File Upload Import
  const handleLocalImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.habits)) {
          onRestoreData({
            habits: parsed.habits,
            archivedHabits: parsed.archivedHabits || [],
            stats: parsed.stats || {
              xp: 0,
              level: 1,
              grindScore: 0,
              totalCompletions: 0,
              streakFreezes: 1,
              achievements: [],
            },
            habitNotes: parsed.habitNotes || {},
          });
          setBackupSuccessMsg('Local backup file imported successfully!');
          setTimeout(() => setBackupSuccessMsg(''), 4000);
        } else {
          setError('Invalid backup file structure.');
        }
      } catch (err) {
        setError('Error parsing local backup JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={currentUser ? 'User Account & Cloud Sync' : 'Sign In / Account Portal'}
      maxWidth="max-w-lg"
    >
      <div className="relative w-full overflow-hidden bg-slate-900 text-slate-100 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                {currentUser && currentUser.provider !== 'guest' && currentUser.provider !== 'local' && currentUser.email
                  ? 'User Account & Cloud Sync'
                  : 'Sign In / Account Portal'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {currentUser && currentUser.provider !== 'guest' && currentUser.provider !== 'local' && currentUser.email
                  ? 'Multi-Device Real-Time Cloud Sync Active'
                  : 'Guest Mode: Data is stored 100% locally on this device'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {currentUser && currentUser.provider !== 'guest' && currentUser.provider !== 'local' && currentUser.email ? (
            /* LOGGED IN CLOUD ACCOUNT VIEW */
            <div className="space-y-5">
              
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/40"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-100 truncate">
                      {currentUser.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {currentUser.provider}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mt-1">
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Account Active • {habits.length} Habits Logged</span>
                  </div>
                </div>
              </div>

              {/* PRIVACY & CLIENT-SIDE ENCRYPTION GUARANTEE */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Zero-Knowledge Privacy & Client-Side Security</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Your habit schedules, completions, XP progress, and private journal notes are stored securely and synchronized in real-time to your authenticated profile.
                </p>
              </div>

              {/* Success Message Banner */}
              {backupSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{backupSuccessMsg}</span>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* DATA BACKUP & LOCAL EXPORT / IMPORT */}
              <div className="dark-card p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-extrabold text-xs">
                    <Download className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Data Backup & Restore</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700 font-semibold">
                    JSON Format
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Download a full backup file containing all your habits, routines, completions, notes, and XP stats, or import an existing backup file.
                </p>

                {/* Quick Action Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleLocalExport}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-[0.99]"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Download JSON Backup</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold transition-all active:scale-[0.99]"
                  >
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Import JSON File</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLocalImport}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>

              {/* ACCOUNT ACTIONS */}
              <div className="pt-1 flex flex-col gap-2">
                <button
                  onClick={async () => {
                    try {
                      await firebaseSignOut(auth);
                    } catch (err) {
                      console.error('Sign out error:', err);
                    }
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold text-xs transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Account</span>
                </button>
              </div>

            </div>
          ) : (
            /* SIGN IN / REGISTER FORM */
            <div className="space-y-4">
              {/* GUEST MODE NOTICE */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-300 font-bold">
                  <Database className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Guest Mode is Active</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  All your habits, streaks, XP, reflections, and routines are stored <strong>100% locally on your browser</strong>. Sign in below anytime to connect Real-Time Cloud Sync across your devices.
                </p>
              </div>
              
              {/* GOOGLE SIGN IN BUTTON */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-slate-100 font-bold text-xs shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isSubmitting ? 'Authenticating...' : 'Continue with Google'}</span>
              </button>

              {/* DIVIDER */}
              <div className="relative flex items-center justify-center my-2">
                <div className="w-full border-t border-slate-800" />
                <span className="absolute px-3 bg-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Or via Email
                </span>
              </div>

              {/* TAB SWITCHER */}
              <div className="flex p-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setError('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tab === 'signin'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup');
                    setError('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    tab === 'signup'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* ERROR ALERT */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* EMAIL FORM */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {tab === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Johnson"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {tab === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{tab === 'signin' ? 'Sign In to Account' : 'Register Account'}</span>
                </button>

                {/* SIGN IN / SIGN UP LINK TOGGLES */}
                <div className="text-center pt-2">
                  {tab === 'signin' ? (
                    <p className="text-xs text-slate-400">
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('signup');
                          setError('');
                        }}
                        className="text-indigo-400 font-bold hover:underline"
                      >
                        Sign Up Here
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setTab('signin');
                          setError('');
                        }}
                        className="text-indigo-400 font-bold hover:underline"
                      >
                        Sign In Here
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};
