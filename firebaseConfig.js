import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyAtGUX2LG4Ua6IQO1Cf9PuMP4GkZ80RA50",
  authDomain: "toros-1453e.firebaseapp.com",
  projectId: "toros-1453e",
  storageBucket: "toros-1453e.firebasestorage.app",
  messagingSenderId: "898581498892",
  appId: "1:898581498892:web:48e49c9bd5a0e15ed8f229"
};


// Inicializa Firebase
const app = initializeApp(firebaseConfig)

// Firestore apuntando EXCLUSIVAMENTE a la base de datos 'Toros2-202dc'
// getFirestore acepta el databaseId como segundo parámetro
const db = getFirestore(app, 'newtoros')

// Verificar que se está usando la base de datos correcta
console.log('Firestore inicializado con databaseId:', db._databaseId?.database || db._delegate?._databaseId?.database || 'verificando...')

// Storage
const storage = getStorage(app)

export { app, db, storage }
