import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// All-or-nothing config validation: never mix fields from different projects
const metaEnv = (import.meta as any).env || {};
const hasEnvConfig = Boolean(metaEnv.VITE_FIREBASE_API_KEY && metaEnv.VITE_FIREBASE_PROJECT_ID);

let activeConfig: Record<string, any>;
if (hasEnvConfig) {
  activeConfig = {
    apiKey: metaEnv.VITE_FIREBASE_API_KEY,
    authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
    storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || `${metaEnv.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
    messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: metaEnv.VITE_FIREBASE_APP_ID || '',
  };
} else {
  activeConfig = {
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  };
}

const app = !getApps().length ? initializeApp(activeConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
try {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch {
  // Ignore
}

// Read firestore database ID from env first, then fallback to config
const cfg = firebaseConfig as any;
const rawDbId = metaEnv.VITE_FIREBASE_DATABASE_ID || metaEnv.VITE_FIRESTORE_DATABASE_ID || cfg.firestoreDatabaseId;
const dbId = rawDbId && rawDbId !== '(default)' ? rawDbId : undefined;

// Enable persistent offline cache for reliable PWA write queue and multi-tab sync with graceful fallback
function initDb() {
  try {
    const firestoreSettings = {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    };
    return dbId
      ? initializeFirestore(app, firestoreSettings, dbId)
      : initializeFirestore(app, firestoreSettings);
  } catch (primaryErr) {
    try {
      return dbId ? getFirestore(app, dbId) : getFirestore(app);
    } catch (fallbackErr) {
      console.warn('[Firebase] Firestore init notice:', fallbackErr);
      return getFirestore(app);
    }
  }
}

export const db = initDb();
export const storage = getStorage(app);

export { 
  GoogleAuthProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  firebaseSignOut, 
  onAuthStateChanged,
  updateProfile,
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL
};
export type { FirebaseUser };


