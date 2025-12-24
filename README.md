# Relevador de Precios

Aplicación web para ayudar a relevadores de precios a registrar y gestionar los precios de productos en diferentes supermercados. La aplicación permite escanear códigos de barras usando la cámara del dispositivo.

## Características

- 📷 **Escaneo de códigos de barras**: Usa la cámara del dispositivo para leer códigos de barras de productos
- 📦 **Gestión de productos**: Registra y gestiona información de productos (nombre, marca, código de barras)
- 🏪 **Múltiples supermercados**: Registra precios del mismo producto en diferentes supermercados
- 💾 **Almacenamiento local**: Los datos se guardan en el navegador (localStorage)
- 📱 **Diseño responsive**: Interfaz moderna y adaptable a diferentes tamaños de pantalla

## Tecnologías

- **Vite**: Build tool y dev server
- **React**: Framework de UI
- **Tailwind CSS**: Framework de estilos
- **html5-qrcode**: Biblioteca para escanear códigos de barras y QR
- **lucide-react**: Iconos modernos

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Inicia el servidor de desarrollo:
```bash
npm run dev
```

3. Abre tu navegador en la URL que aparece en la terminal (generalmente `http://localhost:5173`)

## Uso

### Escanear un producto nuevo

1. Haz clic en el botón "Escanear Código" o "Nuevo" en la lista de productos
2. Permite el acceso a la cámara cuando se solicite
3. Apunta la cámara al código de barras del producto
4. Una vez escaneado, completa la información del producto (nombre, marca)
5. Registra el precio en el supermercado correspondiente

### Registrar precio de un producto existente

1. Busca el producto en la lista
2. Haz clic en el producto
3. Selecciona el supermercado y ingresa el precio
4. Guarda el precio

### Supermercados predefinidos

La aplicación viene con los siguientes supermercados predefinidos:
- Carrefour
- Disco
- Jumbo
- Coto

## Estructura del Proyecto

```
precio-relevador/
├── src/
│   ├── components/
│   │   ├── BarcodeScanner.jsx    # Componente de escaneo de códigos
│   │   ├── ProductForm.jsx       # Formulario para crear productos
│   │   ├── ProductList.jsx       # Lista de productos
│   │   └── PriceEntry.jsx        # Formulario para registrar precios
│   ├── utils/
│   │   └── storage.js            # Utilidades para localStorage
│   ├── App.jsx                   # Componente principal
│   ├── index.css                 # Estilos globales
│   └── main.jsx                  # Punto de entrada
├── public/                       # Archivos estáticos
└── package.json
```

## Permisos necesarios

La aplicación requiere acceso a la cámara del dispositivo para escanear códigos de barras. Asegúrate de permitir el acceso cuando el navegador lo solicite.

## ⚠️ Importante: HTTPS requerido para cámara en móviles

**Para usar la cámara en dispositivos móviles, la aplicación debe estar servida sobre HTTPS.**

Los navegadores modernos (especialmente en móviles) requieren una conexión segura (HTTPS) para acceder a la cámara. Excepciones:
- `localhost` o `127.0.0.1` (solo en desarrollo)
- Conexiones HTTPS

### Opciones para desarrollo móvil:

1. **Usar la IP local de tu computadora:**
   ```bash
   npm run dev -- --host
   ```
   Luego accede desde tu móvil usando `http://TU_IP_LOCAL:5173` (solo funciona en la misma red WiFi)

2. **Usar un túnel HTTPS (recomendado para móviles):**
   - [ngrok](https://ngrok.com/): `ngrok http 5173`
   - [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
   - [localtunnel](https://localtunnel.github.io/www/): `npx localtunnel --port 5173`

3. **Desplegar en producción** con HTTPS (Vercel, Netlify, etc.)

### Solución de problemas de permisos:

Si ves el error "Permission denied" o "NotAllowedError":
1. Asegúrate de estar usando HTTPS (o localhost en desarrollo)
2. Verifica los permisos de cámara en la configuración de tu navegador
3. Recarga la página después de otorgar permisos
4. Algunos navegadores requieren que el usuario interactúe primero (hacer clic) antes de solicitar permisos

## Notas

- Los datos se almacenan localmente en el navegador. Si limpias el almacenamiento del navegador, perderás los datos.
- La aplicación funciona mejor en dispositivos móviles con cámara trasera.
- Asegúrate de tener buena iluminación al escanear códigos de barras.
- En desarrollo local, la cámara solo funcionará si accedes desde `localhost` o usando un túnel HTTPS.

## Scripts disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run preview`: Previsualiza la build de producción
- `npm run lint`: Ejecuta el linter

## Próximas mejoras

- Exportar datos a CSV/Excel
- Comparación de precios entre supermercados
- Estadísticas y gráficos
- Sincronización en la nube
- Historial de cambios de precios
# precio-relevador
