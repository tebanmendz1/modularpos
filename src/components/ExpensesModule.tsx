import React, { useState } from "react";
import { Wallet, Plus, Calendar, Filter, Trash2, CheckCircle2, TrendingDown, DollarSign } from "lucide-react";
import { Expense, Company, Branch, CashSession } from "../types";

interface ExpensesModuleProps {
  activeCompany: Company;
  activeBranch: Branch;
  expenses: Expense[];
  cashSessions: CashSession[];
  onUpdateExpenses: (newExpenses: Expense[]) => void;
  onCashOutSession?: (amount: number, type: "in" | "out") => void;
  onAddAudit: (action: string, details: string) => void;
}

export default function ExpensesModule({
  activeCompany,
  activeBranch,
  expenses,
  cashSessions,
  onUpdateExpenses,
  onCashOutSession,
  onAddAudit
}: ExpensesModuleProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  // Form states
  const [category, setCategory] = useState("Suministros");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo de Caja");
  const [approvedBy, setApprovedBy] = useState("");

  const categories = [
    "Servicios Públicos",
    "Mantenimiento",
    "Alquiler",
    "Suministros",
    "Nómina / Personal",
    "Transporte / Delivery",
    "Otros"
  ];

  const paymentMethods = [
    "Efectivo de Caja",
    "Transferencia Bancaria",
    "Tarjeta Corporativa",
    "Caja Chica"
  ];

  // Filter expenses by active company and branch
  const branchExpenses = expenses.filter(
    (e) => e.companyId === activeCompany.id && e.branchId === activeBranch.id
  );

  const filteredExpenses = branchExpenses.filter((e) => {
    const matchCat = categoryFilter === "all" || e.category === categoryFilter;
    const matchMethod = methodFilter === "all" || e.paymentMethod === methodFilter;
    return matchCat && matchMethod;
  });

  // Calculate totals
  const totalAmount = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cashAmount = branchExpenses
    .filter((e) => e.paymentMethod === "Efectivo de Caja")
    .reduce((sum, e) => sum + e.amount, 0);
  const bankAmount = branchExpenses
    .filter((e) => e.paymentMethod === "Transferencia Bancaria")
    .reduce((sum, e) => sum + e.amount, 0);

  // Check if there is an active cash session
  const openCashSession = cashSessions.find(
    (cs) => cs.companyId === activeCompany.id && cs.branchId === activeBranch.id && cs.status === "open"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor ingrese un monto válido.");
      return;
    }

    if (!description.trim()) {
      alert("Por favor ingrese una descripción.");
      return;
    }

    // Cash session constraint for cash expenses
    if (paymentMethod === "Efectivo de Caja" && !openCashSession) {
      alert("No se puede pagar con 'Efectivo de Caja' porque no hay un turno de caja abierto para esta sucursal. Abra caja primero o seleccione otro método de pago.");
      return;
    }

    const newExpense: Expense = {
      id: "exp_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      category,
      amount: numAmount,
      date: new Date().toISOString().split("T")[0],
      description,
      paymentMethod,
      approvedBy: approvedBy.trim() || undefined
    };

    const updated = [newExpense, ...expenses];
    onUpdateExpenses(updated);

    // If paid with cash, record outflow in cash session
    if (paymentMethod === "Efectivo de Caja" && onCashOutSession) {
      onCashOutSession(numAmount, "out");
    }

    onAddAudit(
      "Registro de Gasto",
      `Gasto registrado en la categoría ${category} por un monto de ${activeCompany.settings.currency} ${numAmount.toFixed(2)} (${description})`
    );

    // Reset form
    setShowAddModal(false);
    setAmount("");
    setDescription("");
    setApprovedBy("");
  };

  const handleDelete = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;

    if (confirm(`¿Está seguro que desea eliminar este gasto por ${activeCompany.settings.currency} ${target.amount.toFixed(2)}?`)) {
      const updated = expenses.filter((e) => e.id !== id);
      onUpdateExpenses(updated);

      onAddAudit(
        "Eliminación de Gasto",
        `Se eliminó gasto de ${activeCompany.settings.currency} ${target.amount.toFixed(2)} (${target.description})`
      );
    }
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 p-6" id="expenses-viewport">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            Control de Gastos Operacionales
          </h2>
          <p className="text-xs text-slate-500 mt-1">Registre, clasifique y rinda cuentas de las salidas financieras de la sucursal.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
          id="btn-register-expense"
        >
          <Plus className="w-4 h-4" />
          Registrar Gasto
        </button>
      </div>

      {/* METRICS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Gastado</span>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {activeCompany.settings.currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Efectivo de Caja</span>
            <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
              {activeCompany.settings.currency} {cashAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Transferencias / Bancos</span>
            <div className="text-2xl font-black text-slate-800 mt-1 font-mono">
              {activeCompany.settings.currency} {bankAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Filtros:</span>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-2">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold cursor-pointer focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-2">Método de Pago</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg text-slate-700 font-semibold cursor-pointer focus:outline-hidden focus:border-indigo-500"
            >
              <option value="all">Todos los Métodos</option>
              {paymentMethods.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE VIEW */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Categoría</th>
                <th className="p-3">Descripción</th>
                <th className="p-3">Método Pago</th>
                <th className="p-3">Aprobado Por</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se encontraron gastos registrados con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {e.date}
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{e.description}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        e.paymentMethod === "Efectivo de Caja" 
                          ? "bg-amber-50 text-amber-700 border border-amber-100" 
                          : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      }`}>
                        {e.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-medium">{e.approvedBy || "—"}</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">
                      {activeCompany.settings.currency} {e.amount.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Wallet className="w-4 h-4 text-indigo-600" />
                Registrar Gasto
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Monto ({activeCompany.settings.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Monto gastado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Descripción / Concepto</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Pago servicio internet Claro..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Método de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {paymentMethod === "Efectivo de Caja" && (
                  <p className="text-[10px] text-amber-600 mt-1.5 font-medium leading-snug">
                    {openCashSession 
                      ? `⚠️ Nota: Esto registrará un flujo de salida de ${activeCompany.settings.currency} ${amount || "0"} en el arqueo del cajero activo (${openCashSession.userName}).`
                      : "❌ Requiere un turno de caja abierto en esta sucursal."
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Aprobado Por (Opcional)</label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Nombre de supervisor..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
                id="btn-confirm-expense-save"
              >
                Confirmar Gasto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
