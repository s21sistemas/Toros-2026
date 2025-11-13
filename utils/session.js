import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'sessionUser';
// Implementación mínima de emisor compatible con React Native (sin 'events')
const listeners = new Set();

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(AUTH_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function onAuthStateChanged(callback) {
  // Emitir estado actual de forma asíncrona
  setTimeout(async () => {
    const user = await getCurrentUser();
    callback(user);
  }, 0);
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function setSessionUser(user) {
  if (user) {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(AUTH_KEY);
  }
  // Notificar a todos los suscriptores
  for (const cb of listeners) {
    try {
      cb(user || null);
    } catch {
      // ignorar errores de callbacks
    }
  }
}

export async function signOut() {
  await setSessionUser(null);
}


