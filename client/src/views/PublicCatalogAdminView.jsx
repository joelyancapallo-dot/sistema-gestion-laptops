import React, { useState } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Eye, 
  EyeOff, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Share2, 
  ShieldCheck, 
  Search, 
  Laptop,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function PublicCatalogAdminView({
  laptops = [],
  currentUser,
  onRefresh
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPersonalLink, setCopiedPersonalLink] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [updatingId, setUpdatingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const isAdmin = currentUser?.rol === 'admin';

  // Enlaces
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const generalCatalogUrl = `${baseUrl}/catalogo`;
  
  const personalCatalogUrl = `${baseUrl}/catalogo?vendedor=${encodeURIComponent(currentUser?.nombre || '')}${
    currentUser?.telefono ? `&phone=${encodeURIComponent(currentUser.telefono)}` : ''
  }`;

  const handleCopyLink = async (url, isPersonal = false) => {
    try {
      await navigator.clipboard.writeText(url);
      if (isPersonal) {
        setCopiedPersonalLink(true);
        setTimeout(() => setCopiedPersonalLink(false), 2500);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch (_) {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (isPersonal) {
        setCopiedPersonalLink(true);
        setTimeout(() => setCopiedPersonalLink(false), 2500);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  const handleShareWhatsApp = (isPersonal = false) => {
    const url = isPersonal ? personalCatalogUrl : generalCatalogUrl;
    const advisorText = isPersonal ? ` Mi nombre es *${currentUser?.nombre}* y estoy atento a tus consultas.` : '';
    const text = `¡Hola! 👋 Te comparto nuestro catálogo actualizado de laptops disponibles con fotos, especificaciones completas y precios de oferta:%0A%0A🔗 ${url}%0A%0A${advisorText} ¡Cualquier equipo que te guste, me avisas por aquí!`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleTogglePublic = async (laptop) => {
    if (!isAdmin) return;
    try {
      setUpdatingId(laptop.id);
      setStatusMessage(null);

      const res = await fetch(`/api/laptops/${laptop.id}/toggle-public`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicado: !laptop.publicado })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar visibilidad.');

      setStatusMessage({
        type: 'success',
        text: data.message || 'Estado de publicación actualizado.'
      });

      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message
      });
    } finally {
      setUpdatingId(null);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Filtrado de laptops en la tabla de control
  const filteredLaptops = laptops.filter(l => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.marca && l.marca.toLowerCase().includes(term)) ||
      (l.modelo && l.modelo.toLowerCase().includes(term)) ||
      (l.numero_serie && l.numero_serie.toLowerCase().includes(term)) ||
      (l.responsable_nombre && l.responsable_nombre.toLowerCase().includes(term))
    );
  });

  const totalInStock = laptops.filter(l => l.estado === 'disponible' || l.estado === 'reservada').length;
  const totalPublished = laptops.filter(l => (l.estado === 'disponible' || l.estado === 'reservada') && l.publicado !== false).length;

  return (
    <div className="space-y-6">
      
      {/* 1. Header del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Catálogo Público de Laptops
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              Web Externa
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Enlace web comercial para que tus vendedores compartan el inventario disponible con sus clientes.
          </p>
        </div>

        {/* Botón para alternar Vista Previa interactiva */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              previewMode 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>{previewMode ? 'Cerrar Vista Previa' : 'Vista Previa de Clientes'}</span>
          </button>

          <a
            href={generalCatalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir en Nueva Pestaña</span>
          </a>
        </div>
      </div>

      {/* Alerta de Estado */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center space-x-2 text-xs font-bold transition-all ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* 2. Tarjetas de Enlace para Compartir */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Enlace General del Negocio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                🌐 Enlace General del Catálogo
              </span>
              <span className="text-xs text-slate-400 font-medium">Acceso público sin login</span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mt-2">
              Catálogo Oficial LaptopPRO
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Enlace general que muestra todas las laptops disponibles con el número de WhatsApp principal del negocio.
            </p>

            <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 font-mono text-xs text-slate-700 truncate select-all">
              {generalCatalogUrl}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => handleCopyLink(generalCatalogUrl, false)}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>

            <button
              onClick={() => handleShareWhatsApp(false)}
              className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              title="Compartir por WhatsApp"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Enlace Personalizado del Asesor Comercial */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-5 rounded-2xl border border-indigo-200/80 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-1 rounded-lg">
                👤 Tu Enlace Personalizado ({currentUser?.nombre})
              </span>
              <span className="text-xs text-indigo-600 font-bold">¡Recomendado para Vendedores!</span>
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm mt-2">
              Catálogo con tu Asesoría Directa
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Al compartir este enlace, tus clientes verán tu nombre como asesor y los botones de WhatsApp les escribirán directamente a ti.
            </p>

            <div className="mt-3 p-2.5 bg-white rounded-xl border border-indigo-200 font-mono text-xs text-indigo-900 truncate select-all">
              {personalCatalogUrl}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              onClick={() => handleCopyLink(personalCatalogUrl, true)}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              {copiedPersonalLink ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedPersonalLink ? '¡Tu Enlace Copiado!' : 'Copiar Mi Enlace'}</span>
            </button>

            <button
              onClick={() => handleShareWhatsApp(true)}
              className="inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              title="Compartir por WhatsApp con tus datos"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Modo Vista Previa Interactiva (Cómo ven los clientes) */}
      {previewMode ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-base">
                Simulador de Vista del Cliente
              </h2>
              <p className="text-xs text-slate-500">
                Así es exactamente como un cliente ve tu catálogo público en su dispositivo.
              </p>
            </div>

            {/* Alternador Desktop / Móvil */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors ${
                  previewDevice === 'desktop' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="hidden sm:inline">Computadora</span>
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors ${
                  previewDevice === 'mobile' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Celular</span>
              </button>
            </div>
          </div>

          <div className="flex justify-center bg-slate-900/5 p-4 rounded-2xl overflow-hidden">
            <div 
              className={`bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-300 transition-all duration-300 ${
                previewDevice === 'mobile' ? 'w-[375px] h-[667px]' : 'w-full h-[700px]'
              }`}
            >
              <iframe
                src="/catalogo"
                title="Vista previa del Catálogo Público"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      ) : (
        /* 4. Tabla de Control de Publicación (Solo Administrador puede alternar ON/OFF) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-extrabold text-slate-900 text-sm">
                  Control de Laptops Publicadas en la Web
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                  {totalPublished} de {totalInStock} en stock publicadas
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAdmin 
                  ? 'Activa o desactiva qué laptops están visibles para los clientes en el catálogo web público.' 
                  : 'Listado de equipos visibles actualmente en el catálogo público.'}
              </p>
            </div>

            {/* Buscador interno */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por marca, modelo o serie..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Laptop & Serie</th>
                  <th className="py-3 px-4">Condición</th>
                  <th className="py-3 px-4">Especificaciones</th>
                  <th className="py-3 px-4">Precio Sugerido (Público)</th>
                  <th className="py-3 px-4">Estado Inventario</th>
                  <th className="py-3 px-4 text-center">Publicado en Web</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLaptops.length > 0 ? (
                  filteredLaptops.map(laptop => {
                    const isPublished = laptop.publicado !== false;
                    const isUpdating = updatingId === laptop.id;

                    return (
                      <tr key={laptop.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            {laptop.foto_portada ? (
                              <img
                                src={laptop.foto_portada}
                                alt={laptop.modelo}
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                <Laptop className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-900">
                                {laptop.marca} {laptop.modelo}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {laptop.numero_serie}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            laptop.condicion === 'nueva' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {laptop.condicion}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          <div>{laptop.procesador || '-'}</div>
                          <div className="text-slate-400 text-[10px]">
                            {laptop.ram || '8GB'} • {laptop.almacenamiento || '256GB'} • {laptop.pantalla || '15.6" FHD'}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          {formatCurrency(laptop.precio_sugerido)}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            laptop.estado === 'disponible' ? 'bg-emerald-500 text-white' : 
                            laptop.estado === 'reservada' ? 'bg-amber-500 text-white font-extrabold' : 
                            'bg-slate-400 text-white'
                          }`}>
                            {laptop.estado}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isAdmin ? (
                            <button
                              onClick={() => handleTogglePublic(laptop)}
                              disabled={isUpdating}
                              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition-all ${
                                isPublished
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                              }`}
                              title={isPublished ? 'Hacer clic para ocultar del catálogo web' : 'Hacer clic para publicar en el catálogo web'}
                            >
                              {isUpdating ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : isPublished ? (
                                <>
                                  <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Publicado</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Oculto</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              isPublished ? 'text-emerald-700 bg-emerald-50' : 'text-slate-400 bg-slate-50'
                            }`}>
                              {isPublished ? 'Visible en Web' : 'Oculto en Web'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No se encontraron laptops que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* 5. Tarjeta Informativa de Seguridad Comercial */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-emerald-950">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="block font-bold">Blindaje y Privacidad Comercial Activa</strong>
          <p className="text-emerald-900 leading-relaxed">
            El catálogo público está diseñado bajo estricta seguridad a nivel de base de datos. Ningún cliente o visitante externo puede ver precios mínimos, costos de adquisición, ganancias, datos de vendedores o notas internas del negocio, garantizando total confidencialidad.
          </p>
        </div>
      </div>

    </div>
  );
}
