# Generación de Metadata

La metadata (categorías, subcategorías y marcas) se genera automáticamente y se guarda en la colección `metadata` de MongoDB.

## Generación Automática

La metadata se genera automáticamente cuando:
1. Se accede al endpoint `GET /api/metadata/categories` y no existe metadata o está vacía
2. Se llama al endpoint `POST /api/metadata/regenerate`

## Estructura de la Metadata

La metadata se guarda en MongoDB con la siguiente estructura:

```javascript
{
  type: 'categories',
  categorias: ['ALMACEN', 'BEBIDAS', ...],
  categoriaSubcategorias: {
    'ALMACEN': ['0101 - ACEITE', '0102 - ARROZ', ...],
    'BEBIDAS': ['0202 - AMARGOS', '0204 - CHAMPAGNE', ...],
    ...
  },
  marcas: ['MOLTO', 'VANGUARDIA', ...],
  updatedAt: Date
}
```

## Cómo Regenerar la Metadata

### Opción 1: Desde el Frontend
1. Ve a la vista "Buscar Producto"
2. Selecciona "Por Categoría" o "Por Marca"
3. Si no hay subcategorías o marcas, aparecerá un botón "Regenerar metadata"
4. Haz clic en el botón

### Opción 2: Desde la API
```bash
curl -X POST http://localhost:3001/api/metadata/regenerate
```

### Opción 3: Automáticamente
Simplemente accede al endpoint de metadata y se regenerará si está vacía:
```bash
curl http://localhost:3001/api/metadata/categories
```

## Nota sobre Marcas

Si los productos no tienen marcas (campo `marca` es `null` o vacío), no aparecerán en la metadata. Para que aparezcan marcas:

1. **Agregar marcas manualmente**: Al crear o editar productos desde la aplicación, puedes agregar marcas
2. **Modificar el script de importación**: Si tu CSV tiene una columna de marca, modifica `scripts/import-csv.js` para leerla
3. **Extraer marcas del nombre**: Puedes crear un script que extraiga marcas del nombre del producto

La metadata se actualizará automáticamente la próxima vez que se regenere.

