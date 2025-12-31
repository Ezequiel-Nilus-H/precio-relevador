import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, X, Plus } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/storage';
import { supermarketsAPI } from '../utils/api';

const Settings = ({ onClose, onSave, required = false }) => {
  const [fecha, setFecha] = useState('');
  const [supermercado, setSupermercado] = useState('');
  const [relevador, setRelevador] = useState('');
  const [supermarkets, setSupermarkets] = useState([]);
  const [newSupermarket, setNewSupermarket] = useState('');
  const [showNewSupermarketInput, setShowNewSupermarketInput] = useState(false);

  useEffect(() => {
    const loadSupermarkets = async () => {
      try {
        // Cargar supermercados desde la base de datos (fuente de verdad)
        let dbSupermarkets = [];
        try {
          dbSupermarkets = await supermarketsAPI.getAll();
        } catch (error) {
          console.error('Error cargando supermercados de la BD:', error);
        }
        
        // Usar solo los supermercados de la BD
        const validSupermarkets = dbSupermarkets.sort();
        setSupermarkets(validSupermarkets);
      } catch (error) {
        console.error('Error cargando supermercados:', error);
        // Si falla, dejar la lista vacía
        setSupermarkets([]);
      }
    };
    
    loadSupermarkets();
    
    // Cargar ajustes guardados
    const settings = getSettings();
    if (settings.fecha) {
      setFecha(settings.fecha);
    } else {
      // Por defecto, fecha de hoy
      const today = new Date().toISOString().split('T')[0];
      setFecha(today);
    }
    if (settings.supermercado) {
      setSupermercado(settings.supermercado);
    }
    if (settings.relevador) {
      setRelevador(settings.relevador);
    }
  }, []);

  const handleAddNewSupermarket = () => {
    if (!newSupermarket.trim()) {
      alert('Por favor ingresa un nombre de supermercado');
      return;
    }
    
    const trimmedName = newSupermarket.trim();
    
    if (supermarkets.includes(trimmedName)) {
      alert('Este supermercado ya existe');
      return;
    }

    // Agregar el nuevo supermercado a la lista actual (solo en memoria)
    // Se guardará en la BD cuando se use por primera vez
    const updatedSupermarkets = [...supermarkets, trimmedName].sort();
    setSupermarkets(updatedSupermarkets);
    setSupermercado(trimmedName);
    setNewSupermarket('');
    setShowNewSupermarketInput(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!fecha) {
      alert('Por favor selecciona una fecha');
      return;
    }

    if (!supermercado || !supermercado.trim()) {
      alert('Por favor selecciona o crea un supermercado');
      return;
    }

    const settings = {
      fecha,
      supermercado: supermercado.trim(),
      relevador: relevador || null,
    };

    saveSettings(settings);
    
    if (onSave) {
      onSave(settings);
    }
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon size={24} />
          Ajustes
        </h2>
        {onClose && !required && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {required && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Configuración requerida:</strong> Por favor completa los ajustes antes de continuar.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Fecha que se usará para los relevamientos de precios
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supermercado <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            <select
              value={supermercado}
              onChange={(e) => setSupermercado(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar supermercado</option>
              {supermarkets.map((sm) => (
                <option key={sm} value={sm}>
                  {sm}
                </option>
              ))}
            </select>
            {!showNewSupermarketInput ? (
              <button
                type="button"
                onClick={() => setShowNewSupermarketInput(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Plus size={16} />
                Crear nuevo supermercado
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSupermarket}
                  onChange={(e) => setNewSupermarket(e.target.value)}
                  placeholder="Nombre del nuevo supermercado"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewSupermarket();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddNewSupermarket}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewSupermarketInput(false);
                    setNewSupermarket('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Supermercado por defecto para los relevamientos (obligatorio)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relevador
          </label>
          <input
            type="text"
            value={relevador}
            onChange={(e) => setRelevador(e.target.value)}
            placeholder="Nombre del relevador"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Nombre de la persona que realiza el relevamiento
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Guardar Ajustes
          </button>
          {onClose && !required && (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-semibold"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default Settings;

