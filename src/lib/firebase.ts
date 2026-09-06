import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(rawConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure Firestore is connected to the exact database provisioned for this project
export const db = rawConfig.firestoreDatabaseId
  ? getFirestore(app, rawConfig.firestoreDatabaseId)
  : getFirestore(app);

export const firebaseConfig = rawConfig;
