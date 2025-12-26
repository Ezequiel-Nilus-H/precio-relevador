# Guía de Despliegue en Render

Esta guía te ayudará a desplegar la aplicación en Render.

## 🏗️ Arquitectura: ¿Un Servicio o Dos?

**Tu aplicación tiene DOS opciones de despliegue:**

### ✅ Opción 1: Servicio Único (Recomendada - Configuración Actual)

**Un solo servicio web** que maneja tanto el backend (API) como el frontend:
- ✅ Más simple y económico (solo un servicio)
- ✅ No necesitas configurar CORS entre servicios
- ✅ Menos latencia (todo en el mismo servidor)
- ✅ El servidor Express sirve la API (`/api/*`) y los archivos estáticos del frontend

**No necesitas subir el repo dos veces** - solo creas un servicio web en Render.

### 🔄 Opción 2: Servicios Separados (Frontend + Backend)

Si prefieres separar frontend y backend en servicios diferentes:
- Puedes usar el **mismo repositorio** para crear dos servicios en Render
- Cada servicio tiene su propia configuración (build/start commands diferentes)
- Necesitarás configurar CORS y variables de entorno para la URL del backend

---

## 📋 Requisitos Previos

1. Una cuenta en [Render](https://render.com)
2. Una base de datos MongoDB (MongoDB Atlas recomendado)
3. Git configurado en tu proyecto

## 🚀 Opción 1: Despliegue con Servicio Único (Recomendado)

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en un repositorio Git (GitHub, GitLab, o Bitbucket):

```bash
git add .
git commit -m "Preparado para despliegue en Render"
git push
```

### 2. Crear el Servicio en Render

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Click en **"New +"** → **"Web Service"**
3. Conecta tu repositorio (GitHub/GitLab/Bitbucket)
4. Selecciona el repositorio `precio-relevador`

### 3. Configurar el Servicio

Render debería detectar automáticamente la configuración desde `render.yaml`, pero puedes verificar:

- **Name**: `precio-relevador` (o el que prefieras)
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Elige el plan que prefieras (Free tier disponible)

### 4. Configurar Variables de Entorno

En la sección **"Environment"** del servicio, agrega:

- `NODE_ENV` = `production`
- `MONGODB_URI` = Tu URI de conexión a MongoDB (ej: `mongodb+srv://usuario:password@cluster.mongodb.net/?appName=relevamiento`)
- `DB_NAME` = `relevamiento` (o el nombre de tu base de datos)

**⚠️ IMPORTANTE**: 
- Marca `MONGODB_URI` como **Secret** (Render lo ocultará)
- No compartas tu URI de MongoDB públicamente

### 5. Desplegar

1. Click en **"Create Web Service"**
2. Render comenzará a construir y desplegar tu aplicación
3. El proceso puede tardar varios minutos la primera vez
4. Una vez completado, tendrás una URL como: `https://precio-relevador.onrender.com`

### 6. Verificar el Despliegue

- Visita la URL de tu aplicación
- Verifica que el health check funcione: `https://tu-app.onrender.com/api/health`
- Prueba la funcionalidad de la aplicación

## 🔧 Configuración Adicional

### Health Check

La aplicación incluye un endpoint de health check en `/api/health` que Render puede usar para monitorear el estado del servicio.

### Variables de Entorno Disponibles

**Para Servicio Único (Opción 1):**
- `NODE_ENV`: `production` (requerido para producción)
- `MONGODB_URI`: URI de conexión a MongoDB (requerido)
- `DB_NAME`: Nombre de la base de datos (opcional, default: `relevamiento`)
- `PORT`: Puerto del servidor (Render lo asigna automáticamente)

**Para Servicios Separados (Opción 2):**
- **Backend**: `NODE_ENV`, `MONGODB_URI`, `DB_NAME`, `SERVE_STATIC=false`
- **Frontend**: `NODE_ENV`, `VITE_API_URL` (URL completa del backend API)

### Actualizar la Aplicación

Cada vez que hagas `git push` a la rama principal, Render automáticamente:
1. Detectará los cambios
2. Reconstruirá la aplicación
3. La redesplegará

Puedes desactivar el auto-deploy en la configuración del servicio si prefieres hacerlo manualmente.

---

## 🔄 Opción 2: Despliegue con Servicios Separados (Frontend + Backend)

Si prefieres separar el frontend y backend en servicios diferentes (por ejemplo, para escalar independientemente), puedes usar el **mismo repositorio** para crear dos servicios en Render.

### Ventajas de Separar Servicios:
- ✅ Escalado independiente (puedes escalar solo el backend o solo el frontend)
- ✅ Despliegues independientes (puedes actualizar frontend sin tocar backend)
- ✅ Mejor para equipos grandes (diferentes equipos pueden trabajar en cada servicio)

### Desventajas:
- ❌ Más costoso (dos servicios en lugar de uno)
- ❌ Necesitas configurar CORS
- ❌ Más complejo de mantener

### Pasos para Servicios Separados:

#### 1. Crear Servicio Backend (API)

1. En Render Dashboard: **"New +"** → **"Web Service"**
2. Conecta el mismo repositorio
3. Configuración:
   - **Name**: `precio-relevador-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Health Check Path**: `/api/health`

4. Variables de entorno:
   - `NODE_ENV` = `production`
   - `MONGODB_URI` = Tu URI de MongoDB (marcar como Secret)
   - `DB_NAME` = `relevamiento`
   - `SERVE_STATIC` = `false` (importante: no servir archivos estáticos)

5. Anota la URL del backend (ej: `https://precio-relevador-api.onrender.com`)

#### 2. Crear Servicio Frontend

1. En Render Dashboard: **"New +"** → **"Web Service"**
2. Conecta el **mismo repositorio** (sí, el mismo)
3. Configuración:
   - **Name**: `precio-relevador-frontend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview`
   - **Root Directory**: `.` (raíz del proyecto)

4. Variables de entorno:
   - `NODE_ENV` = `production`
   - `VITE_API_URL` = `https://precio-relevador-api.onrender.com/api` (la URL de tu backend)

#### 3. Configurar CORS en el Backend

El backend ya tiene CORS habilitado (`app.use(cors())`), pero si tienes problemas, puedes restringirlo a tu dominio frontend:

```javascript
// En server.js, reemplaza app.use(cors()) con:
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // O especifica tu URL frontend
  credentials: true
}));
```

### Nota sobre el Mismo Repositorio

**Sí, puedes usar el mismo repositorio para ambos servicios.** Render te permite:
- Crear múltiples servicios desde el mismo repo
- Cada servicio tiene su propia configuración (build/start commands)
- Cada servicio se despliega independientemente

No necesitas duplicar el código ni crear repositorios separados.

---

## 🐛 Solución de Problemas

### Error de Build

- Verifica que todas las dependencias estén en `package.json`
- Revisa los logs de build en Render Dashboard
- Asegúrate de que `npm run build` funcione localmente

### Error de Conexión a MongoDB

- Verifica que `MONGODB_URI` esté correctamente configurada
- Asegúrate de que tu IP esté en la whitelist de MongoDB Atlas (o usa `0.0.0.0/0` para permitir todas)
- Verifica que el usuario de MongoDB tenga los permisos necesarios

### La aplicación no carga

- Verifica los logs del servicio en Render Dashboard
- Asegúrate de que el health check (`/api/health`) responda correctamente
- Verifica que `NODE_ENV=production` esté configurado

### Rutas no funcionan (404)

- Asegúrate de que el servidor esté sirviendo los archivos estáticos correctamente
- Verifica que el build se haya completado exitosamente
- Revisa que el catch-all route esté configurado en `server.js`

## 📝 Notas

- El plan gratuito de Render puede "dormir" el servicio después de 15 minutos de inactividad. La primera petición después de dormir puede tardar ~30 segundos.
- Para producción, considera usar un plan de pago para evitar el "sleep" y tener mejor rendimiento.
- Render proporciona HTTPS automáticamente, así que no necesitas configurar certificados SSL.

## 🔗 Enlaces Útiles

- [Documentación de Render](https://render.com/docs)
- [Render Dashboard](https://dashboard.render.com)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

