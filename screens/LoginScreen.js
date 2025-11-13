import React, { useState, useEffect } from 'react';
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
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { theme } from '../utils/theme';
import { loginWithAccessCode, userHasActivation, activateWithToken } from '../utils/authService';
import { setSessionUser } from '../utils/session';

SplashScreen.preventAutoHideAsync();

const LoginScreen = ({ navigation }) => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [errors, setErrors] = useState({ correo: '', contrasena: '' });
  const [pendingUser, setPendingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [fontsLoaded] = useFonts({
    'MiFuente': require('../fonts/TypoCollegeDemo.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const validateForm = () => {
    let isValid = true;
    const newErrors = { correo: '', contrasena: '' };

    if (!correo.trim()) {
      newErrors.correo = 'El correo es obligatorio.';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(correo)) {
      newErrors.correo = 'El correo no es válido.';
      isValid = false;
    }

    if (!contrasena.trim()) {
      newErrors.contrasena = 'La contraseña es obligatoria.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    try {
      // 1) Validar credenciales, pero NO crear sesión aún
      const user = await loginWithAccessCode(correo.trim(), contrasena.trim(), { skipSession: true });
      // 2) Verificar activación por token
      const activated = await userHasActivation(user.id);
      if (!activated) {
        setPendingUser(user);
        setShowTokenModal(true);
        return;
      }
      // 3) Si ya está activado, crear sesión y navegar
      await setSessionUser({ uid: user.id, email: user.correo, nombre_completo: user.nombre_completo || '' });
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión');
    }
  };

  const confirmTokenActivation = async () => {
    const token = tokenInput.trim();
    if (!token) {
      Alert.alert('Token requerido', 'Ingresa tu token de activación');
      return;
    }
    try {
      const user = pendingUser || (await loginWithAccessCode(correo.trim(), contrasena.trim(), { skipSession: true }));
      await activateWithToken({ userId: user.id, userName: user.nombre_completo, token });
      await setSessionUser({ uid: user.id, email: user.correo, nombre_completo: user.nombre_completo || '' });
      setShowTokenModal(false);
      setPendingUser(null);
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'No se pudo activar el token');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#d32f2f', '#b71c1c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.loginContainer}>
              <View style={styles.headerContainer}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../assets/logoPotros.jpg')}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                </View>
                <Text style={styles.welcomeText}>Iniciar Sesión</Text>
                <Text style={styles.subtitle}>Acceso exclusivo para padres/tutores de jugadores</Text>
              </View>

              <View style={styles.formContainer}>
                <TextInput
                  style={[styles.input, errors.correo ? styles.inputError : null]}
                  placeholder="Correo electrónico"
                  placeholderTextColor={theme.colors.muted}
                  value={correo}
                  onChangeText={setCorreo}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.correo ? <Text style={styles.errorText}>{errors.correo}</Text> : null}

                <View style={styles.passwordWrap}>
                  <TextInput
                    style={[styles.input, errors.contrasena ? styles.inputError : null]}
                    placeholder="Contraseña"
                    placeholderTextColor={theme.colors.muted}
                    value={contrasena}
                    onChangeText={setContrasena}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.muted} />
                  </TouchableOpacity>
                </View>
                {errors.contrasena ? <Text style={styles.errorText}>{errors.contrasena}</Text> : null}

                <TouchableOpacity onPress={handleLogin} activeOpacity={0.9}>
                  <LinearGradient
                    colors={['#e53935', '#b71c1c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.loginButton}
                  >
                    <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.linksContainer}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Register')}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>
                      ¿No tienes cuenta? <Text style={styles.linkTextBold}>Regístrate</Text>
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
      </LinearGradient>
      {/* Modal para ingresar Token de Activación */}
      <Modal
        visible={showTokenModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTokenModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Token de activación</Text>
            <Text style={styles.modalText}>
              Tu cuenta requiere un token de activación. Ingresa el token para continuar.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ingresa tu token"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="characters"
              value={tokenInput}
              onChangeText={setTokenInput}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={() => setShowTokenModal(false)}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={confirmTokenActivation}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loginContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    ...theme.shadow.card,
    marginHorizontal: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffe6e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...theme.shadow.soft,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  welcomeText: {
    fontFamily: 'MiFuente',
    fontSize: 32,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  formContainer: {
    marginBottom: 20,
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
    color: theme.colors.text,
  },
  passwordWrap: {
    position: 'relative',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    top: 15,
    padding: 4,
  },
  inputError: {
    borderColor: theme.colors.primary,
  },
  errorText: {
    color: theme.colors.primary,
    fontSize: 12,
    marginBottom: 15,
    marginLeft: 15,
  },
  loginButton: {
    paddingVertical: 15,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    ...theme.shadow.soft,

  },
  loginButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linksContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkButton: {
    marginVertical: 8,
  },
  linkText: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  linkTextBold: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    width: '100%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalText: {
    marginTop: 8,
    color: theme.colors.muted,
    fontSize: 14,
  },
  modalInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    height: 48,
    color: theme.colors.text,
    backgroundColor: '#FAFAFA',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.sm,
    marginLeft: 10,
  },
  modalCancel: {
    backgroundColor: '#E9ECEF',
  },
  modalConfirm: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});

export default LoginScreen;