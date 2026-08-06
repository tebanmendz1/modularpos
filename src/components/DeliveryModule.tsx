import React, { useState } from "react";
import { MapPin, Plus, CheckCircle, Navigation, Clock, User, Phone, Check, RefreshCw, Layers, Settings } from "lucide-react";
import { Company, Branch } from "../types";

interface DeliveryOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  courierName: string;
  amount: number;
  status: "preparing" | "dispatched" | "delivered" | "cancelled";
  notes?: string;
  createdTime: string;
}

interface DeliveryModuleProps {
  activeCompany: Company;
  activeBranch: Branch;
  onAddAudit: (action: string, details: string) => void;
}

export default function DeliveryModule({
  activeCompany,
  activeBranch,
  onAddAudit
}: DeliveryModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<"active" | "history" | "config">("active");
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // Delivery order list state - seeded with demo orders
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([
    { id: "del_1", customerName: "Clara Ortiz", phone: "809-555-8833", address: "Calle Las Damas #10, Zona Colonial", courierName: "Carlos Motoconcho", amount: 1250, status: "preparing", notes: "Llamar antes de llegar", createdTime: new Date(Date.now() - 25 * 60000).toISOString() },
    { id: "del_2", customerName: "Marcos Peña", phone: "829-555-4422", address: "Av. Abraham Lincoln, Torre 3, Apt. 4B", courierName: "Franklin Delivery", amount: 2800, status: "dispatched", notes: "Cobrar con tarjeta (llevar verifone)", createdTime: new Date(Date.now() - 50 * 60000).toISOString() },
    { id: "del_3", customerName: "Silvia Méndez", phone: "809-555-1199", address: "Calle Bella Vista #32", courierName: "Carlos Motoconcho", amount: 650, status: "delivered", notes: "Dejar en recepción", createdTime: new Date(Date.now() - 120 * 60000).toISOString() }
  ]);

  // Form states for new delivery
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [courierName, setCourierName] = useState("Carlos Motoconcho");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Business Config states for Owner/Admin
  const [cfgLogo, setCfgLogo] = useState((activeCompany as any).logo || "");
  const [cfgAddress, setCfgAddress] = useState((activeCompany as any).address || activeBranch.address || "Av. Winston Churchill #102, Santo Domingo");
  const [cfgCoords, setCfgCoords] = useState("18.4861, -69.9312");
  const [cfgServiceTime, setCfgServiceTime] = useState("08:00 AM - 11:00 PM");
  const [cfgBaseFee, setCfgBaseFee] = useState(1.5);
  const [cfgPerKmRate, setCfgPerKmRate] = useState(0.75);
  const [savingCfg, setSavingCfg] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Map Pin Picker Modal states
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapTempCoords, setMapTempCoords] = useState<[number, number]>([18.4861, -69.9312]);
  const [mapTempAddress, setMapTempAddress] = useState("");
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const leafletMapRef = React.useRef<any>(null);
  const leafletMarkerRef = React.useRef<any>(null);

  const openMapPickerModal = () => {
    const parts = cfgCoords.split(",").map((p) => parseFloat(p.trim()));
    const initialCoords: [number, number] =
      parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
        ? [parts[0], parts[1]]
        : [18.4861, -69.9312];

    setMapTempCoords(initialCoords);
    setMapTempAddress(cfgAddress);
    setShowMapModal(true);
  };

  React.useEffect(() => {
    if (!showMapModal) return;

    const loadLeaflet = async () => {
      if (!(window as any).L) {
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.body.appendChild(script);
        });
      }

      setTimeout(() => {
        if (mapContainerRef.current && (window as any).L) {
          const L = (window as any).L;
          if (leafletMapRef.current) {
            leafletMapRef.current.remove();
          }

          const map = L.map(mapContainerRef.current).setView(mapTempCoords, 16);
          leafletMapRef.current = map;

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap"
          }).addTo(map);

          const marker = L.marker(mapTempCoords, { draggable: true }).addTo(map);
          leafletMarkerRef.current = marker;

          const updateFromLatLng = async (lat: number, lng: number) => {
            const newCoords: [number, number] = [lat, lng];
            setMapTempCoords(newCoords);
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
              if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) {
                  setMapTempAddress(data.display_name);
                }
              }
            } catch (err) {
              console.warn("Geocoding error:", err);
            }
          };

          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            updateFromLatLng(pos.lat, pos.lng);
          });

          map.on("click", (e: any) => {
            marker.setLatLng(e.latlng);
            updateFromLatLng(e.latlng.lat, e.latlng.lng);
          });
        }
      }, 300);
    };

    loadLeaflet();
  }, [showMapModal]);

  const handleConfirmPinLocation = () => {
    setCfgCoords(`${mapTempCoords[0].toFixed(6)}, ${mapTempCoords[1].toFixed(6)}`);
    if (mapTempAddress) {
      setCfgAddress(mapTempAddress);
    }
    setShowMapModal(false);
    alert(`¡Pin del negocio ajustado!\nCoordenadas: ${mapTempCoords[0].toFixed(6)}, ${mapTempCoords[1].toFixed(6)}`);
  };

  // Detect exact business GPS location
  const handleDetectBusinessGps = async () => {
    if (!navigator.geolocation) {
      alert("Su navegador no soporta geolocalización por GPS.");
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCfgCoords(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setCfgAddress(data.display_name);
            }
          }
        } catch (err) {
          console.warn("Error en geocodificación inversa:", err);
        } finally {
          setDetectingGps(false);
          alert(`¡Ubicación exacta del negocio detectada por GPS!\nCoordenadas: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
        }
      },
      (err) => {
        setDetectingGps(false);
        alert("No se pudo obtener la ubicación GPS. Por favor permita el acceso a la ubicación en su navegador.");
      },
      { enableHighAccuracy: true }
    );
  };

  // Fetch live delivery orders from PWA server endpoint
  const fetchLiveDeliveries = async () => {
    try {
      const res = await fetch("/api/pwa/driver/orders");
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          const mapped: DeliveryOrder[] = data.orders.map((o: any) => ({
            id: o.id,
            customerName: o.customerName || "Cliente PWA",
            phone: o.customerPhone || "809-555-0100",
            address: o.deliveryAddress || "Dirección PWA",
            courierName: o.courierName || "Repartidor Asignado",
            amount: Number(o.total || 0),
            status: o.status === "assigned" || o.status === "pending" ? "preparing" : (o.status as any),
            notes: (o.items || []).map((i: any) => `${i.quantity || 1}x ${i.name}`).join(", ") || o.paymentMethod || "Pedido PWA Delivery",
            createdTime: o.createdAt || new Date().toISOString()
          }));

          setDeliveries((prev) => {
            const liveMap = new Map(mapped.map((m) => [m.id, m]));
            const remaining = prev.filter((p) => !liveMap.has(p.id));
            return [...mapped, ...remaining];
          });
        }
      }
    } catch (err) {
      console.warn("Error cargando pedidos PWA en POS:", err);
    }
  };

  React.useEffect(() => {
    fetchLiveDeliveries();
    const interval = setInterval(fetchLiveDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled");
  const historyDeliveries = deliveries.filter((d) => d.status === "delivered" || d.status === "cancelled");

  // Save Delivery Config to POS DB
  const handleSaveDeliveryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCfg(true);
    try {
      const parts = cfgCoords.split(",").map((p) => parseFloat(p.trim()));
      const coords: [number, number] = parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
        ? [parts[0], parts[1]]
        : [18.4861, -69.9312];

      const res = await fetch("/api/pwa/businesses/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: activeCompany.id,
          logo: cfgLogo,
          address: cfgAddress,
          coords,
          serviceTime: cfgServiceTime,
          baseDeliveryFee: Number(cfgBaseFee),
          perKmRate: Number(cfgPerKmRate)
        })
      });

      if (res.ok) {
        alert("¡Configuración de Delivery guardada exitosamente en el POS y sincronizada con la PWA!");
        onAddAudit("Configuración Delivery", `Actualizados parámetros de delivery para ${activeCompany.name}`);
      } else {
        alert("Error al guardar la configuración.");
      }
    } catch (err) {
      alert("Error al conectar con el servidor POS.");
    } finally {
      setSavingCfg(false);
    }
  };

  // Handle new delivery creation
  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custAddress.trim() || !orderAmount) {
      alert("Por favor rellene todos los campos obligatorios.");
      return;
    }

    const nextAmt = parseFloat(orderAmount);
    if (isNaN(nextAmt) || nextAmt <= 0) {
      alert("El monto debe ser un valor válido mayor a cero.");
      return;
    }

    const newDel: DeliveryOrder = {
      id: "del_" + Math.random().toString(36).slice(2, 9),
      customerName: custName.trim(),
      phone: custPhone.trim(),
      address: custAddress.trim(),
      courierName,
      amount: nextAmt,
      status: "preparing",
      notes: orderNotes.trim() || undefined,
      createdTime: new Date().toISOString()
    };

    setDeliveries([newDel, ...deliveries]);
    onAddAudit("Despacho Delivery", `Se ordenó envío #${newDel.id} para ${newDel.customerName} vía ${newDel.courierName}`);

    setShowAddOrderModal(false);
    setCustName("");
    setCustPhone("");
    setCustAddress("");
    setCourierName("Carlos Motoconcho");
    setOrderAmount("");
    setOrderNotes("");
  };

  // Dispatch / Transition status
  const handleUpdateStatus = (delId: string, nextStatus: "preparing" | "dispatched" | "delivered" | "cancelled") => {
    const updated = deliveries.map((d) => {
      if (d.id === delId) {
        return {
          ...d,
          status: nextStatus
        };
      }
      return d;
    });

    setDeliveries(updated);
    const order = deliveries.find((o) => o.id === delId);
    if (order) {
      onAddAudit(
        "Logística Delivery",
        `Envío #${order.id} cambió a estado: ${nextStatus.toUpperCase()} (Entregador: ${order.courierName})`
      );
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 p-6" id="delivery-viewport">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            Control de Envíos, Despachos & Delivery
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestione órdenes de envío a domicilio, configure su local/mapa y dé seguimiento a repartidores en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddOrderModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
            id="btn-add-delivery"
          >
            <Plus className="w-4 h-4" />
            Nuevo Envío Manual
          </button>
        </div>
      </div>

      {/* SUB MENU TABS */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab("active")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "active"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Navigation className="w-4 h-4 animate-pulse" />
          Envíos Activos ({activeDeliveries.length})
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "history"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Historial Entregados ({historyDeliveries.length})
        </button>
        <button
          onClick={() => setActiveSubTab("config")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "config"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuración del Delivery & Negocio
        </button>
      </div>

      {/* CONFIG SUBTAB FOR BUSINESS OWNER */}
      {activeSubTab === "config" && (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs overflow-y-auto">
          <h3 className="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Configurar Parámetros del Negocio para la PWA & Delivery
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Configure la ubicación exacta de su restaurante en el mapa, su logo, horario de servicio y tarifas por km. Estos datos se mostrarán directamente en la PWA de los clientes.
          </p>

          <form onSubmit={handleSaveDeliveryConfig} className="max-w-2xl space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">🖼️ URL del Logo del Negocio:</label>
              <input
                type="text"
                value={cfgLogo}
                onChange={(e) => setCfgLogo(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">📍 Dirección Completa del Local:</label>
                <button
                  type="button"
                  onClick={handleDetectBusinessGps}
                  disabled={detectingGps}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border border-indigo-200 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  {detectingGps ? "Detectando GPS..." : "📍 Usar GPS del Dispositivo"}
                </button>
              </div>
              <input
                type="text"
                value={cfgAddress}
                onChange={(e) => setCfgAddress(e.target.value)}
                placeholder="Av. Winston Churchill #102, Santo Domingo"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">🗺️ Coordenadas GPS del Mapa (Latitud, Longitud):</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDetectBusinessGps}
                    disabled={detectingGps}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold underline cursor-pointer"
                  >
                    Capturar GPS
                  </button>
                  <button
                    type="button"
                    onClick={openMapPickerModal}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                    🗺️ Ajustar Pin en el Mapa
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={cfgCoords}
                onChange={(e) => setCfgCoords(e.target.value)}
                placeholder="18.4861, -69.9312"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Presione &quot;📍 Usar GPS del Dispositivo&quot; o &quot;🗺️ Ajustar Pin en el Mapa&quot; para posicionar manualmente el pin exacto de su restaurante.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">🕒 Horario de Servicio / Atención:</label>
              <input
                type="text"
                value={cfgServiceTime}
                onChange={(e) => setCfgServiceTime(e.target.value)}
                placeholder="08:00 AM - 11:00 PM"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">💵 Tarifa Base de Envío ($):</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfgBaseFee}
                  onChange={(e) => setCfgBaseFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">🛣️ Tarifa Adicional por Km ($/km):</label>
                <input
                  type="number"
                  step="0.25"
                  value={cfgPerKmRate}
                  onChange={(e) => setCfgPerKmRate(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCfg}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {savingCfg ? "Guardando en POS..." : "💾 Guardar Configuración de Delivery"}
            </button>
          </form>
        </div>
      )}

      {/* LIST OF DELIVERIES (ACTIVE & HISTORY) */}
      {activeSubTab !== "config" && (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 p-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-extrabold uppercase text-[10px]">
                  <th className="p-3">Código</th>
                  <th className="p-3">Cliente / Teléfono</th>
                  <th className="p-3">Dirección de Entrega</th>
                  <th className="p-3">Mensajero / Repartidor</th>
                  <th className="p-3">Monto / Notas</th>
                  <th className="p-3">Estado actual</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(activeSubTab === "active" ? activeDeliveries : historyDeliveries).map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-600">{del.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{del.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {del.phone}
                      </div>
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-700" title={del.address}>
                      {del.address}
                    </td>
                    <td className="p-3 font-medium text-slate-800 flex items-center gap-1.5 mt-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {del.courierName}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">${del.amount.toFixed(2)}</div>
                      {del.notes && <div className="text-[10px] text-slate-500 truncate max-w-xs">{del.notes}</div>}
                    </td>
                    <td className="p-3">
                      {del.status === "preparing" && (
                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> En Preparación
                        </span>
                      )}
                      {del.status === "dispatched" && (
                        <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                          <Navigation className="w-3 h-3 animate-bounce" /> En Camino / Despachado
                        </span>
                      )}
                      {del.status === "delivered" && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                          <Check className="w-3 h-3" /> Entregado
                        </span>
                      )}
                      {del.status === "cancelled" && (
                        <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        {del.status === "preparing" && (
                          <button
                            onClick={() => handleUpdateStatus(del.id, "dispatched")}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer"
                          >
                            Despachar
                          </button>
                        )}
                        {del.status === "dispatched" && (
                          <button
                            onClick={() => handleUpdateStatus(del.id, "delivered")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer"
                          >
                            Marcar Entregado
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL FOR NEW MANUAL DELIVERY ORDER */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Nuevo Envío Manual a Domicilio
            </h3>

            <form onSubmit={handleCreateDelivery} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Cliente *</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Ej: María Rodríguez"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono de Contacto</label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="Ej: 809-555-1234"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dirección de Entrega *</label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="Calle, Número, Edificio, Apt..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mensajero / Entregador</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="Carlos Motoconcho">Carlos Motoconcho</option>
                  <option value="Franklin Delivery">Franklin Delivery</option>
                  <option value="Delivery Propio Local">Delivery Propio Local</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Monto a Cobrar ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas / Instrucciones especiales</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ej: Cobrar con verifone, tocar timbre"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddOrderModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                >
                  Guardar Orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOR ADJUSTING PIN LOCATION ON LEAFLET MAP */}
      {showMapModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-indigo-600" />
                📍 Ajustar Pin del Negocio en el Mapa Interactivo
              </h3>
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Arrastre el marcador <b>📍</b> o haga clic en cualquier punto del mapa para establecer la posición física exacta de su restaurante.
            </p>

            <div
              ref={mapContainerRef}
              className="w-full h-80 rounded-2xl border border-slate-200 shadow-inner overflow-hidden"
              style={{ minHeight: 320 }}
            />

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-800">
                Coordenadas Seleccionadas: <span className="font-mono text-indigo-600">{mapTempCoords[0].toFixed(6)}, {mapTempCoords[1].toFixed(6)}</span>
              </div>
              <div className="text-slate-600 truncate">
                <b>Dirección estimada:</b> {mapTempAddress || "Cargando dirección..."}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPinLocation}
                className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirmar Ubicación del Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
