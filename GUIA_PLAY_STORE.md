# Guía para Subir a Play Store - Resolver Error de Keystore

## 🔴 Problema Actual

El Android App Bundle está firmado con una clave diferente a la que Play Store espera:
- **SHA1 Esperado:** `6C:1F:32:AD:BD:FA:A9:3F:3B:E2:E8:6C:76:3B:55:A4:FB:74:46:1C`
- **SHA1 Actual:** `F3:54:05:7F:74:4A:0B:F2:71:79:1C:3D:78:8A:BB:C1:1B:B5:34:AF`

## ✅ Solución

### Opción 1: Si ya tienes una app en Play Store (RECOMENDADO)

Si ya subiste una versión anterior de la app a Play Store, necesitas usar el **mismo keystore** que usaste antes.

1. **Obtén el keystore de Play Store:**
   - Ve a Google Play Console
   - Configuración → Integridad de la app → Certificados de firma de la app
   - Descarga el certificado o usa el keystore que usaste originalmente

2. **Sube el keystore a EAS:**
   ```bash
   eas credentials
   ```
   - Selecciona: `Android`
   - Selecciona: `Set up credentials for production`
   - Selecciona: `Upload existing keystore`
   - Sube tu archivo `.keystore` o `.jks`
   - Ingresa el alias y contraseñas

### Opción 2: Si es la primera vez que subes la app

Si es la primera vez que subes esta app a Play Store, puedes usar el keystore que EAS generó, pero **DEBES GUARDARLO** para futuras actualizaciones.

1. **Descarga el keystore de EAS:**
   ```bash
   eas credentials
   ```
   - Selecciona: `Android`
   - Selecciona: `View credentials`
   - Descarga el keystore y **GUÁRDALO EN UN LUGAR SEGURO**

2. **Importante:** Guarda también:
   - El alias del keystore
   - La contraseña del keystore
   - La contraseña de la clave

### Opción 3: Usar el keystore correcto manualmente

Si tienes el keystore con el SHA1 correcto (`6C:1F:32:AD:BD:FA:A9:3F:3B:E2:E8:6C:76:3B:55:A4:FB:74:46:1C`):

1. **Verifica el SHA1 de tu keystore:**
   ```bash
   keytool -list -v -keystore tu-keystore.jks -alias tu-alias
   ```

2. **Sube el keystore a EAS:**
   ```bash
   eas credentials
   ```
   - Selecciona: `Android`
   - Selecciona: `Set up credentials for production`
   - Selecciona: `Upload existing keystore`
   - Sube tu archivo `.keystore` o `.jks`

## 📝 Pasos Después de Configurar el Keystore

1. **Genera un nuevo build:**
   ```bash
   eas build -p android --profile production
   ```

2. **Descarga el AAB:**
   - Ve a: https://expo.dev/accounts/ulises933/projects/toros-app-dev/builds
   - Descarga el archivo `.aab` del build más reciente

3. **Sube a Play Store:**
   - Ve a Google Play Console
   - Crea una nueva versión
   - Sube el archivo `.aab`
   - Completa la información requerida
   - Publica

## ⚠️ IMPORTANTE

- **NUNCA pierdas el keystore de producción** - sin él no podrás actualizar tu app
- Guarda el keystore en múltiples lugares seguros (nube encriptada, USB, etc.)
- Si pierdes el keystore, tendrás que crear una nueva app en Play Store

## 🔍 Verificar SHA1 de un Keystore

```bash
keytool -list -v -keystore ruta/al/keystore.jks -alias nombre-del-alias
```

Busca la línea que dice "SHA1:" y verifica que coincida con el esperado por Play Store.

