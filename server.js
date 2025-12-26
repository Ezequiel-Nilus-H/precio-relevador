import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3001;

const MONGODB_URI = 'mongodb+srv://data_ventas:Uc1pXMnnx3alzEoA@relevamiento.jzagvuu.mongodb.net/?appName=relevamiento';
const DB_NAME = 'relevamiento';
const COLLECTION_NAME = 'productos';

// Middleware
app.use(cors());
app.use(express.json());

// Cliente MongoDB (se reutiliza)
let client = null;
let db = null;

async function getDb() {
  // Si no hay cliente, crear uno nuevo
  if (!client) {
    try {
      // Opciones de conexión para mantener la conexión viva
      const clientOptions = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 1,
        maxIdleTimeMS: 30000,
        retryWrites: true,
        retryReads: true,
      };
      
      client = new MongoClient(MONGODB_URI, clientOptions);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ Conexión a MongoDB establecida');
    } catch (error) {
      console.error('Error conectando a MongoDB:', error);
      client = null;
      db = null;
      throw error;
    }
  }
  
  // Verificar que db existe
  if (!db && client) {
    try {
      db = client.db(DB_NAME);
    } catch (error) {
      console.error('Error obteniendo database:', error);
      // Intentar reconectar
      await reconnect();
    }
  }
  
  // Intentar hacer un ping para verificar que la conexión sigue activa
  if (client && db) {
    try {
      await client.db('admin').command({ ping: 1 });
    } catch (error) {
      console.warn('Conexión inactiva, reconectando...', error.message);
      await reconnect();
    }
  }
  
  if (!db) {
    throw new Error('Database connection is null');
  }
  
  return db;
}

async function reconnect() {
  // Cerrar conexión anterior
  if (client) {
    try {
      await client.close();
    } catch (closeError) {
      // Ignorar errores al cerrar
    }
  }
  
  client = null;
  db = null;
  
  // Intentar reconectar
  try {
    const clientOptions = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    };
    
    client = new MongoClient(MONGODB_URI, clientOptions);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Reconexión a MongoDB establecida');
  } catch (error) {
    console.error('Error en reconexión:', error);
    throw error;
  }
}

// Rutas

// Obtener todos los productos
app.get('/api/products', async (req, res) => {
  try {
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    // Contar productos primero
    const count = await collection.countDocuments({});
    console.log(`📊 Total productos en DB: ${count}`);
    
    const products = await collection.find({}).limit(1000).toArray();
    console.log(`✅ Productos obtenidos: ${products.length}`);
    
    // Convertir ObjectId a string para JSON
    const productsWithStringIds = products.map(p => ({
      ...p,
      _id: p._id.toString()
    }));
    
    res.json(productsWithStringIds);
  } catch (error) {
    console.error('❌ Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error al obtener productos', details: error.message });
  }
});

// Buscar productos por EAN (puede haber múltiples)
app.get('/api/products/ean/:ean', async (req, res) => {
  try {
    const { ean } = req.params;
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    // Buscar productos que tengan este EAN (soporta múltiples EANs)
    const products = await collection.find({
      $or: [
        { ean: ean },
        { eans: ean }
      ]
    }).toArray();
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error buscando producto:', error);
    res.status(500).json({ error: 'Error al buscar producto' });
  }
});

