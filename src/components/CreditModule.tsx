import React, { useState } from "react";
import { CreditCard, Search, DollarSign, ArrowUpRight, ArrowDownRight, History, Calendar, CheckCircle2, AlertTriangle, ShieldCheck, UserPlus, Edit2, X, PlusCircle, Building } from "lucide-react";
import { Customer } from "../types";

interface CreditModuleProps {
  activeCompany: any;
  customers: Customer[];
  onUpdateCustomers: (c: Customer[]) => void;
  onAddAudit: (action: string, details: string) => void;
}

export default function CreditModule({
  activeCompany,
  customers,
  onUpdateCustomers,
  onAddAudit
}: CreditModuleProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Registration Modal States
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustRnc, setNewCustRnc] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustLimit, setNewCustLimit] = useState("10000");

  // Edit Credit Limit Modal States
  const [editingCreditLimitCust, setEditingCreditLimitCust] = useState<Customer | null>(null);
  const [editLimitInput, setEditLimitInput] = useState("");

  // Credit pay down states
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [payNotes, setPayNotes] = useState("");

  const companyCustomers = customers.filter((c) => c.companyId === activeCompany.id);

  const handleRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      alert("El Nombre y Teléfono son obligatorios.");
      return;
    }

    const limit = parseFloat(newCustLimit) || 0;
    const newCustomer: Customer = {
      id: "cust_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: newCustName.trim(),
      rncOrCedula: newCustRnc.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || `${newCustName.toLowerCase().replace(/\s+/g, '')}@cliente.com`,
      points: 100,
      tier: "Bronce",
      creditLimit: limit,
      currentDebt: 0,
      synced: true
    };

    const updated = [...customers, newCustomer];
    onUpdateCustomers(updated);
    onAddAudit("Registrar Cliente", `Cliente ${newCustomer.name} registrado con límite de crédito DOP $${limit.toFixed(2)}.`);

    setNewCustName("");
    setNewCustRnc("");
    setNewCustPhone("");
    setNewCustEmail("");
    setNewCustLimit("10000");
    setShowAddCustomerModal(false);
    setSelectedCustomer(newCustomer);
  };

  const handleSaveEditCreditLimit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCreditLimitCust) return;

    const newLimit = parseFloat(editLimitInput) || 0;
    const updated = customers.map(c => {
      if (c.id === editingCreditLimitCust.id) {
        return { ...c, creditLimit: newLimit };
      }
      return c;
    });

    onUpdateCustomers(updated);
    onAddAudit("Modificar Límite de Crédito", `Límite de crédito de ${editingCreditLimitCust.name} actualizado a DOP $${newLimit.toFixed(2)}.`);

    if (selectedCustomer?.id === editingCreditLimitCust.id) {
      setSelectedCustomer({ ...selectedCustomer, creditLimit: newLimit });
    }

    setEditingCreditLimitCust(null);
    setEditLimitInput("");
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      alert("Ingrese un monto válido para registrar el abono.");
      return;
    }

    if (amount > selectedCustomer.currentDebt) {
      alert(`El abono excede la deuda actual de $${selectedCustomer.currentDebt.toFixed(2)}.`);
      return;
    }

    const updatedCustomers = customers.map((c) => {
      if (c.id === selectedCustomer.id) {
        const nextDebt = Math.max(0, c.currentDebt - amount);
        
        onAddAudit(
          "Abono de Crédito",
          `Abono de $${amount.toFixed(2)} registrado para ${c.name} (${payMethod}). Notas: ${payNotes}`
        );

        return { ...c, currentDebt: nextDebt };
      }
      return c;
    });

    onUpdateCustomers(updatedCustomers);
    
    // update current selected Customer locally
    const updatedSelected = updatedCustomers.find((c) => c.id === selectedCustomer.id);
    if (updatedSelected) setSelectedCustomer(updatedSelected);

    setPayAmount("");
    setPayNotes("");
    alert("¡Abono registrado con éxito en su cuenta!");
  };

  const filtered = companyCustomers.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.rncOrCedula && c.rncOrCedula.includes(search)) ||
    (c.phone && c.phone.includes(search))
  );


  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800" id="credit-module-root">
      
      {/* LEFT: DEBTORS DIRECTORY */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4" id="credit-list-section">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Gestión de Clientes & Límites de Crédito
            </h2>
            <p className="text-xs text-slate-500 mt-1">Registre clientes, asigne líneas de crédito corporativas, consulte estados de deuda y administre abonos.</p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
            id="btn-add-customer-credit"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Cliente</span>
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, RNC/Cédula o celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 shadow-xs"
            id="input-credit-search"
          />
        </div>

        {/* LIST */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Cliente / Razón Social</th>
                  <th className="p-3">RNC / Cédula / Tel.</th>
                  <th className="p-3 text-right">Límite Autorizado</th>
                  <th className="p-3 text-right">Deuda Actual</th>
                  <th className="p-3 text-center">Crédito Disponible</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const available = (c.creditLimit || 0) - (c.currentDebt || 0);
                  const ratio = c.creditLimit > 0 ? (c.currentDebt / c.creditLimit) * 100 : 0;
                  const isCritical = ratio >= 80;

                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${selectedCustomer?.id === c.id ? "bg-indigo-50/20 font-medium" : ""}`}
                    >
                      <td className="p-3">
                        <p className="font-bold text-slate-950">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{c.email}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-mono font-bold text-slate-600">{c.rncOrCedula || "Sin RNC"}</p>
                        <p className="text-[10px] text-slate-400">{c.phone || "—"}</p>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 font-bold">
                        ${(c.creditLimit || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        ${(c.currentDebt || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border ${
                          available <= 0 && c.creditLimit > 0
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : isCritical 
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}>
                          ${available.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(c)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                          >
                            Ver / Abonar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCreditLimitCust(c);
                              setEditLimitInput((c.creditLimit || 0).toString());
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-all cursor-pointer"
                            title="Editar Límite de Crédito"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

            </table>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: CHIPS & ABONO FORM */}
      <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto p-5 shrink-0" id="credit-payment-panel">
        {selectedCustomer ? (
          <div className="space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Estado de Cuenta</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-xs text-slate-400">Cerrar</button>
            </div>

            {/* Credit Status Cards */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-950 text-sm">{selectedCustomer.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {selectedCustomer.id.slice(0, 10).toUpperCase()}</p>
                </div>
                {selectedCustomer.currentDebt > 0 && (
                  <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 px-2 py-0.5 rounded-sm font-bold flex items-center gap-0.5">
                    Saldo Pendiente
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/55">
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Crédito Utilizado</span>
                  <span className="text-sm font-bold font-mono text-rose-600 mt-1 block">
                    ${selectedCustomer.currentDebt.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider">Línea Disponible</span>
                  <span className="text-sm font-bold font-mono text-emerald-600 mt-1 block">
                    ${(selectedCustomer.creditLimit - selectedCustomer.currentDebt).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className={`h-full ${selectedCustomer.currentDebt / selectedCustomer.creditLimit >= 0.8 ? "bg-rose-500" : "bg-indigo-500"}`}
                  style={{ width: `${Math.min(100, (selectedCustomer.currentDebt / selectedCustomer.creditLimit) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* FORM: REGISTRO DE ABONO */}
            {selectedCustomer.currentDebt > 0 ? (
              <form onSubmit={handleRegisterPayment} className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3.5">
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Registrar Abono a Deuda</span>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Monto del Pago</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">$</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-4 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Medio de Pago del Abono</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl text-xs px-2.5 py-2 cursor-pointer focus:outline-hidden"
                  >
                    <option value="Efectivo">Efectivo depositado</option>
                    <option value="Tarjeta">Tarjeta Crédito / Débito</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 block">Notas de Referencia</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                    placeholder="Ej: Depósito Banreservas #93848"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  id="btn-submit-credit-paydown"
                >
                  Registrar Abono y Saldar
                </button>
              </form>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center flex flex-col items-center gap-2">
                <ShieldCheck className="w-10 h-10 text-emerald-500 animate-bounce" />
                <h4 className="font-bold text-emerald-900 text-xs">Cuenta al Día</h4>
                <p className="text-[10px] text-emerald-600 max-w-64">El cliente seleccionado no tiene deudas activas de compras en el POS. Su crédito disponible está al 100%.</p>
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT INITIAL INFO PANEL */
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
            <DollarSign className="w-12 h-12 text-slate-200 mb-2" />
            <p className="text-xs font-semibold">Seleccione un Cliente de la Lista</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-60">Seleccione un cliente para revisar la línea de crédito otorgada, saldos adeudados y procesar cobros de abonos.</p>
          </div>
        )}
      </div>

      {/* REGISTRAR CLIENTE CON LIMITE DE CREDITO MODAL */}

      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-add-customer">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Registrar Nuevo Cliente</h3>
                  <p className="text-[10px] text-slate-400">Crear ficha de cliente y asignar línea de crédito</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterCustomer} className="space-y-3.5 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre o Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Comercializadora del Caribe S.R.L."
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-bold"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">RNC / Cédula</label>
                  <input
                    type="text"
                    placeholder="101010101"
                    value={newCustRnc}
                    onChange={(e) => setNewCustRnc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono *</label>
                  <input
                    type="text"
                    required
                    placeholder="809-555-0199"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="info@empresa.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Límite de Crédito Autorizado (DOP $) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-400">$</span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    required
                    placeholder="10000.00"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl pl-8 pr-3 py-2.5 text-sm font-mono font-extrabold text-emerald-400 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
                <p className="text-[9.5px] text-slate-500 mt-1">Monto máximo que el cliente puede comprar fiado / a crédito en POS.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CREDIT LIMIT MODAL */}
      {editingCreditLimitCust && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-edit-credit-limit">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Modificar Límite de Crédito</h3>
                  <p className="text-[10px] text-slate-400">{editingCreditLimitCust.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCreditLimitCust(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCreditLimit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nuevo Límite de Crédito Autorizado (DOP $)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-emerald-400 text-sm">$</span>
                  <input
                    type="number"
                    step="500"
                    min="0"
                    required
                    value={editLimitInput}
                    onChange={(e) => setEditLimitInput(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono font-extrabold text-emerald-400 focus:outline-hidden focus:border-emerald-400"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Deuda actual: <strong className="text-rose-400">${(editingCreditLimitCust.currentDebt || 0).toFixed(2)}</strong>
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCreditLimitCust(null)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  Actualizar Límite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

