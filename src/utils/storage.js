// Utilidades para manejar el almacenamiento local

const STORAGE_KEYS = {
  PRODUCTS: 'precio-relevador-products',
  SUPERMARKETS: 'precio-relevador-supermarkets',
  PRICES: 'precio-relevador-prices',
  SETTINGS: 'precio-relevador-settings',
};

export const getProducts = () => {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  return data ? JSON.parse(data) : [];
};

export const saveProduct = (product) => {
  const products = getProducts();
  const existingIndex = products.findIndex(p => p.barcode === product.barcode);
  
  if (existingIndex >= 0) {
    products[existingIndex] = { ...products[existingIndex], ...product };
  } else {
    products.push({ ...product, id: Date.now().toString() });
  }
  
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  return products;
};

// Nota: Ya no guardamos la lista de supermercados en localStorage
// Solo se guarda el supermercado seleccionado en los ajustes (settings)
// Los supermercados se cargan siempre desde la base de datos
export const getSupermarkets = () => {
  // Siempre retornar array vacío - los supermercados vienen de la BD
  return [];
};

export const saveSupermarket = (supermarketName) => {
  // Ya no guardamos en localStorage, solo retornar el nombre
  // El supermercado se guardará en la BD cuando se use
  return [supermarketName];
};

export const getPrices = () => {
  const data = localStorage.getItem(STORAGE_KEYS.PRICES);
  return data ? JSON.parse(data) : [];
};

export const savePrice = (priceEntry) => {
  const prices = getPrices();
  const entry = {
    ...priceEntry,
    id: priceEntry.id || Date.now().toString(),
    timestamp: priceEntry.timestamp || new Date().toISOString(),
  };
  
  // Buscar si ya existe un precio para este producto en este supermercado
  const existingIndex = prices.findIndex(
    p => p.productBarcode === entry.productBarcode && 
         p.supermarketId === entry.supermarketId
  );
  
  if (existingIndex >= 0) {
    prices[existingIndex] = entry;
  } else {
    prices.push(entry);
  }
  
  localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(prices));
  return prices;
};

export const getPricesByProduct = (barcode) => {
  const prices = getPrices();
  return prices.filter(p => p.productBarcode === barcode);
};

export const getPricesBySupermarket = (supermarketId) => {
  const prices = getPrices();
  return prices.filter(p => p.supermarketId === supermarketId);
};

// Funciones para ajustes
export const getSettings = () => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (data) {
    return JSON.parse(data);
  }
  // Valores por defecto
  const today = new Date().toISOString().split('T')[0];
  return {
    fecha: today,
    supermercado: null,
    relevador: null,
  };
};

export const saveSettings = (settings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  return settings;
};





