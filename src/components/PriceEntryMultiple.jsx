import { useState, useEffect } from 'react';
import { Save, DollarSign, CheckSquare, Square } from 'lucide-react';
import { pricesAPI, productOperationsAPI } from '../utils/api';
import { getSettings } from '../utils/storage';

const PriceEntryMultiple = ({ products, selectedSupermarket, onSave, onCancel }) => {
  const [price, setPrice] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [existingPrices, setExistingPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Si hay un solo producto, auto-seleccionarlo
    if (products.length === 1) {
      setSelectedProducts([products[0]._id]);
    } else {
      // Si hay múltiples, seleccionar todos por defecto
      setSelectedProducts(products.map(p => p._id));
    }
    loadPrices();
  }, [products]);

  const loadPrices = async () => {
    // Cargar precios de todos los productos
    try {
      setLoading(true);
      const allPrices = [];
      for (const product of products) {
        const ean = product.ean || (product.eans && product.eans[0]);
        if (ean) {
          try {
            const prices = await pricesAPI.getPrices(ean);
            allPrices.push(...(prices || []));
          } catch (error) {
            console.error('Error cargando precios:', error);
          }
        }
      }
      setExistingPrices(allPrices);
    } catch (error) {
      console.error('Error cargando precios:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedProducts.length === 0) {
      alert('Selecciona al menos un producto');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      alert('Ingresa un precio válido');
      return;
    }

    try {
      setSaving(true);
      // Obtener ajustes guardados
      const settings = getSettings();
      const supermercado = selectedSupermarket || settings.supermercado;
      
      if (!supermercado) {
        alert('Por favor selecciona un supermercado o configúralo en ajustes');
        return;
      }

      await productOperationsAPI.addPriceToMultiple(
        selectedProducts,
        supermercado,
        parseFloat(price),
        settings.fecha,
        settings.relevador
      );
      onSave();
    } catch (error) {
      console.error('Error guardando precio:', error);
      alert('Error al guardar el precio: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (!products || products.length === 0) return null;

  // Obtener ajustes para mostrar información
  const settings = getSettings();
  const supermercado = selectedSupermarket || settings.supermercado;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Precio</h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm font-semibold text-blue-800 mb-2">
          Supermercado: <span className="font-normal">{supermercado || 'No configurado'}</span>
        </p>
        {settings.fecha && (
          <p className="text-xs text-blue-700 mb-1">
            Fecha: <span className="font-normal">{new Date(settings.fecha).toLocaleDateString()}</span>
          </p>
        )}
        {settings.relevador && (
          <p className="text-xs text-blue-700">
            Relevador: <span className="font-normal">{settings.relevador}</span>
          </p>
        )}
        {products.length > 1 && (
          <p className="text-xs text-blue-700">
            Se encontraron {products.length} productos con este EAN. Selecciona a cuáles asignar el precio.
          </p>
        )}
      </div>

      {products.length > 1 && (
        <div className="mb-4 p-4 border border-gray-200 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Seleccionar productos:</h3>
          <div className="space-y-2">
            {products.map((product) => {
              const isSelected = selectedProducts.includes(product._id);
              return (
                <label
                  key={product._id}
                  className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleProduct(product._id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{product.nombre || 'Sin nombre'}</h4>
                    <p className="text-sm text-gray-600">EAN: {product.ean || 'Sin EAN'}</p>
                    {product.marca && (
                      <p className="text-sm text-gray-500">Marca: {product.marca}</p>
                    )}
                    {product.subcategoria && (
                      <p className="text-xs text-gray-400">{product.subcategoria}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {products.length === 1 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800">{products[0].nombre || 'Sin nombre'}</h3>
          <p className="text-sm text-gray-600">EAN: {products[0].ean || 'Sin EAN'}</p>
          {products[0].marca && (
            <p className="text-sm text-gray-500">Marca: {products[0].marca}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <DollarSign size={18} />
            Precio
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
            Cargando precios...
          </div>
        ) : existingPrices.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Precios registrados:</h4>
            <div className="space-y-1">
              {existingPrices
                .filter(p => p.supermercado === supermercado)
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .slice(0, 5)
                .map((p, idx) => (
                  <div key={idx} className="text-sm text-blue-700">
                    ${p.precio.toFixed(2)} 
                    <span className="text-xs text-gray-500 ml-2">
                      ({new Date(p.fecha).toLocaleDateString()})
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={saving || selectedProducts.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : `Guardar Precio${selectedProducts.length > 1 ? ` (${selectedProducts.length} productos)` : ''}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default PriceEntryMultiple;





