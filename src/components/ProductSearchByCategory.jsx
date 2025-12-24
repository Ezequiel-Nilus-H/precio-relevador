import { useState, useEffect } from 'react';
import { Search, Package, X, Plus } from 'lucide-react';
import { productsAPI, metadataAPI } from '../utils/api';

const ProductSearchByCategory = ({ scannedEAN, onSelectProduct, onAddEANToProduct, onCreateNew, onCancel }) => {
  const [metadata, setMetadata] = useState({ categorias: [], categoriaSubcategorias: {}, marcas: [] });
  const [searchType, setSearchType] = useState('categoria'); // 'categoria', 'marca'
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedSubcategoria, setSelectedSubcategoria] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    if (searchType === 'categoria' && selectedCategoria) {
      searchByCategory();
    } else if (searchType === 'marca' && selectedMarca) {
      searchByBrand();
    }
  }, [selectedCategoria, selectedSubcategoria, selectedMarca, searchType]);

  const loadMetadata = async () => {
    try {
      const data = await metadataAPI.getCategories();
      // Asegurar que categoriaSubcategorias existe
      setMetadata({
        categorias: data.categorias || [],
        categoriaSubcategorias: data.categoriaSubcategorias || {},
        marcas: data.marcas || []
      });
    } catch (error) {
      console.error('Error cargando metadata:', error);
      // En caso de error, inicializar con valores por defecto
      setMetadata({
        categorias: [],
        categoriaSubcategorias: {},
        marcas: []
      });
    }
  };

  const searchByCategory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategoria) params.append('categoria', selectedCategoria);
      if (selectedSubcategoria) params.append('subcategoria', selectedSubcategoria);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/products/by-category?${params}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error buscando por categoría:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const searchByBrand = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/products/by-brand?marca=${encodeURIComponent(selectedMarca)}`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error buscando por marca:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEAN = async (product) => {
    try {
      await onAddEANToProduct(product._id, scannedEAN);
      onSelectProduct({ ...product, eans: [...(product.eans || []), scannedEAN] });
    } catch (error) {
      console.error('Error agregando EAN:', error);
      alert('Error al agregar EAN al producto');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Producto no encontrado</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>EAN escaneado:</strong> {scannedEAN}
        </p>
        <p className="text-xs text-yellow-700 mt-1">
          Busca el producto por categoría/subcategoría o por marca para agregar este EAN
        </p>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setSearchType('categoria')}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
            searchType === 'categoria'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Categoría
        </button>
        <button
          onClick={() => setSearchType('marca')}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
            searchType === 'marca'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Marca
        </button>
      </div>

      {searchType === 'categoria' && (
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
            <select
              value={selectedCategoria}
              onChange={(e) => {
                setSelectedCategoria(e.target.value);
                setSelectedSubcategoria('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Selecciona categoría</option>
              {metadata.categorias.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {selectedCategoria && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subcategoría</label>
              <select
                value={selectedSubcategoria}
                onChange={(e) => setSelectedSubcategoria(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Todas las subcategorías</option>
                {(!selectedCategoria || !metadata.categoriaSubcategorias ? [] : (metadata.categoriaSubcategorias[selectedCategoria] || []))
                  .map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
              </select>
            </div>
          )}
        </div>
      )}

      {searchType === 'marca' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
          <select
            value={selectedMarca}
            onChange={(e) => setSelectedMarca(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Selecciona marca</option>
            {metadata.marcas.map((marca) => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Buscando...</div>
      ) : products.length > 0 ? (
        <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
          {products.map((product) => (
            <div
              key={product._id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{product.nombre}</h3>
                  <p className="text-sm text-gray-600">EAN: {product.ean || 'Sin EAN'}</p>
                  {product.marca && (
                    <p className="text-sm text-gray-500">Marca: {product.marca}</p>
                  )}
                  {product.subcategoria && (
                    <p className="text-xs text-gray-400">{product.subcategoria}</p>
                  )}
                </div>
                <button
                  onClick={() => handleAddEAN(product)}
                  className="ml-4 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1"
                >
                  <Plus size={16} />
                  Agregar EAN
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (selectedCategoria || selectedMarca) && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron productos
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t">
        <button
          onClick={onCreateNew}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <Package size={20} />
          Crear Nuevo Producto
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ProductSearchByCategory;

