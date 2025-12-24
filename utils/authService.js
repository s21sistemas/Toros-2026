import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { setSessionUser } from './session';

const USERS = 'usuarios';
const TOKENS = 'tokens';

export async function loginWithAccessCode(email, accessCode, options = {}) {
  const q = query(
    collection(db, USERS),
    where('correo', '==', email),
    where('codigo_acceso', '==', accessCode)
  );
  console.log('q', q);
  const snap = await getDocs(q);
  console.log('snap', snap);
  if (snap.empty) {
    throw new Error('Correo o código de acceso incorrectos.');
  }
  const d = snap.docs[0];
  const user = { id: d.id, ...d.data() };
  console.log('user', user);
  if (!options.skipSession) {
    await setSessionUser({ uid: user.id, email: user.correo, nombre_completo: user.nombre_completo || '' });
  }
  return user;
}

export async function userHasActivation(userId) {
  const q = query(collection(db, TOKENS), where('usuario_activador_id', '==', userId));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function activateWithToken({ userId, userName, token }) {
  // Normalizar token (mayúsculas y sin espacios)
  const normalizedToken = token.trim().toUpperCase();
  console.log('Buscando token:', normalizedToken);
  console.log('Base de datos:', db._databaseId?.database || db._delegate?._databaseId?.database || '(default)');
  
  // Primero buscar solo por token para verificar conexión
  const qToken = query(
    collection(db, TOKENS),
    where('token', '==', normalizedToken)
  );
  const snapToken = await getDocs(qToken);
  console.log('Búsqueda solo por token:', {
    empty: snapToken.empty,
    size: snapToken.size,
    docs: snapToken.docs.map(d => ({ id: d.id, token: d.data().token, status: d.data().status }))
  });
  
  // Si no encuentra nada por token, el token no existe
  if (snapToken.empty) {
    throw new Error('Token no encontrado. Verifica que el token sea correcto.');
  }
  
  // Filtrar por status en memoria si es necesario
  const activeTokens = snapToken.docs.filter(doc => {
    const data = doc.data();
    return data.status === 'activo';
  });
  
  console.log('Tokens activos encontrados:', activeTokens.length);
  
  if (activeTokens.length === 0) {
    // Verificar si el token existe pero está usado
    const usedTokens = snapToken.docs.filter(doc => doc.data().status === 'usado');
    if (usedTokens.length > 0) {
      throw new Error('Este token ya fue utilizado.');
    }
    throw new Error('Token inválido o inactivo.');
  }
  
  const tokenDoc = activeTokens[0];
  const tokenData = tokenDoc.data();
  
  // Verificar que el token no esté ya asignado a otro usuario
  if (tokenData.usuario_activador_id && tokenData.usuario_activador_id !== userId) {
    throw new Error('Este token ya fue utilizado por otro usuario.');
  }
  
  const ref = doc(db, TOKENS, tokenDoc.id);
  await updateDoc(ref, {
    usuario_activador_id: userId,
    usuario_activador_nombre: userName || '',
    status: 'usado',
    fecha_activacion: serverTimestamp(),
  });
  
  console.log('Token activado exitosamente');
  return tokenDoc.id;
}

export async function registerUser({ nombreCompleto, correo, telefono, ocupacion, codigoAcceso }) {
  const payload = {
    nombre_completo: nombreCompleto,
    correo,
    celular: telefono || '',
    ocupacion: ocupacion || '',
    codigo_acceso: codigoAcceso,
    fecha_registro: new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, USERS), payload);
  // set uid/rol_id fields to doc id for compatibility
  await updateDoc(ref, { uid: ref.id, rol_id: ref.id, id: ref.id });
  return { id: ref.id, ...payload };
}

export async function sendTorosPasswordResetEmail(correo) {
  const url = 'https://test.prostafsse.ngrok.app/sendTorosPasswordResetEmail';

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ correo }),
  });

  // Aunque el backend debería responder JSON siempre, manejamos casos raros
  let data;
  try {
    data = await resp.json();
  } catch (_) {
    data = null;
  }

  if (!resp.ok) {
    const message = data?.message || 'Ocurrió un error al solicitar la recuperación de contraseña.';
    const err = new Error(message);
    err.data = data;
    err.status = resp.status;
    throw err;
  }

  // Esperado: { ok: boolean, message: string }
  return data || { ok: false, message: 'Respuesta inválida del servidor.' };
}


