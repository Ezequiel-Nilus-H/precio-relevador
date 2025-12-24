import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle, Store, Calendar } from 'lucide-react';
import { getSettings } from '../utils/storage';

const BarcodeScanner = ({ onScan, onClose, selectedSupermarket, autoStart = false }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    // Verificar compatibilidad del navegador al montar
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('⚠️ Tu navegador no soporta el acceso a la cámara.\n\nPor favor, usa un navegador moderno como Chrome, Firefox, Safari o Edge.');
    } else if (autoStart && !hasAutoStarted.current) {
      // Iniciar automáticamente si autoStart está activo
      hasAutoStarted.current = true;
      // Pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        startScanning();
      }, 100);
    }
    
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [autoStart]);

  const getCameraConfigs = () => {
    // Configuraciones optimizadas para iPhone 14 Pro y dispositivos con múltiples cámaras
    // El autofocus se configurará directamente en el stream después de iniciar
    return [
      // Configuración principal: cámara trasera (mejor para códigos de barras)
      { facingMode: "environment" },
      // Configuración alternativa: forzar cámara trasera
      { facingMode: { exact: "environment" } },
      // Sin restricciones (para desktop/macOS)
      true,
      // Cámara frontal como último recurso
      { facingMode: "user" }
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
          const scanConfig = {
            fps: 12,
            qrbox: (w, h) => ({
              width: Math.floor(w * 0.92),
              height: Math.floor(h * 0.25), // franja más fina
            }),
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
            ],
            useBarCodeDetectorIfSupported: true,
            rememberLastUsedCamera: true,
            verbose: false,
          };

          // Verificar si el navegador soporta BarcodeDetector API (mucho más rápido)
          const hasBarcodeDetector = 'BarcodeDetector' in window;
          if (hasBarcodeDetector) {
            console.log('✅ BarcodeDetector API disponible - usando decodificador nativo ultra-rápido');
          } else {
            console.log('⚠️ BarcodeDetector API no disponible - usando decodificador JavaScript (más lento)');
          }

          // Usar la configuración de cámara tal cual
          // El autofocus se configurará directamente en el stream después de iniciar
          const cameraConfig = config === true ? undefined : config;

          // Usar la configuración de cámara con autofocus habilitado
          await html5QrCode.start(
            cameraConfig,
            scanConfig,
            (decodedText, decodedResult) => {
              // Callback optimizado para respuesta inmediata
              // No hacer ninguna operación pesada aquí, solo pasar el resultado
              onScan(decodedText);
              stopScanning();
            },
            (errorMessage) => {
              // Ignorar errores de escaneo continuo (no hacer nada para no ralentizar)
            }
          );

          // Configurar autofocus directamente en el stream de video
          // Esto es especialmente importante para iPhone 14 Pro y iOS/Safari
          // Esperar un poco para que el video esté completamente inicializado
          setTimeout(() => {
            try {
              // Obtener el elemento de video que html5-qrcode crea
              const videoElement = document.querySelector('#reader video');
              if (videoElement && videoElement.srcObject) {
                const stream = videoElement.srcObject;
                const videoTrack = stream.getVideoTracks()[0];
                
                if (videoTrack && typeof videoTrack.getCapabilities === 'function') {
                  const capabilities = videoTrack.getCapabilities();
                  
                  // Verificar si el dispositivo soporta focusMode
                  if (capabilities.focusMode && Array.isArray(capabilities.focusMode)) {
                    // Priorizar 'continuous' para autofocus continuo (mejor para distancias cercanas)
                    const focusMode = capabilities.focusMode.includes('continuous') 
                      ? 'continuous' 
                      : capabilities.focusMode.includes('single-shot')
                      ? 'single-shot'
                      : null;
                    
                    if (focusMode) {
                      // Configurar autofocus
                      videoTrack.applyConstraints({
                        advanced: [{ focusMode: focusMode }]
                      }).then(() => {
                        console.log(`✅ Autofocus configurado: ${focusMode}`);
                      }).catch((err) => {
                        console.log('⚠️ No se pudo configurar autofocus:', err.message);
                      });
                    }
                  }
                  
                  // Configurar exposición continua también para mejor calidad
                  if (capabilities.exposureMode && Array.isArray(capabilities.exposureMode)) {
                    if (capabilities.exposureMode.includes('continuous')) {
                      videoTrack.applyConstraints({
                        advanced: [{ exposureMode: 'continuous' }]
                      }).catch(() => {
                        // Ignorar errores de exposición
                      });
                    }
                  }
                  
                  // Para iPhone 14 Pro: intentar configurar distancia focal para enfoque cercano
                  if (capabilities.zoom && capabilities.zoom.max > 1) {
                    // No aplicar zoom automático, pero el dispositivo puede ajustar automáticamente
                  }
                }
              }
            } catch (focusError) {
              console.log('⚠️ Error al configurar autofocus:', focusError.message);
              // No fallar si no se puede configurar autofocus, continuar de todas formas
            }
          }, 500); // Esperar 500ms para que el video esté listo

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

  const settings = getSettings();
  
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

        {(selectedSupermarket || settings.supermercado) && settings.fecha && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-800 mb-2">Información del relevamiento:</p>
            <div className="space-y-1 text-xs text-blue-700">
              <p className="flex items-center gap-2">
                <Store size={14} />
                <span>Supermercado: <span className="font-semibold">{selectedSupermarket || settings.supermercado}</span></span>
              </p>
              <p className="flex items-center gap-2">
                <Calendar size={14} />
                <span>Fecha: <span className="font-semibold">{new Date(settings.fecha).toLocaleDateString()}</span></span>
              </p>
            </div>
          </div>
        )}

        <div id="reader" className="w-full mb-4 rounded-lg overflow-hidden bg-gray-100" style={{ transform: 'scaleX(-1)' }}>
          <style>{`
            #reader video {
              transform: scaleX(-1) !important;
              width: 100% !important;
              height: auto !important;
            }
          `}</style>
        </div>

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

