import React, { useState, useEffect, useMemo } from 'react';
import { 
  Laptop, 
  Search, 
  Cpu, 
  HardDrive, 
  Monitor, 
  ShieldCheck, 
  MessageCircle, 
  ArrowUpDown, 
  RotateCcw, 
  Eye, 
  Camera, 
  Sparkles, 
  Check, 
  Clock, 
  Layers, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Share2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function PublicCatalogView({ onGoToLogin }) {
  const [laptops, setLaptops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedCondicion, setSelectedCondicion] = useState('');
  const [selectedProcesador, setSelectedProcesador] = useState('');
  const [sortBy, setSortBy] = useState('precio_asc');

  // Modal de Galería de Fotos
  const [selectedLaptopForGallery, setSelectedLaptopForGallery] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Datos de contacto por URL (ej. vendedor que comparte con su cliente ?vendedor=Juan&phone=51987654321)
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const customVendorName = urlParams.get('vendedor') || urlParams.get('v') || '';
  const customPhone = urlParams.get('phone') || urlParams.get('tel') || '51987654321';

  // Cargar catálogo público desde el endpoint seguro
  const fetchPublicCatalog = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/public/catalog');
      if (!res.ok) {
        throw new Error('No se pudo cargar el catálogo público.');
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.laptops)) {
        setLaptops(data.laptops);
      } else {
        setLaptops([]);
      }
    } catch (err) {
      console.error('Error fetching public catalog:', err);
      setError('En este momento no pudimos cargar las laptops disponibles. Por favor, intenta de nuevo en unos instantes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicCatalog();
  }, []);

  // Marcas únicas disponibles
  const availableBrands = useMemo(() => {
    return Array.from(
      new Set(laptops.map(l => l.marca?.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [laptops]);

  // Procesadores simplificados (Intel / AMD / etc.)
  const availableProcessors = useMemo(() => {
    const list = laptops.map(l => {
      const p = (l.procesador || '').toLowerCase();
      if (p.includes('i7')) return 'Intel Core i7';
      if (p.includes('i5')) return 'Intel Core i5';
      if (p.includes('i3')) return 'Intel Core i3';
      if (p.includes('ryzen 7')) return 'AMD Ryzen 7';
      if (p.includes('ryzen 5')) return 'AMD Ryzen 5';
      if (p.includes('ryzen 3')) return 'AMD Ryzen 3';
      return null;
    }).filter(Boolean);
    return Array.from(new Set(list));
  }, [laptops]);

  // Filtrado y ordenación
  const filteredLaptops = useMemo(() => {
    return laptops
      .filter(l => {
        const matchesSearch = 
          !searchTerm ||
          l.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.procesador?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.ram?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.almacenamiento?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesMarca = !selectedMarca || l.marca?.toLowerCase() === selectedMarca.toLowerCase();
        const matchesCondicion = !selectedCondicion || l.condicion === selectedCondicion;

        const matchesProc = !selectedProcesador || 
          (l.procesador && l.procesador.toLowerCase().includes(selectedProcesador.toLowerCase().replace('intel ', '').replace('amd ', '')));

        return matchesSearch && matchesMarca && matchesCondicion && matchesProc;
      })
      .sort((a, b) => {
        const priceA = parseFloat(a.precio_sugerido || 0);
        const priceB = parseFloat(b.precio_sugerido || 0);
        const marcaA = (a.marca || '').toLowerCase();
        const marcaB = (b.marca || '').toLowerCase();

        switch (sortBy) {
          case 'precio_asc':
            return priceA - priceB;
          case 'precio_desc':
            return priceB - priceA;
          case 'marca_asc':
            return marcaA.localeCompare(marcaB, 'es');
          case 'marca_desc':
            return marcaB.localeCompare(marcaA, 'es');
          case 'recientes':
          default:
            return (b.id || 0) - (a.id || 0);
        }
      });
  }, [laptops, searchTerm, selectedMarca, selectedCondicion, selectedProcesador, sortBy]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedMarca || selectedCondicion || selectedProcesador || sortBy !== 'precio_asc'
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedMarca('');
    setSelectedCondicion('');
    setSelectedProcesador('');
    setSortBy('precio_asc');
  };

  // Generar enlace de consulta para WhatsApp
  const getWhatsAppLink = (laptop) => {
    const phone = customPhone.replace(/[^0-9]/g, '');
    const currentUrl = window.location.href;
    const msg = `Hola LaptopPRO 👋, estoy interesado en la siguiente laptop de su catálogo web:%0A%0A` +
      `💻 *${laptop.marca} ${laptop.modelo}*%0A` +
      `🏷️ *Condición:* ${laptop.condicion === 'nueva' ? 'Nueva en Caja' : 'Seminueva Certificada'}%0A` +
      `⚡ *Procesador:* ${laptop.procesador || 'Estándar'}%0A` +
      `🧠 *RAM:* ${laptop.ram || '8GB'} | 💾 *Disco:* ${laptop.almacenamiento || '256GB SSD'}%0A` +
      `🖥️ *Pantalla:* ${laptop.pantalla || '15.6" FHD'}%0A` +
      `💵 *Precio de Oferta:* S/ ${parseFloat(laptop.precio_sugerido || 0).toFixed(2)}%0A%0A` +
      (customVendorName ? `(Atendido por: ${customVendorName})%0A` : '') +
      `¿Sigue disponible para entrega inmediata o envío?%0A🔗 ${currentUrl}`;

    return `https://wa.me/${phone}?text=${msg}`;
  };

  const getGeneralWhatsAppLink = () => {
    const phone = customPhone.replace(/[^0-9]/g, '');
    const msg = `Hola LaptopPRO 👋, estoy viendo su catálogo web y deseo consultar sobre las laptops disponibles.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const openGallery = (laptop, index = 0) => {
    setSelectedLaptopForGallery(laptop);
    setCurrentImageIndex(index);
  };

  const closeGallery = () => {
    setSelectedLaptopForGallery(null);
    setCurrentImageIndex(0);
  };

  // Navegación por teclado en la galería (Esc, Flechas)
  useEffect(() => {
    if (!selectedLaptopForGallery) return;
    const photos = Array.isArray(selectedLaptopForGallery.imagenes) && selectedLaptopForGallery.imagenes.length > 0
      ? selectedLaptopForGallery.imagenes
      : (selectedLaptopForGallery.foto_portada ? [{ url: selectedLaptopForGallery.foto_portada }] : []);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowRight' && photos.length > 1) {
        setCurrentImageIndex(prev => (prev + 1) % photos.length);
      }
      if (e.key === 'ArrowLeft' && photos.length > 1) {
        setCurrentImageIndex(prev => (prev - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLaptopForGallery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-500 selection:text-white">
      
      {/* 1. Barra Superior / Navbar Público */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          
          {/* Logo y Marca */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20">
              <Laptop className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg sm:text-xl tracking-tight text-slate-900">
                  Laptop<span className="text-blue-600">PRO</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-700 tracking-wider">
                  Catálogo Oficial
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-none">
                Laptops Garantizadas • Entrega Inmediata
              </p>
            </div>
          </div>

          {/* Acciones del Header */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Si viene con un vendedor en la URL */}
            {customVendorName && (
              <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                <span>Asesor:</span>
                <strong className="text-slate-900">{customVendorName}</strong>
              </div>
            )}

            {/* Botón WhatsApp Directo */}
            <a
              href={getGeneralWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span className="hidden sm:inline">WhatsApp Ventas</span>
              <span className="sm:hidden">Consultar</span>
            </a>

            {/* Enlace discreto al ERP privado (para administradores o vendedores) */}
            <a
              href="/"
              onClick={(e) => {
                if (onGoToLogin) {
                  e.preventDefault();
                  onGoToLogin();
                }
              }}
              className="inline-flex items-center space-x-1 px-2.5 py-2 text-slate-400 hover:text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors"
              title="Acceso exclusivo para el personal de ventas y administración"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Acceso ERP</span>
            </a>
          </div>
        </div>
      </header>

      {/* 2. Hero Banner Comercial */}
      <section className="bg-gradient-to-b from-white via-blue-50/40 to-slate-50 border-b border-slate-200/60 pt-8 pb-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Inventario 100% Verificado y Garantizado</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Catálogo de Laptops Disponibles
          </h1>
          
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            Equipos seleccionados para trabajo intensivo, estudio, diseño y gaming. Consulta disponibilidad y precios en tiempo real.
          </p>

          {/* Garantías comerciales */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-600">
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Garantía de Funcionamiento</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold">
              <Check className="w-4 h-4 text-blue-600" />
              <span>Cargador Original Incluido</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs font-semibold">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Entrega Inmediata</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Barra de Búsqueda y Filtros */}
      <section className="sticky top-16 sm:top-20 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 text-xs">
            
            {/* Buscador de texto */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Buscar por modelo, procesador, memoria RAM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filtro por Marca */}
            <div>
              <select
                value={selectedMarca}
                onChange={(e) => setSelectedMarca(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
              >
                <option value="">Todas las Marcas ({availableBrands.length})</option>
                {availableBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Condición */}
            <div>
              <select
                value={selectedCondicion}
                onChange={(e) => setSelectedCondicion(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
              >
                <option value="">Todas las Condiciones</option>
                <option value="seminueva">Seminuevas Certificadas</option>
                <option value="nueva">Nuevas en Caja</option>
              </select>
            </div>

            {/* Ordenar por Precio / Marca */}
            <div>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full py-2.5 pl-8 pr-3 bg-blue-50/70 border border-blue-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-900 appearance-none cursor-pointer"
                >
                  <option value="precio_asc">💵 Precio: Menor a Mayor</option>
                  <option value="precio_desc">💵 Precio: Mayor a Menor</option>
                  <option value="recientes">⏱️ Más Recientes</option>
                  <option value="marca_asc">🔤 Marca: A → Z</option>
                  <option value="marca_desc">🔤 Marca: Z → A</option>
                </select>
                <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-3.5 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Resumen de resultados y reset */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="font-medium">
              Mostrando <strong className="text-slate-900">{filteredLaptops.length}</strong> de <strong className="text-slate-900">{laptops.length}</strong> laptops disponibles
            </span>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors font-medium"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer Filtros</span>
              </button>
            )}
          </div>

        </div>
      </section>

      {/* 4. Listado Principal de Laptops */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-500 font-semibold">Cargando catálogo actualizado de laptops...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto border border-red-200">
              <Laptop className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">{error}</h3>
            <button
              onClick={fetchPublicCatalog}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
            >
              Reintentar
            </button>
          </div>
        ) : filteredLaptops.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto">
              <Laptop className="w-8 h-8" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No encontramos equipos con estos filtros</h3>
            <p className="text-xs text-slate-500">
              Prueba modificando la búsqueda o restableciendo los filtros para ver todos los modelos disponibles.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Ver Todas las Laptops
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLaptops.map(laptop => {
              const allImages = Array.isArray(laptop.imagenes) && laptop.imagenes.length > 0 
                ? laptop.imagenes 
                : (laptop.foto_portada ? [{ url: laptop.foto_portada, es_portada: true }] : []);

              const coverImg = allImages.find(img => img.es_portada)?.url || allImages[0]?.url || laptop.foto_portada;
              const isDisponible = laptop.estado === 'disponible';
              const isReservada = laptop.estado === 'reservada';

              return (
                <div 
                  key={laptop.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                    isDisponible ? 'border-slate-200' : 
                    isReservada ? 'border-amber-300 ring-1 ring-amber-300/60 bg-amber-50/15' : 
                    'border-slate-100 opacity-70 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Fotografía de Portada con badge de cantidad y apertura de galería */}
                    <div 
                      onClick={() => openGallery(laptop, 0)}
                      className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-slate-100 mb-3 cursor-pointer group border border-slate-200/80 shadow-xs"
                      title="Haz clic para ver la galería completa de fotografías"
                    >
                      {coverImg ? (
                        <>
                          <img 
                            src={coverImg} 
                            alt={`${laptop.marca} ${laptop.modelo}`} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 bg-slate-900/85 backdrop-blur-sm text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-lg">
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>Ver Galería ({allImages.length || 1})</span>
                            </span>
                          </div>
                          {allImages.length > 1 && (
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold flex items-center space-x-1 shadow">
                              <Camera className="w-3 h-3 text-blue-300" />
                              <span>{allImages.length}</span>
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-50 to-slate-100 group-hover:bg-slate-100/90 transition-colors">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 mb-1 border border-slate-200">
                            <Laptop className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Sin fotografía
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Fila Superior: Marca y Estado */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {laptop.marca}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          laptop.condicion === 'nueva' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {laptop.condicion}
                        </span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          laptop.estado === 'disponible' ? 'bg-emerald-500 text-white' : 
                          laptop.estado === 'reservada' ? 'bg-amber-500 text-white font-extrabold' : 
                          'bg-slate-400 text-white'
                        }`}>
                          {laptop.estado}
                        </span>
                      </div>
                    </div>

                    {/* Modelo */}
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{laptop.modelo}</h3>

                    {/* Especificaciones */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{laptop.procesador || 'Intel / AMD'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span>RAM: <strong>{laptop.ram || '8GB'}</strong></span>
                        <span>Disco: <strong>{laptop.almacenamiento || '256GB SSD'}</strong></span>
                        <span>Pantalla: <strong>{laptop.pantalla || '15.6" FHD'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Precios y Botón de WhatsApp */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                          Precio de Venta Sugerido:
                        </span>
                        <span className="font-extrabold text-lg sm:text-xl text-blue-600">
                          {formatCurrency(laptop.precio_sugerido)}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                        ✓ Garantizado
                      </span>
                    </div>

                    {/* Botón WhatsApp */}
                    <a
                      href={getWhatsAppLink(laptop)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-101 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-white" />
                      <span>Consultar por WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. MODAL DE GALERÍA DE FOTOS EN ALTA RESOLUCIÓN */}
      {selectedLaptopForGallery && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          
          {/* Botón flotante para cerrar */}
          <button
            onClick={closeGallery}
            className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-slate-900/90 text-white hover:bg-slate-800 transition-colors shadow-2xl border border-slate-700/80 cursor-pointer"
            title="Cerrar galería (Esc)"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full max-w-4xl max-h-[95vh] flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Header del Modal */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-3 text-white shrink-0">
              <div className="truncate">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">
                    {selectedLaptopForGallery.marca}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedLaptopForGallery.condicion === 'nueva' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {selectedLaptopForGallery.condicion === 'nueva' ? 'Nueva' : 'Seminueva'}
                  </span>
                </div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-100 truncate mt-1">
                  {selectedLaptopForGallery.modelo}
                </h3>
              </div>

              {(() => {
                const photos = Array.isArray(selectedLaptopForGallery.imagenes) && selectedLaptopForGallery.imagenes.length > 0
                  ? selectedLaptopForGallery.imagenes
                  : (selectedLaptopForGallery.foto_portada ? [{ url: selectedLaptopForGallery.foto_portada }] : []);
                return photos.length > 0 ? (
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700 shrink-0">
                    {currentImageIndex + 1} de {photos.length}
                  </span>
                ) : null;
              })()}
            </div>

            {/* Visor de Foto Principal - 100% AJUSTADA SIN CORTES NI DEFORMACIONES */}
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-hidden min-h-[240px] max-h-[50vh] sm:max-h-[56vh]">
              {(() => {
                const photos = Array.isArray(selectedLaptopForGallery.imagenes) && selectedLaptopForGallery.imagenes.length > 0
                  ? selectedLaptopForGallery.imagenes
                  : (selectedLaptopForGallery.foto_portada ? [{ url: selectedLaptopForGallery.foto_portada }] : []);

                if (photos.length === 0) {
                  return (
                    <div className="text-slate-400 text-sm flex flex-col items-center">
                      <Laptop className="w-12 h-12 mb-2 text-slate-600" />
                      <span>Sin fotografías adicionales registradas</span>
                    </div>
                  );
                }

                const currentPhoto = photos[currentImageIndex] || photos[0];

                return (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={currentPhoto.url}
                      alt={`${selectedLaptopForGallery.marca} ${selectedLaptopForGallery.modelo} - Foto ${currentImageIndex + 1}`}
                      className="max-w-full max-h-[46vh] sm:max-h-[52vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none mx-auto"
                    />

                    {/* Flechas de navegación si hay más de 1 foto */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImageIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white transition-all shadow-xl backdrop-blur-sm border border-slate-700/80 hover:scale-105 cursor-pointer z-10"
                          title="Foto anterior"
                        >
                          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button
                          onClick={() => setCurrentImageIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white transition-all shadow-xl backdrop-blur-sm border border-slate-700/80 hover:scale-105 cursor-pointer z-10"
                          title="Siguiente foto"
                        >
                          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Tira de Miniaturas (si hay más de 1 foto) */}
            {(() => {
              const photos = Array.isArray(selectedLaptopForGallery.imagenes) && selectedLaptopForGallery.imagenes.length > 0
                ? selectedLaptopForGallery.imagenes
                : (selectedLaptopForGallery.foto_portada ? [{ url: selectedLaptopForGallery.foto_portada }] : []);

              if (photos.length <= 1) return null;

              return (
                <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-center space-x-2 overflow-x-auto shrink-0">
                  {photos.map((img, idx) => (
                    <button
                      key={img.id || idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        currentImageIndex === idx
                          ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                          : 'border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={`Miniatura ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Barra Inferior del Modal con Especificaciones y Botón WhatsApp */}
            <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-slate-300">
                <span className="bg-slate-800 px-2 py-1 rounded-lg">
                  CPU: <strong className="text-white">{selectedLaptopForGallery.procesador || '-'}</strong>
                </span>
                <span className="bg-slate-800 px-2 py-1 rounded-lg">
                  RAM: <strong className="text-white">{selectedLaptopForGallery.ram || '-'}</strong>
                </span>
                <span className="bg-slate-800 px-2 py-1 rounded-lg">
                  Disco: <strong className="text-white">{selectedLaptopForGallery.almacenamiento || '-'}</strong>
                </span>
                <span className="bg-slate-800 px-2 py-1 rounded-lg">
                  Pantalla: <strong className="text-white">{selectedLaptopForGallery.pantalla || '-'}</strong>
                </span>
                <span className="font-black text-sm text-emerald-400 ml-1">
                  {formatCurrency(selectedLaptopForGallery.precio_sugerido)}
                </span>
              </div>

              <a
                href={getWhatsAppLink(selectedLaptopForGallery)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-102 shrink-0 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Consultar por WhatsApp</span>
              </a>
            </div>

          </div>
        </div>
      )}

      {/* 6. Botón Flotante de WhatsApp para Consultas Generales */}
      <a
        href={getGeneralWhatsAppLink()}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-600/40 transition-all hover:scale-108 group"
        title="Consultar por WhatsApp con un asesor"
      >
        <MessageCircle className="w-7 h-7 fill-white" />
        <span className="absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          ¿Tienes dudas? Escríbenos
        </span>
      </a>

      {/* 7. Footer Público */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
              LP
            </div>
            <span className="font-bold text-slate-200 text-sm">LaptopPRO — Catálogo Comercial de Laptops</span>
          </div>
          <p className="text-center sm:text-right text-slate-500">
            Todos los equipos publicados están sujetos a verificación de stock en tienda física. Precios en Soles (S/).
          </p>
        </div>
      </footer>

    </div>
  );
}
