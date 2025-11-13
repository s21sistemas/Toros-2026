
import React, { useState } from 'react';
import { 
View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Pressable,ActivityIndicator
} from 'react-native';
import { db } from '../firebaseConfig';
import { theme } from '../utils/theme';
import { registerUser, activateWithToken } from '../utils/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
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
    const newErrors = { nombreCompleto: '', correo: '', telefono: '', ocupacion: '' };

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

  const sendEmail = async (email, code, uid) => {
    try {
      const response = await fetch('https://test.prostafsse.ngrok.app/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, uid }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error('No se pudo enviar el correo.');
      }
    } catch (err) {
      console.error('Error al enviar el correo:', err);
      throw new Error('No se pudo enviar el correo. El código de acceso es: ' + code);
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

      // Enviar correo con el código
      Alert.alert(
        'Enviando código de acceso',
        'Estamos enviando el código a tu correo electrónico...',
        [],
        { cancelable: false }
      );

      await sendEmail(correo, codigoAcceso, created.id);

      // Si el usuario proporcionó token de activación, activarlo
      if (tokenActivacion && tokenActivacion.trim().length > 0) {
        try {
          await activateWithToken({ userId: created.id, userName: nombreCompleto, token: tokenActivacion.trim() });
        } catch (e) {
          console.warn('Token no activado:', e?.message);
        }
      }
    
      // Éxito - mostrar mensaje y redirigir
      showAlert(
        '¡Registro exitoso!', 
        `Usuario registrado correctamente. Tu código de acceso ha sido enviado a tu correo electrónico.`, 
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
                    style={[styles.input]}
                    placeholder="Token de activación (opcional)"
                    placeholderTextColor="#999"
                    value={tokenActivacion}
                    onChangeText={setTokenActivacion}
                    editable={!loading}
                  />

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



