import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, BackHandler, Platform, Image, Text, ActivityIndicator, Animated } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width, height } = Dimensions.get('window');

const IntroVideoScreen = ({ onVideoEnd }) => {
  const [hasFinished, setHasFinished] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const videoOpacity = useRef(new Animated.Value(1)).current;

  // Crear el reproductor de video
  const player = useVideoPlayer(require('../assets/reel.mp4'), (player) => {
    player.loop = false;
    player.muted = false;
  });

  useEffect(() => {
    if (!player) return;

    // Esperar a que el video esté listo antes de reproducir
    const readySubscription = player.addListener('statusChange', (status) => {
      console.log(status);
      if (status.status === 'readyToPlay' && !isReady) {
        setIsReady(true);
        // Reproducir el video cuando esté listo
        player.play();
        // Animaciones: desvanecer overlay y mostrar video
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(videoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();
      }
    });

    if (player.status === 'readyToPlay') {
      setIsReady(true);
      setTimeout(() => {
        player.play();
        Animated.parallel([
          Animated.timing(overlayOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
          Animated.timing(videoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();
      }, 50);
    }

    return () => {
      readySubscription?.remove();
    };
  }, [player, isReady]);

  useEffect(() => {
    // Timeout de seguridad: si el video no termina en 60 segundos, continuar
    const safetyTimeout = setTimeout(() => {
      if (!hasFinished && onVideoEnd) {
        console.warn('Timeout: el video no terminó, continuando...');
        setHasFinished(true);
        onVideoEnd();
      }
    }, 60000); // 60 segundos

    // Prevenir que el botón de retroceso funcione durante el video (Android)
    let backHandler;
    if (Platform.OS === 'android') {
      backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Prevenir que el botón de retroceso funcione
        return true;
      });
    }

    return () => {
      clearTimeout(safetyTimeout);
      if (backHandler) {
        backHandler.remove();
      }
    };
  }, [hasFinished, onVideoEnd]);

  useEffect(() => {
    if (!player) return;

    // Escuchar cuando el video termine
    const subscription = player.addListener('playToEnd', () => {
      if (!hasFinished) {
        setHasFinished(true);
        // Llamar al callback cuando el video termine
        if (onVideoEnd) {
          setTimeout(() => {
            onVideoEnd();
          }, 100);
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [player, hasFinished, onVideoEnd]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.videoWrapper, { opacity: videoOpacity }]}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ allowsFullscreen: false }}
          allowsPictureInPicture={false}
          pointerEvents="none"
          // Asegurar que el video ocupe toda la pantalla
          allowsExternalPlayback={false}
        />
      </Animated.View>

      {/* Overlay de marca y loader, se desvanece al estar listo */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
        <View style={styles.brandBox}>
          <Image source={require('../assets/logoToros.jpg')} style={styles.logo} resizeMode="cover" />
          <Text style={styles.title}>Club Toros</Text>
          <Text style={styles.subtitle}>Preparando tu experiencia...</Text>
          <ActivityIndicator size="small" color="#ffffff" style={styles.loader} />
        </View>

        {/* Esquinas decorativas */}
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: Math.min(width * 0.36, 220),
    height: Math.min(width * 0.36, 220),
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#eee',
    fontSize: 14,
    marginTop: 6,
    opacity: 0.9,
  },
  loader: {
    marginTop: 14,
  },
  cornerTL: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 28,
    height: 28,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
  },
  cornerTR: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 28,
    height: 28,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 28,
    height: 28,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 28,
    height: 28,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 4,
  },
});

export default IntroVideoScreen;

