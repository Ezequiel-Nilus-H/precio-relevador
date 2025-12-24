import { Store } from 'lucide-react';
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
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Store size={24} />
        Seleccionar Supermercado
      </h2>
      
      <p className="text-sm text-gray-600 mb-4">
        Elige el supermercado antes de escanear el código de barras
      </p>

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
        <button
          onClick={onStartScan}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg"
        >
          Escanear Código de Barras
        </button>
      )}
    </div>
  );
};

export default SupermarketSelector;




