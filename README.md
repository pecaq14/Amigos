# TipsySolo — proyecto Android (Expo)

Este ZIP contiene el proyecto React Native preparado con Expo. Incluye la pantalla de personajes, chat con Groq y almacenamiento local.

## Crear el APK

Necesitas una computadora con Node.js y una cuenta gratuita de Expo.

1. Descomprime el ZIP.
2. Abre una terminal dentro de la carpeta `TipsySolo`.
3. Instala dependencias:

   ```bash
   npm install
   ```

4. Instala EAS CLI e inicia sesión:

   ```bash
   npm install -g eas-cli
   eas login
   ```

5. Configura el proyecto (la primera vez):

   ```bash
   eas build:configure
   ```

6. Genera un APK de prueba:

   ```bash
   eas build --platform android --profile preview
   ```

7. Cuando termine, Expo mostrará un enlace para descargar el APK e instalarlo en Android.

## Probar antes de compilar

```bash
npx expo start
```

Puedes escanear el QR con Expo Go para probarlo en un teléfono Android.

## Importante sobre la API Key

La app guarda la clave de Groq en AsyncStorage. Esto permite conservarla en el teléfono, pero **AsyncStorage no es un almacén cifrado**. Para una app que se distribuirá a otras personas, lo recomendable es mover las llamadas a Groq a un servidor propio y no incluir claves privadas en la aplicación.

La generación de imágenes usa un servicio externo y requiere conexión a internet. El APK no incluye una clave de Groq: cada usuario debe configurar la suya desde la app.
