import { useState, useEffect } from 'react';
import { Save, DollarSign, Store } from 'lucide-react';
import { pricesAPI, supermarketsAPI } from '../utils/api';
import { getSettings } from '../utils/storage';

const PriceEntry = ({ product, onSave, onCancel }) => {
  const [supermarkets, setSupermarkets] = useState([]);
  const [selectedSupermarket, setSelectedSupermarket] = useState('');
  const [price, setPrice] = useState('');
  const [existingPrices, setExistingPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSupermarkets = async () => {
      try {
        // Cargar supermercados desde la base de datos (fuente de verdad)
        const dbSupermarkets = await supermarketsAPI.getAll();
        const validSupermarkets = dbSupermarkets.sort();
        setSupermarkets(validSupermarkets);
        
        // Si no hay supermercado seleccionado, usar el de ajustes o el primero
        if (!selectedSupermarket && validSupermarkets.length > 0) {
          const settings = getSettings();
          const defaultSupermarket = settings.supermercado && validSupermarkets.includes(settings.supermercado)
            ? settings.supermercado
            : validSupermarkets[0];
          setSelectedSupermarket(defaultSupermarket);
        }
      } catch (error) {
        console.error('Error cargando supermercados:', error);
        setSupermarkets([]);
      }
    };
    
    loadSupermarkets();
  }, []);

  useEffect(() => {
    if (product && product.ean) {
      loadPrices();
    }
  }, [product]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      const prices = await pricesAPI.getPrices(product.ean);
      setExistingPrices(prices || []);
    } catch (error) {
      console.error('Error cargando precios:', error);
      setExistingPrices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSupermarket || !price || parseFloat(price) <= 0) {
      alert('Por favor completa todos los campos correctamente');
      return;
    }

    if (!product.ean) {
      alert('El producto no tiene código EAN');
      return;
    }

    try {
      setSaving(true);
      await pricesAPI.addPrice(product.ean, selectedSupermarket, parseFloat(price));
      await loadPrices(); // Recargar precios
      onSave();
    } catch (error) {
      console.error('Error guardando precio:', error);
      alert('Error al guardar el precio: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Registrar Precio</h2>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800">{product.nombre || 'Sin nombre'}</h3>
        <p className="text-sm text-gray-600">Código: {product.ean || 'Sin EAN'}</p>
        {product.marca && (
          <p className="text-sm text-gray-500">Marca: {product.marca}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Store size={18} />
            Supermercado
          </label>
          <select
            value={selectedSupermarket}
            onChange={(e) => setSelectedSupermarket(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={supermarkets.length === 0}
          >
            {supermarkets.length === 0 ? (
              <option value="">Cargando supermercados...</option>
            ) : (
              <>
                <option value="">Seleccionar supermercado</option>
                {supermarkets.map((supermarket) => (
                  <option key={supermarket} value={supermarket}>
                    {supermarket}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

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
                .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
                .slice(0, 10)
                .map((p, idx) => (
                  <div key={idx} className="text-sm text-blue-700">
                    {p.supermercado}: ${p.precio.toFixed(2)} 
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
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Precio'}
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

export default PriceEntry;

