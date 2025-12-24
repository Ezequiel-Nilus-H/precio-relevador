import { useState } from 'react';
import { Camera, Search, Settings } from 'lucide-react';
import BarcodeScanner from './components/BarcodeScanner';
import ProductSearch from './components/ProductSearch';
import SupermarketSelector from './components/SupermarketSelector';
import ProductSearchByCategory from './components/ProductSearchByCategory';
import ProductFormWithDropdowns from './components/ProductFormWithDropdowns';
import PriceEntryMultiple from './components/PriceEntryMultiple';
import PriceEntryModal from './components/PriceEntryModal';
import SettingsComponent from './components/Settings';
import { productsAPI, productOperationsAPI } from './utils/api';
import { getSettings } from './utils/storage';

function App() {
  const [selectedSupermarket, setSelectedSupermarket] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showPriceEntry, setShowPriceEntry] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [foundProducts, setFoundProducts] = useState([]);
  const [view, setView] = useState('search'); // 'search', 'scan'
  const [showSettings, setShowSettings] = useState(false);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState(null);

  const handleSupermarketSelected = (supermarket) => {
    setSelectedSupermarket(supermarket);
  };

  const handleStartScan = () => {
    if (!selectedSupermarket) {
      alert('Por favor selecciona un supermercado primero');
      return;
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = async (barcode) => {
    setScannedBarcode(barcode);
    setShowScanner(false);
    
    // Verificar si el producto ya existe en MongoDB
    try {
      const products = await productsAPI.getByEAN(barcode);
      if (products && products.length > 0) {
        // Producto encontrado
        setFoundProducts(products);
        setShowPriceEntry(true);
      } else {
        // Producto no encontrado - mostrar búsqueda por categoría/marca
        setShowProductSearch(true);
      }
    } catch (error) {
      // Si no existe (404), mostrar búsqueda
      if (error.message.includes('404') || error.message.includes('no encontrado')) {
        setShowProductSearch(true);
      } else {
        console.error('Error buscando producto:', error);
        alert('Error al buscar producto. Intenta crear uno nuevo.');
        setShowProductSearch(true);
      }
    }
  };

  const handleAddEANToProduct = async (productId, ean) => {
    await productOperationsAPI.addEANToProduct(productId, ean);
  };

  const handleProductSelectedFromSearch = (product) => {
    setShowProductSearch(false);
    setFoundProducts([product]);
    setShowPriceEntry(true);
  };

  const handleCreateNewProduct = () => {
    setShowProductSearch(false);
    setShowProductForm(true);
  };

  const handleProductSaved = (product) => {
    setShowProductForm(false);
    setFoundProducts([product]);
    setShowPriceEntry(true);
  };

  const handlePriceSaved = () => {
    setShowPriceEntry(false);
    setFoundProducts([]);
    setScannedBarcode('');
    setSelectedSupermarket(null); // Reset para nuevo relevamiento
  };

  const [refreshProductSearch, setRefreshProductSearch] = useState(0);

  const handleSelectProductFromSearch = (product) => {
    // Abrir modal para cargar precio
    console.log('Producto seleccionado:', product);
    setSelectedProductForPrice(product);
  };

  const handlePriceSavedFromModal = () => {
    setSelectedProductForPrice(null);
    // Trigger refresh en ProductSearch
    setRefreshProductSearch(prev => prev + 1);
  };

  const resetScanFlow = () => {
    setShowProductSearch(false);
    setShowProductForm(false);
    setShowPriceEntry(false);
    setScannedBarcode('');
    setFoundProducts([]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relevador de Precios</h1>
            <p className="text-sm text-gray-600">Registra y compara precios de productos</p>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ajustes"
          >
            <Settings size={24} className="text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => {
              setView('search');
              resetScanFlow();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Search size={20} />
            Buscar Producto
          </button>
          <button
            onClick={() => {
              setView('scan');
              resetScanFlow();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
              view === 'scan'
                ? 'bg-green-600 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Camera size={20} />
            Escanear Producto
          </button>
        </div>

        {/* Vista: Buscar Producto */}
        {view === 'search' && !showProductForm && !showPriceEntry && !showProductSearch && (
          <ProductSearch
            onSelectProduct={handleSelectProductFromSearch}
            onPriceSaved={refreshProductSearch}
          />
        )}

        {/* Vista: Escanear Producto */}
        {view === 'scan' && !selectedSupermarket && !showScanner && !showProductSearch && !showProductForm && !showPriceEntry && (
          <SupermarketSelector
            selectedSupermarket={selectedSupermarket}
            onSelect={handleSupermarketSelected}
            onStartScan={handleStartScan}
          />
        )}

        {view === 'scan' && selectedSupermarket && showProductSearch && (
          <ProductSearchByCategory
            scannedEAN={scannedBarcode}
            onSelectProduct={handleProductSelectedFromSearch}
            onAddEANToProduct={handleAddEANToProduct}
            onCreateNew={handleCreateNewProduct}
            onCancel={() => {
              resetScanFlow();
              setSelectedSupermarket(null);
            }}
          />
        )}

        {showProductForm && (
          <div className="mb-6">
            <ProductFormWithDropdowns
              barcode={scannedBarcode}
              onSave={handleProductSaved}
              onCancel={() => {
                resetScanFlow();
                setSelectedSupermarket(null);
              }}
            />
          </div>
        )}

        {showPriceEntry && foundProducts.length > 0 && (
          <div className="mb-6">
            <PriceEntryMultiple
              products={foundProducts}
              selectedSupermarket={selectedSupermarket}
              onSave={handlePriceSaved}
              onCancel={() => {
                resetScanFlow();
                setSelectedSupermarket(null);
              }}
            />
          </div>
        )}
      </main>

      {showSettings && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Cerrar si se hace clic fuera del contenido
            if (e.target === e.currentTarget) {
              setShowSettings(false);
            }
          }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsComponent
              onClose={() => setShowSettings(false)}
              onSave={(settings) => {
                setShowSettings(false);
                // Si hay un supermercado configurado en ajustes, usarlo
                if (settings.supermercado && !selectedSupermarket) {
                  setSelectedSupermarket(settings.supermercado);
                }
              }}
            />
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => {
            setShowScanner(false);
            if (!scannedBarcode) {
              setSelectedSupermarket(null);
            }
          }}
        />
      )}

      {selectedProductForPrice && (
        <PriceEntryModal
          product={selectedProductForPrice}
          onSave={handlePriceSavedFromModal}
          onClose={() => setSelectedProductForPrice(null)}
        />
      )}
    </div>
  );
}

export default App;
