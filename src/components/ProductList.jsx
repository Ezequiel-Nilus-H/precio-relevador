import { useState, useEffect } from 'react';
import { Package, Search, Plus } from 'lucide-react';
import { productsAPI } from '../utils/api';

const ProductList = ({ onSelectProduct, onNewProduct }) => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Debounce para búsqueda
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchProducts(searchTerm);
      } else {
        loadProducts();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const allProducts = await productsAPI.getAll();
      console.log('Productos cargados:', allProducts?.length || 0);
      setProducts(Array.isArray(allProducts) ? allProducts : []);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setProducts([]);
      setError(error.message || 'Error desconocido al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const searchProducts = async (query) => {
    try {
      setLoading(true);
      const results = await productsAPI.search(query);
      setProducts(results);
    } catch (error) {
      console.error('Error buscando productos:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Package size={24} />
          Productos
        </h2>
        <button
          onClick={onNewProduct}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Nuevo
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o código de barras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-semibold">Error: {error}</p>
          <button
            onClick={loadProducts}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Cargando productos desde MongoDB...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
            </p>
            {!searchTerm && !error && (
              <div className="text-xs text-gray-400 space-y-1">
                <p>Verifica que:</p>
                <p>1. El servidor API esté corriendo (npm run dev:api)</p>
                <p>2. MongoDB tenga datos (npm run import:csv)</p>
                <button
                  onClick={loadProducts}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Recargar
                </button>
              </div>
            )}
          </div>
        ) : (
          products.map((product) => {
            const pricesCount = product.precios?.length || 0;
            return (
              <div
                key={product._id || product.ean}
                onClick={() => onSelectProduct(product)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{product.nombre || 'Sin nombre'}</h3>
                    <p className="text-sm text-gray-600">Código: {product.ean || 'Sin EAN'}</p>
                    {product.marca && (
                      <p className="text-sm text-gray-500">Marca: {product.marca}</p>
                    )}
                    {product.subcategoria && (
                      <p className="text-xs text-gray-400">{product.subcategoria}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-600">
                      {pricesCount} precio{pricesCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProductList;

