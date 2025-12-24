import { useState } from 'react';
import { Save, X, Package } from 'lucide-react';
import { productsAPI } from '../utils/api';

const ProductForm = ({ barcode, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!barcode) {
      alert('Se requiere un código de barras');
      return;
    }

    try {
      setSaving(true);
      const product = {
        ean: barcode,
        nombre: name.trim() || 'Sin nombre',
        marca: brand.trim() || '',
        peso: null,
        subcategoria: null,
        odooId: null,
      };

      const savedProduct = await productsAPI.createOrUpdate(product);
      onSave(savedProduct);
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar el producto: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Package size={24} />
          Nuevo Producto
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código de Barras
          </label>
          <input
            type="text"
            value={barcode}
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre del Producto *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Leche entera 1L"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marca
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ej: La Serenísima"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Producto'}
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

export default ProductForm;

