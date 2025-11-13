import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyAxQEbSBtaSwO76yNhHpGst63jWZkqkzxE',
  authDomain: 'potros-632ee.firebaseapp.com',
  projectId: 'potros-632ee',
  storageBucket: 'potros-632ee.firebasestorage.app',
  messagingSenderId: '715399204517',
  appId: '1:715399204517:web:6f82c57e723c47931b074c'
}

// Inicializa Firebase
const app = initializeApp(firebaseConfig)

// Firestore apuntando EXCLUSIVAMENTE a la base de datos 'potros2-202dc'
// getFirestore acepta el databaseId como segundo parámetro
const db = getFirestore(app, 'potros2-202dc')

// Verificar que se está usando la base de datos correcta
console.log('Firestore inicializado con databaseId:', db._databaseId?.database || db._delegate?._databaseId?.database || 'verificando...')

// Storage
const storage = getStorage(app)

export { app, db, storage }
