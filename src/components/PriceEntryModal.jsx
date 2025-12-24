import { useState, useEffect } from 'react';
import { Save, DollarSign, X, Package } from 'lucide-react';
import { getSettings } from '../utils/storage';
import { productOperationsAPI } from '../utils/api';

const PriceEntryModal = ({ product, onSave, onClose }) => {
  const [price, setPrice] = useState('');
  const [modalidad, setModalidad] = useState('Neto');
  const [cantidadMinima, setCantidadMinima] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const savedSettings = getSettings();
    setSettings(savedSettings);
  }, []);

  const modalidades = ['Bruto', 'Neto', 'Neto en cantidad'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!price || parseFloat(price) <= 0) {
      alert('Ingresa un precio válido');
      return;
    }

    if (modalidad === 'Neto en cantidad' && (!cantidadMinima || parseInt(cantidadMinima) <= 0)) {
      alert('Ingresa una cantidad mínima válida');
      return;
    }

    if (!settings || !settings.supermercado) {
      alert('Por favor configura el supermercado en ajustes primero');
      return;
    }

    try {
      setSaving(true);
      
      const precioData = {
        productId: product._id,
        productIdType: typeof product._id,
        producto: product.nombre,
        supermercado: settings.supermercado,
        precio: parseFloat(price),
        fecha: settings.fecha,
        relevador: settings.relevador,
        modalidad: modalidad,
        cantidadMinima: modalidad === 'Neto en cantidad' ? parseInt(cantidadMinima) : null
      };
      
      console.log('Guardando precio:', precioData);
      console.log('Product completo:', product);
      
      const cantidadMinimaValue = modalidad === 'Neto en cantidad' ? parseInt(cantidadMinima) : null;
      
      await productOperationsAPI.addPriceToMultiple(
        [product._id],
        settings.supermercado,
        parseFloat(price),
        settings.fecha,
        settings.relevador,
        modalidad,
        cantidadMinimaValue
      );
      
      console.log('Precio guardado exitosamente');
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error guardando precio:', error);
      alert('Error al guardar el precio: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Package size={24} />
            Registrar Precio
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Información del producto */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-1">{product.nombre || 'Sin nombre'}</h3>
          <p className="text-sm text-gray-600">EAN: {product.ean || (product.eans && product.eans[0]) || 'Sin EAN'}</p>
          {product.marca && (
            <p className="text-sm text-gray-500">Marca: {product.marca}</p>
          )}
        </div>

        {/* Información de settings */}
        {settings && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-1">
              Supermercado: <span className="font-normal">{settings.supermercado}</span>
            </p>
            {settings.fecha && (
              <p className="text-xs text-blue-700 mb-1">
                Fecha: <span className="font-normal">{(() => {
                  // Parsear la fecha manualmente para evitar problemas de zona horaria
                  const [year, month, day] = settings.fecha.split('-');
                  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                })()}</span>
              </p>
            )}
            {settings.relevador && (
              <p className="text-xs text-blue-700">
                Relevador: <span className="font-normal">{settings.relevador}</span>
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modalidad
            </label>
            <select
              value={modalidad}
              onChange={(e) => {
                setModalidad(e.target.value);
                if (e.target.value !== 'Neto en cantidad') {
                  setCantidadMinima('');
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {modalidades.map((mod) => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          {modalidad === 'Neto en cantidad' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad mínima
              </label>
              <input
                type="number"
                min="1"
                value={cantidadMinima}
                onChange={(e) => setCantidadMinima(e.target.value)}
                placeholder="Ej: 3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Cantidad mínima de unidades que hay que comprar para obtener este precio
              </p>
            </div>
          )}

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
                autoFocus={modalidad !== 'Neto en cantidad'}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={saving || !settings || !settings.supermercado}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {saving ? 'Guardando...' : 'Guardar Precio'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold"
            >
              Cancelar
            </button>
          </div>

          {(!settings || !settings.supermercado) && (
            <p className="text-xs text-red-600 text-center">
              ⚠️ Configura el supermercado en ajustes primero
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default PriceEntryModal;

