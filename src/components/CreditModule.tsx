import React, { useState } from "react";
import { CreditCard, Search, DollarSign, ArrowUpRight, ArrowDownRight, History, Calendar, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
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

  // Credit pay down states
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [payNotes, setPayNotes] = useState("");

  const companyCustomers = customers.filter((c) => c.companyId === activeCompany.id && c.creditLimit > 0);

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
    (c.rncOrCedula && c.rncOrCedula.includes(search))
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800" id="credit-module-root">
      
      {/* LEFT: DEBTORS DIRECTORY */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4" id="credit-list-section">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              Cuentas por Cobrar (Límite de Crédito Clientes)
            </h2>
            <p className="text-xs text-slate-500 mt-1">Supervise límites de endeudamiento asignados, registre abonos de saldos y administre deudas de clientes autorizados.</p>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar deudor por nombre o RNC/Cédula..."
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
                  <th className="p-3">Cliente</th>
                  <th className="p-3">RNC / Cédula</th>
                  <th className="p-3 text-right">Límite Autorizado</th>
                  <th className="p-3 text-right">Deuda Pendiente</th>
                  <th className="p-3 text-center">Crédito Disponible</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const available = c.creditLimit - c.currentDebt;
                  const ratio = c.creditLimit > 0 ? (c.currentDebt / c.creditLimit) * 100 : 0;
                  const isCritical = ratio >= 80;

                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${selectedCustomer?.id === c.id ? "bg-indigo-50/20 font-medium" : ""}`}
                    >
                      <td className="p-3 font-semibold text-slate-950">{c.name}</td>
                      <td className="p-3 font-mono font-bold text-slate-400">{c.rncOrCedula || "—"}</td>
                      <td className="p-3 text-right font-mono text-slate-600">${c.creditLimit.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-500">${c.currentDebt.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isCritical ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        }`}>
                          ${available.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Ver Cuenta / Cobrar
                        </button>
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

    </div>
  );
}
