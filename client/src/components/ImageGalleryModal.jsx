import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Laptop, 
  Camera, 
  UserCheck, 
  Maximize2,
  Tag
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function ImageGalleryModal({ isOpen, onClose, laptop, initialIndex = 0 }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const images = laptop?.imagenes && laptop.imagenes.length > 0
    ? laptop.imagenes
    : (laptop?.foto_portada ? [{ url: laptop.foto_portada, nombre_archivo: 'Portada', es_portada: true }] : []);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Navegación por teclado (Flechas y Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !laptop) return null;

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md transition-all animate-fadeIn">
      
      {/* Botón Cerrar Flotante */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
        title="Cerrar Galería (Esc)"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Barra Superior Informativa */}
        <div className="p-4 sm:px-6 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-3 text-white">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                  {laptop.marca} {laptop.modelo}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  laptop.condicion === 'nueva' ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-700 text-slate-300'
                }`}>
                  {laptop.condicion}
                </span>
                <span className="font-mono text-xs text-slate-400 hidden sm:inline">
                  [{laptop.numero_serie}]
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                <span className="flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Custodia Stand: <strong>{laptop.responsable_nombre || 'Sin asignar'}</strong></span>
                </span>
                <span>•</span>
                <span className="text-blue-400 font-semibold">
                  Mínimo: {formatCurrency(laptop.precio_minimo)}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  Sugerido: {formatCurrency(laptop.precio_sugerido)}
                </span>
              </p>
            </div>
          </div>

          {images.length > 0 && (
            <div className="text-right shrink-0">
              <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700">
                {currentIndex + 1} / {images.length}
              </span>
            </div>
          )}
        </div>

        {/* Área Principal de Fotografía */}
        <div className="relative flex-1 min-h-[350px] sm:min-h-[460px] max-h-[60vh] sm:max-h-[65vh] flex items-center justify-center p-4 bg-slate-950/40 overflow-hidden">
          
          {images.length > 0 && currentImage ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img 
                src={currentImage.url} 
                alt={`${laptop.marca} ${laptop.modelo} - Foto ${currentIndex + 1}`} 
                className="max-w-full max-h-[58vh] sm:max-h-[62vh] object-contain rounded-2xl shadow-2xl transition-all duration-300 select-none"
              />
              {currentImage.es_portada && (
                <div className="absolute top-2 left-2 px-3 py-1 bg-amber-500 text-slate-950 font-black text-[11px] rounded-xl shadow-lg flex items-center space-x-1">
                  <span>★ FOTOGRAFÍA PRINCIPAL</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500 p-12 text-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-400 mb-3 border border-slate-700">
                <Laptop className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-slate-300">Este equipo aún no cuenta con fotografías</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                El Administrador puede adjuntar fotografías desde el botón de edición en el catálogo.
              </p>
            </div>
          )}

          {/* Flecha Anterior */}
          {images.length > 1 && (
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 hover:bg-blue-600 text-white transition-all shadow-xl backdrop-blur-sm border border-slate-700/60 hover:scale-105"
              title="Foto anterior (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Flecha Siguiente */}
          {images.length > 1 && (
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-2xl bg-slate-900/80 hover:bg-blue-600 text-white transition-all shadow-xl backdrop-blur-sm border border-slate-700/60 hover:scale-105"
              title="Siguiente foto (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

        </div>

        {/* Tira Inferior de Miniaturas y Especificaciones */}
        {images.length > 1 && (
          <div className="p-3 sm:px-6 bg-slate-950/80 border-t border-slate-800 flex items-center justify-center space-x-2 overflow-x-auto">
            {images.map((img, idx) => (
              <button
                key={img.id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  currentIndex === idx 
                    ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105' 
                    : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                <img 
                  src={img.url} 
                  alt={`Miniatura ${idx + 1}`} 
                  className="w-full h-full object-cover"
                />
                {img.es_portada && (
                  <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 text-[8px] font-black uppercase text-center py-0.2">
                    Portada
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
