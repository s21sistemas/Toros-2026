import React, { useState, useEffect } from 'react';
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
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { theme } from '../utils/theme';
import { loginWithAccessCode } from '../utils/authService';
import { setSessionUser } from '../utils/session';

SplashScreen.preventAutoHideAsync();

const LoginScreen = ({ navigation }) => {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errors, setErrors] = useState({ correo: '', contrasena: '' });
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
      // Validar credenciales y crear sesión
      const user = await loginWithAccessCode(correo.trim(), contrasena.trim());
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión');
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
                    source={require('../assets/logoToros.jpg')}
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
});

export default LoginScreen;