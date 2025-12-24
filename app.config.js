export default {
  expo: {
    name: "ClubToros",
    slug: "toros-app-dev",
    version: "3.0.0",
    orientation: "portrait",
    icon: "./assets/logoToros.jpg",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/logoToros.jpg",
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
      bundleIdentifier: "com.mx.s21sistem.ClubToros",
      buildNumber: "3.0.0",
      icon: "./assets/logoToros.jpg",
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
      package: "com.mx.s1sistem.ClubToros",
      versionCode: 5,
      adaptiveIcon: {
        foregroundImage: "./assets/logoToros.jpg",
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
        projectId: "2764dc5b-ae68-415a-bfa1-b1075a8921fe"
      }
    },
    owner: "quesad300"
  }
};