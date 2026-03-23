import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth'
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics'
import { getFirestore, Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
}

// Global variables
let auth: Auth | undefined
let googleProvider: GoogleAuthProvider | undefined
let analytics: Analytics | undefined
let db_firestore: Firestore | undefined
let isFirebaseInitialized = false

// Only initialize if we have a window (client-side) or a valid API key
if (typeof window !== 'undefined' || (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "")) {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    auth = getAuth(app)
    db_firestore = getFirestore(app)
    googleProvider = new GoogleAuthProvider()
    isFirebaseInitialized = true
    
    // Initialize Analytics safely
    if (typeof window !== 'undefined') {
      isSupported().then(yes => {
        if (yes) analytics = getAnalytics(app)
      })
    }
  } catch (error) {
    console.warn("Firebase initialization failed:", error)
    isFirebaseInitialized = false
  }
}

export { auth, googleProvider, analytics, db_firestore, isFirebaseInitialized }
