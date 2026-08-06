import React, { useState } from "react";
import { MapPin, Plus, CheckCircle, Navigation, Clock, User, Phone, Check, RefreshCw, Layers, Settings, Truck } from "lucide-react";
import { Company, Branch } from "../types";

interface DriverItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  username?: string;
  password?: string;
  vehicle?: string;
  active?: boolean;
}

interface DeliveryOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  courierName: string;
  courierPhone?: string;
  amount: number;
  status: "preparing" | "dispatched" | "delivered" | "cancelled" | "assigned" | "picked_up" | "ready";
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
  const [activeSubTab, setActiveSubTab] = useState<"active" | "history" | "drivers" | "config">("active");
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // Delivery order list state - initial state completely clean with ZERO demo orders
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);

  // Registered drivers dynamic list state
  const [drivers, setDrivers] = useState<DriverItem[]>([]);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverPhone, setNewDriverPhone] = useState("");
  const [newDriverEmail, setNewDriverEmail] = useState("");
  const [newDriverPassword, setNewDriverPassword] = useState("123456");
  const [newDriverVehicle, setNewDriverVehicle] = useState("Motocicleta");
  const [savingDriver, setSavingDriver] = useState(false);

  // Fetch real drivers from POS API
  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/pwa/drivers");
      if (res.ok) {
        const data = await res.json();
        if (data.drivers && Array.isArray(data.drivers)) {
          setDrivers(data.drivers);
        }
      }
    } catch (err) {
      console.warn("Error cargando repartidores:", err);
    }
  };

  // Create new delivery driver in POS API
  const handleCreateDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverName.trim()) return;
    setSavingDriver(true);
    try {
      const res = await fetch("/api/pwa/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDriverName.trim(),
          phone: newDriverPhone.trim(),
          email: newDriverEmail.trim(),
          username: newDriverEmail.trim(),
          password: newDriverPassword.trim() || "123456",
          vehicle: newDriverVehicle,
        }),
      });
      if (res.ok) {
        await fetchDrivers();
        setNewDriverName("");
        setNewDriverPhone("");
        setNewDriverEmail("");
        setNewDriverPassword("123456");
        setShowAddDriverModal(false);
        onAddAudit("Repartidores", `Nuevo repartidor registrado: ${newDriverName}`);
      }
    } catch (err) {
      console.warn("Error creando repartidor:", err);
    } finally {
      setSavingDriver(false);
    }
  };

  // Form states for new delivery
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [courierName, setCourierName] = useState("");
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

  // Load existing business config from POS database
  const fetchCurrentCompanyConfig = async () => {
    try {
      const res = await fetch("/api/pwa/businesses");
      if (res.ok) {
        const data = await res.json();
        if (data.businesses && Array.isArray(data.businesses)) {
          const match = data.businesses.find((b: any) => b.id === activeCompany.id) || data.businesses[0];
          if (match) {
            if (match.logo) setCfgLogo(match.logo);
            if (match.address) setCfgAddress(match.address);
            if (match.coords) setCfgCoords(`${match.coords[0]}, ${match.coords[1]}`);
            if (match.serviceTime) setCfgServiceTime(match.serviceTime);
            if (match.baseDeliveryFee !== undefined) setCfgBaseFee(match.baseDeliveryFee);
            if (match.perKmRate !== undefined) setCfgPerKmRate(match.perKmRate);
          }
        }
      }
    } catch (err) {
      console.warn("Error cargando configuración guardada del negocio:", err);
    }
  };

  React.useEffect(() => {
    fetchCurrentCompanyConfig();
  }, [activeCompany?.id]);

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
            courierName: o.driverName || o.courierName || "Sin asignar",
            courierPhone: o.driverPhone || "",
            amount: Number(o.total || 0),
            status: o.status as any,
            notes: (o.items || []).map((i: any) => `${i.quantity || 1}x ${i.name}`).join(", ") || o.notes || o.paymentMethod || "Pedido PWA Delivery",
            createdTime: o.createdAt || new Date().toISOString()
          }));

          setDeliveries(mapped);
        }
      }
    } catch (err) {
      console.warn("Error cargando pedidos PWA en POS:", err);
    }
  };

  // Assign driver modal state
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  React.useEffect(() => {
    fetchLiveDeliveries();
    fetchDrivers();
    const interval = setInterval(fetchLiveDeliveries, 5000);
    return () => clearInterval(interval);
  }, []);

  // Assign a driver to an order (persists in POS DB, driver sees it in PWA immediately)
  const handleAssignDriver = async (orderId: string, driverName: string, driverPhone: string) => {
    try {
      const res = await fetch(`/api/pwa/orders/${orderId}/assign-driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverName, driverPhone, status: "driver_assigned" }),
      });
      if (res.ok) {
        setDeliveries((prev) =>
          prev.map((d) => d.id === orderId
            ? { ...d, courierName: driverName, courierPhone: driverPhone, status: "driver_assigned" as any }
            : d
          )
        );
        onAddAudit("Asignación Delivery", `Pedido #${orderId} asignado a ${driverName}`);
      }
    } catch (err) {
      console.warn("Error asignando repartidor:", err);
    }
    setAssigningOrderId(null);
  };

  // Update order status (triggers real-time update in PWA client)
  const handleUpdateStatusApi = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/pwa/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDeliveries((prev) =>
          prev.map((d) => d.id === orderId ? { ...d, status: status as any } : d)
        );
        const order = deliveries.find((o) => o.id === orderId);
        if (order) {
          onAddAudit("Logística Delivery", `Pedido #${orderId} → ${status.toUpperCase()}`);
        }
      }
    } catch (err) {
      // Fallback to local state
      handleUpdateStatus(orderId, status as any);
    }
  };


  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled" && d.status !== "canceled");
  const historyDeliveries = deliveries.filter((d) => d.status === "delivered" || d.status === "cancelled" || d.status === "canceled");

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
        if (activeCompany) (activeCompany as any).address = cfgAddress;
        if (activeBranch) (activeBranch as any).address = cfgAddress;
        alert("¡Configuración de Delivery guardada exitosamente en el POS y sincronizada con la PWA!");
        onAddAudit("Configuración Delivery", `Actualizados parámetros de delivery y dirección para ${activeCompany.name}`);
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
    setCourierName("");
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
    <div className="h-full flex flex-col bg-slate-50 p-6 font-sans">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            Módulo Logístico de Delivery & Envíos
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
          onClick={() => setActiveSubTab("drivers")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "drivers"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck className="w-4 h-4 text-violet-600" />
          🛵 Repartidores & Accesos PWA ({drivers.length})
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

      {/* DRIVERS SUBTAB: REGISTRO Y ACCESOS PWA */}
      {activeSubTab === "drivers" && (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-violet-600" />
                Repartidores Registrados & Accesos a la PWA
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Registre a sus mensajeros y asígneles accesos para ingresar a la App PWA del Delivery.
              </p>
            </div>
            <button
              onClick={() => setShowAddDriverModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Nuevo Repartidor
            </button>
          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-6 text-xs text-violet-900 space-y-1.5">
            <div className="font-extrabold flex items-center gap-1.5 text-violet-950 text-sm">
              📱 ¿Cómo le da acceso a su repartidor a la App PWA?
            </div>
            <div>1. Presione <b>&quot;Registrar Nuevo Repartidor&quot;</b> e ingrese su Nombre, Teléfono, Usuario / Correo y Contraseña.</div>
            <div>2. Su repartidor debe ingresar desde su celular a la PWA en <b>/sign-in</b> o <b>/driver</b>.</div>
            <div>3. Selecciona la opción <b>&quot;Ingresar como Repartidor&quot;</b> e ingresa sus credenciales creadas aquí.</div>
            <div>4. ¡Listo! Al asignarle un pedido en este panel, le aparecerá en tiempo real en su celular.</div>
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
              <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">No hay repartidores registrados</div>
              <p className="text-xs text-slate-500 mt-1 mb-4">Agregue repartidores para asignarle pedidos en el sistema.</p>
              <button
                onClick={() => setShowAddDriverModal(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                + Registrar Primer Repartidor
              </button>
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-200 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <th className="p-3">Repartidor</th>
                    <th className="p-3">Teléfono / WhatsApp</th>
                    <th className="p-3">Vehículo</th>
                    <th className="p-3">🔑 Usuario PWA</th>
                    <th className="p-3">🔒 Clave PWA</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {drivers.map((drv) => (
                    <tr key={drv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                          🛵
                        </div>
                        {drv.name}
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        {drv.phone ? `📞 ${drv.phone}` : "Sin teléfono"}
                      </td>
                      <td className="p-3 text-slate-700 font-semibold">
                        {drv.vehicle || "Motocicleta"}
                      </td>
                      <td className="p-3 font-mono text-violet-700 font-bold">
                        {drv.email || drv.username || `${drv.name.toLowerCase().replace(/\s+/g, '')}@pos.com`}
                      </td>
                      <td className="p-3 font-mono text-slate-900 font-extrabold">
                        <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded-md text-[11px]">
                          {drv.password || "123456"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={async () => {
                            if (confirm(`¿Eliminar al repartidor ${drv.name}?`)) {
                              await fetch(`/api/pwa/drivers/${drv.id}`, { method: "DELETE" });
                              fetchDrivers();
                              onAddAudit("Repartidores", `Repartidor eliminado: ${drv.name}`);
                            }
                          }}
                          className="bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CONFIG SUBTAB FOR BUSINESS OWNER */}
      {activeSubTab === "config" && (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs overflow-y-auto">
          <h3 className="text-base font-extrabold text-slate-900 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Configurar Parámetros del Negocio para la PWA & Delivery
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Configure la información real de su comercio para que se refleje automáticamente en la aplicación móvil PWA de los clientes.
          </p>

          <div className="max-w-2xl space-y-6">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                🏢 Nombre de la Empresa / Comercio
              </label>
              <input
                type="text"
                value={activeCompany.name}
                disabled
                className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-100 text-slate-600 font-bold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                📍 Dirección Física del Negocio (Se refleja en PWA y geolocalización)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cfgAddress}
                  onChange={(e) => setCfgAddress(e.target.value)}
                  placeholder="Ej: Av. 27 de Febrero #45, Santiago / Santo Domingo"
                  className="flex-1 px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                🎯 Coordenadas GPS del Local [Latitud, Longitud]
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={cfgCoords}
                  onChange={(e) => setCfgCoords(e.target.value)}
                  placeholder="Ej: 19.4517, -70.6970"
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowMapModal(true)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  Ubicar en Mapa
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  ⏰ Horario de Servicio
                </label>
                <input
                  type="text"
                  value={cfgServiceTime}
                  onChange={(e) => setCfgServiceTime(e.target.value)}
                  placeholder="08:00 AM - 11:00 PM"
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  💵 Tarifa Base Envío ($)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={cfgBaseFee}
                  onChange={(e) => setCfgBaseFee(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  📏 Tarifa por KM ($)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={cfgPerKmRate}
                  onChange={(e) => setCfgPerKmRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSaveBusinessConfig}
                disabled={savingCfg}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {savingCfg ? "Guardando Cambios..." : "Guardar Configuración en POS & PWA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE / LIST FOR ACTIVE OR HISTORY DELIVERIES */}
      {(activeSubTab === "active" || activeSubTab === "history") && (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {activeSubTab === "active" ? "Listado de Órdenes de Envío en Curso" : "Historial de Envíos Entregados"}
            </h3>
            <span className="text-[11px] text-slate-500 font-semibold">
              Total: {(activeSubTab === "active" ? activeDeliveries : historyDeliveries).length} órdenes
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {(activeSubTab === "active" ? activeDeliveries : historyDeliveries).length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Truck className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold text-slate-600">No hay órdenes {activeSubTab === "active" ? "activas" : "en el historial"}</p>
                <p className="text-[11px] text-slate-400 mt-1">Las compras realizadas en la PWA aparecerán automáticamente aquí.</p>
              </div>
            ) : (
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
                      <td className="p-3 font-medium text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {del.courierName || "Sin asignar"}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">${del.amount.toFixed(2)}</div>
                        {del.notes && <div className="text-[10px] text-slate-500 truncate max-w-xs">{del.notes}</div>}
                      </td>
                      <td className="p-3">
                        {(del.status === "assigned" || del.status === "preparing") && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                            📋 Confirmado
                          </span>
                        )}
                        {(del.status === "driver_assigned" || del.status === "ready") && (
                          <span className="bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                            🛵 Delivery Asignado ({del.courierName || 'Asignado'})
                          </span>
                        )}
                        {(del.status === "dispatched" || del.status === "picked_up" || del.status === "shipping" || del.status === "in_transit") && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                            <Navigation className="w-3 h-3 animate-bounce" /> Delivery en Camino
                          </span>
                        )}
                        {del.status === "delivered" && (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Entregado
                          </span>
                        )}
                        {(del.status === "cancelled" || del.status === "canceled") && (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                            Cancelado
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {/* Assign driver button */}
                          {del.status !== "delivered" && del.status !== "cancelled" && del.status !== "canceled" && (
                            <button
                              onClick={() => { setAssigningOrderId(del.id); setSelectedDriver(del.courierName && del.courierName !== "Sin asignar" ? del.courierName : (drivers.length > 0 ? drivers[0].name : "")); }}
                              className="bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3" /> {del.courierName && del.courierName !== "Sin asignar" ? "Reasignar" : "Asignar Delivery"}
                            </button>
                          )}

                          {/* Despachado button */}
                          {del.status !== "dispatched" && del.status !== "picked_up" && del.status !== "delivered" && del.status !== "cancelled" && del.status !== "canceled" && (
                            <button
                              onClick={() => handleUpdateStatusApi(del.id, "dispatched")}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              🚀 Despachado
                            </button>
                          )}

                          {/* Entregado button */}
                          {(del.status === "dispatched" || del.status === "picked_up" || del.status === "driver_assigned" || del.status === "ready") && (
                            <button
                              onClick={() => handleUpdateStatusApi(del.id, "delivered")}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                            >
                              ✓ Entregado
                            </button>
                          )}

                          {/* Cancel button */}
                          {del.status !== "delivered" && del.status !== "cancelled" && del.status !== "canceled" && (
                            <button
                              onClick={() => handleUpdateStatusApi(del.id, "canceled")}
                              className="bg-red-100 hover:bg-red-200 text-red-700 text-[11px] font-bold px-2 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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

      {/* MODAL: ASSIGN DRIVER */}
      {assigningOrderId && (() => {
        const order = deliveries.find((d) => d.id === assigningOrderId);
        const currentDriverName = selectedDriver || (drivers.length > 0 ? drivers[0].name : "");
        const selectedDriverObj = drivers.find((d) => d.name === currentDriverName) || { name: currentDriverName, phone: "" };
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-violet-600" />
                  <h3 className="text-base font-extrabold text-slate-900">Asignar Repartidor</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(true)}
                  className="bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] font-bold px-2 py-1 rounded-lg border border-violet-200 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Nuevo
                </button>
              </div>

              {order && (
                <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-700 space-y-1">
                  <div><b>Pedido:</b> #{order.id}</div>
                  <div><b>Cliente:</b> {order.customerName}</div>
                  <div><b>Dirección:</b> {order.address}</div>
                  <div><b>Monto:</b> ${order.amount.toFixed(2)}</div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">Seleccionar Repartidor:</label>
                <select
                  value={currentDriverName}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none bg-white text-slate-900 font-semibold cursor-pointer"
                >
                  {drivers.length > 0 ? (
                    drivers.map((d) => (
                      <option key={d.id || d.name} value={d.name} className="bg-white text-slate-900 font-semibold py-1">
                        {d.name}{d.phone ? ` — ${d.phone}` : ''} ({d.vehicle || 'Moto'})
                      </option>
                    ))
                  ) : (
                    <option value="Repartidor Asignado">Repartidor por defecto</option>
                  )}
                </select>
              </div>

              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800 mb-4">
                <b>📱 Al asignar:</b> El repartidor verá este pedido inmediatamente en su app PWA para comenzar la entrega.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssigningOrderId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignDriver(assigningOrderId, currentDriverName, selectedDriverObj.phone)}
                  className="px-5 py-2 text-xs font-extrabold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  Asignar y Despachar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: REGISTRAR NUEVO REPARTIDOR */}
      {showAddDriverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                Registrar Nuevo Repartidor
              </h3>
              <button
                type="button"
                onClick={() => setShowAddDriverModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDriverSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo del Repartidor *</label>
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  placeholder="Ej: Carlos Ramírez"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-semibold placeholder:text-slate-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  placeholder="Ej: 809-555-0199"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-semibold placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Vehículo</label>
                <select
                  value={newDriverVehicle}
                  onChange={(e) => setNewDriverVehicle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-semibold cursor-pointer"
                >
                  <option value="Motocicleta">Motocicleta</option>
                  <option value="Passola">Passola</option>
                  <option value="Bicicleta">Bicicleta</option>
                  <option value="Automóvil">Automóvil</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="text-[11px] font-extrabold text-violet-700 mb-2 flex items-center gap-1">
                  📱 Credenciales de Acceso para la PWA del Repartidor
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">🔑 Correo / Usuario de Acceso PWA</label>
                    <input
                      type="text"
                      value={newDriverEmail}
                      onChange={(e) => setNewDriverEmail(e.target.value)}
                      placeholder="Ej: carlos@pos.com o carlos.ramirez"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-semibold placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">🔒 Contraseña de Acceso PWA *</label>
                    <input
                      type="text"
                      value={newDriverPassword}
                      onChange={(e) => setNewDriverPassword(e.target.value)}
                      placeholder="Ej: 123456"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-semibold placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDriverModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingDriver}
                  className="px-5 py-2 text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {savingDriver ? "Guardando..." : "Guardar Repartidor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
