import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, TextInput,
  Animated, Platform, PanResponder, Linking, ActivityIndicator,
  Image, Button, SafeAreaView, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Rect } from 'react-native-svg';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

import { app, db, storage } from '../firebaseConfig'; 
import { theme } from '../utils/theme';
import { getCurrentUser } from '../utils/session';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const HomeScreen = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_p: '',
    apellido_m: '',
    sexo: '',
    categoria:'',
    direccion: '',
    telefono: '',
    fecha_nacimiento: new Date(),
    lugar_nacimiento: '',
    curp: '',
    grado_escolar: '',
    nombre_escuela: '',
    alergias: '',
    padecimientos: '',
    peso: '',
    tipo_inscripcion: '',
    foto_jugador: null,
    firma: '',
    activo: 'no activo',
    numero_mfl: '000000',
    documentos: {
      ine_tutor: null,
      curp_jugador: null,
      acta_nacimiento: null,
      comprobante_domicilio: null,
      firma: null
    },
    transferencia: {
      club_anterior: '',
      temporadas_jugadas: '',
      motivo_transferencia: ''
    }
  });

  const [errors, setErrors] = useState({});
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [currentUpload, setCurrentUpload] = useState(null);
  const signatureRef = useRef(null);
  const signatureViewRef = useRef(null);
  const [categoria, setCategoria] = useState(null);
  const [temporadas, setTemporadas] = useState([]);
  const [temporadaSeleccionada, setTemporadaSeleccionada] = useState(null);
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  
  // Determinar los pasos según el tipo de inscripción
  const getSteps = () => {
    if (formData.tipo_inscripcion === 'reinscripcion' && jugadorSeleccionado) {
      // Para reinscripción: temporada, datos médicos/escolares, foto y documentación
      return [
        'GeneroForm',
        'TipoInscripcionForm',
        'TemporadaReinscripcionForm',
        'DatosEscolaresMedicosForm',
        'FotoForm',
        'DocumentacionForm',
      ];
    }
    // Para inscripción normal
    return [
      'GeneroForm',
      'TipoInscripcionForm',
      'DatosPersonalesForm',
      'DatosContactoForm',
      'DatosEscolaresMedicosForm',
      ...(formData.tipo_inscripcion === 'transferencia' ? ['TransferenciaForm'] : []),
      'FotoForm',
      'DocumentacionForm',
    ];
  };
  
  const steps = getSteps();

  // Agregar este useEffect justo aquí 👇
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const routes = navigation.getState()?.routes;
      const previousRoute = routes?.[routes.length - 2]?.name;
      
      if (previousRoute === 'MainTabs') {
        resetForm();
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Función para resetear el formulario
  const resetForm = () => {
    setCurrentStep(0);
    setJugadorSeleccionado(null);
    setTemporadaSeleccionada(null);
    setFormData({
      nombre: '',
      apellido_p: '',
      apellido_m: '',
      sexo: '',
      categoria: '',
      direccion: '',
      telefono: '',
      fecha_nacimiento: new Date(),
      lugar_nacimiento: '',
      curp: '',
      grado_escolar: '',
      nombre_escuela: '',
      alergias: '',
      padecimientos: '',
      peso: '',
      tipo_inscripcion: '',
      foto_jugador: null,
      firma: '',
      activo: 'no activo',
      numero_mfl: '000000',
      documentos: {
        ine_tutor: null,
        curp_jugador: null,
        acta_nacimiento: null,
        comprobante_domicilio: null,
        firma: null
      },
      transferencia: {
        club_anterior: '',
        temporadas_jugadas: '',
        motivo_transferencia: ''
      }
    });
    setErrors({});
    setUploadProgress({});
    setCurrentUpload(null);
    fadeAnim.setValue(1);
  };

  
const safeUploadFile = async ({ uri, name, folder, type = null }) => {
  try {
    if (!uri || !name || !folder) {
      throw new Error('Parámetros insuficientes para la carga del archivo');
    }

    console.log(`Subiendo archivo: ${name} desde ${uri.substring(0, 50)}...`);

    let blob;
    
    // Para datos URI (como la firma)
    if (uri.startsWith('data:')) {
      const response = await fetch(uri);
      blob = await response.blob();
    } 
    // Para Android
    else if (Platform.OS === 'android' && uri.startsWith('content://')) {
      const cacheFileUri = `${FileSystem.cacheDirectory}${name}`;
      await FileSystem.copyAsync({ from: uri, to: cacheFileUri });
      const response = await fetch(`file://${cacheFileUri}`);
      blob = await response.blob();
    } 
    // Para web
    else if (Platform.OS === 'web') {
      const response = await fetch(uri);
      blob = await response.blob();
    } 
    // Para iOS y otros casos
    else {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('El archivo no existe en la ruta especificada');
      const response = await fetch(uri);
      blob = await response.blob();
    }

    if (!blob) {
      throw new Error('No se pudo crear el blob del archivo');
    }

    const fileExtension = name.split('.').pop() || (blob.type?.split('/')?.[1] || 'jpg');
    const mimeType = type || blob.type || 'application/octet-stream';
    const fullPath = `${folder}/${Date.now()}_${name}`;
    const storageRef = ref(storage, fullPath);

    const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: mimeType });

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => ({ ...prev, [folder]: progress }));
        },
        (error) => {
          console.error('Error durante la subida:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log(`Archivo subido con éxito: ${downloadURL}`);
            resolve(downloadURL);
          } catch (e) {
            console.error('Error al obtener URL de descarga:', e);
            reject(e);
          }
        }
      );
    });

  } catch (error) {
    console.error('Error en safeUploadFile:', {
      error: error.message,
      uri: uri?.substring(0, 100),
      name,
      folder
    });
    throw error;
  }
};


  const validateForm = () => {
    const newErrors = {};
    
    switch (steps[currentStep]) {
      case 'GeneroForm':
        if (!formData.sexo) {
          newErrors.sexo = 'Selecciona un género';
        }
        break;
      case 'TipoInscripcionForm':
        if (!formData.tipo_inscripcion) {
          newErrors.tipo_inscripcion = 'Selecciona un tipo de inscripción';
        }
        break;
      case 'DatosPersonalesForm':
        if (!formData.nombre) newErrors.nombre = 'Nombre es requerido';
        if (!formData.apellido_p) newErrors.apellido_p = 'Apellido paterno es requerido';
        break;
      // case 'FirmaForm':
      //   if (!formData.firma || formData.firma === '' || !formData.firma.startsWith('data:image')) {
      //     newErrors.firma = 'Captura tu firma';
      //   }
      //   break;
      case 'FotoForm':
        if (!formData.foto_jugador) newErrors.foto_jugador = 'Sube una foto del jugador';
        break;

    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateForm()) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentStep((prev) => prev + 1);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handlePreviousStep = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep((prev) => prev - 1);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const captureSignature = async () => {
    console.log('🟡 captureSignature ejecutándose...');
    console.log('🟡 signatureViewRef:', signatureViewRef);
    console.log('🟡 signatureViewRef.current:', signatureViewRef.current);
    if (!signatureViewRef.current) {
      console.log('❌ signatureViewRef.current es null');
      return null;
    }
    
    try {
      console.log('📸 Iniciando captura de firma...');
      
      // Capturar la vista como imagen base64
      const result = await captureRef(signatureViewRef, {
        format: 'png',
        quality: 0.8,
        result: 'base64',
      });
      
      const dataURL = `data:image/png;base64,${result}`;
      console.log('✅ Firma capturada exitosamente:', dataURL.substring(0, 50) + '...');
      
      return dataURL;
    } catch (error) {
      console.error('❌ Error al capturar firma:', error);
      return null;
    }
  };
  

  const handleSelectFile = async (field) => {
    try {
      let result;
      
      if (Platform.OS === 'web') {
        // Implementación para web
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.pdf,.jpg,.jpeg,.png';
          
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              setFormData(prev => ({
                ...prev,
                documentos: {
                  ...prev.documentos,
                  [field]: {
                    uri: URL.createObjectURL(file),
                    name: file.name,
                    type: file.type
                  }
                }
              }));
            }
            resolve();
          };
          
          input.click();
        });
      } else {
        // Implementación para móvil
        result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setFormData(prev => ({
          ...prev,
          documentos: {
            ...prev.documentos,
            [field]: {
              uri: file.uri,
              name: file.name,
              type: file.mimeType
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

    const showAlert = (title, message, options) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      if (options && options[0] && options[0].onPress) {
        options[0].onPress();
      }
    } else {
      Alert.alert(title, message, options);
    }
  };
  
const handleSubmit = async () => {
  if (!validateForm()) {
    Alert.alert('Error', 'Por favor completa todos los campos requeridos');
    return;
  }

  setLoading(true);

  try {
    // 1. Verificar autenticación
    const user = await getCurrentUser();
    if (!user || !user.uid) {
      throw new Error('No se pudo verificar tu sesión. Vuelve a iniciar sesión.');
    }
    
    // Obtener el uid real del documento de usuario en Firestore (igual que ProfileScreen)
    let uid = user.uid; // Fallback al ID del documento
    try {
      const usuariosQuery = query(
        collection(db, 'usuarios'),
        where('correo', '==', user.email)
      );
      const usuariosSnapshot = await getDocs(usuariosQuery);
      
      if (!usuariosSnapshot.empty) {
        const userDoc = usuariosSnapshot.docs[0];
        const userData = userDoc.data();
        // Usar el campo uid del documento si existe, de lo contrario usar el ID del documento
        uid = userData.uid || userDoc.id;
        console.log('👤 [handleSubmit] UID obtenido del documento de usuario:', {
          docId: userDoc.id,
          uidCampo: userData.uid,
          uidUsado: uid
        });
      }
    } catch (error) {
      console.warn('⚠️ [handleSubmit] No se pudo obtener el uid del documento, usando uid de session:', error);
    }

    // 2. Subir archivos
    let fotoJugadorURL = null;
    if (formData.foto_jugador?.uri) {
      setCurrentUpload('Foto del jugador');
      fotoJugadorURL = await safeUploadFile({
        uri: formData.foto_jugador.uri,
        name: formData.foto_jugador.name || 'foto_jugador.jpg',
        folder: 'fotos',
        type: formData.foto_jugador.type || 'image/jpeg'
      });
    }

    // 3. Subir documentos
    const documentosSubidos = {};
    const documentosFields = ['ine_tutor', 'curp_jugador', 'acta_nacimiento', 'comprobante_domicilio'];
    
    for (const field of documentosFields) {
      if (formData.documentos[field]?.uri) {
        setCurrentUpload(`Documento ${field}`);
        documentosSubidos[field] = await safeUploadFile({
          uri: formData.documentos[field].uri,
          name: formData.documentos[field].name || `${field}.pdf`,
          folder: 'documentos',
          type: formData.documentos[field].type || 'application/pdf'
        });
      }
    }

    // LOGS DE DEBUG - AGREGAR ESTAS LÍNEAS
    console.log('🔍 VERIFICANDO FIRMA EN HANDLESUBMIT:');
    console.log('  - formData.firma existe:', !!formData.firma);
    console.log('  - formData.firma !== "":', formData.firma !== '');
    console.log('  - empieza con data:image:', formData.firma?.startsWith('data:image'));
    console.log('  - firma completa (primeros 100):', formData.firma?.substring(0, 100));
    console.log('🏷️ CATEGORIA ANTES DE GUARDAR:', formData.categoria);

    // 4. Subir firma si existe
    let firmaURL = null;
    // if (formData.firma && formData.firma !== '' && formData.firma.startsWith('data:image')) {
    //   setCurrentUpload('Firma');
    //   console.log('🔄 Subiendo firma a Firebase Storage...');
    //   firmaURL = await safeUploadFile({
    //     uri: formData.firma,  // Usar directamente formData.firma que ya es base64
    //     name: `firma_${Date.now()}.png`,
    //     folder: 'firmas',
    //     type: 'image/png'
    //   });
    //   console.log('✅ Firma subida exitosamente:', firmaURL);
    // }

    // 5. Obtener temporada (activa para inscripción normal, seleccionada para reinscripción)
    let temporadaActiva = null;
    if (formData.tipo_inscripcion === 'reinscripcion' && formData.temporadaId) {
      // Para reinscripción, usar la temporada seleccionada
      temporadaActiva = {
        value: formData.temporadaId
      };
      console.log("🔄 [handleSubmit] Reinscripción - Temporada seleccionada:", temporadaActiva);
    } else {
      // Para inscripción normal, obtener temporada activa
      try {
        const temporadasQuery = query(
          collection(db, 'temporadas'),
          where('estado_temporada', '==', 'Activa')
        );
        const temporadasSnapshot = await getDocs(temporadasQuery);
        if (!temporadasSnapshot.empty) {
          const tempDoc = temporadasSnapshot.docs[0];
          temporadaActiva = {
            label: tempDoc.data().temporada || 'Temporada Activa',
            value: tempDoc.id
          };
          console.log("✅ [handleSubmit] Temporada activa:", temporadaActiva);
        }
      } catch (dbError) {
        console.error('Error al obtener temporada activa:', dbError);
      }
    }
    const datosMinimos = {
      ...formData,
      foto: fotoJugadorURL,
    };
    console.log(datosMinimos);
    
    // Verifica si algún campo requerido está vacío, null o undefined
    const estaIncompleto = Object.entries(datosMinimos).some(([key, value]) => {
      if(key === 'firma')return false;
      if (value === undefined || value == null || value == '') {
    }
      return value === undefined || value === null || value === '';
    });
    
    const documentosIncompletos = Object.entries(datosMinimos.documentos).some(([key, value]) => {
      if(key === 'firma')return false;

      if (value === undefined || value == null || value == '') {
    }
      return value === undefined || value === null || value === '';
    });

    console.log('estaIncompleto', estaIncompleto);
    console.log('documentosIncompletos', documentosIncompletos);
    
    const estatus = (estaIncompleto || documentosIncompletos) ? 'Incompleto' : 'Completo';
    
    console.log('status', estatus);
    
    // LOGS ANTES DE CREAR EL OBJETO
    console.log('📄 DOCUMENTOS A GUARDAR:');
    console.log('  - documentosSubidos:', documentosSubidos);
    console.log('  - firmaURL:', firmaURL);
    
    // 6. Crear objeto de registro
    const datosRegistro = {
      nombre: formData.nombre,
      apellido_p: formData.apellido_p,
      apellido_m: formData.apellido_m,
      sexo: formData.sexo,
      categoria: formData.tipo_inscripcion === 'porrista' ? '' : formData.categoria,
      direccion: formData.direccion,
      telefono: formData.telefono,
      // Datos del tutor / contacto (si existen)
      celular_tutor: formData.celular_tutor || null,
      correo_tutor: formData.correo_tutor || null,
      fecha_nacimiento: formData.fecha_nacimiento.toISOString().split('T')[0],
      lugar_nacimiento: formData.lugar_nacimiento,
      curp: formData.curp,
      grado_escolar: formData.grado_escolar,
      nombre_escuela: formData.nombre_escuela,
      alergias: formData.alergias,
      padecimientos: formData.padecimientos,
      peso: formData.peso,
      tipo_inscripcion: formData.tipo_inscripcion,
      foto: fotoJugadorURL,
      documentos: {
        ...documentosSubidos,
        firma: firmaURL
      },
      activo: 'activo',
      numero_mfl: formData.numero_mfl,
      fecha_registro: new Date(),
      uid: uid,
      estatus,
      // Guardar temporadaId - puede venir de temporadaActiva.value o de formData.temporadaId
      temporadaId: temporadaActiva?.value || formData.temporadaId || null,
      ...(formData.tipo_inscripcion === 'transferencia' && {
        transferencia: formData.transferencia
      })
    };
    
    console.log('📝 [handleSubmit] Datos del registro a guardar:', {
      nombre: datosRegistro.nombre,
      activo: datosRegistro.activo,
      uid: datosRegistro.uid,
      temporadaId: datosRegistro.temporadaId,
      categoria: datosRegistro.categoria,
      tipo_inscripcion: datosRegistro.tipo_inscripcion
    });

    // 7. Guardar en Firestore
    const coleccion = formData.tipo_inscripcion === 'porrista' ? 'porristas' : 'jugadores';
    
    // Si es reinscripción, marcar el documento anterior como 'no activo'
    if (formData.tipo_inscripcion === 'reinscripcion' && jugadorSeleccionado) {
      console.log('🔄 [handleSubmit] Reinscripción - Marcando documento anterior como inactivo...', {
        jugadorId: jugadorSeleccionado.id,
        collection: jugadorSeleccionado.collection,
        nombre: jugadorSeleccionado.nombre
      });
      try {
        const docAnteriorRef = doc(db, jugadorSeleccionado.collection, jugadorSeleccionado.id);
        
        // Actualizar el documento anterior: cambiar activo a 'no activo' y agregar fecha de fin de temporada
        const updateData = {
          activo: 'no activo',
          fecha_fin_temporada: new Date().toISOString(),
          estatus: 'No activo' // También actualizar el estatus
        };
        
        console.log('📝 [handleSubmit] Actualizando documento anterior con:', updateData);
        await updateDoc(docAnteriorRef, updateData);
        
        // Verificar que se actualizó correctamente
        const docVerificado = await getDoc(docAnteriorRef);
        if (docVerificado.exists()) {
          const datosActualizados = docVerificado.data();
          console.log('✅ [handleSubmit] Documento anterior actualizado correctamente:', {
            activo: datosActualizados.activo,
            estatus: datosActualizados.estatus,
            fecha_fin_temporada: datosActualizados.fecha_fin_temporada
          });
        }
      } catch (error) {
        console.error('❌ [handleSubmit] Error al marcar documento anterior como inactivo:', error);
        console.error('❌ [handleSubmit] Stack:', error.stack);
        // No lanzar error, continuar con la creación del nuevo registro
        // pero mostrar advertencia
        Alert.alert(
          'Advertencia',
          'Se creó el nuevo registro pero hubo un problema al actualizar el registro anterior. Contacta al administrador.'
        );
      }
    }
    
    console.log('💾 DATOS COMPLETOS A GUARDAR:', JSON.stringify(datosRegistro, null, 2));
    const docRef = await addDoc(collection(db, coleccion), datosRegistro);
    console.log('✅ [handleSubmit] Nuevo documento creado con ID:', docRef.id);


    // AGREGAR ESTAS LÍNEAS PARA VERIFICAR
    console.log('✅ DOCUMENTO GUARDADO CON ID:', docRef.id);
    console.log('🔍 VERIFICANDO QUE SE GUARDÓ CORRECTAMENTE...');

    // Leer el documento recién creado para verificar
    const docSnap = await getDoc(doc(db, coleccion, docRef.id));
    if (docSnap.exists()) {
      const datosSalvados = docSnap.data();
      console.log('📖 DATOS LEÍDOS DE FIREBASE:');
      console.log('  - Tiene documentos:', !!datosSalvados.documentos);
      console.log('  - Firma en documentos:', datosSalvados.documentos?.firma || 'NULL');
      console.log('  - Documentos completos:', JSON.stringify(datosSalvados.documentos, null, 2));
    } else {
      console.log('❌ ERROR: No se pudo leer el documento recién creado');
    }

    // 8. Procesar pagos
    await processPayments(docRef.id, formData, temporadaActiva);

    showAlert(
      'Registro Exitoso',
      'Jugador registrado correctamente',
      [{ text: 'OK', onPress: () => navigation.navigate('MainTabs') }]);



  } catch (error) {
    console.error('Error completo en handleSubmit:', error);
    Alert.alert('Error', error.message || 'Ocurrió un error al completar el registro');
  } finally {
    setLoading(false);
    setCurrentUpload(null);
  }
};



  
  // Procesar pagos (separado para mejor organización)
// Modifica la llamada a processPayments en handleSubmit:


// Y actualiza la función processPayments:
const processPayments = async (playerId, formData, temporadaActiva) => {
  try {
    // Obtener el ID de la temporada (puede ser un objeto o un string)
    const temporadaId = temporadaActiva?.value || temporadaActiva || formData.temporadaId;
    
    console.log('💰 [processPayments] Buscando costos...', {
      tipo_inscripcion: formData.tipo_inscripcion,
      temporadaId: temporadaId,
      categoria: formData.categoria,
      temporadaActiva: temporadaActiva
    });
    
    // Obtener el nombre de la temporada desde el ID
    let nombreTemporada = null;
    try {
      if (temporadaId) {
        const temporadaDoc = await getDoc(doc(db, 'temporadas', temporadaId));
        if (temporadaDoc.exists()) {
          nombreTemporada = temporadaDoc.data().temporada;
          console.log('📋 [processPayments] Nombre de temporada obtenido:', nombreTemporada);
        }
      }
    } catch (error) {
      console.warn('⚠️ [processPayments] No se pudo obtener el nombre de la temporada:', error);
    }
    
    // Para reinscripción, usar los mismos costos que para inscripción normal
    const tipoInscripcionParaCostos = formData.tipo_inscripcion === 'reinscripcion' 
      ? 'novato' 
      : formData.tipo_inscripcion;
    
    const costosCollection = tipoInscripcionParaCostos === 'porrista' ? 'costos-porrista' : 'costos-jugador';
    
    // Intentar buscar primero por nombre de temporada (como se guarda en Firestore)
    let costosQuery = null;
    let costosSnapshot = null;
    
    if (nombreTemporada) {
      // Buscar por nombre de temporada
      costosQuery = query(
        collection(db, costosCollection),
        where('temporada', '==', nombreTemporada),
        where('categoria', '==', formData.categoria)
      );
      costosSnapshot = await getDocs(costosQuery);
      console.log('🔍 [processPayments] Query por nombre de temporada:', {
        collection: costosCollection,
        temporada: nombreTemporada,
        categoria: formData.categoria,
        resultados: costosSnapshot.size
      });
    }
    
    // Si no se encontraron resultados, intentar por temporadaId
    if (!costosSnapshot || costosSnapshot.empty) {
      if (temporadaId) {
        costosQuery = query(
          collection(db, costosCollection),
          where('temporadaId', '==', temporadaId),
          where('categoria', '==', formData.categoria)
        );
        costosSnapshot = await getDocs(costosQuery);
        console.log('🔍 [processPayments] Query por temporadaId:', {
          collection: costosCollection,
          temporadaId: temporadaId,
          categoria: formData.categoria,
          resultados: costosSnapshot.size
        });
      }
    }
    
    // Si aún no se encontraron resultados, buscar solo por categoría (fallback)
    if (costosSnapshot.empty && formData.categoria) {
      console.log('⚠️ [processPayments] No se encontraron costos con filtro de temporada, buscando solo por categoría...');
      costosQuery = query(
        collection(db, costosCollection),
        where('categoria', '==', formData.categoria)
      );
      costosSnapshot = await getDocs(costosQuery);
      console.log('🔍 [processPayments] Query solo por categoría:', {
        collection: costosCollection,
        categoria: formData.categoria,
        resultados: costosSnapshot.size
      });
    }
    
    if (costosSnapshot.empty) {
      console.error('❌ [processPayments] No se encontraron costos', {
        collection: costosCollection,
        temporadaId: temporadaId,
        nombreTemporada: nombreTemporada,
        categoria: formData.categoria
      });
      // No lanzar error, solo registrar y continuar sin crear pagos
      console.warn('⚠️ [processPayments] Continuando sin crear pagos - el jugador se registró correctamente');
      return; // Salir sin error para que el registro se complete
    }

    const costosDoc = costosSnapshot.docs[0];
    const costosData = costosDoc.data();
    console.log('costos encontrados para la categoria')
    console.log(costosData);
    const parseCost = (value) => parseInt(value || '0', 10);
    
    const nombreCompleto = `${formData.nombre} ${formData.apellido_p} ${formData.apellido_m}`;
    const fechaActual = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 7);

    if (formData.tipo_inscripcion === 'porrista') {
      const inscripcion = parseCost(costosData.inscripcion);
      const coaching = parseCost(costosData.coaching);
      const total = inscripcion + coaching;

      const pagosPorrista = {
        porristaId: playerId,
        nombre: nombreCompleto,
        pagos: [
          {
            tipo: 'Inscripción',
            estatus: 'pendiente',
            fecha_pago: null,
            monto: inscripcion,
            metodo_pago: null,
            abono: 'NO',
            abonos: [],
            total_abonado: 0,
            fecha_limite: fechaLimite.toISOString().split('T')[0]
          },
          {
            tipo: 'Coaching',
            estatus: 'pendiente',
            fecha_pago: null,
            monto: coaching,
            metodo_pago: null,
            abono: 'NO',
            abonos: [],
            total_abonado: 0,
            fecha_limite: null
          }
        ],
        monto_total_pagado: 0,
        monto_total_pendiente: total,
        monto_total: total,
        fecha_registro: fechaActual.toISOString().split('T')[0],
        temporadaId: temporadaId || costosData.temporadaId
      };
      await addDoc(collection(db, 'pagos_porristas'), pagosPorrista);
    } else {
      // LÓGICA EXACTA DE ANDROID - crea inscripción, primera jornada y pesaje
      const inscripcion = parseCost(costosData.inscripcion);
      const equipamiento = parseCost(costosData.primera_jornada); // CLAVE: toma de primera_jornada
      const pesaje = parseCost(costosData.pesaje);
      
      const total = inscripcion + equipamiento + pesaje;

      const pagosJugador = {
        jugadorId: playerId,
        nombre: nombreCompleto,
        categoria: formData.categoria,
        pagos: [
          {
            tipo: 'Inscripción',
            beca: '0',
            descuento: '0',
            estatus: 'pendiente',
            fecha_pago: null,
            submonto: inscripcion,
            monto: inscripcion,
            prorroga: false,
            fecha_limite: fechaLimite.toISOString().split('T')[0],
            metodo_pago: null,
            abono: 'NO',
            abonos: [],
            total_abonado: 0
          },
          {
            tipo: 'Primera jornada', // EXACTAMENTE como en Android
            estatus: 'pendiente',
            fecha_pago: null,
            fecha_limite: fechaLimite.toISOString().split('T')[0],
            monto: equipamiento, // Monto viene de costosData.primera_jornada
            metodo_pago: null,
            abono: 'NO',
            abonos: [],
            total_abonado: 0
          },
          {
            tipo: 'Pesaje',
            estatus: 'pendiente',
            fecha_pago: null,
            monto: pesaje,
            metodo_pago: fechaLimite.toISOString().split('T')[0], // Como en Android
            abono: 'NO',
            abonos: [],
            total_abonado: 0
          }
        ],
        monto_total_pagado: 0,
        monto_total_pendiente: total,
        monto_total: total,
        fecha_registro: fechaActual.toISOString().split('T')[0],
        temporadaId: temporadaId || costosData.temporadaId
      };
      await addDoc(collection(db, 'pagos_jugadores'), pagosJugador);
    }
  } catch (error) {
    console.error('Error al procesar pagos:', error);
    throw new Error('Se completó el registro pero hubo un problema con los pagos. Contacta al administrador.');
  }
};
  
  const renderForm = () => {
    switch (steps[currentStep]) {
      case 'GeneroForm':
        return <GeneroForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} />;
      case 'TipoInscripcionForm':
        return <TipoInscripcionForm 
          formData={formData} 
          setFormData={setFormData} 
          errors={errors} 
          onNext={handleNextStep} 
          navigation={navigation} 
          resetForm={resetForm}
          setJugadorSeleccionado={setJugadorSeleccionado}
        />;
      case 'TemporadaReinscripcionForm':
        return <TemporadaReinscripcionForm 
          formData={formData} 
          setFormData={setFormData} 
          errors={errors} 
          onNext={handleNextStep}
          temporadas={temporadas}
          setTemporadas={setTemporadas}
          temporadaSeleccionada={temporadaSeleccionada}
          setTemporadaSeleccionada={setTemporadaSeleccionada}
          jugadorSeleccionado={jugadorSeleccionado}
        />;
      case 'DatosPersonalesForm':
        return <DatosPersonalesForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} />;
      case 'DatosContactoForm':
        return <DatosContactoForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} />;
      case 'DatosEscolaresMedicosForm':
        return <DatosEscolaresMedicosForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} />;
      case 'TransferenciaForm':
        return <TransferenciaForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} />;
      // case 'FirmaForm':
      //   return <FirmaForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} signatureViewRef={signatureViewRef} captureSignature={captureSignature} />;
      case 'FotoForm':
        return <FotoForm formData={formData} setFormData={setFormData} errors={errors} onNext={handleNextStep} />;
      case 'DocumentacionForm':
        return <DocumentacionForm 
          formData={formData} 
          setFormData={setFormData} 
          onSubmit={handleSubmit} 
          uploadProgress={uploadProgress}
          currentUpload={currentUpload}
          handleSelectFile={handleSelectFile}
        />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, '#FFFFFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          {/* Progress Indicator */}
          {steps.length > 1 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentStep + 1) / steps.length) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                Paso {currentStep + 1} de {steps.length}
              </Text>
            </View>
          )}

          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderForm()}
            </ScrollView>
          </Animated.View>

          {currentStep > 0 && currentStep !== steps.length && (
            <TouchableOpacity style={styles.backButton} onPress={handlePreviousStep}>
              <LinearGradient
                colors={[theme.colors.muted, theme.colors.muted + 'DD']}
                style={styles.backButtonGradient}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                <Text style={styles.backButtonText}>Atrás</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {loading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                {currentUpload && (
                  <Text style={styles.uploadingText}>
                    Subiendo {currentUpload}... {Math.round(uploadProgress[currentUpload] || 0)}%
                  </Text>
                )}
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Componente GeneroForm
const GeneroForm = ({ formData, setFormData, errors, onNext }) => {
  const selectGender = (gender) => {
    setFormData({ ...formData, sexo: gender });
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={40} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>¿Registrarás a un hombre o mujer?</Text>
      <Text style={styles.subtitle}>Selecciona el género para continuar con el registro</Text>
      
      <View style={styles.genderOptionsContainer}>
        <TouchableOpacity
          style={[
            styles.genderOption,
            formData.sexo === 'hombre' && styles.genderOptionSelected
          ]}
          onPress={() => selectGender('hombre')}
          activeOpacity={0.7}
        >
          <View style={[
            styles.genderIconContainer,
            formData.sexo === 'hombre' && styles.genderIconContainerSelected
          ]}>
            <Ionicons 
              name="male" 
              size={32} 
              color={formData.sexo === 'hombre' ? '#FFFFFF' : theme.colors.primary} 
            />
          </View>
          <Text style={[
            styles.genderOptionText,
            formData.sexo === 'hombre' && styles.genderOptionTextSelected
          ]}>
            Hombre
          </Text>
          {formData.sexo === 'hombre' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} style={styles.checkIcon} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.genderOption,
            formData.sexo === 'mujer' && styles.genderOptionSelected
          ]}
          onPress={() => selectGender('mujer')}
          activeOpacity={0.7}
        >
          <View style={[
            styles.genderIconContainer,
            formData.sexo === 'mujer' && styles.genderIconContainerSelected
          ]}>
            <Ionicons 
              name="female" 
              size={32} 
              color={formData.sexo === 'mujer' ? '#FFFFFF' : theme.colors.primary} 
            />
          </View>
          <Text style={[
            styles.genderOptionText,
            formData.sexo === 'mujer' && styles.genderOptionTextSelected
          ]}>
            Mujer
          </Text>
          {formData.sexo === 'mujer' && (
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} style={styles.checkIcon} />
          )}
        </TouchableOpacity>
      </View>
      
      {errors.sexo && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
          <Text style={styles.errorText}>{errors.sexo}</Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={[styles.button, !formData.sexo && styles.buttonDisabled]} 
        onPress={onNext} 
        activeOpacity={0.8}
        disabled={!formData.sexo}
      >
        <LinearGradient
          colors={formData.sexo ? [theme.colors.primary, theme.colors.primaryDark] : [theme.colors.muted, theme.colors.muted]}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// Componente TipoInscripcionForm
const TipoInscripcionForm = ({ formData, setFormData, errors, onNext, navigation, resetForm, setJugadorSeleccionado }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchError, setSearchError] = useState('');
  const [foundPlayer, setFoundPlayer] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [reinscribiendo, setReinscribiendo] = useState(false);
  const [existingPlayers, setExistingPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  const tipoInscripcionOptions = [
    { label: "Selecciona un tipo de inscripción", value: "" },
    { label: "Novato / Nuevo Registro", value: "novato" },
    { label: "Reinscripción", value: "reinscripcion" },
    { label: "Transferencia", value: "transferencia" },
    ...(formData.sexo === "mujer" ? [{ label: "Porrista", value: "porrista" }] : []),
  ];

  const validateSearchTerm = (term) => {
    if (term.length === 18) return { type: 'curp', isValid: true };
    if (/^\d{6}$/.test(term)) return { type: 'mfl', isValid: true };
    return { type: null, isValid: false };
  };

  const searchPlayer = async () => {
    console.log('🔍 [searchPlayer] Iniciando búsqueda manual...');
    console.log('📝 [searchPlayer] Término de búsqueda:', searchTerm);
    
    const validation = validateSearchTerm(searchTerm);
    console.log('✅ [searchPlayer] Validación:', validation);
    
    if (!validation.isValid) {
      console.warn('⚠️ [searchPlayer] Término de búsqueda inválido');
      setSearchError('Ingresa un CURP (18 caracteres) o MFL (6 dígitos) válido');
      return;
    }

    setLoadingSearch(true);
    setSearchError('');
    setFoundPlayer(null);
    
    console.log('👤 [searchPlayer] Buscando con:', {
      tipo: validation.type,
      termino: searchTerm,
      sexo: formData.sexo
    });

    try {
      let q;
      if (validation.type === 'curp') {
        q = query(
          collection(db, 'jugadores'),
          where('curp', '==', searchTerm.toUpperCase()),
          where('activo', '==', 'no activo')
        );
      } else {
        q = query(
          collection(db, 'jugadores'),
          where('numero_mfl', '==', searchTerm),
          where('activo', '==', 'no activo')
        );
      }

      let qCheerleader;
      if (formData.sexo === 'mujer') {
        if (validation.type === 'curp') {
          qCheerleader = query(
            collection(db, 'porristas'),
            where('curp', '==', searchTerm.toUpperCase()),
            where('activo', '==', 'no activo')
          );
        } else {
          qCheerleader = query(
            collection(db, 'porristas'),
            where('numero_mfl', '==', searchTerm),
            where('activo', '==', 'no activo')
          );
        }
      }

      const [playersSnapshot, cheerleadersSnapshot] = await Promise.all([
        getDocs(q),
        qCheerleader ? getDocs(qCheerleader) : Promise.resolve({ empty: true }),
      ]);

      let playerData = null;
      
      if (!playersSnapshot.empty) {
        playerData = { 
          ...playersSnapshot.docs[0].data(), 
          id: playersSnapshot.docs[0].id,
          collection: 'jugadores'
        };
      } else if (!cheerleadersSnapshot.empty) {
        playerData = { 
          ...cheerleadersSnapshot.docs[0].data(), 
          id: cheerleadersSnapshot.docs[0].id,
          collection: 'porristas'
        };
      }

      console.log('📊 [searchPlayer] Resultados de búsqueda:', {
        playersSnapshot: {
          size: playersSnapshot.size,
          empty: playersSnapshot.empty
        },
        cheerleadersSnapshot: {
          size: cheerleadersSnapshot.size,
          empty: cheerleadersSnapshot.empty
        },
        playerData: playerData ? {
          id: playerData.id,
          nombre: playerData.nombre,
          activo: playerData.activo,
          collection: playerData.collection
        } : null
      });

      if (playerData) {
        console.log('✅ [searchPlayer] Jugador encontrado:', playerData);
        setFoundPlayer(playerData);
        // Guardar el jugador seleccionado para el flujo de reinscripción
        if (setJugadorSeleccionado) {
          setJugadorSeleccionado(playerData);
          // Pre-llenar formData con los datos del jugador
          setFormData(prev => ({
            ...prev,
            nombre: playerData.nombre || '',
            apellido_p: playerData.apellido_p || '',
            apellido_m: playerData.apellido_m || '',
            sexo: playerData.sexo || '',
            fecha_nacimiento: playerData.fecha_nacimiento ? new Date(playerData.fecha_nacimiento) : new Date(),
            curp: playerData.curp || '',
            grado_escolar: playerData.grado_escolar || '',
            nombre_escuela: playerData.nombre_escuela || '',
            alergias: playerData.alergias || '',
            padecimientos: playerData.padecimientos || '',
            peso: playerData.peso || '',
            categoria: playerData.categoria || '',
            // Datos de contacto / tutor que queremos conservar en la reinscripción
            direccion: playerData.direccion || '',
            telefono: playerData.telefono || '',
            celular_tutor: playerData.celular_tutor || '',
            correo_tutor: playerData.correo_tutor || ''
          }));
        }
      } else {
        console.warn('⚠️ [searchPlayer] No se encontró jugador');
        setSearchError('No se encontró un jugador/porrista con esos datos o ya está activo');
      }
    } catch (error) {
      console.error('❌ [searchPlayer] Error al buscar jugador:', error);
      console.error('❌ [searchPlayer] Stack:', error.stack);
      setSearchError('Error al buscar jugador. Inténtalo de nuevo.');
    } finally {
      setLoadingSearch(false);
      console.log('🏁 [searchPlayer] Búsqueda finalizada');
    }
  };

  const handleReinscripcionContinue = () => {
    if (!foundPlayer) {
      Alert.alert('Error', 'Debes seleccionar un jugador primero');
      return;
    }
    // Continuar al siguiente paso (selección de temporada)
    onNext();
  };

  const handleTipoInscripcionChange = (itemValue) => {
    console.log('🔄 [handleTipoInscripcionChange] Cambiando tipo de inscripción:', itemValue);
    console.log('📋 [handleTipoInscripcionChange] formData actual:', {
      tipo_inscripcion: formData.tipo_inscripcion,
      sexo: formData.sexo
    });
    
    setFormData({ ...formData, tipo_inscripcion: itemValue });
    setFoundPlayer(null);
    setSearchTerm('');
    setSearchError('');
    
    // Cargar jugadores/porristas existentes cuando se selecciona reinscripción
    if (itemValue === 'reinscripcion') {
      console.log('✅ [handleTipoInscripcionChange] Reinscripción seleccionada, cargando jugadores...');
      loadExistingPlayers();
    } else {
      console.log('🔄 [handleTipoInscripcionChange] Limpiando lista de jugadores');
      setExistingPlayers([]);
    }
  };

  const loadExistingPlayers = async () => {
    console.log('🔍 [loadExistingPlayers] Iniciando carga de jugadores existentes...');
    setLoadingPlayers(true);
    try {
      const user = await getCurrentUser();
      console.log('👤 [loadExistingPlayers] Usuario obtenido de session:', {
        user: user,
        uid: user?.uid,
        email: user?.email
      });
      
      if (!user || !user.uid) {
        console.warn('⚠️ [loadExistingPlayers] No se encontró usuario o uid en session');
        setLoadingPlayers(false);
        return;
      }

      // Obtener el uid real del documento de usuario en Firestore
      // El user.uid de session es el ID del documento, pero necesitamos el campo uid del documento
      const usuariosQuery = query(
        collection(db, 'usuarios'),
        where('correo', '==', user.email)
      );
      const usuariosSnapshot = await getDocs(usuariosQuery);
      
      let realUid = user.uid; // Fallback al ID del documento
      
      if (!usuariosSnapshot.empty) {
        const userDoc = usuariosSnapshot.docs[0];
        const userData = userDoc.data();
        realUid = userData.uid || userDoc.id; // Usar el campo uid del documento o el ID como fallback
        console.log('📄 [loadExistingPlayers] Datos del usuario en Firestore:', {
          docId: userDoc.id,
          uidCampo: userData.uid,
          uidUsado: realUid,
          userData: userData
        });
      } else {
        console.warn('⚠️ [loadExistingPlayers] No se encontró el documento del usuario en Firestore');
      }

      const collectionName = formData.sexo === 'mujer' ? 'porristas' : 'jugadores';
      console.log('📋 [loadExistingPlayers] Parámetros de búsqueda:', {
        collectionName,
        sexo: formData.sexo,
        uid: realUid,
        uidSession: user.uid
      });

      // Buscar jugadores inactivos (para reinscripción)
      const qInactivos = query(
        collection(db, collectionName),
        where('uid', '==', realUid),
      );
      console.log('🔎 [loadExistingPlayers] Query inactivos:', qInactivos);

      // También buscar activos para debug
      const qActivos = query(
        collection(db, collectionName),
        where('uid', '==', realUid),
        where('activo', '==', 'activo')
      );
      console.log('🔎 [loadExistingPlayers] Query activos:', qActivos);

      // Buscar todos sin filtro de activo para debug
      const qTodos = query(
        collection(db, collectionName),
        where('uid', '==', realUid)
      );
      console.log('🔎 [loadExistingPlayers] Query todos:', qTodos);

      const [snapshotInactivos, snapshotActivos, snapshotTodos] = await Promise.all([
        getDocs(qInactivos),
        getDocs(qActivos),
        getDocs(qTodos)
      ]);

      console.log('📊 [loadExistingPlayers] Resultados de búsqueda:', {
        inactivos: {
          size: snapshotInactivos.size,
          empty: snapshotInactivos.empty,
          docs: snapshotInactivos.docs.map(d => ({ id: d.id, nombre: d.data().nombre, activo: d.data().activo, uid: d.data().uid }))
        },
        activos: {
          size: snapshotActivos.size,
          empty: snapshotActivos.empty,
          docs: snapshotActivos.docs.map(d => ({ id: d.id, nombre: d.data().nombre, activo: d.data().activo, uid: d.data().uid }))
        },
        todos: {
          size: snapshotTodos.size,
          empty: snapshotTodos.empty,
          docs: snapshotTodos.docs.map(d => ({ id: d.id, nombre: d.data().nombre, activo: d.data().activo, uid: d.data().uid }))
        }
      });

      // Usar los inactivos para reinscripción, pero también incluir activos si no hay inactivos
      let players = snapshotInactivos.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        collection: collectionName
      }));

      // Si no hay inactivos pero hay activos, mostrar los activos también (puede que quiera reinscribir)
      if (players.length === 0 && snapshotActivos.size > 0) {
        console.log('ℹ️ [loadExistingPlayers] No hay inactivos, incluyendo activos para reinscripción');
        players = snapshotActivos.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          collection: collectionName
        }));
      }

      console.log('✅ [loadExistingPlayers] Jugadores encontrados para reinscripción:', players.length);
      if (players.length > 0) {
        console.log('📝 [loadExistingPlayers] Primer jugador:', {
          id: players[0].id,
          nombre: players[0].nombre,
          activo: players[0].activo,
          uid: players[0].uid
        });
      } else {
        console.warn('⚠️ [loadExistingPlayers] No se encontraron jugadores para mostrar');
      }

      setExistingPlayers(players);
    } catch (error) {
      console.error('❌ [loadExistingPlayers] Error al cargar jugadores existentes:', error);
      console.error('❌ [loadExistingPlayers] Stack:', error.stack);
    } finally {
      setLoadingPlayers(false);
      console.log('🏁 [loadExistingPlayers] Finalizado');
    }
  };

  const selectExistingPlayer = (player) => {
    console.log('👆 [selectExistingPlayer] Jugador seleccionado:', {
      id: player.id,
      nombre: player.nombre,
      activo: player.activo,
      uid: player.uid
    });
    setFoundPlayer(player);
    setSearchTerm('');
    setSearchError('');
    // Guardar el jugador seleccionado para el flujo de reinscripción
    if (setJugadorSeleccionado) {
      setJugadorSeleccionado(player);
      // Pre-llenar formData con los datos del jugador
      setFormData(prev => ({
        ...prev,
        nombre: player.nombre || '',
        apellido_p: player.apellido_p || '',
        apellido_m: player.apellido_m || '',
        sexo: player.sexo || '',
        fecha_nacimiento: player.fecha_nacimiento ? new Date(player.fecha_nacimiento) : new Date(),
        curp: player.curp || '',
        grado_escolar: player.grado_escolar || '',
        nombre_escuela: player.nombre_escuela || '',
        alergias: player.alergias || '',
        padecimientos: player.padecimientos || '',
        peso: player.peso || '',
        categoria: player.categoria || '',
        // Datos de contacto / tutor que queremos conservar en la reinscripción
        direccion: player.direccion || '',
        telefono: player.telefono || '',
        celular_tutor: player.celular_tutor || '',
        correo_tutor: player.correo_tutor || ''
      }));
    }
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Tipo de Inscripción</Text>
      <Picker
        selectedValue={formData.tipo_inscripcion}
        onValueChange={handleTipoInscripcionChange}
        style={styles.picker}
      >
        {tipoInscripcionOptions.map((option, index) => (
          <Picker.Item key={index} label={option.label} value={option.value} />
        ))}
      </Picker>
      {errors.tipo_inscripcion && <Text style={styles.errorText}>{errors.tipo_inscripcion}</Text>}

      {formData.tipo_inscripcion === 'reinscripcion' && (
        <View style={styles.reinscripcionContainer}>
          <Text style={styles.subtitle}>Selecciona un jugador/porrista para reinscribir</Text>
          
          {/* Lista de jugadores/porristas existentes */}
          {loadingPlayers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Cargando jugadores...</Text>
            </View>
          ) : existingPlayers.length > 0 ? (
            <View style={styles.playersListContainer}>
              <Text style={styles.sectionTitle}>Tus jugadores/porristas registrados:</Text>
              <ScrollView style={styles.playersList} nestedScrollEnabled>
                {existingPlayers.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerCard,
                      foundPlayer?.id === player.id && styles.playerCardSelected
                    ]}
                    onPress={() => selectExistingPlayer(player)}
                    activeOpacity={0.7}
                  >
                    {player.foto && (
                      <Image 
                        source={{ uri: player.foto }} 
                        style={styles.playerCardImage}
                      />
                    )}
                    <View style={styles.playerCardInfo}>
                      <Text style={styles.playerCardName}>
                        {player.nombre} {player.apellido_p} {player.apellido_m}
                      </Text>
                      <Text style={styles.playerCardDetails}>
                        {player.curp} • MFL: {player.numero_mfl || 'N/A'}
                      </Text>
                    </View>
                    {foundPlayer?.id === player.id && (
                      <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.noPlayersContainer}>
              <Ionicons name="people-outline" size={48} color={theme.colors.muted} />
              <Text style={styles.noPlayersText}>No tienes jugadores/porristas registrados</Text>
            </View>
          )}

          {/* Separador */}
          {existingPlayers.length > 0 && (
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>O busca por CURP/MFL</Text>
              <View style={styles.separatorLine} />
            </View>
          )}

          {/* Búsqueda manual */}
          <View style={styles.searchSection}>
            <TextInput
              style={styles.input}
              placeholder="Ingresa CURP (18 caracteres) o MFL (6 dígitos)"
              placeholderTextColor={theme.colors.muted}
              value={searchTerm}
              onChangeText={setSearchTerm}
              maxLength={18}
              autoCapitalize="characters"
            />
            
            {searchError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
                <Text style={styles.errorText}>{searchError}</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.searchButton, !searchTerm.trim() && styles.buttonDisabled]} 
              onPress={searchPlayer}
              disabled={loadingSearch || !searchTerm.trim()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={searchTerm.trim() ? [theme.colors.primary, theme.colors.primaryDark] : [theme.colors.muted, theme.colors.muted]}
                style={styles.searchButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loadingSearch ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                    <Text style={styles.buttonText}>Buscar</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {foundPlayer && (
            <View style={styles.playerInfoContainer}>
              <Text style={styles.playerInfoTitle}>Jugador encontrado:</Text>
              
              {foundPlayer.foto && (
                <Image 
                  source={{ uri: foundPlayer.foto }} 
                  style={styles.playerImage}
                />
              )}
              
              <Text style={styles.playerInfoText}>
                Nombre: {foundPlayer.nombre} {foundPlayer.apellido_p} {foundPlayer.apellido_m}
              </Text>
              <Text style={styles.playerInfoText}>CURP: {foundPlayer.curp}</Text>
              <Text style={styles.playerInfoText}>MFL: {foundPlayer.numero_mfl || 'N/A'}</Text>
              <Text style={styles.playerInfoText}>Estado actual: {foundPlayer.activo}</Text>
              
              <TouchableOpacity 
                style={styles.reinscribirButton}
                onPress={handleReinscripcionContinue}
                disabled={reinscribiendo}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primaryDark]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>Continuar</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {formData.tipo_inscripcion && formData.tipo_inscripcion !== 'reinscripcion' && (
        <TouchableOpacity 
          style={styles.button} 
          onPress={onNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Componente TemporadaReinscripcionForm
const TemporadaReinscripcionForm = ({ 
  formData, 
  setFormData, 
  errors, 
  onNext,
  temporadas,
  setTemporadas,
  temporadaSeleccionada,
  setTemporadaSeleccionada,
  jugadorSeleccionado
}) => {
  const [loadingTemporadas, setLoadingTemporadas] = useState(false);
  const [categoriaCalculada, setCategoriaCalculada] = useState(null);

  // Cargar temporadas disponibles
  useEffect(() => {
    const loadTemporadas = async () => {
      console.log('🔄 [TemporadaReinscripcionForm] Cargando temporadas...');
      setLoadingTemporadas(true);
      try {
        const temporadasQuery = query(
          collection(db, 'temporadas'),
          where('estado_temporada', 'in', ['Activa', 'Inactiva'])
        );
        const temporadasSnapshot = await getDocs(temporadasQuery);
        
        const temporadasList = temporadasSnapshot.docs.map(doc => ({
          label: doc.data().temporada || 'Sin nombre',
          value: doc.id,
          estado: doc.data().estado_temporada || 'Inactiva',
          ...doc.data()
        }));
        
        // Ordenar por temporada (más reciente primero)
        temporadasList.sort((a, b) => {
          const aNum = parseInt(a.label.match(/\d+/)?.[0] || '0');
          const bNum = parseInt(b.label.match(/\d+/)?.[0] || '0');
          return bNum - aNum;
        });
        
        console.log('✅ [TemporadaReinscripcionForm] Temporadas cargadas:', temporadasList.length);
        setTemporadas(temporadasList);
      } catch (error) {
        console.error('❌ [TemporadaReinscripcionForm] Error al cargar temporadas:', error);
        Alert.alert('Error', 'No se pudieron cargar las temporadas');
      } finally {
        setLoadingTemporadas(false);
      }
    };

    loadTemporadas();
  }, []);

  // Determinar categoría cuando se selecciona una temporada
  useEffect(() => {
    if (temporadaSeleccionada && jugadorSeleccionado && jugadorSeleccionado.fecha_nacimiento && jugadorSeleccionado.sexo) {
      console.log('🔄 [TemporadaReinscripcionForm] Calculando categoría para nueva temporada...');
      determinarCategoriaParaTemporada(temporadaSeleccionada, jugadorSeleccionado);
    }
  }, [temporadaSeleccionada, jugadorSeleccionado]);

  const determinarCategoriaParaTemporada = async (temporadaId, jugador) => {
    try {
      const fechaNac = jugador.fecha_nacimiento instanceof Date 
        ? jugador.fecha_nacimiento 
        : new Date(jugador.fecha_nacimiento);
      
      console.log('📅 [determinarCategoriaParaTemporada] Fecha nacimiento:', fechaNac.toISOString().split('T')[0]);
      console.log('👤 [determinarCategoriaParaTemporada] Sexo:', jugador.sexo);
      console.log('🏆 [determinarCategoriaParaTemporada] Temporada ID:', temporadaId);

      // Primero obtener el nombre de la temporada desde el ID
      let nombreTemporada = null;
      try {
        const temporadaDoc = await getDoc(doc(db, 'temporadas', temporadaId));
        if (temporadaDoc.exists()) {
          nombreTemporada = temporadaDoc.data().temporada;
          console.log('📋 [determinarCategoriaParaTemporada] Nombre de temporada:', nombreTemporada);
        } else {
          console.warn('⚠️ [determinarCategoriaParaTemporada] No se encontró la temporada con ID:', temporadaId);
        }
      } catch (error) {
        console.error('❌ [determinarCategoriaParaTemporada] Error al obtener temporada:', error);
      }

      if (!nombreTemporada) {
        console.warn('⚠️ [determinarCategoriaParaTemporada] No se pudo obtener el nombre de la temporada');
        setCategoriaCalculada('NO ENCONTRADA');
        setFormData(prev => ({
          ...prev,
          categoria: 'NO ENCONTRADA',
          temporadaId: temporadaId
        }));
        return;
      }

      // Buscar categorías asociadas a esta temporada por nombre
      const categoriasRef = collection(db, 'categorias');
      const q = query(
        categoriasRef, 
        where('sexo', '==', jugador.sexo),
        where('temporada', '==', nombreTemporada)
      );
      const querySnapshot = await getDocs(q);
      
      console.log('🔍 [determinarCategoriaParaTemporada] Categorías encontradas:', querySnapshot.size);

      if (querySnapshot.empty) {
        console.warn('⚠️ [determinarCategoriaParaTemporada] No se encontraron categorías para esta temporada');
        setCategoriaCalculada('NO ENCONTRADA');
        setFormData(prev => ({
          ...prev,
          categoria: 'NO ENCONTRADA',
          temporadaId: temporadaId
        }));
        return;
      }

      let categoriaAsignada = 'NO ENCONTRADA';

      for (const doc of querySnapshot.docs) {
        const categoriaData = doc.data();
        const fechaInicio = new Date(categoriaData.fecha_inicio);
        const fechaFin = new Date(categoriaData.fecha_fin);

        if (fechaNac >= fechaInicio && fechaNac <= fechaFin) {
          categoriaAsignada = categoriaData.nombre_categoria;
          console.log('✅ [determinarCategoriaParaTemporada] Categoría asignada:', categoriaAsignada);
          console.log('   - Rango categoría:', fechaInicio.toISOString().split('T')[0], 'a', fechaFin.toISOString().split('T')[0]);
          break;
        }
      }

      setCategoriaCalculada(categoriaAsignada);
      setFormData(prev => ({
        ...prev,
        categoria: categoriaAsignada,
        temporadaId: temporadaId
      }));
    } catch (error) {
      console.error('❌ [determinarCategoriaParaTemporada] Error:', error);
      setCategoriaCalculada('NO ENCONTRADA');
      setFormData(prev => ({
        ...prev,
        categoria: 'NO ENCONTRADA',
        temporadaId: temporadaId
      }));
    }
  };

  const handleTemporadaChange = (itemValue) => {
    console.log('🔄 [handleTemporadaChange] Temporada seleccionada:', itemValue);
    setTemporadaSeleccionada(itemValue);
    setFormData(prev => ({
      ...prev,
      temporadaId: itemValue
    }));
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Selecciona la Temporada</Text>
      <Text style={styles.subtitle}>
        Selecciona la temporada a la que deseas reinscribir a {jugadorSeleccionado?.nombre || 'este jugador'}
      </Text>

      {loadingTemporadas ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Cargando temporadas...</Text>
        </View>
      ) : (
        <>
          <Picker
            selectedValue={temporadaSeleccionada}
            onValueChange={handleTemporadaChange}
            style={styles.picker}
          >
            <Picker.Item label="Selecciona una temporada" value="" />
            {temporadas.map((temp) => (
              <Picker.Item 
                key={temp.value} 
                label={`${temp.label} (${temp.estado})`} 
                value={temp.value} 
              />
            ))}
          </Picker>

          {temporadaSeleccionada && categoriaCalculada && (
            <View style={styles.infoContainer}>
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>Categoría asignada:</Text>
                  <Text style={styles.infoValue}>{categoriaCalculada}</Text>
                </View>
              </View>
            </View>
          )}

          {errors.temporadaId && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.danger} />
              <Text style={styles.errorText}>{errors.temporadaId}</Text>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, !temporadaSeleccionada && styles.buttonDisabled]} 
            onPress={onNext}
            disabled={!temporadaSeleccionada}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={temporadaSeleccionada ? [theme.colors.primary, theme.colors.primaryDark] : [theme.colors.muted, theme.colors.muted]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

// Componente DatosPersonalesForm
const DatosPersonalesForm = ({ formData, setFormData, errors, onNext }) => {
  
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [dateInputValue, setDateInputValue] = useState(
    formData.fecha_nacimiento ? new Date(formData.fecha_nacimiento).toISOString().split('T')[0] : ''
  );
  const [dateError, setDateError] = useState('');
  const [categoriaError, setCategoriaError] = useState('');

  const determinarCategoria = async (fechaNacimiento, sexo) => {
    if (!fechaNacimiento || !sexo) return;

    try {
      const fechaNac = new Date(fechaNacimiento);
      const categoriasRef = collection(db, 'categorias');
      const q = query(categoriasRef, where('sexo', '==', sexo));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No se encontraron categorías para el sexo especificado');
        setFormData(prev => ({
          ...prev,
          categoria: 'NO ENCONTRADA',
          temporadaId: null,
        }));
        return;
      }

      let categoriaAsignada = 'NO ENCONTRADA';
      let tempTemporadaInfo = null;

      for (const doc of querySnapshot.docs) {
        const categoriaData = doc.data();
        const fechaInicio = new Date(categoriaData.fecha_inicio);
        const fechaFin = new Date(categoriaData.fecha_fin);

        if (fechaNac >= fechaInicio && fechaNac <= fechaFin) {
          categoriaAsignada = categoriaData.nombre_categoria;
          console.log('🏷️ CATEGORIA ASIGNADA EN determinarCategoria:', categoriaAsignada);
          console.log('   - Fecha nacimiento:', fechaNac.toISOString().split('T')[0]);
          console.log('   - Rango categoria:', fechaInicio.toISOString().split('T')[0], 'a', fechaFin.toISOString().split('T')[0]);
          tempTemporadaInfo = {
            nombre: categoriaData.temporada,
            id: categoriaData.temporadaId
          };
          break;
        }
      }

      setFormData(prev => ({
        ...prev,
        categoria: categoriaAsignada,
        temporadaId: tempTemporadaInfo?.id || null
      }));

    } catch (error) {
      console.error('Error al determinar categoría:', error);
      setFormData(prev => ({
        ...prev,
        categoria: 'NO ENCONTRADA',
        temporadaId: null
      }));
    }
  };

useEffect(() => {
  // Limpiar error de categoría cuando se actualice a un valor válido
  if (formData.categoria && formData.categoria !== 'NO ENCONTRADA') {
    setCategoriaError('');
  }
}, [formData.categoria]);

  useEffect(() => {
    if (formData.tipo_inscripcion === 'porrista') {
      setFormData(prev => ({ ...prev, categoria: '' }));
      return;
    }

    if (formData.fecha_nacimiento && formData.sexo) {
      determinarCategoria(formData.fecha_nacimiento, formData.sexo);
    }
  }, [formData.fecha_nacimiento, formData.sexo, formData.tipo_inscripcion]);

  const onChangeMobile = (event, selectedDate) => {
    setShowPicker(true);
    if (selectedDate) {
      updateDate(selectedDate);
    }
  };

  const updateDate = (newDate) => {
    const validDate = new Date(newDate);
    if (isNaN(validDate.getTime())) return;

    setDate(validDate);
    setDateInputValue(validDate.toISOString().split('T')[0]);
    setFormData({ ...formData, fecha_nacimiento: validDate });
    
    // Validar si la fecha es hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(validDate);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      setDateError('La fecha de nacimiento no puede ser hoy');
    } else {
      setDateError('');
    }
    
  };

  const handleWebDateChange = (e) => {
    const value = e.target.value;
    setDateInputValue(value);
    
    if (value) {
      const newDate = new Date(value);
      if (!isNaN(newDate.getTime())) {
        updateDate(newDate);
      }
    }
  };

  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(new Date(dateObj).getTime())) return 'Fecha inválida';
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateObj).toLocaleDateString('es-MX', options);
  };

  const handleNext = () => {
    // Validar categoría solo si no es porrista
  if (formData.tipo_inscripcion !== 'porrista') {
    if (!formData.categoria || formData.categoria === 'NO ENCONTRADA') {
      setCategoriaError('No se pudo asignar una categoría válida. Verifica la fecha de nacimiento.');
      return;
    }
    // No necesitamos else aquí, el useEffect se encargará de limpiar el error
  }
    
    // Validar fecha
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.fecha_nacimiento);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate.getTime() === today.getTime()) {
      setDateError('La fecha de nacimiento no puede ser hoy');
      return;
    }
    
    // Si todo está bien, continuar
    setDateError('');
    setCategoriaError('');
    onNext();
  };

  return (
    <ScrollView 
      style={styles.mainContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >  
        <View style={styles.formContainer}>
          <Text style={styles.title}>Datos Personales- Jugador(a)</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nombre del jugador(a)"
             placeholderTextColor="#444"
            value={formData.nombre}
            onChangeText={(text) => setFormData({ ...formData, nombre: text })}
          />
          {errors.nombre && <Text style={styles.errorText}>{errors.nombre}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Apellido Paterno"
             placeholderTextColor="#444"
            value={formData.apellido_p}
            onChangeText={(text) => setFormData({ ...formData, apellido_p: text })}
          />
          {errors.apellido_p && <Text style={styles.errorText}>{errors.apellido_p}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Apellido Materno"
             placeholderTextColor="#444"
            value={formData.apellido_m}
            onChangeText={(text) => setFormData({ ...formData, apellido_m: text })}
          />
          {errors.apellido_m && <Text style={styles.errorText}>{errors.apellido_m}</Text>}

          <Text style={styles.label}>Fecha de Nacimiento:</Text>
          
          {Platform.OS !== 'web' ? (
            <>
              <Button 
                title="Seleccionar fecha"
                onPress={() => setShowPicker(true)} 
              />
              {showPicker && (
                <DateTimePicker
                  value={date || new Date()}
                  mode="date"
                  display="default"
                  onChange={onChangeMobile}
                  maximumDate={new Date()}
                />
              )}
            </>
          ) : (
            <>
              <input
                type="date"
                
                onChange={handleWebDateChange}
                style={styles.webInput}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.fecha_nacimiento && (
                <Text style={styles.errorText}>{errors.fecha_nacimiento}</Text>
              )}
            </>
          )}

           <Text style={styles.selectedDate}>
            Fecha seleccionada: {formatDate(date)}
          </Text>
          
          {/* Mostrar error de fecha solo para porristas */}
          {formData.tipo_inscripcion === 'porrista' && dateError && (
            <Text style={styles.errorText}>{dateError}</Text>
          )}

          {/* Contenedor de categoría y errores asociados */}
          {formData.tipo_inscripcion !== 'porrista' && (
            <View style={styles.categoriaContainer}>
              {/* Información de categoría */}
              {formData.categoria && (
                <>
                  <Text style={styles.categoriaText}>
                    Categoría asignada:  
                    <Text style={styles.categoriaValue}>{formData.categoria}</Text>
                  </Text>
                  {formData.categoria === 'NO ENCONTRADA' && (
                    <Text style={styles.categoriaNota}>
                      *El jugador está fuera de los rangos de edad, VERIFICA SU FECHA DE NACIMIENTO
                    </Text>
                  )}
                </>
              )}
              
              {/* Errores agrupados */}
              {dateError && <Text style={styles.errorText}>{dateError}</Text>}
              {categoriaError && <Text style={styles.errorText}>{categoriaError}</Text>}
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Lugar de Nacimiento"
             placeholderTextColor="#444"
            value={formData.lugar_nacimiento}
            onChangeText={(text) => setFormData({ ...formData, lugar_nacimiento: text })}
          />
          {errors.lugar_nacimiento && <Text style={styles.errorText}>{errors.lugar_nacimiento}</Text>}

         {/* <TextInput
            style={styles.input}
            placeholder="CURP (EN MAYUSCULAS)"
             placeholderTextColor="#444"
            value={formData.curp}
            onChangeText={(text) => setFormData({ ...formData, curp: text.toUpperCase() })}
            maxLength={18}
          />
          {errors.curp && <Text style={styles.errorText}>{errors.curp}</Text>}

          <TouchableOpacity 
            onPress={() => Linking.openURL('https://www.gob.mx/curp/')} 
            style={styles.linkContainer}
          >
            <Text style={styles.linkText}>¿No sabes tu CURP? Consúltala aquí</Text>
          </TouchableOpacity>*/}

          <TouchableOpacity 
            style={[styles.button, (!!dateError || (formData.tipo_inscripcion !== 'porrista' && !!categoriaError)) && styles.buttonDisabled]} 
            onPress={handleNext}
            disabled={!!dateError || (formData.tipo_inscripcion !== 'porrista' && !!categoriaError)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(!!dateError || (formData.tipo_inscripcion !== 'porrista' && !!categoriaError)) ? [theme.colors.muted, theme.colors.muted] : [theme.colors.primary, theme.colors.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Continuar</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView> 
    </ScrollView>
  );
};


const validateContact = (direccion, telefono) => {
  if ((direccion !== undefined && direccion !== '') && (telefono !== undefined && telefono !== '')) return true
}

// Componente DatosContactoForm
const DatosContactoForm = ({ formData, setFormData, errors, onNext }) => {
  return (
    <ScrollView 
            style={styles.mainContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >

      <View style={styles.formContainer}>
        <Text style={styles.title}>Datos de Contacto</Text>
        <TextInput
          style={styles.input}
          placeholder="Dirección"
           placeholderTextColor="#444"
          value={formData.direccion}
          onChangeText={(text) => setFormData({ ...formData, direccion: text })}
        />
        {errors.direccion && <Text style={styles.errorText}>{errors.direccion}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
           placeholderTextColor="#444"
          value={formData.telefono}
          onChangeText={(text) => setFormData({ ...formData, telefono: text })}
          keyboardType="phone-pad"
        />
        {errors.telefono && <Text style={styles.errorText}>{errors.telefono}</Text>}
        <TouchableOpacity 
          style={[styles.button, !validateContact(formData.direccion, formData.telefono) && styles.buttonDisabled]} 
          onPress={onNext} 
          disabled={!validateContact(formData.direccion, formData.telefono)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={validateContact(formData.direccion, formData.telefono) ? [theme.colors.primary, theme.colors.primaryDark] : [theme.colors.muted, theme.colors.muted]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Componente DatosEscolaresMedicosForm
const DatosEscolaresMedicosForm = ({ formData, setFormData, errors, onNext }) => {
  return (
    <ScrollView 
      style={styles.mainContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Datos Escolares y Médicos</Text>
        
        {/* Grado Escolar */}
        <Text style={styles.label}>Grado Escolar</Text>
        <Picker
          selectedValue={formData.grado_escolar}
          onValueChange={(itemValue) => setFormData({ ...formData, grado_escolar: itemValue })}
          style={styles.picker}
        >
          <Picker.Item label="Selecciona el grado escolar" value="" />
          <Picker.Item label="Kinder" value="kinder" />
          <Picker.Item label="Primaria" value="primaria" />
          <Picker.Item label="Secundaria" value="secundaria" />
          <Picker.Item label="Preparatoria" value="preparatoria" />
        </Picker>
        {errors.grado_escolar && <Text style={styles.errorText}>{errors.grado_escolar}</Text>}
        
        {/* Nombre de la Escuela */}
        <Text style={styles.label}>Nombre de la Escuela</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa el nombre de la escuela"
          placeholderTextColor={theme.colors.muted}
          value={formData.nombre_escuela}
          onChangeText={(text) => setFormData({ ...formData, nombre_escuela: text })}
        />
        {errors.nombre_escuela && <Text style={styles.errorText}>{errors.nombre_escuela}</Text>}
        
        {/* Alergias */}
        <Text style={styles.label}>Alergias</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa las alergias (escribe 'No' si no tiene)"
          placeholderTextColor={theme.colors.muted}
          value={formData.alergias}
          onChangeText={(text) => setFormData({ ...formData, alergias: text })}
        />
        {errors.alergias && <Text style={styles.errorText}>{errors.alergias}</Text>}
        
        {/* Padecimientos */}
        <Text style={styles.label}>Padecimientos</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa los padecimientos (escribe 'No' si no tiene)"
          placeholderTextColor={theme.colors.muted}
          value={formData.padecimientos}
          onChangeText={(text) => setFormData({ ...formData, padecimientos: text })}
        />
        {errors.padecimientos && <Text style={styles.errorText}>{errors.padecimientos}</Text>}
        
        {/* Peso */}
        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ingresa el peso en kilogramos"
          placeholderTextColor={theme.colors.muted}
          value={formData.peso}
          onChangeText={(text) => setFormData({ ...formData, peso: text })}
          keyboardType="numeric"
        />
        {errors.peso && <Text style={styles.errorText}>{errors.peso}</Text>}
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={onNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Componente TransferenciaForm
const TransferenciaForm = ({ formData, setFormData, errors, onNext }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      transferencia: {
        ...prev.transferencia,
        [field]: value
      }
    }));
  };

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Datos de Transferencia</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Club de Origen"
         placeholderTextColor="#444"
        value={formData.transferencia.club_anterior}
        onChangeText={(text) => handleChange('club_anterior', text)}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Temporadas Jugadas"
         placeholderTextColor="#444"
        value={formData.transferencia.temporadas_jugadas}
        onChangeText={(text) => handleChange('temporadas_jugadas', text)}
      />
      
      <Picker
        selectedValue={formData.transferencia.motivo_transferencia}
        onValueChange={(itemValue) => handleChange('motivo_transferencia', itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Selecciona un motivo de transferencia" value="" />
        <Picker.Item label="Préstamo" value="prestamo" />
        <Picker.Item label="Cambio de domicilio" value="cambio_domicilio" />
        <Picker.Item label="Descanso" value="descanso" />
        <Picker.Item label="Transferencia definitiva" value="transferencia_definitiva" />
      </Picker>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={onNext}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.buttonText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// Componente FirmaFotoForm
const FirmaForm = ({ formData, setFormData, errors, onNext, signatureViewRef, captureSignature }) => {
  const [firmaConfirmada, setFirmaConfirmada] = useState(false);
  
  // Estados para la firma en web (SVG)
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Función para convertir SVG a Base64 (Web)
  const convertSvgToBase64 = async () => {
    try {
      const svgWidth = 300;
      const svgHeight = 150;
      
      let pathElements = '';
      paths.forEach((path, index) => {
        if (path.length > 0) {
          const pathData = path
            .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
            .join(' ');
          pathElements += `<path d="${pathData}" stroke="black" stroke-width="3" fill="none"/>`;
        }
      });

      const svgString = `
        <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          ${pathElements}
        </svg>
      `;

      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        canvas.width = svgWidth;
        canvas.height = svgHeight;
        
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, svgWidth, svgHeight);
        
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          resolve(base64);
        };
        
        img.src = url;
      });
    } catch (error) {
      console.error('Error convirtiendo SVG a Base64:', error);
      return null;
    }
  };

  const handleConfirmSignature = async () => {
    console.log('🔴 handleConfirmSignature llamado');
    console.log('🔴 Platform.OS:', Platform.OS);
    console.log('🔴 paths.length:', paths.length);
    if (Platform.OS === 'web') {
      // Para web - confirmar firma SVG
      if (paths.length === 0) {
        Alert.alert('Error', 'Por favor dibuja tu firma antes de confirmar');
        return;
      }

      const base64 = await convertSvgToBase64();
      console.log('🖊️ BASE64 GENERADO:', base64 ? 'SÍ' : 'NO');
      if (base64) {
        setFormData(prev => ({ ...prev, firma: base64 }));
        console.log('🖊️ FIRMA GUARDADA EN FORMDATA:', base64.substring(0, 50) + '...');
        setFirmaConfirmada(true);
        Alert.alert('Éxito', 'Firma capturada correctamente');
      }
    } else {
      // Para móvil - usar captureRef
      if (paths.length === 0) {
        Alert.alert('Error', 'Por favor dibuja tu firma antes de confirmar');
        return;
      }

      const capturedSignature = await captureSignature();
      if (capturedSignature) {
        setFormData(prev => ({ ...prev, firma: capturedSignature }));
        setFirmaConfirmada(true);
        Alert.alert('Éxito', 'Firma capturada correctamente');
      } else {
        Alert.alert('Error', 'No se pudo capturar la firma. Inténtalo de nuevo.');
      }
    }
  };

  const handleClearSignature = () => {
    setPaths([]);
    setCurrentPath([]);
    setFormData(prev => ({ ...prev, firma: '' }));
    setFirmaConfirmada(false);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event, gestureState) => {
      const { locationX, locationY } = event.nativeEvent;
      setIsDrawing(true);
      setScrollEnabled(false);
      setCurrentPath([{ x: locationX, y: locationY }]);
    },
    onPanResponderMove: (event, gestureState) => {
      if (!isDrawing) return;
      const { locationX, locationY } = event.nativeEvent;
      setCurrentPath((prevPath) => [...prevPath, { x: locationX, y: locationY }]);
    },
    onPanResponderRelease: () => {
      setIsDrawing(false);
      setScrollEnabled(true);
      const newPaths = [...paths, currentPath];
      setPaths(newPaths);
      setCurrentPath([]);
    },
  });

  const getPathData = (path) => {
    if (path.length === 0) return '';
    return path
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  };

  return (
    <ScrollView 
      style={styles.mainContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEnabled={scrollEnabled}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Captura tu firma</Text>
        
        {/* IMPORTANTE: Esta es la vista que se capturará */}
        <View 
          ref={signatureViewRef} 
          style={styles.signatureContainer} 
          {...panResponder.panHandlers}
        >
          <Svg style={styles.canvas} width={300} height={150}>
            <Rect width="100%" height="100%" fill="white" stroke="#ddd" strokeWidth={1} />
            {paths.map((path, index) => (
              <Path
                key={index}
                d={getPathData(path)}
                stroke="black"
                strokeWidth={3}
                fill="none"
              />
            ))}
            <Path
              d={getPathData(currentPath)}
              stroke="black"
              strokeWidth={3}
              fill="none"
            />
          </Svg>
        </View>
        
        <View style={styles.signatureButtonsContainer}>
          <TouchableOpacity 
            style={styles.signatureButton} 
            onPress={handleConfirmSignature}
          >
            <Text style={styles.signatureButtonText}>Confirmar Firma</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.signatureButton, styles.clearButton]} 
            onPress={handleClearSignature}
          >
            <Text style={styles.signatureButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        {/* Indicador de estado de la firma */}
        {firmaConfirmada && formData.firma && formData.firma !== '' ? (
          <View style={styles.successContainer}>
            <Text style={styles.signatureStatus}>
              ✅ Firma capturada correctamente
            </Text>
            {formData.firma.startsWith('data:image') && (
              <Image
                source={{ uri: formData.firma }}
                style={styles.signaturePreview}
                resizeMode="contain"
              />
            )}
          </View>
        ) : (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Dibuja tu firma y presiona "Confirmar Firma" para continuar
            </Text>
          </View>
        )}
        
        {errors.firma && <Text style={styles.errorText}>{errors.firma}</Text>}
        
        <TouchableOpacity 
          style={[
            styles.button,
            (!firmaConfirmada || !formData.firma || formData.firma === '') && styles.buttonDisabled
          ]} 
          onPress={onNext}
          disabled={!firmaConfirmada || !formData.firma || formData.firma === ''}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={(!firmaConfirmada || !formData.firma || formData.firma === '') ? [theme.colors.muted, theme.colors.muted] : [theme.colors.primary, theme.colors.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Componente FotoForm - NUEVO
const FotoForm = ({ formData, setFormData, errors, onNext }) => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasGalleryPermission, setHasGalleryPermission] = useState(null);
  
  useEffect(() => {
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');
      setHasGalleryPermission(galleryStatus.status === 'granted');
    })();
  }, []);

  const handleSelectFoto = async () => {
    if (!hasGalleryPermission) {
      Alert.alert('Permisos denegados', 'Necesitas permitir el acceso a la galería');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.3,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setFormData(prev => ({
          ...prev,
          foto_jugador: {
            uri: selectedImage.uri,
            name: `foto_jugador_${Date.now()}.jpg`,
            type: selectedImage.mimeType || 'image/jpeg'
          }
        }));
      }
    } catch (error) {
      console.error('Error al seleccionar la foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    if (!hasCameraPermission) {
      Alert.alert('Permisos denegados', 'Necesitas permitir el acceso a la cámara');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        aspect: [4, 3],
        quality: 0.3,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setFormData((prevData) => ({
          ...prevData,
          foto_jugador: {
            uri: uri,
            name: `foto_jugador_${Date.now()}.jpg`,
            type: 'image/jpeg'
          }
        }));
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
    }
  };

  return (
    <ScrollView 
      style={styles.mainContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Foto del Jugador</Text>
        
        {formData.foto_jugador && (
          <Image
            source={{ uri: formData.foto_jugador.uri }}
            style={styles.imagePreview}
          />
        )}
        
        <View style={styles.photoButtonsContainer}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleTakePhoto}>
            <Text style={styles.secondaryButtonText}>Tomar Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSelectFoto}>
            <Text style={styles.secondaryButtonText}>Ver Galería</Text>
          </TouchableOpacity>
        </View>
        
        {errors.foto_jugador && <Text style={styles.errorText}>{errors.foto_jugador}</Text>}
        
        <TouchableOpacity 
          style={[styles.button, !formData.foto_jugador && styles.buttonDisabled]} 
          onPress={onNext}
          disabled={!formData.foto_jugador}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={!formData.foto_jugador ? [theme.colors.muted, theme.colors.muted] : [theme.colors.primary, theme.colors.primaryDark]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};


const DocumentacionForm = ({ formData, setFormData, onSubmit, uploadProgress, currentUpload, handleSelectFile }) => {
  const [acceptedRegulation, setAcceptedRegulation] = useState(false);
  const [acceptedDeclaration, setAcceptedDeclaration] = useState(false);

  const renderFileInfo = (field) => {
    const doc = formData.documentos[field];
    if (!doc || !doc.uri) return null;

    return (
      <View style={styles.fileInfoContainer}>
        <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
          {doc.name || 'Archivo seleccionado'}
        </Text>
        
        {currentUpload === field ? (
          <View style={styles.uploadStatus}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.uploadProgressText}>
              {Math.round(uploadProgress[field] || 0)}%
            </Text>
          </View>
        ) : (
          <Text style={styles.uploadPendingText}>Listo para subir</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView 
      style={styles.mainContent}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formContainer}>
        <Text style={styles.title}>Reglamentación del equipo</Text>
        
       {/* {['ine_tutor', 'curp_jugador', 'acta_nacimiento', 'comprobante_domicilio'].map((field) => (
          <View key={field} style={styles.formGroup}>
            <Text style={styles.label}>
              {field === 'ine_tutor' && 'INE del Tutor'}
              {field === 'curp_jugador' && 'CURP del Jugador'}
              {field === 'acta_nacimiento' && 'Acta de Nacimiento'}
              {field === 'comprobante_domicilio' && 'Comprobante de Domicilio'}

            </Text>
            
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => handleSelectFile(field)}
              disabled={!!currentUpload}
            >
              <Text style={styles.buttonText}>
                {formData.documentos[field]?.uri ? 'Reemplazar archivo' : 'Seleccionar archivo'}
              </Text>
            </TouchableOpacity>
            
            {renderFileInfo(field)}
          </View>
        ))} */}


        {/* Sección de aceptación del reglamento */}
        <View style={styles.declarationContainer}>
                          <View style={styles.checkboxContainer}>
                            <TouchableOpacity 
                              style={[styles.checkbox, acceptedDeclaration && styles.checkboxChecked]}
                              onPress={() => setAcceptedDeclaration(!acceptedDeclaration)}
                            >
                              {acceptedDeclaration && <Text style={styles.checkmark}>✓</Text>}
                            </TouchableOpacity>
                            <Text style={styles.declarationText}>
                              Declaro bajo protesta de decir verdad que la información y documentación proporcionada en esta 
                              aplicación y presentada al Club Potros es verídica, por lo que en caso de existir falsedad en 
                              ella deslindo de toda responsabilidad al Club Potros y tengo pleno conocimiento que se aplicarán 
                              las sanciones administrativas y penas establecidas en los ordenamientos del reglamento 
                              establecido por la liga.
                            </Text>
                          </View>
                        </View>
        <View style={styles.regulationContainer}>
          <Text style={styles.regulationTitle}>Reglamento del Equipo</Text>
          
          <TouchableOpacity 
            onPress={() => Linking.openURL('https://clubpotros.mx/politicas/ReglamentoPotros.pdf')} 
            style={styles.regulationLink}
          >
            <Text style={styles.regulationLinkText}>Descargue, lea y firme el reglamento</Text>
          </TouchableOpacity>
          
          <View style={styles.checkboxContainer}>
            <TouchableOpacity 
              style={[styles.checkbox, acceptedRegulation && styles.checkboxChecked]}
              onPress={() => setAcceptedRegulation(!acceptedRegulation)}
            >
              {acceptedRegulation && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.regulationText}>
              Confirmo que he leído y acepto el reglamento del equipo
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.submitButton,
            (!acceptedRegulation || !acceptedDeclaration || currentUpload) && styles.disabledButton
          ]} 
         onPress={onSubmit}
         disabled={!acceptedRegulation || !acceptedDeclaration || !!currentUpload}
        >
          <Text style={styles.submitButtonText}>
            {currentUpload ? 'Subiendo foto...' : 'Finalizar Registro'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    ...theme.shadow.soft,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  formContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: theme.colors.muted,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: theme.spacing.md,
    color: theme.colors.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    fontSize: 16,
    color: theme.colors.text,
  },
  genderOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  genderOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  genderOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
    ...theme.shadow.card,
  },
  genderIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  genderIconContainerSelected: {
    backgroundColor: theme.colors.primary,
  },
  genderOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  genderOptionTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  checkIcon: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
    minHeight: 50,
    justifyContent: 'center',
  },
  picker: {
    height: Platform.OS === 'ios' ? 200 : 50,
    width: '100%',
    color: theme.colors.text,
  },
  pickerItem: {
    fontSize: 16,
    color: theme.colors.text,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  button: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  buttonGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.danger + '15',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.sm,
  },
  secondaryButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    ...theme.shadow.soft,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    ...theme.shadow.card,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 14,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: theme.spacing.lg,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  backButtonGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: theme.spacing.xs,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    minWidth: 200,
    ...theme.shadow.card,
  },
  uploadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  signatureContainer: {
    height: 200,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignSelf: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  linkText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
    marginBottom: 15,
    fontSize: 16,
  },
  selectedDate: {
    paddingTop:10,
    fontSize: 16,
    marginBottom: 15,
    color: '#555555',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
  },
  reinscripcionContainer: {
    marginTop: theme.spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.muted,
    fontSize: 14,
  },
  playersListContainer: {
    marginBottom: theme.spacing.lg,
  },
  playersList: {
    maxHeight: 300,
    marginTop: theme.spacing.md,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  playerCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  playerCardImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacing.md,
  },
  playerCardInfo: {
    flex: 1,
  },
  playerCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  playerCardDetails: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  noPlayersContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
  },
  noPlayersText: {
    marginTop: theme.spacing.md,
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  separatorText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.muted,
    fontSize: 12,
  },
  searchSection: {
    marginTop: theme.spacing.md,
  },
  searchButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  searchButtonGradient: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  reinscripcionContainerOld: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  playerInfoContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadow.card,
  },
  playerInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.md,
    color: theme.colors.text,
    textAlign: 'center',
  },
  playerInfoText: {
    fontSize: 14,
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  playerImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing.md,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  reinscribirButton: {
    marginTop: theme.spacing.lg,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  infoContainer: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadow.soft,
  },
  infoTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  uploadButton: {
    backgroundColor: '#b51f28',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  fileName: {
    fontSize: 14,
    color: 'green',
    marginLeft: 5,
    flex: 1,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadProgressText: {
    fontSize: 14,
    color: '#007BFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  uploadPendingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  uploadSuccessText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#b51f28',
  },
  webInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  categoriaContainer: {
    marginTop: 10,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4682b4',
  },
  categoriaText: {
    fontSize: 16,
    color: '#333',
  },
  categoriaValue: {
    fontWeight: 'bold',
    color: '#2e8b57',
  },
  categoriaNota: {
    fontSize: 14,
    color: '#ff8c00',
    marginTop: 5,
    fontStyle: 'italic',
  },
  regulationContainer: {
    marginTop: 25,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  regulationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  regulationLink: {
    marginBottom: 15,
  },
  regulationLinkText: {
    color: '#007BFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007BFF',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007BFF',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  regulationText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
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
   declarationContainer: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  declarationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'center',
  },

  warningContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    alignItems: 'center',
  },

  warningText: {
    color: '#F57C00',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },

  signaturePreview: {
    width: 200,
    height: 100,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignSelf: 'center',
  },

  signatureButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 15,
  },

  signatureButton: {
    backgroundColor: '#b51f28',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center',
  },

  clearButton: {
    backgroundColor: '#dc3545',
  },

  signatureButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  signatureStatus: {
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },

  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.6,
  },
  successContainer: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    alignItems: 'center',
  },
  warningText: {
    color: '#F57C00',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 14,
  },
  signaturePreview: {
    width: 200,
    height: 100,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignSelf: 'center',
  },
  signatureButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 15,
  },
  signatureButton: {
    backgroundColor: '#b51f28',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  signatureButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  signatureStatus: {
    color: '#28a745',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
});

export default HomeScreen;