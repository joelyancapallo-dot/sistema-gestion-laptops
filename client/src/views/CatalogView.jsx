import React, { useState, useRef } from 'react';
import { 
  Laptop, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Tag, 
  Cpu, 
  ShieldCheck,
  AlertCircle,
  UserCheck,
  ArrowRightLeft,
  Users,
  Clock,
  X,
  XCircle,
  BookmarkCheck,
  Camera,
  UploadCloud,
  Eye,
  Star,
  ArrowUpDown,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';
import ImageGalleryModal from '../components/ImageGalleryModal';

export default function CatalogView({ 
  laptops = [], 
  vendors = [],
  currentUser, 
  onSaveLaptop, 
  onDeleteLaptop,
  onRefresh
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('en_stock');
  const [selectedCondicion, setSelectedCondicion] = useState('');
  const [selectedResponsable, setSelectedResponsable] = useState('');
  const [sortBy, setSortBy] = useState('recientes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaptop, setEditingLaptop] = useState(null);

  // Modal de Galería Ampliada de Fotografías (Visible para Vendedores y Admin)
  const [galleryLaptop, setGalleryLaptop] = useState(null);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Fotografías para creación y edición (Administrador)
  const [uploadedFotos, setUploadedFotos] = useState([]);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const openGalleryModal = (laptop, index = 0) => {
    setGalleryLaptop(laptop);
    setGalleryInitialIndex(index);
  };

  // Subir fotografías al servidor con validación de tipo y tamaño
  const handleUploadFiles = async (filesList) => {
    if (!filesList || filesList.length === 0) return;

    const validFiles = [];
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        alert(`El archivo "${file.name}" no tiene un formato admitido. Solo se aceptan imágenes JPG, JPEG, PNG y WEBP.`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`El archivo "${file.name}" supera el tamaño máximo permitido de 5 MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const uploadFormData = new FormData();
    validFiles.forEach(f => uploadFormData.append('fotos', f));

    try {
      setUploadingFotos(true);
      const res = await fetch('/api/laptops/upload', {
        method: 'POST',
        body: uploadFormData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir fotografías.');

      if (Array.isArray(data.files) && data.files.length > 0) {
        setUploadedFotos(prev => {
          const hasCover = prev.some(p => p.es_portada);
          const newFiles = data.files.map((f, idx) => ({
            ...f,
            es_portada: !hasCover && idx === 0
          }));
          return [...prev, ...newFiles];
        });
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingFotos(false);
    }
  };

  const handleSetCoverPhoto = (index) => {
    setUploadedFotos(prev => prev.map((f, i) => ({
      ...f,
      es_portada: i === index
    })));
  };

  const handleRemovePhoto = (index) => {
    setUploadedFotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(f => f.es_portada)) {
        updated[0].es_portada = true;
      }
      return updated;
    });
  };

  // Modal de Transferencia de Custodia Física (Solo Admin)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferLaptop, setTransferLaptop] = useState(null);
  const [newVendorId, setNewVendorId] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Modal de Reserva Temporal (24 Horas)
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveLaptop, setReserveLaptop] = useState(null);
  const [clienteReserva, setClienteReserva] = useState('');
  const [reserveLoading, setReserveLoading] = useState(false);

  const isAdmin = currentUser?.rol === 'admin';

  // Form State
  const [formData, setFormData] = useState({
    marca: 'Lenovo',
    modelo: '',
    numero_serie: '',
    condicion: 'seminueva',
    procesador: '',
    ram: '16GB',
    almacenamiento: '512GB SSD',
    pantalla: '15.6" FHD',
    costo_adquisicion: '',
    gastos_adquisicion: '15.00',
    precio_minimo: '',
    precio_sugerido: '',
    estado: 'disponible',
    responsable_id: vendors[0]?.id || ''
  });

  const openNewModal = async () => {
    setEditingLaptop(null);
    setUploadedFotos([]);
    let nextSerial = 'SN-00001';
    try {
      const res = await fetch('/api/laptops/next-serial');
      if (res.ok) {
        const data = await res.json();
        if (data.nextSerial) {
          nextSerial = data.nextSerial;
        }
      }
    } catch (err) {
      console.error('Error al obtener siguiente número de serie:', err);
    }

    setFormData({
      marca: 'Lenovo',
      modelo: '',
      numero_serie: nextSerial,
      condicion: 'seminueva',
      procesador: '',
      ram: '16GB',
      almacenamiento: '512GB SSD',
      pantalla: '15.6" FHD',
      costo_adquisicion: '',
      gastos_adquisicion: '15.00',
      precio_minimo: '',
      precio_sugerido: '',
      estado: 'disponible',
      responsable_id: currentUser?.rol === 'vendedor' ? currentUser.id : (vendors[0]?.id || '')
    });
    setIsModalOpen(true);
  };

  const handleMinPriceChange = (val) => {
    const num = parseFloat(val);
    const updated = {
      ...formData,
      precio_minimo: val
    };
    if (!isNaN(num) && num > 0) {
      // Regla: Precio sugerido = Precio mínimo de venta + S/ 150.00
      updated.precio_sugerido = (num + 150).toFixed(2);
    } else if (!val) {
      updated.precio_sugerido = '';
    }
    setFormData(updated);
  };

  const handleBlurDecimal = (field) => {
    const raw = formData[field];
    if (raw !== '' && raw !== null && raw !== undefined) {
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        setFormData(prev => ({
          ...prev,
          [field]: num.toFixed(2)
        }));
      }
    }
  };

  const openEditModal = (laptop) => {
    setEditingLaptop(laptop);
    setUploadedFotos(
      Array.isArray(laptop.imagenes) && laptop.imagenes.length > 0
        ? [...laptop.imagenes]
        : (laptop.foto_portada ? [{ url: laptop.foto_portada, nombre_archivo: 'Portada', es_portada: true }] : [])
    );
    setFormData({
      marca: laptop.marca,
      modelo: laptop.modelo,
      numero_serie: laptop.numero_serie,
      condicion: laptop.condicion,
      procesador: laptop.procesador || '',
      ram: laptop.ram || '',
      almacenamiento: laptop.almacenamiento || '',
      pantalla: laptop.pantalla || '15.6" FHD',
      costo_adquisicion: laptop.costo_adquisicion || '',
      gastos_adquisicion: laptop.gastos_adquisicion || '15.00',
      precio_minimo: laptop.precio_minimo,
      precio_sugerido: laptop.precio_sugerido,
      estado: laptop.estado,
      responsable_id: laptop.responsable_id || vendors[0]?.id || ''
    });
    setIsModalOpen(true);
  };

  const openTransferModal = (laptop) => {
    setTransferLaptop(laptop);
    // Sugerir el primer vendedor que no sea el actual
    const otherVendor = vendors.find(v => v.id !== laptop.responsable_id) || vendors[0];
    setNewVendorId(otherVendor ? otherVendor.id : '');
    setTransferReason('Reasignación de stand / vitrina');
    setIsTransferModalOpen(true);
  };

  const handleExecuteTransfer = async (e) => {
    e.preventDefault();
    if (!transferLaptop || !newVendorId) return;

    try {
      const res = await fetch(`/api/laptops/${transferLaptop.id}/transferir`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.rol || 'admin',
          'x-user-id': String(currentUser?.id || 1)
        },
        body: JSON.stringify({
          nuevo_responsable_id: parseInt(newVendorId, 10),
          motivo: transferReason,
          usuario_id: currentUser?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error transfiriendo custodia');
      setIsTransferModalOpen(false);
      setTransferLaptop(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handlers para Reserva Temporal de 24 Horas
  const openReserveModal = (laptop) => {
    setReserveLaptop(laptop);
    setClienteReserva('');
    setIsReserveModalOpen(true);
  };

  const handleExecuteReserve = async (e) => {
    e.preventDefault();
    if (!reserveLaptop) return;

    try {
      setReserveLoading(true);
      const res = await fetch(`/api/laptops/${reserveLaptop.id}/reservar`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.rol || 'vendedor',
          'x-user-id': String(currentUser?.id || 1)
        },
        body: JSON.stringify({
          cliente_nombre: clienteReserva,
          usuario_id: currentUser?.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reservar laptop');
      setIsReserveModalOpen(false);
      setReserveLaptop(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setReserveLoading(false);
    }
  };

  const handleCancelReservation = async (laptop) => {
    if (!confirm(`¿Estás seguro de cancelar la reserva de ${laptop.marca} ${laptop.modelo}?\n\nEl stock volverá a estar disponible para venta inmediata.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/laptops/${laptop.id}/cancelar-reserva`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.rol || 'vendedor',
          'x-user-id': String(currentUser?.id || 1)
        },
        body: JSON.stringify({
          usuario_id: currentUser?.id,
          motivo: 'Cancelación manual'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cancelar reserva');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const getTimeRemaining = (expiryDate) => {
    if (!expiryDate) return '';
    const now = new Date();
    const exp = new Date(expiryDate);
    const diffMs = exp - now;
    if (diffMs <= 0) return 'Expirada';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const formatReservationExpiry = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }) +
           ' (' + d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) + ')';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await onSaveLaptop({
        ...formData,
        fotos: uploadedFotos,
        imagenes: uploadedFotos
      }, !!editingLaptop, editingLaptop ? editingLaptop.id : null);
      setIsModalOpen(false);
    } catch (err) {
      alert('Error guardando laptop: ' + err.message);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm || 
    (selectedEstado && selectedEstado !== 'en_stock') || 
    selectedCondicion || 
    selectedResponsable || 
    sortBy !== 'recientes'
  );

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedEstado('en_stock');
    setSelectedCondicion('');
    setSelectedResponsable('');
    setSortBy('recientes');
  };

  // Filtrado y ordenación de laptops
  const filteredLaptops = laptops
    .filter(l => {
      const matchesSearch = 
        (l.marca?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.modelo?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.numero_serie?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.responsable_nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.reservado_por_nombre?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (l.procesador?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesEstado = !selectedEstado || 
        (selectedEstado === 'en_stock' ? (l.estado === 'disponible' || l.estado === 'reservada') : l.estado === selectedEstado);
      const matchesCondicion = !selectedCondicion || l.condicion === selectedCondicion;
      const matchesResponsable = !selectedResponsable || String(l.responsable_id) === String(selectedResponsable);

      return matchesSearch && matchesEstado && matchesCondicion && matchesResponsable;
    })
    .sort((a, b) => {
      const priceA = parseFloat(a.precio_sugerido || a.precio_minimo || 0);
      const priceB = parseFloat(b.precio_sugerido || b.precio_minimo || 0);
      const marcaA = (a.marca || '').toLowerCase();
      const marcaB = (b.marca || '').toLowerCase();
      const modeloA = (a.modelo || '').toLowerCase();
      const modeloB = (b.modelo || '').toLowerCase();

      switch (sortBy) {
        case 'precio_asc':
          return priceA - priceB;
        case 'precio_desc':
          return priceB - priceA;
        case 'marca_asc':
          return marcaA.localeCompare(marcaB, 'es') || modeloA.localeCompare(modeloB, 'es');
        case 'marca_desc':
          return marcaB.localeCompare(marcaA, 'es') || modeloB.localeCompare(modeloA, 'es');
        case 'recientes':
        default:
          return (b.id || 0) - (a.id || 0);
      }
    });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Catálogo e Inventario de Laptops
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
              Custodia Física Individual
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cada laptop pertenece a la custodia física del vendedor que la recibe a su cargo. Al venderse, se preserva este registro.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Nueva Laptop</span>
          </button>
        )}
      </div>

      {/* Filtros y Ordenación */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Buscador */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              placeholder="Buscar marca, modelo, serie o custodia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Ordenar por (Precio, Marca, Recientes) */}
          <div>
            <div className="relative">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2 pl-8 pr-3 bg-blue-50/60 border border-blue-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-900 appearance-none cursor-pointer"
              >
                <option value="recientes">⏱️ Más Recientes</option>
                <option value="precio_asc">💵 Precio: Menor a Mayor</option>
                <option value="precio_desc">💵 Precio: Mayor a Menor</option>
                <option value="marca_asc">🔤 Marca: A → Z</option>
                <option value="marca_desc">🔤 Marca: Z → A</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600 absolute left-2.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Estado */}
          <div>
            <select 
              value={selectedEstado} 
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="">Todos los Estados</option>
              <option value="en_stock">En Stock (Disponibles y Reservadas)</option>
              <option value="disponible">Solo Disponibles Libres</option>
              <option value="reservada">Solo Reservadas (24h)</option>
              <option value="vendida">Vendidas</option>
            </select>
          </div>

          {/* Condición */}
          <div>
            <select 
              value={selectedCondicion} 
              onChange={(e) => setSelectedCondicion(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="">Todas las Condiciones</option>
              <option value="nueva">Nuevas</option>
              <option value="seminueva">Seminuevas</option>
            </select>
          </div>
        </div>

        {/* Barra de Responsable y Resumen de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Custodia física:</span>
            <select 
              value={selectedResponsable} 
              onChange={(e) => setSelectedResponsable(e.target.value)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 text-xs"
            >
              <option value="">Todos los Responsables</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 ml-auto">
            <span className="text-slate-500 font-medium">
              Mostrando <strong className="text-slate-800">{filteredLaptops.length}</strong> de <strong className="text-slate-800">{laptops.length}</strong> laptops
            </span>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                title="Restablecer todos los filtros"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Tarjetas de Laptops */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLaptops.length > 0 ? (
          filteredLaptops.map((l) => {
            const isDisponible = l.estado === 'disponible';
            const isReservada = l.estado === 'reservada';
            const costoTotal = parseFloat(l.costo_adquisicion || 0) + parseFloat(l.gastos_adquisicion || 0);
            const gananciaBase = parseFloat(l.precio_minimo) - costoTotal;

            return (
              <div 
                key={l.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${
                  isDisponible ? 'border-slate-200' : 
                  isReservada ? 'border-amber-300 ring-1 ring-amber-300/60 bg-amber-50/15' : 
                  'border-slate-100 opacity-70 bg-slate-50/50'
                }`}
              >
                <div>
                  
                  {/* Fotografía de Portada con badge de cantidad y apertura de galería */}
                  <div 
                    onClick={() => openGalleryModal(l)}
                    className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden bg-slate-100 mb-3 cursor-pointer group border border-slate-200/80 shadow-xs"
                    title="Haz clic para ver la galería completa de fotografías"
                  >
                    {l.foto_portada || (l.imagenes && l.imagenes.length > 0) ? (
                      <>
                        <img 
                          src={l.foto_portada || l.imagenes[0].url} 
                          alt={`${l.marca} ${l.modelo}`} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-slate-950/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="px-3 py-1.5 bg-slate-900/85 backdrop-blur-sm text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-lg">
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Ver Galería ({l.imagenes?.length || 1})</span>
                          </span>
                        </div>
                        {l.imagenes && l.imagenes.length > 1 && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold flex items-center space-x-1 shadow">
                            <Camera className="w-3 h-3 text-blue-300" />
                            <span>{l.imagenes.length}</span>
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
                      {l.marca}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.condicion === 'nueva' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {l.condicion}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.estado === 'disponible' ? 'bg-emerald-500 text-white' : 
                        l.estado === 'reservada' ? 'bg-amber-500 text-white font-extrabold' : 
                        'bg-slate-400 text-white'
                      }`}>
                        {l.estado}
                      </span>
                    </div>
                  </div>

                  {/* Modelo y Serie */}
                  <h3 className="font-extrabold text-slate-900 text-sm">{l.modelo}</h3>
                  <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                    Serie: <span className="text-slate-600 font-medium">{l.numero_serie}</span>
                  </div>

                  {/* Badge de Responsabilidad Física / Custodia */}
                  <div className="mt-2.5 p-2 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 overflow-hidden">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] text-indigo-500 font-bold block uppercase tracking-wider leading-none">
                          Custodia Física a Cargo de:
                        </span>
                        <span className="font-extrabold text-indigo-900 text-[11px] truncate block">
                          {l.responsable_nombre || 'Sin asignar'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Transferir: SOLO ADMINISTRADOR */}
                      {isDisponible && isAdmin && (
                        <button
                          onClick={() => openTransferModal(l)}
                          className="px-2 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold shadow-xs flex items-center space-x-1 transition-colors"
                          title="Transferir custodia a otro vendedor (Exclusivo Administrador)"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                          <span>Transferir</span>
                        </button>
                      )}

                      {/* Reservar: Disponible para rol vendedor (y administrador) */}
                      {isDisponible && (
                        <button
                          onClick={() => openReserveModal(l)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold shadow-xs flex items-center space-x-1 transition-colors"
                          title="Reservar equipo por 24 horas (bloquea el stock temporalmente)"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Reservar</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Banner de Reserva Activa con Cuenta Regresiva de 24h */}
                  {isReservada && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Stock Reservado (24 Horas)</span>
                        </span>
                        {(isAdmin || l.reservado_por === currentUser?.id) && (
                          <button
                            onClick={() => handleCancelReservation(l)}
                            className="px-2 py-0.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[10px] font-bold shadow-xs transition-colors flex items-center space-x-1"
                            title="Cancelar reserva y liberar laptop al stock disponible"
                          >
                            <X className="w-3 h-3" />
                            <span>Liberar</span>
                          </button>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-950 font-medium leading-tight">
                        <span>A cargo de la reserva: </span>
                        <strong className="text-amber-900">{l.reservado_por_nombre || 'Vendedor'}</strong>
                        {l.cliente_reserva && (
                          <span className="block text-slate-600 text-[10px] font-normal mt-0.5">
                            Cliente / Ref: {l.cliente_reserva}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-amber-800 pt-1 border-t border-amber-200/70 font-semibold">
                        <span>Vence: {formatReservationExpiry(l.reserva_expira_at)}</span>
                        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-extrabold text-[10px]">
                          {getTimeRemaining(l.reserva_expira_at)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Especificaciones */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{l.procesador || 'Intel / AMD'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>RAM: <strong>{l.ram || '8GB'}</strong></span>
                      <span>Disco: <strong>{l.almacenamiento || '256GB SSD'}</strong></span>
                      <span>Pantalla: <strong>{l.pantalla || '15.6" FHD'}</strong></span>
                    </div>
                  </div>

                </div>

                {/* Precios y Rentabilidad */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                  
                  {/* Precios Autorizados */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                        Precio Mínimo:
                      </span>
                      <span className="font-black text-sm text-slate-900">
                        {formatCurrency(l.precio_minimo)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                        Precio Sugerido:
                      </span>
                      <span className="font-extrabold text-sm text-blue-600">
                        {formatCurrency(l.precio_sugerido)}
                      </span>
                    </div>
                  </div>

                  {/* Información Financiera Exclusiva para Administrador */}
                  {isAdmin && (
                    <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-slate-600">
                        <span>Costo Total Equipo:</span>
                        <span className="font-medium">{formatCurrency(costoTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-emerald-800 pt-0.5 border-t border-emerald-200/60">
                        <span>Ganancia Base Negocio:</span>
                        <span>+{formatCurrency(gananciaBase)}</span>
                      </div>
                    </div>
                  )}

                  {/* Acciones de Edición para Administrador */}
                  {isAdmin && (
                    <div className="pt-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(l)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Estás seguro de eliminar la laptop ${l.marca} ${l.modelo}?`)) {
                            onDeleteLaptop(l.id);
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg"
                        title="Eliminar laptop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            No se encontraron laptops con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* MODAL AGREGAR / EDITAR LAPTOP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-extrabold text-base text-slate-900">
                {editingLaptop ? 'Modificar Laptop en Catálogo' : 'Registrar Nueva Laptop al Catálogo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              
              {/* Asignación de Responsable Físico (Custodia) */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                <label className="font-extrabold text-indigo-950 block">
                  👤 Vendedor Responsable de Custodia Física *
                </label>
                <p className="text-[11px] text-indigo-700 leading-tight">
                  Vendedor que recibe físicamente el equipo en su stand y queda a su cargo hasta que se venda.
                </p>
                <select 
                  required
                  value={formData.responsable_id} 
                  onChange={(e) => setFormData({ ...formData, responsable_id: e.target.value })}
                  className="w-full mt-1.5 p-2 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Seleccionar vendedor custodio --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Marca *</label>
                  <select 
                    value={formData.marca} 
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="Lenovo">Lenovo</option>
                    <option value="HP">HP</option>
                    <option value="Dell">Dell</option>
                    <option value="ASUS">ASUS</option>
                    <option value="Apple">Apple</option>
                    <option value="Acer">Acer</option>
                    <option value="MSI">MSI</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Condición *</label>
                  <select 
                    value={formData.condicion} 
                    onChange={(e) => setFormData({ ...formData, condicion: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                  >
                    <option value="seminueva">Seminueva</option>
                    <option value="nueva">Nueva</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Modelo Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: ThinkPad T14 Gen 2" 
                  value={formData.modelo} 
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                  <span>Número de Serie Único (Serial Number) *</span>
                  <span className="text-[10px] text-blue-600 font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Correlativo Automático</span>
                  </span>
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    readOnly
                    placeholder="SN-00001" 
                    value={formData.numero_serie} 
                    className="w-full p-2 font-mono font-bold bg-slate-100 border border-slate-300 rounded-xl text-slate-700 cursor-not-allowed select-none"
                    title="El número de serie es correlativo y asignado automáticamente por el sistema."
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Generado automáticamente por el sistema (ej. SN-00001). No modificable manualmente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Procesador</label>
                  <input 
                    type="text" 
                    placeholder="i5-1135G7 / Ryzen 5" 
                    value={formData.procesador} 
                    onChange={(e) => setFormData({ ...formData, procesador: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                    <span>Tamaño de Pantalla</span>
                    <span className="text-[10px] text-blue-600 font-semibold">Predet: 15.6" FHD</span>
                  </label>
                  <input 
                    type="text" 
                    list="pantalla-sugerencias"
                    placeholder='15.6" FHD' 
                    value={formData.pantalla} 
                    onChange={(e) => setFormData({ ...formData, pantalla: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium"
                  />
                  <datalist id="pantalla-sugerencias">
                    <option value='15.6" FHD' />
                    <option value='14.0" FHD' />
                    <option value='15.6" HD' />
                    <option value='14.0" HD' />
                    <option value='16.0" WUXGA / 2K' />
                    <option value='17.3" FHD' />
                    <option value='13.3" FHD' />
                    <option value='14.5" 2.5K' />
                    <option value='15.6" 144Hz IPS' />
                  </datalist>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Memoria RAM</label>
                  <input 
                    type="text" 
                    placeholder="16GB" 
                    value={formData.ram} 
                    onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Almacenamiento (Disco)</label>
                  <input 
                    type="text" 
                    placeholder="512GB SSD" 
                    value={formData.almacenamiento} 
                    onChange={(e) => setFormData({ ...formData, almacenamiento: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Costos y Precios */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block mb-2">
                  Estructura de Precios y Rentabilidad (S/)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Costo Adquisición (S/) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      placeholder="0.00" 
                      value={formData.costo_adquisicion} 
                      onChange={(e) => setFormData({ ...formData, costo_adquisicion: e.target.value })}
                      onBlur={() => handleBlurDecimal('costo_adquisicion')}
                      className="w-full p-2 border border-slate-300 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                      <span>Gastos Adicionales (S/)</span>
                      <span className="text-[10px] text-slate-400 font-normal">Predet: S/ 15.00</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="15.00" 
                      value={formData.gastos_adquisicion} 
                      onChange={(e) => setFormData({ ...formData, gastos_adquisicion: e.target.value })}
                      onBlur={() => handleBlurDecimal('gastos_adquisicion')}
                      className="w-full p-2 border border-slate-300 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="font-bold text-blue-900 block mb-1">Precio Mínimo de Venta (S/) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      placeholder="0.00" 
                      value={formData.precio_minimo} 
                      onChange={(e) => handleMinPriceChange(e.target.value)}
                      onBlur={() => handleBlurDecimal('precio_minimo')}
                      className="w-full p-2 bg-blue-50/50 border border-blue-300 rounded-xl font-extrabold text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 flex items-center justify-between mb-1">
                      <span>Precio Sugerido Venta (S/) *</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">+S/ 150 autom.</span>
                    </label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      placeholder="0.00" 
                      value={formData.precio_sugerido} 
                      onChange={(e) => setFormData({ ...formData, precio_sugerido: e.target.value })}
                      onBlur={() => handleBlurDecimal('precio_sugerido')}
                      className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* FOTOGRAFÍAS DEL PRODUCTO (Solo Administrador) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                      Fotografías del Producto
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {uploadedFotos.length} {uploadedFotos.length === 1 ? 'fotografía' : 'fotografías'}
                  </span>
                </div>

                {/* Zona de Arrastrar y Soltar / Subida de Archivos */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleUploadFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50/80 scale-[1.01]' 
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-100/60 bg-white'
                  }`}
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleUploadFiles(e.target.files);
                      }
                    }}
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    className="hidden"
                  />

                  {uploadingFotos ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-blue-600">Subiendo fotografías al servidor...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-1 text-slate-600">
                      <UploadCloud className="w-7 h-7 text-blue-500 mb-1" />
                      <p className="text-xs font-bold text-slate-800">
                        Arrastra fotografías aquí o <span className="text-blue-600 underline">haz clic para examinar</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Admite imágenes JPG, JPEG, PNG y WEBP (Máx. 5 MB por archivo)
                      </p>
                    </div>
                  )}
                </div>

                {/* Miniaturas de Fotografías */}
                {uploadedFotos.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Fotografías registradas (★ = Portada en catálogo):
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {uploadedFotos.map((foto, index) => (
                        <div 
                          key={foto.url || index}
                          className={`relative rounded-xl overflow-hidden border-2 bg-slate-100 group transition-all shadow-xs ${
                            foto.es_portada 
                              ? 'border-amber-500 ring-2 ring-amber-500/30' 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="w-full h-20 overflow-hidden bg-slate-200">
                            <img 
                              src={foto.url} 
                              alt={`Foto ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Badge de Portada o Botón para Hacer Portada */}
                          {foto.es_portada ? (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-black rounded-md shadow">
                              ★ Portada
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleSetCoverPhoto(index); }}
                              className="absolute top-1 left-1 px-1.5 py-0.5 bg-slate-900/75 hover:bg-amber-500 hover:text-slate-950 text-white text-[9px] font-bold rounded-md shadow opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Establecer como foto de portada"
                            >
                              Hacer Portada
                            </button>
                          )}

                          {/* Botón de Eliminar Foto */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemovePhoto(index); }}
                            className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-md shadow opacity-80 hover:opacity-100 transition-opacity"
                            title="Eliminar fotografía"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20"
                >
                  Guardar Laptop
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL TRANSFERIR CUSTODIA FÍSICA (Solo Admin) */}
      {isTransferModalOpen && transferLaptop && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">Transferir Custodia Física</h2>
                  <p className="text-[11px] text-slate-500">Reasignar responsabilidad de equipo entre vendedores</p>
                </div>
              </div>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-slate-400 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Equipo:</span>
                  <span className="font-bold text-slate-900">{transferLaptop.marca} {transferLaptop.modelo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serie:</span>
                  <span className="font-mono text-slate-700">{transferLaptop.numero_serie}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Custodia Actual:</span>
                  <span className="font-extrabold text-indigo-700">{transferLaptop.responsable_nombre || 'Sin asignar'}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nuevo Vendedor Responsable de Custodia *
                </label>
                <select
                  required
                  value={newVendorId}
                  onChange={(e) => setNewVendorId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Elige el vendedor que recibe el equipo --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre} ({v.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Motivo o Nota de Transferencia
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de módulo, vitrina central o stand"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20"
                >
                  Confirmar Transferencia
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL RESERVAR LAPTOP POR 24 HORAS */}
      {isReserveModalOpen && reserveLaptop && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-slate-900">Reservar Laptop por 24 Horas</h2>
                  <p className="text-[11px] text-slate-500">Bloqueo temporal de stock en inventario</p>
                </div>
              </div>
              <button onClick={() => setIsReserveModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
            </div>

            <form onSubmit={handleExecuteReserve} className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Equipo a Reservar:</span>
                  <span className="font-bold text-slate-900">{reserveLaptop.marca} {reserveLaptop.modelo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Número de Serie:</span>
                  <span className="font-mono text-slate-700">{reserveLaptop.numero_serie}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Precio Mínimo:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(reserveLaptop.precio_minimo)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Vendedor que Reserva:</span>
                  <span className="font-extrabold text-indigo-700">{currentUser?.nombre}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nombre del Cliente o Motivo de Reserva (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cliente Juan Pérez - Viene a recoger mañana"
                  value={clienteReserva}
                  onChange={(e) => setClienteReserva(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Condiciones de la Reserva Automática (24 Horas):</span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 pl-1 leading-relaxed">
                  <li>El stock quedará bloqueado temporalmente durante <strong>24 horas exactas</strong>.</li>
                  <li>Otros vendedores no podrán disponer de este equipo mientras dure la reserva.</li>
                  <li>Si la venta no es concretada dentro de las 24 horas, el sistema liberará automáticamente la laptop a disponible.</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsReserveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={reserveLoading}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {reserveLoading ? 'Reservando...' : 'Confirmar Reserva (24h)'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL GALERÍA AMPLIADA DE FOTOGRAFÍAS (Para Administrador y Vendedores) */}
      <ImageGalleryModal
        isOpen={!!galleryLaptop}
        onClose={() => setGalleryLaptop(null)}
        laptop={galleryLaptop}
        initialIndex={galleryInitialIndex}
      />

    </div>
  );
}
