import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAtGUX2LG4Ua6IQO1Cf9PuMP4GkZ80RA50',
  authDomain: 'newtoros.firebaseapp.com',
  projectId: 'newtoros',
  storageBucket: 'newtoros.firebasestorage.app',
  messagingSenderId: '898581498892',
  appId: '1:898581498892:web:48e49c9bd5a0e15ed8f229'
}

// Inicializa Firebase
const app = initializeApp(firebaseConfig)

// Inicializa Firestore apuntando EXCLUSIVAMENTE a la base de datos 'newtoros'
// Esta base de datos debe existir en Firebase Console
// IMPORTANTE: No hay fallback a la base de datos por defecto
const db = getFirestore(app, 'newtoros')
const auth = getAuth(app)
const storage = getStorage(app)

export { app, auth, db, storage }
