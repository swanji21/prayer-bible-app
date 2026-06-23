import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBa8JISkQUN3gp0V2BMDdxUZQPh-s3QRcQ",
  authDomain: "prayer-bible-app.firebaseapp.com",
  projectId: "prayer-bible-app",
  storageBucket: "prayer-bible-app.firebasestorage.app",
  messagingSenderId: "727713955623",
  appId: "1:727713955623:web:24963674e220f847e8f302"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)