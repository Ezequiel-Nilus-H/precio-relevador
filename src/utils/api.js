const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Función helper para hacer requests
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error en ${endpoint}:`, error);
    // Si es un error de conexión, dar mensaje más claro
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(`No se pudo conectar con el servidor API en ${API_BASE_URL}. Verifica que el servidor esté corriendo.`);
    }
    throw error;
  }
}

// API de productos
export const productsAPI = {
  // Obtener todos los productos
  getAll: async () => {
    return fetchAPI('/products');
  },

  // Buscar producto por EAN
  getByEAN: async (ean) => {
    return fetchAPI(`/products/ean/${ean}`);
  },

  // Buscar productos
  search: async (query) => {
    return fetchAPI(`/products/search?q=${encodeURIComponent(query)}`);
  },

  // Crear o actualizar producto
  createOrUpdate: async (product) => {
    return fetchAPI('/products', {
      method: 'POST',
      body: product,
    });
  },
};

// API de precios
export const pricesAPI = {
  // Agregar precio a un producto por EAN
  addPrice: async (ean, supermercado, precio) => {
    return fetchAPI(`/products/ean/${ean}/prices`, {
      method: 'POST',
      body: { supermercado, precio },
    });
  },

  // Obtener precios de un producto por EAN
  getPrices: async (ean) => {
    return fetchAPI(`/products/ean/${ean}/prices`);
  },
};

// Health check
export const healthCheck = async () => {
  return fetchAPI('/health');
};

// Metadata
export const metadataAPI = {
  getCategories: async () => {
    return fetchAPI('/metadata/categories');
  },
  getSubcategoriasByCategoria: async (categoria) => {
    return fetchAPI(`/metadata/categories/${encodeURIComponent(categoria)}/subcategorias`);
  },
  regenerateMetadata: async () => {
    return fetchAPI('/metadata/regenerate', {
      method: 'POST',
    });
  },
};

// Product operations
export const productOperationsAPI = {
  addEANToProduct: async (productId, ean) => {
    return fetchAPI(`/products/${productId}/add-ean`, {
      method: 'POST',
      body: { ean },
    });
  },
  
  addPriceToMultiple: async (productIds, supermercado, precio, fecha, relevador, modalidad, cantidadMinima) => {
    const body = { productIds, supermercado, precio };
    if (fecha) {
      body.fecha = fecha;
    }
    if (relevador) {
      body.relevador = relevador;
    }
    if (modalidad) {
      body.modalidad = modalidad;
    }
    if (cantidadMinima !== null && cantidadMinima !== undefined) {
      body.cantidadMinima = cantidadMinima;
    }
    return fetchAPI('/products/prices/batch', {
      method: 'POST',
      body,
    });
  },
};

// Supermarkets API
export const supermarketsAPI = {
  getAll: async () => {
    return fetchAPI('/supermarkets');
  },
};

