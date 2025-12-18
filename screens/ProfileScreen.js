import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { Ionicons } from '@expo/vector-icons';
import { theme } from '../utils/theme';
import { db } from '../firebaseConfig';
import { getCurrentUser, signOut } from '../utils/session';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const formatValue = (value) => {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'object') {
    return value.tipo || value.nombre || JSON.stringify(value);
  }
  return String(value);
};

const CustomImage = ({ uri, style }) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !uri) {
    return (
      <View style={[styles.cardImage, styles.imagePlaceholder]}>
        <Ionicons name="person" size={40} color="#ccc" />
      </View>
    );
  }

  return (
    <Image 
      source={{ uri }} 
      style={style}
      onError={() => setImageError(true)}
    />
  );
};

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [players, setPlayers] = useState([]);
  const [cheerleaders, setCheerleaders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loginData, setLoginData] = useState({
    correo: '',
    id: '',
    nombre_completo: '',
    ocupacion: '',
    rol: '',
  });

  const fetchPlayersAndCheerleaders = async () => {
    try {
      console.log('Buscando jugadores/porristas para userId:', loginData.id);
      
      const qPlayers = query(
        collection(db, 'jugadores'), 
        where('uid', '==', loginData.id),
        where('activo', '==', 'activo')
      );
      console.log('qPlayers', qPlayers);
      
      const qCheerleaders = query(
        collection(db, 'porristas'), 
        where('uid', '==', loginData.id),
        where('activo', '==', 'activo')
      );
      console.log('qCheerleaders', qCheerleaders);
      const [playersSnapshot, cheerleadersSnapshot] = await Promise.all([
        getDocs(qPlayers),
        getDocs(qCheerleaders),
      ]);
      console.log('playersSnapshot size:', playersSnapshot.size);
      console.log('cheerleadersSnapshot size:', cheerleadersSnapshot.size);
      
      // Si no encuentra nada, intentar buscar sin el filtro de activo para debug
      if (playersSnapshot.empty && cheerleadersSnapshot.empty) {
        console.log('No se encontraron registros activos, buscando todos los registros...');
        const qAllPlayers = query(
          collection(db, 'jugadores'), 
          where('uid', '==', loginData.id)
        );
        const qAllCheerleaders = query(
          collection(db, 'porristas'), 
          where('uid', '==', loginData.id)
        );
        const [allPlayersSnap, allCheerleadersSnap] = await Promise.all([
          getDocs(qAllPlayers),
          getDocs(qAllCheerleaders),
        ]);
        console.log('Total jugadores encontrados (sin filtro activo):', allPlayersSnap.size);
        console.log('Total porristas encontrados (sin filtro activo):', allCheerleadersSnap.size);
        if (allPlayersSnap.size > 0) {
          console.log('Ejemplo de jugador:', allPlayersSnap.docs[0].data());
        }
        if (allCheerleadersSnap.size > 0) {
          console.log('Ejemplo de porrista:', allCheerleadersSnap.docs[0].data());
        }
      }
      
      const playersData = playersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const cheerleadersData = cheerleadersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      setPlayers(playersData);
      console.log('Jugadores cargados:', playersData.length);
      setCheerleaders(cheerleadersData);
      console.log('Porristas cargados:', cheerleadersData.length);
      setError(null);
    } catch (error) {
      console.error('Error al obtener los registros:', error);
      setError('Error al cargar los registros. Inténtalo de nuevo.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchPlayersAndCheerleaders();
    } catch (error) {
      console.error('Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetch = async () => {
      try {
        const user = await getCurrentUser();

        if (!user || !isMounted) {
          setLoading(false);
          return;
        }

        // Buscar por correo ya que es más confiable que uid
        const q = query(collection(db, 'usuarios'), where('correo', '==', user.email));
        const querySnapshot = await getDocs(q);

        if (!isMounted) return;

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          // Usar el campo 'uid' del documento si existe, de lo contrario usar el ID del documento
          const userId = userData.uid || userDoc.id;
          console.log('Usuario encontrado:', {
            docId: userDoc.id,
            uid: userData.uid,
            userIdUsado: userId
          });
          setLoginData({
            correo: user.email,
            id: userId, // Usar el uid del documento o el ID si no existe
            nombre_completo: userData.nombre_completo || 'Usuario',
            ocupacion: userData.ocupacion || '',
            rol: userData.rol || '',
          });
        } else {
          setError('No se encontraron datos adicionales del usuario.');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error al obtener los datos del usuario:', error);
        if (isMounted) {
          setError('Error al cargar los datos del usuario.');
          setLoading(false);
        }
      }
    };
    fetch();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (loginData.id) {
      const loadData = async () => {
        setLoading(true);
        try {
          await fetchPlayersAndCheerleaders();
        } catch (error) {
          console.error('Error al cargar datos:', error);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [loginData.id]);

  const handleUploadDocuments = () => {
    if (!loginData.id) {
      Alert.alert(
        'Error',
        'No se pudo obtener tu identificador de usuario. Intenta recargar la pantalla.'
      );
      return;
    }

    const url = `https://sistem.clubtoros.com/subir-documentos?uid=${loginData.id}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir el navegador para subir documentos.');
    });
  };

  const getStatusStyle = (status) => {
    console.log(status);
    switch(status) {
      case 'Completo':
        return { color: 'green' };
      case 'Incompleto':
        return { color: 'red' };
      case 'pendiente':
        return { color: 'orange' };
      default:
        return { color: '#555' };
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Eliminar Cuenta',
      '¿Estás seguro de que deseas eliminar tu cuenta permanentemente? Esta acción no se puede deshacer y se perderán todos tus datos.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Primero marcamos como inactivos todos los jugadores y porristas asociados
              const batchUpdates = [];
              
              // Marcamos jugadores como inactivos
              players.forEach(player => {
                const playerRef = doc(db, 'jugadores', player.id);
                batchUpdates.push(updateDoc(playerRef, { activo: 'inactivo' }));
              });
              
              // Marcamos porristas como inactivas
              cheerleaders.forEach(cheerleader => {
                const cheerleaderRef = doc(db, 'porristas', cheerleader.id);
                batchUpdates.push(updateDoc(cheerleaderRef, { activo: 'inactivo' }));
              });
              
              // Ejecutamos todas las actualizaciones
              await Promise.all(batchUpdates);
              
              // Eliminamos el usuario de Firebase Auth
              const user = auth.currentUser;
              await user.delete();
              
              // Navegamos al login
              navigation.navigate('Login');
              
            } catch (error) {
              console.error('Error al eliminar la cuenta:', error);
              Alert.alert('Error', 'No se pudo eliminar la cuenta. Asegúrate de haber iniciado sesión recientemente.');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#b51f28" />
        <Text style={styles.loadingText}>Cargando datos del usuario...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.profileButton} 
          onPress={() => setShowMenu(!showMenu)}
        >
          <View style={styles.profileContent}>
            <Text style={styles.headerText}> Hola, {formatValue(loginData.nombre_completo)}</Text>
            <Ionicons name="menu" size={32} color="#333" />
          </View>
        </TouchableOpacity>

         {showMenu && (
          <View style={styles.menuContainer}>
            <View style={styles.menu}>
              <TouchableOpacity
                style={[styles.menuItem, styles.deleteAccountItem]}
                onPress={handleDeleteAccount}
              >
                <Text style={[styles.menuText, styles.deleteAccountText]}>Eliminar Cuenta</Text>
              </TouchableOpacity>
                  <TouchableOpacity
                style={styles.menuItem}
              onPress={() => {
                    setShowMenu(false);
                    signOut().then(() => {
                      setTimeout(() => {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'Login' }],
                        });
                      }, 100);
                    });
                  }}
              >
                <Text style={styles.menuText}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#b51f28']} // Android
            tintColor={'#b51f28'} // iOS
            title="Actualizando..." // iOS
            titleColor={'#b51f28'} // iOS
          />
        }
      >
        <Text style={styles.sectionTitle}>Jugadores Registrados</Text>
        {players.length > 0 ? (
          players.map((player, index) => (
            <View key={`player-${player.id || index}`} style={styles.card}>
              <View style={styles.cardLeft}>
                <CustomImage uri={player.foto} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {formatValue(player.nombre)} {formatValue(player.apellido_p)} {formatValue(player.apellido_m)}
                  </Text>
                  <Text style={styles.cardDetail}>Tipo: {formatValue(player.tipo_inscripcion)}</Text>
                  <Text style={styles.cardDetail}>MFL: {formatValue(player.numero_mfl)}</Text>
                  <Text style={styles.cardDetail}>Categoría: {formatValue(player.categoria)}</Text>
                  <Text style={[styles.cardDetail, getStatusStyle(player.estatus)]}>
                    Estatus: {formatValue(player.estatus)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pagosButton]}
                  onPress={() => navigation.navigate('Pagos', { jugadorId: player.id })}
                >
                  <Text style={styles.buttonText}>Pagos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.equipmentButton]}
                  onPress={() => navigation.navigate('Equipamiento', { jugadorId: player.id })}
                >
                  <Text style={styles.buttonText}>Equipo</Text>
                </TouchableOpacity>

              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No hay jugadores activos registrados.</Text>
        )}

        <Text style={styles.sectionTitle}>Porristas Registradas</Text>
        {cheerleaders.length > 0 ? (
          cheerleaders.map((cheerleader, index) => (
            <View key={`cheerleader-${cheerleader.id || index}`} style={styles.card}>
              <View style={styles.cardLeft}>
                <CustomImage uri={cheerleader.foto} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {formatValue(cheerleader.nombre)} {formatValue(cheerleader.apellido_p)} {formatValue(cheerleader.apellido_m)}
                  </Text>
                  <Text style={styles.cardDetail}>Tipo: {formatValue(cheerleader.tipo_inscripcion)}</Text>
                  <Text style={styles.cardDetail}>MFL: {formatValue(cheerleader.numero_mfl)}</Text>
                  <Text style={styles.cardDetail}>Categoría: {formatValue(cheerleader.categoria)}</Text>
                  <Text style={[styles.cardDetail, getStatusStyle(cheerleader.estatus)]}>
                    Estatus: {formatValue(cheerleader.estatus)}
                  </Text>
                </View>
              </View>
              <View style={styles.cardButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.pagosButton]}
                  onPress={() => navigation.navigate('Pagos', { 
                    jugadorId: cheerleader.id,
                    esPorrista: true 
                  })}
                >
                  <Text style={styles.buttonText}>Pagos</Text>
                </TouchableOpacity>

              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No hay porristas activas registradas.</Text>
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('RegistrarJugador')}
        >
          <View style={styles.addButtonContent}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Registrar</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, styles.uploadButton]}
          onPress={handleUploadDocuments}
        >
          <View style={styles.addButtonContent}>
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={22}
              color="#fff"
            />
            <Text style={styles.addButtonText}>Subir documentos</Text>
          </View>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setLoading(true)}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 5,
  },
  headerContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
    zIndex: 100,
    paddingLeft: 10,
    paddingRight: 10,
  },
  profileButton: {
    width: '100%',
  },
  profileContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginRight: 10,
  },
  menuContainer: {
    position: 'absolute',
    top: 40,
    right: 0,
    zIndex: 1000,
  },
  menu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    ...theme.shadow.card,
    minWidth: 150,
  },
  menuItem: {
    padding: 10,
  },
  menuText: {
    fontSize: 16,
    color: '#ff4444',
  },
  deleteAccountItem: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 5,
    paddingTop: 10,
  },
  deleteAccountText: {
    fontSize: 16,
    color: '#c2c0c0',
  },
  mainContent: {
    flex: 1,
    zIndex: 1,
    paddingLeft: 10,
    paddingRight: 10,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
    color: theme.colors.text,
    textAlign: 'left',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: 10,
    marginBottom: 15,
    ...theme.shadow.soft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 5,
    numberOfLines: 2,
    ellipsizeMode: 'tail',
    width: '60%',
  },
  cardDetail: {
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 3,
  },
  cardButtons: {
    marginLeft: 10,
    alignItems: 'flex-end',
    width: '30%',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 5,
    marginBottom: 6,
    minWidth: 100,
    width: '100%',
    alignItems: 'center',
  },
  pagosButton: {
    backgroundColor: theme.colors.primary,
  },
  equipmentButton: {
    backgroundColor: '#2c3e50',
  },
  deleteButton: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.muted,
    marginVertical: 20,
    fontStyle: 'italic',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 100,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.shadow.card,
  },
  uploadButton: {
    backgroundColor: '#2c3e50',
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 5,
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 20,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    borderRadius: theme.radius.sm,
    width: '100%',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
});

export default ProfileScreen;