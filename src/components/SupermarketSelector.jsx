import { Store, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getSettings } from '../utils/storage';
import { supermarketsAPI } from '../utils/api';

const SupermarketSelector = ({ selectedSupermarket, onSelect, onStartScan }) => {
  const [supermarkets, setSupermarkets] = useState([]);

  useEffect(() => {
    const loadSupermarkets = async () => {
      try {
        // Cargar supermercados desde la base de datos (fuente de verdad)
        const dbSupermarkets = await supermarketsAPI.getAll();
        const validSupermarkets = dbSupermarkets.sort();
        setSupermarkets(validSupermarkets);
        
        // Si no hay supermercado seleccionado, intentar usar el de ajustes
        if (!selectedSupermarket && validSupermarkets.length > 0) {
          const settings = getSettings();
          if (settings.supermercado && validSupermarkets.includes(settings.supermercado)) {
            onSelect(settings.supermercado);
          }
        }
      } catch (error) {
        console.error('Error cargando supermercados:', error);
        setSupermarkets([]);
      }
    };
    
    loadSupermarkets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const settings = getSettings();
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Store size={24} />
        Seleccionar Supermercado
      </h2>
      
      <p className="text-sm text-gray-600 mb-4">
        Elige el supermercado antes de escanear el código de barras
      </p>

      {settings.fecha && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <Calendar size={16} />
            <span className="font-semibold">Fecha de ajustes:</span>
            <span>{new Date(settings.fecha).toLocaleDateString()}</span>
          </p>
        </div>
      )}

      {!settings.fecha && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ Por favor configura la fecha en Ajustes antes de escanear
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        {supermarkets.map((supermarket) => (
          <button
            key={supermarket}
            onClick={() => onSelect(supermarket)}
            className={`p-4 rounded-lg border-2 transition-all ${
              selectedSupermarket === supermarket
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
            }`}
          >
            {supermarket}
          </button>
        ))}
      </div>

      {selectedSupermarket && (
        <div className="space-y-3">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 mb-1">
              Supermercado seleccionado:
            </p>
            <p className="text-base text-green-900">{selectedSupermarket}</p>
            {settings.fecha && (
              <p className="text-xs text-green-700 mt-2">
                Fecha: {new Date(settings.fecha).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={onStartScan}
            disabled={!settings.fecha}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg"
          >
            Escanear Código de Barras
          </button>
        </div>
      )}
    </div>
  );
};

export default SupermarketSelector;




