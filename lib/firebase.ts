import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
}

// Global variables for auth and app
let auth: Auth
let googleProvider: GoogleAuthProvider

// Only initialize if we have an API key, otherwise we provide a proxy/shell to avoid build-time crashes
if (typeof window !== 'undefined' || (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "")) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
  } catch (error) {
    console.warn("Firebase initialization failed:", error)
    // Fallback for build process
    auth = {} as Auth
    googleProvider = {} as GoogleAuthProvider
  }
} else {
  // Fallback for build process
  auth = {} as Auth
  googleProvider = {} as GoogleAuthProvider
}

export { auth, googleProvider }
