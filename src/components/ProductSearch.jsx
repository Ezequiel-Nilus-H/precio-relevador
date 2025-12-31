import { useState, useEffect } from 'react';
import { Search, Package, Filter, Tag, ArrowLeft } from 'lucide-react';
import { productsAPI, metadataAPI, searchByCategoryAPI } from '../utils/api';
import { getSettings } from '../utils/storage';

const ProductSearch = ({ onSelectProduct, onPriceSaved }) => {
  const [searchType, setSearchType] = useState('nombre'); // 'nombre', 'categoria', 'marca'
  const [searchTerm, setSearchTerm] = useState('');
  const [metadata, setMetadata] = useState({ categorias: [], categoriaSubcategorias: {}, marcas: [] });
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedSubcategoria, setSelectedSubcategoria] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(null);
  const [subcategoriasCompletitud, setSubcategoriasCompletitud] = useState({});

  useEffect(() => {
    loadMetadata();
    loadSettings();
  }, []);

  useEffect(() => {
    // Refrescar la búsqueda cuando cambia onPriceSaved (trigger de refresh)
    if (onPriceSaved !== undefined && onPriceSaved > 0) {
      refreshCurrentSearch();
    }
  }, [onPriceSaved]);

  const loadSettings = () => {
    const savedSettings = getSettings();
    setSettings(savedSettings);
  };

  const refreshCurrentSearch = () => {
    // Recargar settings antes de refrescar
    loadSettings();
    // Pequeño delay para asegurar que settings se actualice
    setTimeout(() => {
      if (searchType === 'nombre' && searchTerm) {
        searchByName(searchTerm);
      } else if (searchType === 'categoria' && selectedCategoria) {
        searchByCategory();
      } else if (searchType === 'marca' && selectedMarca) {
        searchByBrand();
      }
    }, 200);
  };

  useEffect(() => {
    // Debounce para búsqueda por nombre
    if (searchType === 'nombre' && searchTerm) {
      const timer = setTimeout(() => {
        searchByName(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    } else if (searchType === 'nombre' && !searchTerm) {
      setProducts([]);
    }
  }, [searchTerm, searchType]);

  useEffect(() => {
    // Búsqueda automática por categoría
    if (searchType === 'categoria' && selectedCategoria) {
      searchByCategory();
      loadSubcategoriasCompletitud();
    } else if (searchType === 'categoria' && !selectedCategoria) {
      setProducts([]);
      setSubcategoriasCompletitud({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoria, selectedSubcategoria, searchType]);

  useEffect(() => {
    // Recargar completitud cuando cambian los settings
    if (searchType === 'categoria' && selectedCategoria) {
      loadSubcategoriasCompletitud();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.supermercado, settings?.fecha]);

  useEffect(() => {
    // Búsqueda automática por marca
    if (searchType === 'marca' && selectedMarca) {
      searchByBrand();
    } else if (searchType === 'marca' && !selectedMarca) {
      setProducts([]);
    }
  }, [selectedMarca, searchType]);

  const loadMetadata = async () => {
    try {
      const data = await metadataAPI.getCategories();
      setMetadata({
        categorias: data.categorias || [],
        categoriaSubcategorias: data.categoriaSubcategorias || {},
        marcas: data.marcas || []
      });
    } catch (error) {
      console.error('Error cargando metadata:', error);
      setMetadata({
        categorias: [],
        categoriaSubcategorias: {},
        marcas: []
      });
    }
  };

  const loadSubcategoriasCompletitud = async () => {
    if (!selectedCategoria || !settings?.supermercado || !settings?.fecha) {
      setSubcategoriasCompletitud({});
      return;
    }
    
    try {
      const completitud = await metadataAPI.getSubcategoriasCompletitud(
        selectedCategoria,
        settings.supermercado,
        settings.fecha
      );
      setSubcategoriasCompletitud(completitud || {});
    } catch (error) {
      console.error('Error cargando completitud:', error);
      setSubcategoriasCompletitud({});
    }
  };

  const searchByName = async (query) => {
    try {
      setLoading(true);
      setError(null);
      const additionalParams = {};
      if (settings?.supermercado) additionalParams.supermercado = settings.supermercado;
      if (settings?.fecha) additionalParams.fecha = settings.fecha;
      
      const results = await productsAPI.search(query, additionalParams);
      setProducts(results);
    } catch (error) {
      console.error('Error buscando productos:', error);
      setProducts([]);
      setError(error.message || 'Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const searchByCategory = async () => {
    try {
      setLoading(true);
      setError(null);
      const additionalParams = {};
      if (settings?.supermercado) additionalParams.supermercado = settings.supermercado;
      if (settings?.fecha) additionalParams.fecha = settings.fecha;
      
      const data = await searchByCategoryAPI.byCategory(
        selectedCategoria,
        selectedSubcategoria,
        additionalParams
      );
      setProducts(data);
    } catch (error) {
      console.error('Error buscando por categoría:', error);
      setProducts([]);
      setError(error.message || 'Error al buscar por categoría');
    } finally {
      setLoading(false);
    }
  };

  const searchByBrand = async () => {
    try {
      setLoading(true);
      setError(null);
      const additionalParams = {};
      if (settings?.supermercado) additionalParams.supermercado = settings.supermercado;
      if (settings?.fecha) additionalParams.fecha = settings.fecha;
      
      const data = await searchByCategoryAPI.byBrand(selectedMarca, additionalParams);
      setProducts(data);
    } catch (error) {
      console.error('Error buscando por marca:', error);
      setProducts([]);
      setError(error.message || 'Error al buscar por marca');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedCategoria('');
    setSelectedSubcategoria('');
    setSelectedMarca('');
    setProducts([]);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Search size={24} />
          Buscar Producto
        </h2>
      </div>

      {/* Selector de tipo de búsqueda */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            setSearchType('nombre');
            handleReset();
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
            searchType === 'nombre'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Nombre
        </button>
        <button
          onClick={() => {
            setSearchType('categoria');
            handleReset();
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
            searchType === 'categoria'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Categoría
        </button>
        <button
          onClick={() => {
            setSearchType('marca');
            handleReset();
          }}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
            searchType === 'marca'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Por Marca
        </button>
      </div>

      {/* Búsqueda por nombre */}
      {searchType === 'nombre' && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Escribe el nombre del producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Búsqueda por categoría */}
      {searchType === 'categoria' && (
        <div className="mb-4">
          {!selectedCategoria ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Filter size={16} />
                Selecciona una categoría
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {metadata.categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoria(cat)}
                    className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={18} className="text-gray-400 group-hover:text-blue-600" />
                      <span className="font-medium text-gray-700 group-hover:text-blue-700 text-sm">
                        {cat}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => {
                  setSelectedCategoria('');
                  setSelectedSubcategoria('');
                }}
                className="mb-3 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft size={16} />
                Volver a categorías
              </button>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría seleccionada: <span className="text-blue-600 font-semibold">{selectedCategoria}</span>
                </label>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Filter size={16} />
                    Subcategoría (opcional)
                  </label>
                  {(!metadata.categoriaSubcategorias || Object.keys(metadata.categoriaSubcategorias).length === 0) && (
                    <div className="flex items-center gap-2">
                      <button
                      onClick={async () => {
                        try {
                          setLoading(true);
                          await metadataAPI.regenerateMetadata();
                          await new Promise(resolve => setTimeout(resolve, 500));
                          await loadMetadata();
                          setLoading(false);
                          alert('Metadata regenerada exitosamente.');
                        } catch (error) {
                          setLoading(false);
                          console.error('Error regenerando metadata:', error);
                          alert(`Error al regenerar metadata: ${error.message || 'Error desconocido'}`);
                        }
                      }}
                        disabled={loading}
                        className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Regenerando...' : 'Regenerar metadata'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                  {(() => {
                    // Calcular completitud total de la categoría
                    let totalCompletos = 0;
                    let totalProductos = 0;
                    Object.values(subcategoriasCompletitud).forEach(info => {
                      totalCompletos += info.completos || 0;
                      totalProductos += info.total || 0;
                    });
                    const porcentajeTotal = totalProductos > 0 ? Math.round((totalCompletos / totalProductos) * 100) : 0;
                    
                    let colorClassTotal = 'text-gray-400';
                    let bgClassTotal = '';
                    if (porcentajeTotal >= 85) {
                      colorClassTotal = 'text-green-600';
                      bgClassTotal = 'bg-green-50';
                    } else if (porcentajeTotal >= 50) {
                      colorClassTotal = 'text-yellow-600';
                      bgClassTotal = 'bg-yellow-50';
                    } else if (porcentajeTotal >= 35) {
                      colorClassTotal = 'text-orange-600';
                      bgClassTotal = 'bg-orange-50';
                    }
                    
                    return (
                      <button
                        onClick={() => {
                          setSelectedSubcategoria('');
                          // La búsqueda se ejecutará automáticamente por el useEffect
                        }}
                        className={`p-3 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-left ${
                          !selectedSubcategoria
                            ? 'border-blue-500 bg-blue-50'
                            : `border-gray-200 ${totalProductos > 0 ? bgClassTotal : 'bg-white'}`
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-gray-700 text-sm">Todas</span>
                          {totalProductos > 0 && (
                            <div className="flex-shrink-0 text-xs font-semibold" style={{ color: porcentajeTotal >= 85 ? '#16a34a' : porcentajeTotal >= 50 ? '#ca8a04' : porcentajeTotal >= 35 ? '#ea580c' : '#6b7280' }}>
                              {porcentajeTotal}%
                            </div>
                          )}
                        </div>
                        {totalProductos > 0 && (
                          <div className="mt-1 text-xs text-gray-500">
                            {totalCompletos}/{totalProductos} productos
                          </div>
                        )}
                      </button>
                    );
                  })()}
                  {(() => {
                    const subcategorias = (metadata.categoriaSubcategorias && metadata.categoriaSubcategorias[selectedCategoria]) || [];
                    
                    if (subcategorias.length === 0) {
                      return (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay subcategorías disponibles para esta categoría
                        </div>
                      );
                    }
                    
                    return subcategorias.map((sub) => {
                      const completitudInfo = subcategoriasCompletitud[sub] || { porcentaje: 0, completos: 0, total: 0 };
                      const porcentaje = completitudInfo.porcentaje || 0;
                      const completos = completitudInfo.completos || 0;
                      const total = completitudInfo.total || 0;
                      
                      // Extraer solo el nombre (después del " - ")
                      const nombreSubcategoria = sub.includes(' - ') ? sub.split(' - ')[1] : sub;
                      
                      // Determinar color según el porcentaje
                      let bgClass = '';
                      let porcentajeColor = '#6b7280';
                      if (porcentaje >= 85) {
                        bgClass = 'bg-green-50';
                        porcentajeColor = '#16a34a';
                      } else if (porcentaje >= 50) {
                        bgClass = 'bg-yellow-50';
                        porcentajeColor = '#ca8a04';
                      } else if (porcentaje >= 35) {
                        bgClass = 'bg-orange-50';
                        porcentajeColor = '#ea580c';
                      }
                      
                      return (
                        <button
                          key={sub}
                          onClick={() => setSelectedSubcategoria(sub)}
                          className={`p-3 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-left ${
                            selectedSubcategoria === sub
                              ? 'border-blue-500 bg-blue-50'
                              : `border-gray-200 ${total > 0 ? bgClass : 'bg-white'}`
                          }`}
                        >
                          <div className="font-medium text-gray-700 text-sm truncate mb-1">
                            {nombreSubcategoria}
                          </div>
                          {total > 0 && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-gray-500">
                                {completos}/{total} productos
                              </div>
                              <div className="text-xs font-semibold" style={{ color: porcentajeColor }}>
                                {porcentaje}%
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Búsqueda por marca */}
      {searchType === 'marca' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Filter size={16} />
            Selecciona una marca
          </label>
          {metadata.marcas && metadata.marcas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {metadata.marcas.map((marca) => (
                <button
                  key={marca}
                  onClick={() => setSelectedMarca(marca)}
                  className={`p-4 bg-white border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer text-center group ${
                    selectedMarca === marca
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Tag size={18} className={`${selectedMarca === marca ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}`} />
                    <span className={`font-medium text-sm ${
                      selectedMarca === marca
                        ? 'text-blue-700'
                        : 'text-gray-700 group-hover:text-blue-700'
                    }`}>
                      {marca}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              No hay marcas disponibles en la base de datos
            </div>
          )}
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Resultados */}
      {((searchType === 'categoria' && selectedCategoria) || 
        (searchType === 'marca' && selectedMarca) || 
        (searchType === 'nombre' && products.length > 0)) && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} />
            Resultados
            {loading && <span className="text-sm font-normal text-gray-500">(Buscando...)</span>}
          </h3>
          <div className="space-y-2 max-h-[800px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-gray-500">Buscando productos...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">
                  {searchType === 'nombre' && searchTerm
                    ? 'No se encontraron productos con ese nombre'
                    : searchType === 'categoria' && selectedCategoria
                    ? 'No se encontraron productos en esta categoría'
                    : searchType === 'marca' && selectedMarca
                    ? 'No se encontraron productos de esta marca'
                    : 'Realiza una búsqueda para ver resultados'}
                </p>
              </div>
            ) : (
              products.map((product) => {
                const pricesCount = product.precios?.length || 0;
                const hasPrice = product.hasPriceForSupermarket || false;
                return (
                  <div
                    key={product._id || product.ean}
                    onClick={() => onSelectProduct(product)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      hasPrice
                        ? 'border-green-300 bg-green-50 hover:bg-green-100'
                        : 'border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{product.nombre || 'Sin nombre'}</h3>
                        <p className="text-sm text-gray-600">EAN: {product.ean || (product.eans && product.eans[0]) || 'Sin EAN'}</p>
                        {product.marca && (
                          <p className="text-sm text-gray-500">Marca: {product.marca}</p>
                        )}
                        {product.subcategoria && (
                          <p className="text-xs text-gray-400">{product.subcategoria}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${hasPrice ? 'text-green-600' : 'text-blue-600'}`}>
                          {hasPrice ? '✓ Precio registrado' : `${pricesCount} precio${pricesCount !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
