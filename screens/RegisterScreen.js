
import React, { useState } from 'react';
import { 
View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebaseConfig';
import { theme } from '../utils/theme';
import { registerUser, activateWithToken } from '../utils/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
//b51f28
const RegisterScreen = ({ navigation }) => {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ocupacion, setOcupacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    nombreCompleto: '',
    correo: '',
    telefono: '',
    ocupacion: '',
    tokenActivacion: '',
  });
  const [tokenActivacion, setTokenActivacion] = useState('');

  const showAlert = (title, message, isSuccess = false) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(
        title,
        message,
        [
          { 
            text: 'OK', 
            onPress: () => {
              if (isSuccess) {
                navigation.navigate('Login');
              }
            }
          }
        ]
      );
    }
  };

  // Función para traducir errores de Firebase
  const translateFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'El correo electrónico ya está registrado. ¿Ya tienes una cuenta?';
      case 'auth/invalid-email':
        return 'El formato del correo electrónico no es válido.';
      case 'auth/weak-password':
        return 'La contraseña generada no es segura. Por favor, inténtalo de nuevo.';
      case 'auth/network-request-failed':
        return 'Problema de conexión a internet. Verifica tu conexión.';
      default:
        return 'Ocurrió un error al registrar. Por favor, inténtalo de nuevo.';
    }
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { nombreCompleto: '', correo: '', telefono: '', ocupacion: '', tokenActivacion: '' };

    if (!nombreCompleto.trim()) {
      newErrors.nombreCompleto = 'El nombre completo es obligatorio.';
      isValid = false;
    }

    if (!correo.trim()) {
      newErrors.correo = 'El correo es obligatorio.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(correo)) {
      newErrors.correo = 'El correo no es válido.';
      isValid = false;
    }

    if (!tokenActivacion.trim()) {
      newErrors.tokenActivacion = 'El token de activación es obligatorio.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const isCodeUnique = async (code) => {
    const q = query(collection(db, 'usuarios'), where('codigo_acceso', '==', code));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  // Función para construir el HTML del correo
  const buildEmailHtml = (code, uid) => {
    const sistemaUrl = `https://sistem.clubpotros.mx/subir-documentos?uid=${encodeURIComponent(uid)}`;
    const subirDocsUrl = `https://sistem.clubpotros.mx/subir-documentos?uid=${encodeURIComponent(uid)}`;

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; background:#f7f7f7; padding:24px; color:#222;">
        <div style="max-width:720px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06)">
          <div style="background:#b30d1b; color:#fff; text-align:center; padding:28px 16px; font-size:28px; font-weight:700;">¡Pre-registro exitoso!</div>
          <div style="padding:24px 28px;">
            <h2 style="margin:0 0 8px 0; font-size:22px;">Bienvenido(a)</h2>
            <p style="margin:0 0 16px 0; line-height:1.5;">
              Gracias por completar su pre-registro. Hemos guardado sus datos correctamente y estamos emocionados de tenerle con nosotros.
            </p>
            <div style="margin:24px 0; border:1px solid #e6e6e6; border-radius:8px; padding:18px; text-align:center;">
              <div style="font-weight:700; color:#b30d1b; margin-bottom:8px;">Su código de acceso</div>
              <div style="display:inline-block; padding:12px 20px; border:2px dashed #b30d1b; border-radius:6px; font-size:24px; letter-spacing:2px; font-weight:700;">${code}</div>
              <p style="margin:10px 0 0 0; color:#666; font-size:12px;">Este código es confidencial, no lo comparta con nadie.</p>
            </div>
            <div style="margin:24px 0; background:#f5f7f6; border-left:6px solid #2d7a33; border-radius:8px; padding:22px;">
              <div style="text-align:center; font-size:26px; font-weight:800; color:#207a31; margin-bottom:8px;">Completa tu inscripción</div>
              <p style="margin:0 0 16px 0; text-align:center; color:#333;">Para finalizar el proceso y ser parte oficial del club, necesitamos que subas los siguientes documentos:</p>
              <div style="max-width:640px; margin:0 auto;">
                <div style="display:flex; align-items:flex-start; gap:10px; margin:10px 0;">
                  <div style="min-width:28px; height:28px; border-radius:50%; background:#2d7a33; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">1</div>
                  <div style="color:#222;">Identificación oficial (INE o pasaporte)</div>
                </div>
                <div style="display:flex; align-items:flex-start; gap:10px; margin:10px 0;">
                  <div style="min-width:28px; height:28px; border-radius:50%; background:#2d7a33; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">2</div>
                  <div style="color:#222;">Comprobante de domicilio</div>
                </div>
                <div style="display:flex; align-items:flex-start; gap:10px; margin:10px 0;">
                  <div style="min-width:28px; height:28px; border-radius:50%; background:#2d7a33; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center;">3</div>
                  <div style="color:#222;">Documentación adicional requerida</div>
                </div>
              </div>
              <div style="text-align:center; margin-top:18px;">
                <a href="${subirDocsUrl}" style="display:inline-block; padding:12px 22px; background:#2d7a33; color:#fff; text-decoration:none; font-weight:700; border-radius:6px;">Subir Documentos</a>
                <div style="margin-top:10px; color:#6b7280; font-size:13px;">Recuerda hacerlo a la brevedad posible</div>
              </div>
            </div>
            <div style="text-align:center; margin:24px 0 12px;">
              <a href="${sistemaUrl}" style="display:inline-block; margin:8px; padding:12px 18px; background:#b30d1b; color:#fff; text-decoration:none; font-weight:600; border-radius:6px;">Iniciar Sesión</a>
              <a href="${subirDocsUrl}" style="display:inline-block; margin:8px; padding:12px 18px; background:#2d7a33; color:#fff; text-decoration:none; font-weight:600; border-radius:6px;">Subir Documentos</a>
            </div>
            <div style="margin-top:24px; color:#666; font-size:14px;">
              Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.
            </div>
            <div style="margin-top:16px; color:#b30d1b; font-weight:700;">Equipo de soporte Club Potros</div>
          </div>
          <div style="background:#2f2f2f; color:#fff; text-align:center; padding:16px; font-size:12px;">
            © 2025 <strong>Club Potros</strong>. Todos los derechos reservados.<br/>
            <a href="mailto:info@clubpotros.mx" style="color:#fff; text-decoration:none;">info@clubpotros.mx</a> | <a href="tel:+528120039628" style="color:#fff; text-decoration:none;">8120039628</a>
          </div>
        </div>
      </div>
    `;
  };

  // Función para enviar correo usando el cliente nativo
  const sendEmailNative = async (email, code, uid) => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        // Si no hay cliente de correo, mostrar el código en pantalla
        Alert.alert(
          'Código de acceso',
          `Tu código de acceso es: ${code}\n\nGuarda este código de forma segura.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const html = buildEmailHtml(code, uid);
      const subject = 'Tu código de acceso a Club Potros - Completa tu inscripción';
      
      // Texto plano alternativo (para clientes que no soportan HTML)
      const bodyText = `¡Pre-registro exitoso!

Bienvenido(a)

Gracias por completar su pre-registro. Hemos guardado sus datos correctamente y estamos emocionados de tenerle con nosotros.

Su código de acceso: ${code}

Este código es confidencial, no lo comparta con nadie.

Completa tu inscripción:
Para finalizar el proceso y ser parte oficial del club, necesitamos que subas los siguientes documentos:
1. Identificación oficial (INE o pasaporte)
2. Comprobante de domicilio
3. Documentación adicional requerida

Visita: https://sistem.clubpotros.mx/subir-documentos?uid=${uid}

Equipo de soporte Club Potros
info@clubpotros.mx | 8120039628`;

      await MailComposer.composeAsync({
        recipients: [email],
        subject: subject,
        body: bodyText,
        isHtml: true,
        htmlBody: html,
      });
    } catch (error) {
      console.error('Error al abrir cliente de correo:', error);
      // Si falla, mostrar el código en pantalla
      Alert.alert(
        'Código de acceso',
        `Tu código de acceso es: ${code}\n\nGuarda este código de forma segura.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Generar un código único
      let codigoAcceso;
      let isUnique = false;
      let intentos = 0;
      const maxIntentos = 5;

      while (!isUnique && intentos < maxIntentos) {
        codigoAcceso = generateRandomCode();
        isUnique = await isCodeUnique(codigoAcceso);
        intentos++;
      }

      if (!isUnique) {
        throw new Error('No se pudo generar un código único. Por favor, inténtalo de nuevo.');
      }

      // Mostrar feedback visual
      Alert.alert(
        'Registrando usuario',
        'Estamos creando tu cuenta. Por favor espera...',
        [],
        { cancelable: false }
      );

      // Crear usuario en nuestra colección (sin Firebase Auth)
      const created = await registerUser({
        nombreCompleto,
        correo,
        telefono,
        ocupacion,
        codigoAcceso,
      });

      // Activar con token (obligatorio)
      try {
        await activateWithToken({ userId: created.id, userName: nombreCompleto, token: tokenActivacion.trim() });
      } catch (e) {
        console.error('Error al activar token:', e?.message);
        throw new Error(e?.message || 'El token de activación no es válido. Verifica que el token sea correcto.');
      }
    
      // Abrir cliente de correo nativo para enviar el código
      await sendEmailNative(correo, codigoAcceso, created.id);
    
      // Éxito - mostrar mensaje y redirigir
      showAlert(
        '¡Registro exitoso!', 
        `Usuario registrado correctamente. Se abrirá tu cliente de correo para enviar tu código de acceso.`, 
        true
      );

    } catch (err) {
      console.error('Error al registrar el usuario:', err);
      
      // Manejar errores específicos de Firebase
      const errorMessage = err.code 
        ? translateFirebaseError(err) 
        : err.message || 'Error al registrar el usuario. Por favor, inténtalo de nuevo.';
      
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.rectangle}>
                
                <View style={styles.rightColumn}>
                  
                  <Text style={styles.welcomeText}>Registro</Text>
                  <Text style={styles.subtitle}>Registro para padres/tutores de jugadores</Text>
                  <Text style={styles.subtitle}>Ingresa tus datos para realizar tu registro (los campos marcados con * son obligatorios)</Text>
                  
                  <TextInput
                    style={[styles.input, errors.nombreCompleto ? styles.inputError : null]}
                    placeholder="Nombre Completo *"
                    placeholderTextColor="#999"
                    value={nombreCompleto}
                    onChangeText={setNombreCompleto}
                    editable={!loading}
                  />
                  {errors.nombreCompleto ? <Text style={styles.errorText}>{errors.nombreCompleto}</Text> : null}

                  <TextInput
                    style={[styles.input, errors.correo ? styles.inputError : null]}
                    placeholder="Correo electrónico *"
                    placeholderTextColor="#999"
                    value={correo}
                    onChangeText={setCorreo}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  {errors.correo ? <Text style={styles.errorText}>{errors.correo}</Text> : null}

                  <TextInput
                    style={[styles.input, errors.telefono ? styles.inputError : null]}
                    placeholder="Teléfono (10 dígitos)"
                    placeholderTextColor="#999"
                    value={telefono}
                    onChangeText={setTelefono}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!loading}
                  />
                  {errors.telefono ? <Text style={styles.errorText}>{errors.telefono}</Text> : null}

                  <TextInput
                    style={[styles.input, errors.ocupacion ? styles.inputError : null]}
                    placeholder="Ocupación"
                    placeholderTextColor="#999"
                    value={ocupacion}
                    onChangeText={setOcupacion}
                    editable={!loading}
                  />
                  {errors.ocupacion ? <Text style={styles.errorText}>{errors.ocupacion}</Text> : null}

                  <TextInput
                    style={[styles.input, errors.tokenActivacion ? styles.inputError : null]}
                    placeholder="Token de activación *"
                    placeholderTextColor="#999"
                    value={tokenActivacion}
                    onChangeText={setTokenActivacion}
                    autoCapitalize="characters"
                    editable={!loading}
                  />
                  {errors.tokenActivacion ? <Text style={styles.errorText}>{errors.tokenActivacion}</Text> : null}

                  <Pressable 
                    style={({ pressed }) => [
                      styles.loginButton, 
                      pressed && styles.loginButtonPressed,
                      loading && styles.loginButtonDisabled
                    ]} 
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={20} color="#FFF" style={styles.buttonIcon} />
                        <Text style={styles.loginButtonText}>Registrarse</Text>
                      </>
                    )}
                  </Pressable>

                  <TouchableOpacity 
                    onPress={() => navigation.navigate('Login')}
                    disabled={loading}
                  >
                    <Text style={[styles.linkText, loading && styles.linkTextDisabled]}>
                      ¿Ya tienes una cuenta? Inicia Sesión
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              </ScrollView>
              </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  rectangle: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    marginHorizontal: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  leftColumn: {
    flex: 1,
    backgroundColor: '#b51f28',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightColumn: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  welcomeText: {
    fontFamily: 'MiFuente',
    fontSize: 30,
    color: theme.colors.text,
    textAlign: 'center',
    paddingBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  input: {
     height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
    fontSize: 16,
  },
    logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    alignContent:'center',
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    ...theme.shadow.soft,
  },
  loginButtonPressed: {
    backgroundColor: theme.colors.primaryDark,
  },
  loginButtonDisabled: {
    backgroundColor: theme.colors.primaryDark,
  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 10,
  },
  linkText: {
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  linkTextDisabled: {
    color: '#999',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
  image: {
    width: '80%',
    height: '80%',
  },
});

export default RegisterScreen;



