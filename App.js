import React, { useEffect, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from './utils/theme';
import { onAuthStateChanged, getCurrentUser, signOut } from './utils/session';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importar pantallas
import IntroVideoScreen from './screens/IntroVideoScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AvisosScreen from './screens/AvisosScreen';
import PagosScreen from './screens/PagosScreen';
import EquipamientoScreen from './screens/EquipamientoScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Crear referencia de navegación
export const navigationRef = createNavigationContainerRef();

// Flag de pruebas para saltar el video de introducción
// true  => NO se reproduce el video al inicio
// false => SÍ se reproduce el video al inicio
const SKIP_INTRO_FOR_TESTS = null;

// MainTabs SIN el tab de HomeScreen (registro)
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        if (route.name === 'Perfil') {
          iconName = focused ? 'person' : 'person-outline';
        } else if (route.name === 'Avisos') {
          iconName = focused ? 'notifications' : 'notifications-outline';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.muted,
      tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
      tabBarLabelStyle: { fontSize: 12, marginBottom: 6 },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Perfil" component={ProfileScreen} />
    <Tab.Screen name="Avisos" component={AvisosScreen} />
  </Tab.Navigator>
);

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [showIntroVideo, setShowIntroVideo] = useState(SKIP_INTRO_FOR_TESTS);

  SplashScreen.preventAutoHideAsync();

  useEffect(() => {
    let unsubscribe;
    let timeoutId;
    let isMounted = true;

    (async () => {
      try {
        const current = await getCurrentUser();
        if (isMounted) {
          setIsLoggedIn(!!current);
          setIsLoading(false);
          unsubscribe = onAuthStateChanged((user) => {
            if (isMounted) {
              setIsLoggedIn(!!user);
            }
          });
        }
      } catch (error) {
        console.error('Error configurando sesión:', error);
        if (isMounted) {
          // Cerrar sesión si hay error
          await signOut();
          setAuthError('Error al configurar sesión');
          setIsLoggedIn(false);
          setIsLoading(false);
        }
      }
    })();

    // Timeout de seguridad más corto
    timeoutId = setTimeout(async () => {
      if (isMounted) {
        console.warn('Auth check timeout - cerrando sesión y forzando login');
        // Cerrar sesión automáticamente si hay timeout
        await signOut();
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    }, 2000); // Reducido a 2 segundos

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const watched = await AsyncStorage.getItem("intro_watched");
        if (watched === "yes") {
          setShowIntroVideo(false);
        } else {
          setShowIntroVideo(true);
        }
      } catch (e) {
        setShowIntroVideo(true);
      }
    })();
  }, []);

  // Si está cargando o mostrando el video intro, mostrar solo eso
  if (showIntroVideo === null || isLoading) {
    SplashScreen.hideAsync().catch(() => {});
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fbbe08" />
          <Text style={styles.loadingText}>Cargando ClubToros...</Text>
        </View>
        <StatusBar style="light" backgroundColor="#fbbe08" />
      </SafeAreaProvider>
    );
  }
  
  if (showIntroVideo) {
    return (
      <SafeAreaProvider>
        <StatusBar hidden />
        <IntroVideoScreen
          onVideoEnd={async () => {
            await AsyncStorage.setItem("intro_watched", "yes");
            setShowIntroVideo(false);
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={theme.colors.surface} />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName={isLoggedIn ? 'MainTabs' : 'Login'}
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.text,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {!isLoggedIn ? (
            <>
              <Stack.Screen 
                name="Login" 
                component={LoginScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen} 
                options={{ headerShown: false }} 
              />
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : null}

          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          
          {/* HomeScreen ahora es una pantalla independiente accesible desde Perfil */}
          <Stack.Screen
            name="RegistrarJugador"
            component={HomeScreen}
            options={({ navigation }) => ({
              headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 15 }}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
              ),
              title: 'Registrar Jugador',
              headerTitleAlign: 'center',
              headerStyle: { backgroundColor: '#b51f28' },
              headerTintColor: '#fff',
            })}
          />
          
          <Stack.Screen
            name="Pagos"
            component={PagosScreen}
            options={({ navigation }) => ({
              headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 15 }}>
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
              ),
              title: 'Pagos del Jugador',
              headerTitleAlign: 'center',
            })}
          />
          <Stack.Screen
            name="Equipamiento"
            component={EquipamientoScreen}
            options={({ navigation }) => ({
              headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 15 }}>
                  <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
              ),
              title: 'Equipamiento',
              headerTitleAlign: 'center',
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
  },
});

export default App;