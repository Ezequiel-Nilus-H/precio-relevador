import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    // Verificar compatibilidad del navegador al montar
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('⚠️ Tu navegador no soporta el acceso a la cámara.\n\nPor favor, usa un navegador moderno como Chrome, Firefox, Safari o Edge.');
    }
    
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const getCameraConfigs = () => {
    // En macOS, intentar primero sin restricciones, luego con facingMode
    return [
      true, // Primero intentar sin restricciones (para desktop/macOS)
      { facingMode: "user" }, // Cámara frontal
      { facingMode: "environment" }, // Cámara trasera (si hay)
    ];
  };

  const getBrowserInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) {
      return 'Chrome: Configuración → Privacidad y seguridad → Configuración de sitios → Cámara';
    } else if (userAgent.includes('safari')) {
      return 'Safari: Configuración → Safari → Cámara';
    } else if (userAgent.includes('firefox')) {
      return 'Firefox: Configuración → Privacidad y seguridad → Permisos → Cámara';
    }
    return 'Configuración del navegador → Permisos → Cámara';
  };

  const startScanning = async () => {
    try {
      setError(null);
      setIsRequestingPermission(true);

      // Verificar compatibilidad del navegador
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('BROWSER_NOT_SUPPORTED');
      }

      // Verificar si estamos en HTTPS o localhost
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('192.168.') ||
                       window.location.hostname.includes('10.0.');
      
      if (!isSecure) {
        setError('⚠️ La cámara requiere una conexión segura (HTTPS).\n\nPor favor, accede a la aplicación usando HTTPS o desde localhost.');
        setIsRequestingPermission(false);
        return;
      }

      const html5QrCode = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      const cameraConfigs = getCameraConfigs();
      let lastError = null;

      // Intentar con diferentes configuraciones de cámara
      for (const config of cameraConfigs) {
        try {
          // Configuración más simple para macOS/desktop
          const scanConfig = {
            fps: 10,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
              // Calcular tamaño del cuadro de escaneo (60% del viewfinder)
              const minEdgePercentage = 0.6;
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0,
          };

          await html5QrCode.start(
            config === true ? undefined : config, // Si es true, usar undefined (sin restricciones)
            scanConfig,
            (decodedText) => {
              onScan(decodedText);
              stopScanning();
            },
            (errorMessage) => {
              // Ignorar errores de escaneo continuo
            }
          );

          setIsScanning(true);
          setIsRequestingPermission(false);
          setError(null); // Limpiar cualquier error previo
          return; // Éxito, salir del loop
        } catch (err) {
          lastError = err;
          console.log('Intento de cámara falló:', config, err.message);
          
          // Si es un error de permisos, no intentar otras configuraciones
          if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            break;
          }
          
          // Si es el error de "streaming not supported", intentar siguiente configuración
          if (err.message?.includes('streaming not supported') || err.message?.includes('Camera streaming')) {
            continue;
          }
          
          // Continuar con la siguiente configuración para otros errores
          continue;
        }
      }

      // Si llegamos aquí, todas las configuraciones fallaron
      throw lastError || new Error('No se pudo acceder a ninguna cámara');

    } catch (err) {
      setIsRequestingPermission(false);
      let errorMessage = '';
      let showRetry = true;
      
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
        errorMessage = '🔒 Permisos de cámara denegados\n\n';
        errorMessage += 'La cámara está bloqueada para este sitio.\n\n';
        errorMessage += 'Para habilitar los permisos en Chrome:\n\n';
        errorMessage += '1. Haz clic en el ícono de candado 🔒 en la barra de direcciones\n';
        errorMessage += '2. O ve a: Configuración del sitio (ícono a la izquierda del candado)\n';
        errorMessage += '3. Busca "Cámara" en la lista de permisos\n';
        errorMessage += '4. Cambia el menú desplegable de "Bloquear" a "Permitir"\n';
        errorMessage += '5. Cierra la configuración y haz clic en "Reintentar" abajo';
      } else if (err.name === 'NotFoundError' || err.message?.includes('no camera')) {
        errorMessage = '📷 No se encontró ninguna cámara disponible en este dispositivo.';
        showRetry = false;
      } else if (err.name === 'NotReadableError') {
        errorMessage = '⚠️ La cámara está siendo usada por otra aplicación.\n\nCierra otras aplicaciones que usen la cámara e intenta nuevamente.';
      } else if (err.message?.includes('HTTPS')) {
        errorMessage = err.message;
        showRetry = false;
      } else if (err.message?.includes('streaming not supported') || err.message?.includes('Camera streaming') || err.message === 'BROWSER_NOT_SUPPORTED') {
        errorMessage = '⚠️ Problema de compatibilidad con la cámara\n\n';
        errorMessage += 'Posibles soluciones:\n\n';
        errorMessage += '1. Asegúrate de estar usando HTTPS o localhost\n';
        errorMessage += '2. Verifica que Chrome tenga permisos de cámara en macOS:\n';
        errorMessage += '   Sistema → Privacidad y Seguridad → Cámara → Chrome\n';
        errorMessage += '3. Recarga la página e intenta nuevamente\n';
        errorMessage += '4. Si persiste, prueba en modo incógnito';
      } else {
        errorMessage = `❌ Error: ${err.message || 'Error desconocido al acceder a la cámara'}\n\n`;
        errorMessage += 'Detalles técnicos:\n';
        errorMessage += `- Tipo: ${err.name || 'Desconocido'}\n`;
        errorMessage += `- Mensaje: ${err.message || 'Sin mensaje'}`;
      }
      
      setError(errorMessage);
      console.error('Error al iniciar escáner:', err);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error al detener escáner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanning();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Escanear Código de Barras</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div id="reader" className="w-full mb-4 rounded-lg overflow-hidden bg-gray-100 [&_video]:scale-x-[-1]"></div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-800 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div className="whitespace-pre-line flex-1">{error}</div>
            </div>
            {(error.includes('Permisos') || error.includes('compatibilidad') || error.includes('streaming')) && (
              <button
                onClick={() => {
                  setError(null);
                  startScanning();
                }}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
              >
                🔄 Reintentar
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!isScanning ? (
            <button
              onClick={startScanning}
              disabled={isRequestingPermission}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              {isRequestingPermission ? 'Solicitando permisos...' : 'Iniciar Escáner'}
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg"
            >
              Detener Escáner
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
        
        {!error && !isScanning && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm">
            <p className="font-semibold mb-1">💡 Consejos:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Asegúrate de dar permisos de cámara cuando se soliciten</li>
              <li>Usa buena iluminación para escanear códigos de barras</li>
              <li>Mantén el código de barras dentro del cuadro de escaneo</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;

