# Configuración MongoDB - Relevador de Precios

## Estructura de Datos

Los datos se guardan en una sola colección `productos` en MongoDB con la siguiente estructura:

```javascript
{
  _id: ObjectId,
  odooId: String,           // ID de Odoo (opcional)
  nombre: String,            // Nombre del producto
  peso: Number,             // Peso en kg (opcional)
  subcategoria: String,     // Subcategoría (opcional)
  marca: String,            // Marca (opcional)
  ean: String,             // Código de barras (EAN)
  precios: [                // Array de precios históricos
    {
      supermercado: String,  // Ej: "Coto Bruto", "Día Neto", etc.
      precio: Number,
      fecha: Date,
      fuente: String        // "csv" o "app"
    }
  ]
}
```

## Pasos para Configurar

### 1. Importar datos del CSV a MongoDB

```bash
npm run import:csv
```

Este script:
- Lee el archivo `public/data.csv`
- Parsea todos los productos y precios
- Inserta los datos en MongoDB
- Crea índices para búsquedas rápidas

### 2. Iniciar el servidor API

```bash
npm run dev:api
```

El servidor API correrá en `http://localhost:3001`

### 3. Iniciar la aplicación frontend

En otra terminal:

```bash
npm run dev
```

O iniciar ambos a la vez:

```bash
npm run dev:all
```

## Endpoints de la API

- `GET /api/products` - Obtener todos los productos
- `GET /api/products/ean/:ean` - Buscar producto por EAN
- `GET /api/products/search?q=query` - Buscar productos
- `POST /api/products` - Crear o actualizar producto
- `POST /api/products/ean/:ean/prices` - Agregar precio a un producto
- `GET /api/products/ean/:ean/prices` - Obtener precios de un producto
- `GET /api/health` - Health check

## Supermercados Disponibles

La aplicación permite registrar precios para:
- Coto Bruto / Coto Neto
- Día Bruto / Día Neto
- Carrefour Bruto / Carrefour Neto
- Y cualquier otro supermercado que quieras agregar (flexible)

## Variables de Entorno

Puedes crear un archivo `.env` para configurar la URL de la API:

```
VITE_API_URL=http://localhost:3001/api
```

## Notas

- Los precios del CSV se importan con `fuente: "csv"`
- Los nuevos precios desde la app tienen `fuente: "app"`
- Cada precio guarda su fecha de registro
- La estructura es flexible para agregar nuevos supermercados