// Buscar productos por categoría y subcategoría
app.get('/api/products/by-category', async (req, res) => {
  try {
    const { categoria, subcategoria, supermercado, fecha } = req.query;
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    const query = {};
    if (categoria) {
      query.categoria = categoria;
    }
    if (subcategoria) {
      query.subcategoria = subcategoria;
    }
    
    const products = await collection.find(query).limit(100).toArray();
    
    // Convertir ObjectId a string para JSON
    const productsWithStringIds = products.map(p => ({
      ...p,
      _id: p._id.toString()
    }));
    
    // Si se proporciona supermercado y fecha, verificar si tienen precio
    if (supermercado && fecha) {
      // Parsear la fecha directamente desde el string YYYY-MM-DD sin conversión de zona horaria
      // Si viene como "2025-12-24", usar ese string directamente
      let fechaBuscadaStr = fecha;
      if (fecha.includes('T')) {
        // Si viene como ISO string, extraer solo la fecha
        fechaBuscadaStr = fecha.split('T')[0];
      }
      const supermercadoBuscado = String(supermercado || '').trim().toLowerCase();
      
      console.log('Verificando precios - Supermercado buscado:', supermercadoBuscado, 'Fecha buscada:', fechaBuscadaStr, 'Fecha recibida:', fecha);
      
      const productsWithPriceInfo = productsWithStringIds.map(product => {
        const matchingPrices = (product.precios || []).filter(precio => {
          const precioFecha = new Date(precio.fecha);
          const precioSupermercado = String(precio.supermercado || '').trim().toLowerCase();
          const precioFechaStr = precioFecha.toISOString().split('T')[0];
          
          const supermercadoMatch = precioSupermercado === supermercadoBuscado;
          const fechaMatch = precioFechaStr === fechaBuscadaStr;
          
          if (product.nombre && product.nombre.includes('Amargo MAROLIO Citrus')) {
            console.log(`  Precio: supermercado="${precioSupermercado}" (match: ${supermercadoMatch}), fecha="${precioFechaStr}" (match: ${fechaMatch})`);
          }
          
          return supermercadoMatch && fechaMatch;
        });
        
        const hasPrice = matchingPrices.length > 0;
        
        if (product.nombre && product.nombre.includes('Amargo MAROLIO Citrus')) {
          console.log(`  Producto "${product.nombre}": ${matchingPrices.length} precios coincidentes, hasPrice=${hasPrice}`);
        }
        
        return {
          ...product,
          hasPriceForSupermarket: hasPrice
        };
      });
      
      return res.json(productsWithPriceInfo);
    }
    
    res.json(productsWithStringIds);
  } catch (error) {
    console.error('Error buscando por categoría:', error);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

// Buscar productos por marca
app.get('/api/products/by-brand', async (req, res) => {
  try {
    const { marca, supermercado, fecha } = req.query;
    if (!marca) {
      return res.json([]);
    }
    
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    const products = await collection.find({
      marca: marca
    }).limit(100).toArray();
    
    // Convertir ObjectId a string para JSON
    const productsWithStringIds = products.map(p => ({
      ...p,
      _id: p._id.toString()
    }));
    
    // Si se proporciona supermercado y fecha, verificar si tienen precio
    if (supermercado && fecha) {
      // Parsear la fecha directamente desde el string YYYY-MM-DD sin conversión de zona horaria
      // Si viene como "2025-12-24", usar ese string directamente
      let fechaBuscadaStr = fecha;
      if (fecha.includes('T')) {
        // Si viene como ISO string, extraer solo la fecha
        fechaBuscadaStr = fecha.split('T')[0];
      }
      const supermercadoBuscado = String(supermercado || '').trim().toLowerCase();
      
      console.log('Verificando precios - Supermercado buscado:', supermercadoBuscado, 'Fecha buscada:', fechaBuscadaStr, 'Fecha recibida:', fecha);
      
      const productsWithPriceInfo = productsWithStringIds.map(product => {
        const matchingPrices = (product.precios || []).filter(precio => {
          const precioFecha = new Date(precio.fecha);
          const precioSupermercado = String(precio.supermercado || '').trim().toLowerCase();
          const precioFechaStr = precioFecha.toISOString().split('T')[0];
          
          const supermercadoMatch = precioSupermercado === supermercadoBuscado;
          const fechaMatch = precioFechaStr === fechaBuscadaStr;
          
          if (product.nombre && product.nombre.includes('Amargo MAROLIO Citrus')) {
            console.log(`  Precio: supermercado="${precioSupermercado}" (match: ${supermercadoMatch}), fecha="${precioFechaStr}" (match: ${fechaMatch})`);
          }
          
          return supermercadoMatch && fechaMatch;
        });
        
        const hasPrice = matchingPrices.length > 0;
        
        if (product.nombre && product.nombre.includes('Amargo MAROLIO Citrus')) {
          console.log(`  Producto "${product.nombre}": ${matchingPrices.length} precios coincidentes, hasPrice=${hasPrice}`);
        }
        
        return {
          ...product,
          hasPriceForSupermarket: hasPrice
        };
      });
      
      return res.json(productsWithPriceInfo);
    }
    
    res.json(productsWithStringIds);
  } catch (error) {
    console.error('Error buscando por marca:', error);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

// Obtener categorías y subcategorías únicas
app.get('/api/metadata/categories', async (req, res) => {
  try {
    const database = await getDb();
    if (!database) {
      throw new Error('Database connection is not available');
    }
    const productosCollection = database.collection(COLLECTION_NAME);
    const metadataCollection = database.collection('metadata');
    
    // Intentar obtener metadata de la colección dedicada
    let metadataDoc = await metadataCollection.findOne({ type: 'categories' });
    
    // Si no existe o tiene estructura antigua, regenerar
    if (!metadataDoc || !metadataDoc.categoriaSubcategorias || 
        Object.keys(metadataDoc.categoriaSubcategorias || {}).length === 0 ||
        (metadataDoc.subcategorias && !metadataDoc.categoriaSubcategorias)) {
      if (metadataDoc) {
        await metadataCollection.deleteOne({ type: 'categories' });
      }
      
      // Generar metadata desde los productos
      const categorias = await productosCollection.distinct('categoria');
      const marcas = await productosCollection.distinct('marca');
      
      const productos = await productosCollection.find({
        categoria: { $exists: true, $ne: null },
        subcategoria: { $exists: true, $ne: null }
      }).toArray();
      
      // Crear mapa de categoría -> subcategorías
      const categoriaSubcategoriasMap = {};
      productos.forEach(p => {
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
      
      metadataDoc = {
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
    }
    
    res.json({
      categorias: metadataDoc.categorias || [],
      categoriaSubcategorias: metadataDoc.categoriaSubcategorias || {},
      marcas: metadataDoc.marcas || []
    });
  } catch (error) {
    console.error('Error obteniendo metadata:', error);
    res.status(500).json({ error: 'Error obteniendo metadata' });
  }
});

// Endpoint para obtener subcategorías de una categoría específica
app.get('/api/metadata/categories/:categoria/subcategorias', async (req, res) => {
  try {
    const { categoria } = req.params;
    const database = await getDb();
    const metadataCollection = database.collection('metadata');
    
    const metadataDoc = await metadataCollection.findOne({ type: 'categories' });
    
    if (metadataDoc && metadataDoc.categoriaSubcategorias && metadataDoc.categoriaSubcategorias[categoria]) {
      res.json(metadataDoc.categoriaSubcategorias[categoria]);
    } else {
      // Si no está en metadata, buscarlo directamente en productos
      const productosCollection = database.collection(COLLECTION_NAME);
      const subcategorias = await productosCollection.distinct('subcategoria', {
        categoria: categoria,
        subcategoria: { $exists: true, $ne: null }
      });
      res.json(subcategorias.filter(s => s).sort());
    }
  } catch (error) {
    console.error('Error obteniendo subcategorías:', error);
    res.status(500).json({ error: 'Error obteniendo subcategorías' });
  }
});

// Endpoint para regenerar metadata (útil después de importar datos)
app.post('/api/metadata/regenerate', async (req, res) => {
  try {
    const database = await getDb();
    const productosCollection = database.collection(COLLECTION_NAME);
    const metadataCollection = database.collection('metadata');
    
    const categorias = await productosCollection.distinct('categoria');
    const marcas = await productosCollection.distinct('marca');
    
    const productos = await productosCollection.find({
      categoria: { $exists: true, $ne: null },
      subcategoria: { $exists: true, $ne: null }
    }).toArray();
    
    const categoriaSubcategoriasMap = {};
    productos.forEach(p => {
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
    res.json({ success: true, message: 'Metadata regenerada exitosamente' });
  } catch (error) {
    console.error('Error regenerando metadata:', error);
    res.status(500).json({ error: 'Error regenerando metadata' });
  }
});

// Endpoint para obtener completitud de precios por subcategoría
app.get('/api/metadata/subcategorias/completitud', async (req, res) => {
  try {
    const { categoria, supermercado, fecha } = req.query;
    
    if (!categoria) {
      return res.status(400).json({ error: 'Se requiere categoría' });
    }
    
    if (!supermercado || !fecha) {
      // Si no hay supermercado o fecha, retornar 0% para todas las subcategorías
      const database = await getDb();
      const metadataCollection = database.collection('metadata');
      const metadataDoc = await metadataCollection.findOne({ type: 'categories' });
      
      const subcategorias = metadataDoc?.categoriaSubcategorias?.[categoria] || [];
      const completitud = {};
      subcategorias.forEach(sub => {
        completitud[sub] = { total: 0, completos: 0, porcentaje: 0 };
      });
      
      return res.json(completitud);
    }
    
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    // Parsear la fecha
    let fechaBuscadaStr = fecha;
    if (fecha.includes('T')) {
      fechaBuscadaStr = fecha.split('T')[0];
    }
    const supermercadoBuscado = String(supermercado || '').trim().toLowerCase();
    
    // Obtener todas las subcategorías de esta categoría
    const productos = await collection.find({
      categoria: categoria,
      subcategoria: { $exists: true, $ne: null }
    }).toArray();
    
    // Agrupar por subcategoría
    const subcategoriasMap = {};
    
    productos.forEach(product => {
      const sub = String(product.subcategoria).trim();
      if (!sub) return;
      
      if (!subcategoriasMap[sub]) {
        subcategoriasMap[sub] = {
          total: 0,
          completos: 0
        };
      }
      
      subcategoriasMap[sub].total++;
      
      // Verificar si tiene precio para este supermercado y fecha
      const matchingPrices = (product.precios || []).filter(precio => {
        const precioFecha = new Date(precio.fecha);
        const precioSupermercado = String(precio.supermercado || '').trim().toLowerCase();
        const precioFechaStr = precioFecha.toISOString().split('T')[0];
        
        return precioSupermercado === supermercadoBuscado && precioFechaStr === fechaBuscadaStr;
      });
      
      if (matchingPrices.length > 0) {
        subcategoriasMap[sub].completos++;
      }
    });
    
    // Calcular porcentajes
    const completitud = {};
    Object.keys(subcategoriasMap).forEach(sub => {
      const { total, completos } = subcategoriasMap[sub];
      const porcentaje = total > 0 ? Math.round((completos / total) * 100) : 0;
      completitud[sub] = {
        total,
        completos,
        porcentaje
      };
    });
    
    res.json(completitud);
  } catch (error) {
    console.error('Error calculando completitud:', error);
    res.status(500).json({ error: 'Error calculando completitud' });
  }
});

// Buscar productos por nombre o EAN (búsqueda)
// Buscar productos por nombre
app.get('/api/products/search', async (req, res) => {
  try {
    const { q, supermercado, fecha } = req.query;
    if (!q) {
      return res.json([]);
    }

    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    const query = {
      $or: [
        { nombre: { $regex: q, $options: 'i' } },
        { ean: { $regex: q, $options: 'i' } },
        { eans: { $regex: q, $options: 'i' } },
        { marca: { $regex: q, $options: 'i' } }
      ]
    };

    const products = await collection.find(query).limit(50).toArray();
    
    // Si se proporciona supermercado y fecha, verificar si tienen precio
    if (supermercado && fecha) {
      // Parsear la fecha directamente desde el string YYYY-MM-DD sin conversión de zona horaria
      // Si viene como "2025-12-24", usar ese string directamente
      let fechaBuscadaStr = fecha;
      if (fecha.includes('T')) {
        // Si viene como ISO string, extraer solo la fecha
        fechaBuscadaStr = fecha.split('T')[0];
      }
      const supermercadoBuscado = String(supermercado || '').trim().toLowerCase();
      
      console.log('Verificando precios - Supermercado buscado:', supermercadoBuscado, 'Fecha buscada:', fechaBuscadaStr, 'Fecha recibida:', fecha);
      
      const productsWithPriceInfo = products.map(product => {
        const matchingPrices = (product.precios || []).filter(precio => {
          const precioFecha = new Date(precio.fecha);
          const precioSupermercado = String(precio.supermercado || '').trim().toLowerCase();
          const precioFechaStr = precioFecha.toISOString().split('T')[0];
          
          const supermercadoMatch = precioSupermercado === supermercadoBuscado;
          const fechaMatch = precioFechaStr === fechaBuscadaStr;
          
          if (product.nombre && product.nombre.includes('Amargo MAROLIO Citrus')) {
            console.log(`  Precio: supermercado="${precioSupermercado}" (match: ${supermercadoMatch}), fecha="${precioFechaStr}" (match: ${fechaMatch})`);
          }
          
          return supermercadoMatch && fechaMatch;
        });
        
        const hasPrice = matchingPrices.length > 0;
        
        if (product.nombre && product.nombre.includes('Amargo MAROLIO Citrus')) {
          console.log(`  Producto "${product.nombre}": ${matchingPrices.length} precios coincidentes, hasPrice=${hasPrice}`);
        }
        
        return {
          ...product,
          hasPriceForSupermarket: hasPrice
        };
      });
      
      return res.json(productsWithPriceInfo);
    }
    
    res.json(products);
  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

// Agregar EAN a un producto existente
app.post('/api/products/:id/add-ean', async (req, res) => {
  try {
    const { id } = req.params;
    const { ean } = req.body;
    
    if (!ean) {
      return res.status(400).json({ error: 'Se requiere EAN' });
    }

    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    const product = await collection.findOne({ _id: id });
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Convertir ean a eans si es necesario
    let eans = product.eans || [];
    if (product.ean && !eans.includes(product.ean)) {
      eans.push(product.ean);
    }
    if (!eans.includes(ean)) {
      eans.push(ean);
    }

    await collection.updateOne(
      { _id: id },
      { $set: { eans, ean: eans[0] } } // Mantener el primero como principal
    );

    const updated = await collection.findOne({ _id: id });
    res.json(updated);
  } catch (error) {
    console.error('Error agregando EAN:', error);
    res.status(500).json({ error: 'Error al agregar EAN' });
  }
});

// Crear o actualizar producto
app.post('/api/products', async (req, res) => {
  try {
    const { odooId, nombre, peso, categoria, subcategoria, marca, ean, eans } = req.body;
    
    if (!ean && !eans && !odooId) {
      return res.status(400).json({ error: 'Se requiere EAN o ID Odoo' });
    }

    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);

    // Normalizar EANs
    const eansArray = eans || (ean ? [ean] : []);
    const eanPrincipal = eansArray[0] || null;

    const producto = {
      odooId: odooId || null,
      nombre: nombre || '',
      peso: peso || null,
      categoria: categoria || null,
      subcategoria: subcategoria || null,
      marca: marca || null,
      ean: eanPrincipal,
      eans: eansArray,
      precios: []
    };

    // Buscar si ya existe por EAN o ID Odoo
    const existing = await collection.findOne({
      $or: [
        { ean: eanPrincipal },
        { eans: eanPrincipal },
        { odooId: odooId }
      ]
    });

    if (existing) {
      // Actualizar producto existente
      // Combinar EANs
      const existingEans = existing.eans || (existing.ean ? [existing.ean] : []);
      const allEans = [...new Set([...existingEans, ...eansArray])];
      
      await collection.updateOne(
        { _id: existing._id },
        { 
          $set: { 
            ...producto, 
            eans: allEans,
            ean: allEans[0],
            precios: existing.precios 
          } 
        }
      );
      const updated = await collection.findOne({ _id: existing._id });
      res.json(updated);
    } else {
      // Crear nuevo producto
      const result = await collection.insertOne(producto);
      res.json({ ...producto, _id: result.insertedId });
    }
  } catch (error) {
    console.error('Error creando/actualizando producto:', error);
    res.status(500).json({ error: 'Error al crear/actualizar producto' });
  }
});

// Agregar precio a un producto
app.post('/api/products/:id/prices', async (req, res) => {
  try {
    const { id } = req.params;
    const { supermercado, precio, fecha, relevador, modalidad, cantidadMinima } = req.body;

    if (!supermercado || precio === undefined) {
      return res.status(400).json({ error: 'Se requiere supermercado y precio' });
    }

    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);

    const nuevoPrecio = {
      supermercado,
      precio: parseFloat(precio),
      fecha: fecha ? new Date(fecha) : new Date(),
      fuente: 'app'
    };

    if (modalidad) {
      nuevoPrecio.modalidad = modalidad;
    }

    if (cantidadMinima) {
      nuevoPrecio.cantidadMinima = parseInt(cantidadMinima);
    }

    if (relevador) {
      nuevoPrecio.relevador = relevador;
    }

    // Buscar el producto
    const product = await collection.findOne({ _id: id });
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Agregar el nuevo precio
    await collection.updateOne(
      { _id: id },
      { $push: { precios: nuevoPrecio } }
    );

    res.json({ success: true, precio: nuevoPrecio });
  } catch (error) {
    console.error('Error agregando precio:', error);
    res.status(500).json({ error: 'Error al agregar precio' });
  }
});

// Agregar precio a múltiples productos
app.post('/api/products/prices/batch', async (req, res) => {
  try {
    const { productIds, supermercado, precio, fecha, relevador, modalidad, cantidadMinima } = req.body;

    console.log('Recibiendo request para agregar precios:', {
      productIds,
      supermercado,
      precio,
      fecha,
      relevador,
      modalidad,
      cantidadMinima
    });

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Se requiere array de IDs de productos' });
    }

    if (!supermercado || precio === undefined) {
      return res.status(400).json({ error: 'Se requiere supermercado y precio' });
    }

    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);

    // Parsear supermercado y modalidad si viene en formato "Supermercado - Modalidad"
    let supermercadoNombre = supermercado;
    let modalidadFinal = modalidad || null;
    
    if (supermercado && typeof supermercado === 'string' && supermercado.includes(' - ')) {
      const parts = supermercado.split(' - ');
      supermercadoNombre = parts[0].trim();
      modalidadFinal = parts[1].trim();
    }

    const nuevoPrecio = {
      supermercado: supermercadoNombre,
      precio: parseFloat(precio),
      fecha: fecha ? new Date(fecha) : new Date(),
      fuente: 'app'
    };

    if (modalidadFinal) {
      nuevoPrecio.modalidad = modalidadFinal;
    }

    if (cantidadMinima !== null && cantidadMinima !== undefined && cantidadMinima !== '') {
      const cantidad = parseInt(cantidadMinima);
      if (!isNaN(cantidad) && cantidad > 0) {
        nuevoPrecio.cantidadMinima = cantidad;
      }
    }

    if (relevador) {
      nuevoPrecio.relevador = relevador;
    }

    console.log('Precio a guardar:', nuevoPrecio);

    // Convertir IDs a ObjectId si es necesario
    const objectIds = [];
    for (const id of productIds) {
      try {
        if (typeof id === 'string') {
          // Verificar si es un ObjectId válido
          if (ObjectId.isValid(id)) {
            objectIds.push(new ObjectId(id));
          } else {
            console.error('ID no válido:', id);
            return res.status(400).json({ error: `ID de producto no válido: ${id}` });
          }
        } else {
          objectIds.push(id);
        }
      } catch (err) {
        console.error('Error convirtiendo ID:', id, err);
        return res.status(400).json({ error: `Error al procesar ID de producto: ${id} - ${err.message}` });
      }
    }

    console.log('IDs convertidos:', objectIds);

    // Verificar que existan los productos antes de actualizar
    const existingProducts = await collection.find({ _id: { $in: objectIds } }).toArray();
    console.log('Productos encontrados:', existingProducts.length, 'de', objectIds.length);
    
    if (existingProducts.length === 0) {
      return res.status(404).json({ error: 'No se encontraron productos con los IDs proporcionados' });
    }

    // Agregar precio a todos los productos
    const result = await collection.updateMany(
      { _id: { $in: objectIds } },
      { $push: { precios: nuevoPrecio } }
    );

    console.log('Resultado de updateMany:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });

    // Obtener productos actualizados
    const updatedProducts = await collection.find({ _id: { $in: objectIds } }).toArray();

    res.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      productos: updatedProducts 
    });
  } catch (error) {
    console.error('Error agregando precios:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Error al agregar precios', details: error.message });
  }
});

// Agregar precio por EAN (más conveniente desde la app)
app.post('/api/products/ean/:ean/prices', async (req, res) => {
  try {
    const { ean } = req.params;
    const { supermercado, precio, fecha, relevador } = req.body;

    if (!supermercado || precio === undefined) {
      return res.status(400).json({ error: 'Se requiere supermercado y precio' });
    }

    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);

    const nuevoPrecio = {
      supermercado,
      precio: parseFloat(precio),
      fecha: fecha ? new Date(fecha) : new Date(),
      fuente: 'app'
    };

    if (relevador) {
      nuevoPrecio.relevador = relevador;
    }

    // Buscar productos que tengan este EAN
    const products = await collection.find({
      $or: [
        { ean: ean },
        { eans: ean }
      ]
    }).toArray();
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado. Crea el producto primero.' });
    }

    // Agregar precio a todos los productos encontrados
    const productIds = products.map(p => p._id);
    await collection.updateMany(
      { _id: { $in: productIds } },
      { $push: { precios: nuevoPrecio } }
    );

    const updated = await collection.find({ _id: { $in: productIds } }).toArray();
    res.json({ success: true, productos: updated });
  } catch (error) {
    console.error('Error agregando precio:', error);
    res.status(500).json({ error: 'Error al agregar precio' });
  }
});

// Obtener precios de un producto por EAN
app.get('/api/products/ean/:ean/prices', async (req, res) => {
  try {
    const { ean } = req.params;
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    const product = await collection.findOne({ ean });
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(product.precios || []);
  } catch (error) {
    console.error('Error obteniendo precios:', error);
    res.status(500).json({ error: 'Error al obtener precios' });
  }
});

// Obtener producto por ID (debe ir después de todas las rutas específicas)
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    // Convertir el ID a ObjectId si es válido
    let product;
    if (ObjectId.isValid(id)) {
      product = await collection.findOne({ _id: new ObjectId(id) });
    } else {
      return res.status(400).json({ error: 'ID inválido' });
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    // Convertir ObjectId a string para JSON
    const productWithStringId = {
      ...product,
      _id: product._id.toString()
    };
    
    res.json(productWithStringId);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Obtener supermercados únicos de la base de datos
app.get('/api/supermarkets', async (req, res) => {
  try {
    const database = await getDb();
    const collection = database.collection(COLLECTION_NAME);
    
    // Obtener todos los productos con precios
    const products = await collection.find({ precios: { $exists: true, $ne: [] } }).toArray();
    
    // Extraer todos los supermercados únicos
    const supermarketsSet = new Set();
    products.forEach(product => {
      if (product.precios && Array.isArray(product.precios)) {
        product.precios.forEach(precio => {
          if (precio.supermercado) {
            supermarketsSet.add(precio.supermercado);
          }
        });
      }
    });
    
    const supermarkets = Array.from(supermarketsSet).sort();
    res.json(supermarkets);
  } catch (error) {
    console.error('Error obteniendo supermercados:', error);
    res.status(500).json({ error: 'Error al obtener supermercados' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
});

