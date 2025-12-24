import { useState, useEffect } from 'react';
import { Save, X, Package, Plus } from 'lucide-react';
import { productsAPI, metadataAPI } from '../utils/api';

const ProductFormWithDropdowns = ({ barcode, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [peso, setPeso] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [odooId, setOdooId] = useState('');
  const [saving, setSaving] = useState(false);
  const [metadata, setMetadata] = useState({ categorias: [], categoriaSubcategorias: {}, marcas: [] });
  const [newCategoria, setNewCategoria] = useState('');
  const [newSubcategoria, setNewSubcategoria] = useState('');
  const [newMarca, setNewMarca] = useState('');

  useEffect(() => {
    loadMetadata();
  }, []);

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
        marca: brand.trim() || null,
        peso: peso ? parseFloat(peso) : null,
        categoria: categoria || null,
        subcategoria: subcategoria || null,
        odooId: odooId.trim() || null,
      };

      const savedProduct = await productsAPI.createOrUpdate(product);
      
      // Recargar metadata de MongoDB para incluir nuevos valores
      await loadMetadata();
      
      onSave(savedProduct);
    } catch (error) {
      console.error('Error guardando producto:', error);
      alert('Error al guardar el producto: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const addNewCategoria = () => {
    if (newCategoria.trim() && !metadata.categorias.includes(newCategoria.trim())) {
      setMetadata(prev => ({
        ...prev,
        categorias: [...prev.categorias, newCategoria.trim()].sort()
      }));
      setCategoria(newCategoria.trim());
      setNewCategoria('');
    }
  };

  const addNewSubcategoria = () => {
    if (newSubcategoria.trim() && !metadata.subcategorias.includes(newSubcategoria.trim())) {
      setMetadata(prev => ({
        ...prev,
        subcategorias: [...prev.subcategorias, newSubcategoria.trim()].sort()
      }));
      setSubcategoria(newSubcategoria.trim());
      setNewSubcategoria('');
    }
  };

  const addNewMarca = () => {
    if (newMarca.trim() && !metadata.marcas.includes(newMarca.trim())) {
      setMetadata(prev => ({
        ...prev,
        marcas: [...prev.marcas, newMarca.trim()].sort()
      }));
      setBrand(newMarca.trim());
      setNewMarca('');
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
            Código de Barras (EAN)
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
          <div className="flex gap-2">
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona marca</option>
              {metadata.marcas.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <input
                type="text"
                value={newMarca}
                onChange={(e) => setNewMarca(e.target.value)}
                placeholder="Nueva marca"
                className="w-32 px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={addNewMarca}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Peso (kg)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoría
          </label>
          <div className="flex gap-2">
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setSubcategoria('');
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona categoría</option>
              {metadata.categorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-1">
              <input
                type="text"
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
                placeholder="Nueva categoría"
                className="w-32 px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={addNewCategoria}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subcategoría
          </label>
          <div className="flex gap-2">
            <select
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona subcategoría</option>
              {(!categoria || !metadata.categoriaSubcategorias ? [] : (metadata.categoriaSubcategorias[categoria] || []))
                .map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
            </select>
            <div className="flex gap-1">
              <input
                type="text"
                value={newSubcategoria}
                onChange={(e) => setNewSubcategoria(e.target.value)}
                placeholder="Nueva subcategoría"
                className="w-32 px-2 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={addNewSubcategoria}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID Odoo (opcional)
          </label>
          <input
            type="text"
            value={odooId}
            onChange={(e) => setOdooId(e.target.value)}
            placeholder="Ej: 5899"
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

export default ProductFormWithDropdowns;

