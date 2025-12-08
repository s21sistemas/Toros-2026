export default {
  expo: {
    name: "ClubPotros",
    slug: "potros-app-dev",
    version: "2.0.1",
    orientation: "portrait",
    icon: "./assets/logoPotros.jpg",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/logoPotros.jpg",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: ["**/*"],
    plugins: [
      "expo-font",
      "expo-video"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mx.s1sistem.ClubPotros",
      buildNumber: "3.0.1",
      icon: "./assets/logoPotros.jpg",
      deploymentTarget: "15.1",
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        UIDeviceFamily: [1, 2],
        UISupportedInterfaceOrientations: [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown"
        ],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight"
        ],
        NSPhotoLibraryUsageDescription: "Permite acceder a tus fotos para subir imágenes",
        NSCameraUsageDescription: "Permite tomar fotos para subir a la aplicación"
      }
    },
    android: {
      package: "com.mx.s1sistem.ClubPotros",
      versionCode: 6,
      adaptiveIcon: {
        foregroundImage: "./assets/logoPotros.jpg",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES"
      ]
    },
    extra: {
      eas: {
        projectId: "87740b82-0e82-4a0a-aa26-664ce3a12f48"
      }
    },
    owner: "quesad300"
  }
};