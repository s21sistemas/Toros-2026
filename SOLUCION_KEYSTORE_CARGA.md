# Solución: Configurar Keystore de Carga Correcto

## ✅ Situación Confirmada

- **Google Play App Signing está habilitado** ✅
- **SHA-1 del certificado de carga:** `6C:1F:32:AD:BD:FA:A9:3F:3B:E2:E8:6C:76:3B:55:A4:FB:74:46:1C`
- **SHA-1 que Play Store espera:** `6C:1F:32:AD:BD:FA:A9:3F:3B:E2:E8:6C:76:3B:55:A4:FB:74:46:1C` ✅
- **Coinciden perfectamente** ✅

## 🔧 Solución: Actualizar Keystore de Carga en Google Play

Como Google Play App Signing está habilitado, puedes **actualizar el keystore de carga** en Google Play Console.

### Opción 1: Subir Nuevo Keystore de Carga (RECOMENDADO)

1. **Genera un nuevo keystore:**
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```
   - Te pedirá una contraseña (guárdala bien)
   - Te pedirá información (puedes dejar todo en blanco excepto la contraseña)

2. **Ve a Google Play Console:**
   - Configuración → Integridad de la app → Certificados de firma de la app
   - Busca la sección "Certificado de clave de carga"
   - Haz clic en "Actualizar clave de carga"

3. **Sube el nuevo keystore:**
   - Sube el archivo `upload-keystore.jks` que generaste
   - Ingresa la contraseña del keystore
   - Google actualizará el certificado de carga

4. **Configura EAS para usar este keystore:**
   ```bash
   eas credentials
   ```
   - Selecciona: `Android`
   - Selecciona: `Set up credentials for production`
   - Selecciona: `Upload existing keystore`
   - Sube el archivo `upload-keystore.jks`
   - Ingresa el alias: `upload`
   - Ingresa las contraseñas

5. **Genera un nuevo build:**
   ```bash
   eas build -p android --profile production
   ```

### Opción 2: Usar el Keystore Actual de EAS (MÁS FÁCIL)

Como Google Play App Signing está habilitado, puedes intentar:

1. **Descarga el keystore actual de EAS:**
   ```bash
   eas credentials
   ```
   - Selecciona: `Android`
   - Selecciona: `View credentials`
   - Descarga el keystore

2. **Sube este keystore a Google Play:**
   - Ve a Play Console
   - Configuración → Integridad de la app → Certificados de firma de la app
   - "Actualizar clave de carga"
   - Sube el keystore de EAS

3. **Genera un nuevo build:**
   ```bash
   eas build -p android --profile production
   ```

### Opción 3: Intentar Subir el AAB Actual (MÁS RÁPIDO)

Como Google Play App Signing está habilitado, Google puede aceptar el AAB aunque el SHA-1 no coincida inicialmente:

1. **Intenta subir el AAB actual a Play Store**
2. Si Google lo rechaza, usa la Opción 1 o 2

## 📝 Notas Importantes

- **Guarda el keystore de carga** en un lugar seguro
- Una vez configurado, úsalo para todos los builds futuros
- Google Play App Signing maneja la firma final, así que el keystore de carga solo se usa para autenticación

## 🚀 Recomendación

**Usa la Opción 2** (más fácil):
1. Descarga el keystore de EAS
2. Súbelo a Google Play como nueva clave de carga
3. Genera un nuevo build
4. Sube a Play Store

