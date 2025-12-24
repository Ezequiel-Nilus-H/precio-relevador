import { MongoClient } from 'mongodb';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const MONGODB_URI = 'mongodb+srv://data_ventas:Uc1pXMnnx3alzEoA@relevamiento.jzagvuu.mongodb.net/?appName=relevamiento';
const DB_NAME = 'relevamiento';
const COLLECTION_PRODUCTOS = 'productos';
const COLLECTION_SUPERMERCADOS = 'supermercados';
const COLLECTION_METADATA = 'metadata';

// Función para parsear precio (puede venir con comas como separador de miles)
function parsePrice(priceStr) {
  if (!priceStr || priceStr.trim() === '') return null;
  // Remover comas y espacios, convertir a número
  const cleaned = priceStr.toString().replace(/,/g, '').replace(/\s/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Función para parsear columna de precio: "Supermercado - Modalidad" o "Supermercado - Modalidad en cantidad"
function parsePriceColumn(columnName) {
  // Formato esperado: "Supermercado - Modalidad" o "Supermercado - Modalidad en cantidad"
  const match = columnName.match(/^(.+?)\s*-\s*(.+)$/);
  if (!match) return null;

  let supermercado = match[1].trim();
  let modalidadRaw = match[2].trim();
  let modalidad = modalidadRaw;
  let cantidadMinima = null;

  // Detectar si contiene "en cantidad"
  const enCantidadMatch = modalidadRaw.match(/en cantidad/i);
  if (enCantidadMatch) {
    // Extraer la modalidad base (ej: "Neto" de "Neto en cantidad")
    const modalidadBaseMatch = modalidadRaw.match(/^(.+?)\s+en cantidad/i);
    if (modalidadBaseMatch) {
      modalidad = modalidadBaseMatch[1].trim() + ' en cantidad';
    } else {
      modalidad = 'en cantidad';
    }
    
    // Buscar número en la columna completa (podría estar en el nombre del supermercado o modalidad)
    // Ejemplo: "Satelite - Neto en cantidad 3" o similar
    const numeroMatch = columnName.match(/(\d+)\s*(?:unidades?|uds?)?\s*$/i);
    if (numeroMatch) {
      cantidadMinima = parseInt(numeroMatch[1]);
    }
  }

  return {
    supermercado,
    modalidad,
    cantidadMinima
  };
}

// Función para extraer precios del CSV dinámicamente
function extractPrices(row, headers, supermercadosMap) {
  const prices = [];
  const fechaImportacion = new Date();

  // Buscar columnas que parezcan ser de precios (contienen " - ")
  headers.forEach(header => {
    if (!header || header.trim() === '') return;
    
    // Ignorar columnas que no son de precios
    const excludedColumns = ['product_category', 'product_subcategory', 'ID Odoo', 'Producto Odoo', 'EAN', 'Marca', 'Peso', 'Mix Actual'];
    if (excludedColumns.includes(header)) return;

    // Si la columna contiene " - ", probablemente es una columna de precio
    if (header.includes(' - ')) {
      const parsed = parsePriceColumn(header);
      if (parsed) {
        const price = parsePrice(row[header]);
        if (price !== null) {
          const supermercadoId = supermercadosMap.get(parsed.supermercado);
          
          prices.push({
            supermercadoId: supermercadoId || null,
            supermercado: parsed.supermercado,
            modalidad: parsed.modalidad,
            precio: price,
            cantidadMinima: parsed.cantidadMinima,
            fecha: fechaImportacion,
            fuente: 'csv'
          });
        }
      }
    }
  });

  return prices;
}

// Función para crear o actualizar supermercado
async function ensureSupermercado(db, nombre) {
  const collection = db.collection(COLLECTION_SUPERMERCADOS);
  
  // Buscar si ya existe
  const existing = await collection.findOne({ nombre: nombre });
  
  if (existing) {
    return existing._id;
  }
  
  // Crear nuevo supermercado
  const nuevoSupermercado = {
    nombre: nombre,
    direccion: null,
    googleMapsLink: null,
    activo: true,
    fechaCreacion: new Date()
  };
  
  const result = await collection.insertOne(nuevoSupermercado);
  return result.insertedId;
}

async function importCSV() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('Conectando a MongoDB...');
    await client.connect();
    console.log('Conectado a MongoDB');

    const db = client.db(DB_NAME);
    const productosCollection = db.collection(COLLECTION_PRODUCTOS);
    const supermercadosCollection = db.collection(COLLECTION_SUPERMERCADOS);

    // Leer y parsear CSV
    console.log('Leyendo archivo CSV...');
    const csvContent = fs.readFileSync('./public/Untitled spreadsheet - Sheet4 (1).csv', 'utf-8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    if (records.length === 0) {
      console.log('❌ No se encontraron registros en el CSV');
      return;
    }

    // Obtener headers del CSV
    const headers = Object.keys(records[0]);
    console.log(`Headers encontrados: ${headers.length}`);
    
    // Primero, recopilar todos los supermercados únicos del CSV
    console.log('Recopilando supermercados únicos...');
    const supermercadosSet = new Set();
    
      for (const _row of records) {
      headers.forEach(header => {
        if (!header || header.trim() === '') return;
        const excludedColumns = ['product_category', 'product_subcategory', 'ID Odoo', 'Producto Odoo', 'EAN', 'Marca', 'Peso', 'Mix Actual'];
        if (excludedColumns.includes(header)) return;
        
        if (header.includes(' - ')) {
          const parsed = parsePriceColumn(header);
          if (parsed) {
            supermercadosSet.add(parsed.supermercado);
          }
        }
      });
    }
    
    console.log(`Supermercados encontrados: ${supermercadosSet.size}`);

    // Crear/actualizar supermercados y crear mapa nombre -> ID
    console.log('\nCreando/actualizando supermercados...');
    const supermercadosMap = new Map();
    for (const nombreSupermercado of supermercadosSet) {
      const supermercadoId = await ensureSupermercado(db, nombreSupermercado);
      supermercadosMap.set(nombreSupermercado, supermercadoId);
    }
    console.log(`✅ ${supermercadosSet.size} supermercados procesados`);

    // Ahora procesar productos con el mapa de supermercados
    console.log(`\nProcesando ${records.length} productos...`);
    const productos = [];
    let procesados = 0;
    let conPrecios = 0;

    for (const row of records) {
      const odooId = row['ID Odoo']?.trim() || '';
      const nombreProducto = row['Producto Odoo']?.trim() || '';
      
      // Si no tiene ID Odoo ni nombre, saltar
      if (!odooId && !nombreProducto) {
        continue;
      }

      // Extraer precios dinámicamente con el mapa de supermercados
      const precios = extractPrices(row, headers, supermercadosMap);
      
      // Normalizar categoría, subcategoría y marca
      const categoria = row.product_category?.trim() || null;
      const subcategoria = row.product_subcategory?.trim() || null;
      const marca = row.Marca?.trim() || null;
      const ean = row.EAN?.trim() || null;
      
      const producto = {
        odooId: odooId || null,
        nombre: nombreProducto || '',
        peso: parseFloat(row.Peso) || null,
        categoria: categoria,
        subcategoria: subcategoria,
        marca: marca,
        ean: ean || null,
        eans: ean ? [ean] : [],
        precios: precios,
      };

      if (producto.precios.length > 0) {
        conPrecios++;
      }

      productos.push(producto);
      procesados++;

      if (procesados % 100 === 0) {
        console.log(`Procesados: ${procesados}/${records.length}`);
      }
    }

    console.log(`\nTotal productos procesados: ${procesados}`);
    console.log(`Productos con precios: ${conPrecios}`);

    // Limpiar colecciones existentes
    console.log('\nLimpiando colecciones existentes...');
    await productosCollection.deleteMany({});
    const metadataCollection = db.collection(COLLECTION_METADATA);
    await metadataCollection.deleteMany({});
    console.log('✅ Colecciones limpiadas');

    // Insertar productos
    console.log('Insertando productos en MongoDB...');
    if (productos.length > 0) {
      const result = await productosCollection.insertMany(productos);
      console.log(`✅ ${result.insertedCount} productos insertados exitosamente`);
    }

    // Crear índices para productos
    console.log('Creando índices para productos...');
    await productosCollection.createIndex({ ean: 1 });
    await productosCollection.createIndex({ odooId: 1 });
    await productosCollection.createIndex({ 'precios.supermercadoId': 1 });
    await productosCollection.createIndex({ 'precios.supermercado': 1 });
    await productosCollection.createIndex({ 'precios.fecha': -1 });
    await productosCollection.createIndex({ categoria: 1 });
    await productosCollection.createIndex({ subcategoria: 1 });
    console.log('✅ Índices de productos creados');

    // Crear índices para supermercados
    console.log('Creando índices para supermercados...');
    await supermercadosCollection.createIndex({ nombre: 1 }, { unique: true });
    console.log('✅ Índices de supermercados creados');

    // Generar metadata
    console.log('\nGenerando metadata...');
    const categorias = await productosCollection.distinct('categoria');
    const marcas = await productosCollection.distinct('marca');
    
    const productosParaMetadata = await productosCollection.find({
      categoria: { $exists: true, $ne: null },
      subcategoria: { $exists: true, $ne: null }
    }).toArray();
    
    // Crear mapa de categoría -> subcategorías
    const categoriaSubcategoriasMap = {};
    productosParaMetadata.forEach(p => {
      if (p.categoria && p.subcategoria) {
        const cat = String(p.categoria).trim();
        const sub = String(p.subcategoria).trim();
        if (cat && sub) {
          if (!categoriaSubcategoriasMap[cat]) {
            categoriaSubcategoriasMap[cat] = new Set();
          }
          categoriaSubcategoriasMap[cat].add(sub);
        }
      }
    });
    
    // Convertir Sets a Arrays y ordenar
    const categoriaSubcategorias = {};
    Object.keys(categoriaSubcategoriasMap).forEach(cat => {
      categoriaSubcategorias[cat] = Array.from(categoriaSubcategoriasMap[cat]).sort();
    });
    
    // Filtrar y normalizar marcas
    const marcasFiltradas = marcas
      .filter(m => m && String(m).trim().length > 0)
      .map(m => String(m).trim())
      .sort();
    
    const metadataDoc = {
      type: 'categories',
      categorias: categorias.filter(c => c).sort(),
      categoriaSubcategorias: categoriaSubcategorias,
      marcas: marcasFiltradas,
      updatedAt: new Date()
    };
    
    await metadataCollection.replaceOne(
      { type: 'categories' },
      metadataDoc,
      { upsert: true }
    );
    console.log(`✅ Metadata generada: ${categorias.filter(c => c).length} categorías, ${marcasFiltradas.length} marcas`);

    console.log('\n✨ Importación completada exitosamente!');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Conexión cerrada');
  }
}

// Ejecutar importación
importCSV().catch(console.error);

