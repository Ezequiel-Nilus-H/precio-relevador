import { useState, useEffect } from 'react';
import { Save, DollarSign, X, Package, History, ArrowLeft } from 'lucide-react';
import { getSettings } from '../utils/storage';
import { productOperationsAPI } from '../utils/api';

const PriceEntryModal = ({ product, onSave, onClose }) => {
  const [view, setView] = useState('form'); // 'form' o 'history'
  const [price, setPrice] = useState('');
  const [modalidad, setModalidad] = useState('Neto');
  const [cantidadMinima, setCantidadMinima] = useState('');
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [precios, setPrecios] = useState([]);
  const [loadingPrecios, setLoadingPrecios] = useState(false);

  useEffect(() => {
    const savedSettings = getSettings();
    setSettings(savedSettings);
    // Cargar precios iniciales del producto
    if (product && product.precios) {
      setPrecios(product.precios);
    }
  }, [product]);

  useEffect(() => {
    // Cuando cambia a la vista de historial, cargar precios actualizados
    if (view === 'history' && product) {
      loadPrecios();
    }
  }, [view, product]);

  const loadPrecios = async () => {
    if (!product) return;
    
    try {
      setLoadingPrecios(true);
      // Usar los precios del producto si están disponibles, o hacer fetch
      if (product.precios && product.precios.length > 0) {
        setPrecios(product.precios);
      } else {
        // Si no hay precios en el producto, intentar obtenerlos
        const ean = product.ean || (product.eans && product.eans[0]);
        if (ean) {
          // Por ahora usar los precios del producto directamente
          setPrecios([]);
        }
      }
    } catch (error) {
      console.error('Error cargando precios:', error);
      setPrecios([]);
    } finally {
      setLoadingPrecios(false);
    }
  };

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
            {view === 'form' ? (
              <>
                <Package size={24} />
                Registrar Precio
              </>
            ) : (
              <>
                <History size={24} />
                Historial de Precios
              </>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {view === 'history' && (
              <button
                onClick={() => setView('form')}
                className="text-gray-600 hover:text-gray-800 flex items-center gap-1 text-sm"
                title="Volver a cargar precio"
              >
                <ArrowLeft size={18} />
                Volver
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
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
        {settings && view === 'form' && (
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

        {/* Botón para cambiar de vista */}
        {view === 'form' && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setView('history')}
              className="flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm"
              title="Ver precios guardados"
            >
              <History size={16} />
              <span className="font-semibold">{precios.length}</span>
            </button>
          </div>
        )}

        {/* Vista de formulario */}
        {view === 'form' && (
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
        )}

        {/* Vista de historial de precios */}
        {view === 'history' && (
          <div className="space-y-4">
            {loadingPrecios ? (
              <div className="text-center py-8 text-gray-500">Cargando precios...</div>
            ) : precios.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay precios registrados para este producto</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {precios
                  .sort((a, b) => {
                    const fechaA = new Date(a.fecha);
                    const fechaB = new Date(b.fecha);
                    return fechaB - fechaA; // Más recientes primero
                  })
                  .map((precio, index) => {
                    // Parsear la fecha manualmente para evitar problemas de zona horaria
                    let fechaStr = '';
                    let horaStr = '';
                    
                    // Si la fecha viene como string ISO, extraer directamente
                    if (typeof precio.fecha === 'string') {
                      if (precio.fecha.includes('T')) {
                        const [fechaPart, horaPart] = precio.fecha.split('T');
                        const [year, month, day] = fechaPart.split('-');
                        fechaStr = `${day}/${month}/${year}`;
                        
                        if (horaPart) {
                          const [hora, minutos] = horaPart.split(':');
                          const horaNum = parseInt(hora);
                          const minutosNum = parseInt(minutos);
                          const esPM = horaNum >= 12;
                          const hora12 = horaNum > 12 ? horaNum - 12 : (horaNum === 0 ? 12 : horaNum);
                          horaStr = `${hora12.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')} ${esPM ? 'p. m.' : 'a. m.'}`;
                        }
                      } else {
                        // Si es solo fecha sin hora
                        const [year, month, day] = precio.fecha.split('-');
                        fechaStr = `${day}/${month}/${year}`;
                      }
                    } else {
                      // Si viene como Date object
                      const fecha = new Date(precio.fecha);
                      const fechaISO = fecha.toISOString();
                      const [fechaPart, horaPart] = fechaISO.split('T');
                      const [year, month, day] = fechaPart.split('-');
                      fechaStr = `${day}/${month}/${year}`;
                      
                      if (horaPart) {
                        const [hora, minutos] = horaPart.split(':');
                        const horaNum = parseInt(hora);
                        const minutosNum = parseInt(minutos);
                        const esPM = horaNum >= 12;
                        const hora12 = horaNum > 12 ? horaNum - 12 : (horaNum === 0 ? 12 : horaNum);
                        horaStr = `${hora12.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')} ${esPM ? 'p. m.' : 'a. m.'}`;
                      }
                    }
                    
                    const fechaCompleta = horaStr ? `${fechaStr}, ${horaStr}` : fechaStr;
                    
                    return (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-800">
                                ${precio.precio.toFixed(2)}
                              </span>
                              {precio.modalidad && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                  {precio.modalidad}
                                </span>
                              )}
                              {precio.cantidadMinima && (
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                                  Mín. {precio.cantidadMinima} unidades
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Supermercado:</span> {precio.supermercado || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              <span className="font-medium">Fecha:</span> {fechaCompleta}
                            </p>
                            {precio.relevador && (
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Relevador:</span> {precio.relevador}
                              </p>
                            )}
                            {precio.fuente && (
                              <p className="text-xs text-gray-400 mt-1">
                                Fuente: {precio.fuente}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceEntryModal;

