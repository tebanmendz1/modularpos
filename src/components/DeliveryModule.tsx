import React, { useState } from "react";
import { MapPin, Plus, CheckCircle, Navigation, Clock, User, Phone, Check, RefreshCw, Layers } from "lucide-react";
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
  const [activeSubTab, setActiveSubTab] = useState<"active" | "history">("active");
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

  const activeDeliveries = deliveries.filter((d) => d.status !== "delivered" && d.status !== "cancelled");
  const historyDeliveries = deliveries.filter((d) => d.status === "delivered" || d.status === "cancelled");

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

    // Reset Form
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
            Gestione órdenes de envío a domicilio, asigne choferes o mensajeros, y dé seguimiento a los pagos pendientes en tiempo real.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddOrderModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
            id="btn-add-delivery"
          >
            <Plus className="w-4 h-4" />
            Nuevo Envío
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
      </div>

      {/* LIST OF DELIVERIES */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1 p-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Cliente / Teléfono</th>
                <th className="p-3">Dirección de Destino</th>
                <th className="p-3">Repartidor</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center">Hora Pedido</th>
                <th className="p-3 text-center">Estado</th>
                <th className="p-3 text-center">Flujo de Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {(activeSubTab === "active" ? activeDeliveries : historyDeliveries).length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No se encontraron órdenes de delivery en esta sección.
                  </td>
                </tr>
              ) : (
                (activeSubTab === "active" ? activeDeliveries : historyDeliveries).map((d) => {
                  const minutesPassed = Math.floor((Date.now() - new Date(d.createdTime).getTime()) / 60000);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-[11px] text-slate-500">#{d.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {d.customerName}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-2.5 h-2.5" />
                          {d.phone}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium max-w-xs truncate" title={d.address}>
                        {d.address}
                        {d.notes && (
                          <div className="text-[9.5px] italic text-amber-600 mt-0.5">Nota: {d.notes}</div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-700">{d.courierName}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {activeCompany.settings.currency} {d.amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                        <div className="flex justify-center items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {minutesPassed < 60 ? `${minutesPassed} min` : `${Math.floor(minutesPassed / 60)} hrs`}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          d.status === "delivered"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : d.status === "dispatched"
                            ? "bg-sky-50 text-sky-600 border border-sky-200 animate-pulse"
                            : d.status === "cancelled"
                            ? "bg-red-50 text-red-500 border border-red-200"
                            : "bg-amber-50 text-amber-600 border border-amber-200"
                        }`}>
                          {d.status === "delivered" ? "Entregado" : d.status === "dispatched" ? "En Camino" : d.status === "cancelled" ? "Cancelado" : "En Cocina"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {d.status === "preparing" && (
                            <button
                              onClick={() => handleUpdateStatus(d.id, "dispatched")}
                              className="px-2.5 py-1 bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100 rounded-lg text-[9px] font-black cursor-pointer transition-colors"
                            >
                              Despachar Repartidor
                            </button>
                          )}
                          {d.status === "dispatched" && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleUpdateStatus(d.id, "delivered")}
                                className="px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-150 rounded-lg text-[9px] font-black cursor-pointer flex items-center gap-1 transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                Entregado (Cobrado)
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(d.id, "cancelled")}
                                className="px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-150 rounded-lg text-[9px] font-black cursor-pointer transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                          {d.status === "delivered" && (
                            <div className="flex items-center justify-center text-[10px] text-emerald-600 font-bold gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Liquidado
                            </div>
                          )}
                          {d.status === "cancelled" && (
                            <span className="text-[10px] text-slate-400 font-medium">Orden Anulada</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD DELIVERY */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Registrar Envío / Delivery
              </h3>
              <button onClick={() => setShowAddOrderModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Cliente *</label>
                  <input
                    type="text"
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Ej. Anabel Peña..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Cliente</label>
                  <input
                    type="text"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="809-555-1234..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Dirección de Entrega *</label>
                <textarea
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder="Escriba calle, número, sector o referencias de torre..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Repartidor Mensajero</label>
                  <select
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="Carlos Motoconcho">Carlos Motoconcho</option>
                    <option value="Franklin Delivery">Franklin Delivery</option>
                    <option value="Pedro Express">Pedro Express</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Monto de Venta ({activeCompany.settings.currency}) *</label>
                  <input
                    type="number"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                    placeholder="Monto total..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notas de Despacho</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Ej. Llevar cambio de 1000..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                Registrar Delivery Activo
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
