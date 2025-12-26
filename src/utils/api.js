// Usar ruta relativa para que pase por el proxy de Vite (HTTPS -> HTTP)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
      const errorMessage = error.error || `HTTP error! status: ${response.status}`;
      const errorObj = new Error(errorMessage);
      errorObj.status = response.status;
      throw errorObj;
    }
    return await response.json();
  } catch (error) {
    // Solo loguear errores que no sean 404 (producto no encontrado es esperado)
    if (error.status !== 404 && !error.message.includes('404')) {
      console.error(`Error en ${endpoint}:`, error);
    }
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

  // Obtener producto por ID
  getById: async (id) => {
    try {
      return await fetchAPI(`/products/${id}`);
    } catch (error) {
      // Si es un 404 (producto no encontrado), retornar null en lugar de lanzar error
      if (error.message.includes('404') || error.message.includes('no encontrado')) {
        return null;
      }
      // Para otros errores, lanzar el error normalmente
      throw error;
    }
  },

  // Buscar producto por EAN
  getByEAN: async (ean) => {
    try {
      return await fetchAPI(`/products/ean/${ean}`);
    } catch (error) {
      // Si es un 404 (producto no encontrado), retornar array vacío en lugar de lanzar error
      if (error.message.includes('404') || error.message.includes('no encontrado')) {
        return [];
      }
      // Para otros errores, lanzar el error normalmente
      throw error;
    }
  },

  // Buscar productos
  search: async (query, additionalParams = {}) => {
    const params = new URLSearchParams({ q: query });
    // Agregar parámetros adicionales (supermercado, fecha, etc.)
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return fetchAPI(`/products/search?${params}`);
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
  getSubcategoriasCompletitud: async (categoria, supermercado, fecha) => {
    const params = new URLSearchParams({ categoria });
    if (supermercado) params.append('supermercado', supermercado);
    if (fecha) params.append('fecha', fecha);
    return fetchAPI(`/metadata/subcategorias/completitud?${params}`);
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

// Buscar productos por categoría
export const searchByCategoryAPI = {
  byCategory: async (categoria, subcategoria, additionalParams = {}) => {
    const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    if (subcategoria) params.append('subcategoria', subcategoria);
    // Agregar parámetros adicionales (supermercado, fecha, etc.)
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return fetchAPI(`/products/by-category?${params}`);
  },
  
  byBrand: async (marca, additionalParams = {}) => {
    const params = new URLSearchParams({ marca: encodeURIComponent(marca) });
    // Agregar parámetros adicionales (supermercado, fecha, etc.)
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    return fetchAPI(`/products/by-brand?${params}`);
  },
};

// Supermarkets API
export const supermarketsAPI = {
  getAll: async () => {
    return fetchAPI('/supermarkets');
  },
};

