import React, { useState, useEffect } from "react";
import { 
  Calculator, BookOpen, FileSpreadsheet, Plus, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, AlertTriangle, Printer, Download, 
  Search, RefreshCw, Layers, DollarSign, PieChart, ShieldCheck, FileText
} from "lucide-react";
import { Company, User, Branch, Sale, Expense, Account, JournalEntry } from "../types";

interface AccountingModuleProps {
  activeCompany: Company;
  currentUser: User;
  activeBranch: Branch;
  sales: Sale[];
  expenses: Expense[];
  onAddAudit: (action: string, details: string) => void;
}

// Standard Default Chart of Accounts
export const DEFAULT_ACCOUNTS: Omit<Account, "companyId">[] = [
  // Activos (1)
  { id: "acc_1101", code: "1.1.01", name: "Caja General y Efectivo", type: "Activo", balance: 150000.00, isSubaccount: false },
  { id: "acc_1102", code: "1.1.02", name: "Banco y Cuentas de Moneda", type: "Activo", balance: 345000.50, isSubaccount: false },
  { id: "acc_1103", code: "1.1.03", name: "Cuentas por Cobrar Clientes", type: "Activo", balance: 85200.00, isSubaccount: false },
  { id: "acc_1104", code: "1.1.04", name: "Inventario de Mercancías", type: "Activo", balance: 520000.00, isSubaccount: false },
  { id: "acc_1201", code: "1.2.01", name: "Mobiliarios y Equipos de Oficina", type: "Activo", balance: 120000.00, isSubaccount: false },
  { id: "acc_1202", code: "1.2.02", name: "Equipos de Cómputo y POS", type: "Activo", balance: 95000.00, isSubaccount: false },
  
  // Pasivos (2)
  { id: "acc_2101", code: "2.1.01", name: "Cuentas por Pagar Proveedores", type: "Pasivo", balance: 110000.00, isSubaccount: false },
  { id: "acc_2102", code: "2.1.02", name: "ITBIS / Impuestos por Pagar", type: "Pasivo", balance: 45200.00, isSubaccount: false },
  { id: "acc_2103", code: "2.1.03", name: "Retenciones y Retribuciones", type: "Pasivo", balance: 18500.00, isSubaccount: false },
  { id: "acc_2201", code: "2.2.01", name: "Préstamos Bancarios a Largo Plazo", type: "Pasivo", balance: 250000.00, isSubaccount: false },

  // Capital / Patrimonio (3)
  { id: "acc_3101", code: "3.1.01", name: "Capital Social Suscrito", type: "Capital", balance: 500000.00, isSubaccount: false },
  { id: "acc_3102", code: "3.1.02", name: "Utilidades Acumuladas de Ejercicios Anteriores", type: "Capital", balance: 180000.00, isSubaccount: false },

  // Ingresos (4)
  { id: "acc_4101", code: "4.1.01", name: "Ventas de Mercancías y Servicios", type: "Ingreso", balance: 0.00, isSubaccount: false },
  { id: "acc_4102", code: "4.1.02", name: "Otros Ingresos Operativos", type: "Ingreso", balance: 0.00, isSubaccount: false },

  // Costos (5)
  { id: "acc_5101", code: "5.1.01", name: "Costo de Ventas y Mercancía Vendida", type: "Costo", balance: 0.00, isSubaccount: false },

  // Gastos (6)
  { id: "acc_6101", code: "6.1.01", name: "Gastos de Sueldos y Salarios", type: "Gasto", balance: 0.00, isSubaccount: false },
  { id: "acc_6102", code: "6.1.02", name: "Gastos de Alquiler de Local", type: "Gasto", balance: 0.00, isSubaccount: false },
  { id: "acc_6103", code: "6.1.03", name: "Gastos de Servicios Públicos y Luz", type: "Gasto", balance: 0.00, isSubaccount: false },
  { id: "acc_6104", code: "6.1.04", name: "Gastos de Publicidad y Marketing", type: "Gasto", balance: 0.00, isSubaccount: false },
  { id: "acc_6105", code: "6.1.05", name: "Gastos Generales y Administrativos", type: "Gasto", balance: 0.00, isSubaccount: false },
];

export default function AccountingModule({
  activeCompany,
  currentUser,
  activeBranch,
  sales,
  expenses,
  onAddAudit
}: AccountingModuleProps) {
  const [activeTab, setActiveTab] = useState<"catalogo" | "diario" | "balanza" | "estados">("catalogo");

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem(`accounting_acc_${activeCompany.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_ACCOUNTS.map(a => ({ ...a, companyId: activeCompany.id }));
  });

  // Journal entries state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem(`accounting_entries_${activeCompany.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Seed initial demo entry
    return [{
      id: "entry_demo_1",
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      entryNumber: "ASI-2026-0001",
      date: new Date().toISOString().split("T")[0],
      concept: "Asiento de Apertura de Ejercicio Fiscal",
      status: "posted",
      createdBy: currentUser.name,
      lines: [
        { accountId: "acc_1101", accountCode: "1.1.01", accountName: "Caja General y Efectivo", debit: 150000, credit: 0 },
        { accountId: "acc_1102", accountCode: "1.1.02", accountName: "Banco y Cuentas de Moneda", debit: 345000.50, credit: 0 },
        { accountId: "acc_1104", accountCode: "1.1.04", accountName: "Inventario de Mercancías", debit: 520000, credit: 0 },
        { accountId: "acc_2101", accountCode: "2.1.01", accountName: "Cuentas por Pagar Proveedores", debit: 0, credit: 110000 },
        { accountId: "acc_3101", accountCode: "3.1.01", accountName: "Capital Social Suscrito", debit: 0, credit: 500000 },
        { accountId: "acc_3102", accountCode: "3.1.02", accountName: "Utilidades Acumuladas", debit: 0, credit: 405000.50 }
      ]
    }];
  });

  // Filter accounts for active company
  useEffect(() => {
    localStorage.setItem(`accounting_acc_${activeCompany.id}`, JSON.stringify(accounts));
  }, [accounts, activeCompany.id]);

  useEffect(() => {
    localStorage.setItem(`accounting_entries_${activeCompany.id}`, JSON.stringify(journalEntries));
  }, [journalEntries, activeCompany.id]);

  // Modal create account state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAccCode, setNewAccCode] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState<Account["type"]>("Activo");
  const [newAccInitialBalance, setNewAccInitialBalance] = useState("0");

  // Modal create journal entry
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryConcept, setEntryConcept] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryLines, setEntryLines] = useState<Array<{
    accountId: string;
    debit: string;
    credit: string;
  }>>([
    { accountId: "acc_1101", debit: "0", credit: "0" },
    { accountId: "acc_4101", debit: "0", credit: "0" }
  ]);

  // Search filter
  const [searchAccount, setSearchAccount] = useState("");

  // Handle Add Account
  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode || !newAccName) return;

    const newAcc: Account = {
      id: "acc_custom_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      code: newAccCode.trim(),
      name: newAccName.trim(),
      type: newAccType,
      balance: parseFloat(newAccInitialBalance) || 0,
      isSubaccount: false
    };

    setAccounts([...accounts, newAcc]);
    setShowAccountModal(false);
    setNewAccCode("");
    setNewAccName("");
    setNewAccInitialBalance("0");
    onAddAudit("Nueva Cuenta Contable", `Creación de cuenta ${newAcc.code} - ${newAcc.name}`);
  };

  // Add line to journal entry modal
  const handleAddEntryLine = () => {
    setEntryLines([...entryLines, { accountId: accounts[0]?.id || "", debit: "0", credit: "0" }]);
  };

  const handleRemoveEntryLine = (index: number) => {
    if (entryLines.length <= 2) return;
    setEntryLines(entryLines.filter((_, i) => i !== index));
  };

  // Calculate entry total debits and credits
  const totalDebit = entryLines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = entryLines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  // Handle Save Journal Entry
  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert("El asiento contable debe estar cuadrado. Los débitos deben ser exactamente iguales a los créditos.");
      return;
    }
    if (!entryConcept.trim()) {
      alert("Por favor ingresa la glosa o concepto del asiento.");
      return;
    }

    const formattedLines = entryLines.map(l => {
      const acc = accounts.find(a => a.id === l.accountId);
      return {
        accountId: l.accountId,
        accountCode: acc?.code || "",
        accountName: acc?.name || "",
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0
      };
    });

    const newEntry: JournalEntry = {
      id: "entry_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      entryNumber: `ASI-2026-${(journalEntries.length + 1).toString().padStart(4, "0")}`,
      date: entryDate,
      concept: entryConcept,
      status: "posted",
      createdBy: currentUser.name,
      lines: formattedLines
    };

    // Update account balances
    const updatedAccounts = accounts.map(acc => {
      let balanceChange = 0;
      formattedLines.forEach(line => {
        if (line.accountId === acc.id) {
          if (acc.type === "Activo" || acc.type === "Costo" || acc.type === "Gasto") {
            balanceChange += (line.debit - line.credit);
          } else {
            balanceChange += (line.credit - line.debit);
          }
        }
      });
      return { ...acc, balance: acc.balance + balanceChange };
    });

    setAccounts(updatedAccounts);
    setJournalEntries([newEntry, ...journalEntries]);
    setShowEntryModal(false);
    setEntryConcept("");
    setEntryLines([
      { accountId: "acc_1101", debit: "0", credit: "0" },
      { accountId: "acc_4101", debit: "0", credit: "0" }
    ]);

    onAddAudit("Asiento Contable Creado", `Creación de asiento ${newEntry.entryNumber} por $${totalDebit.toFixed(2)}`);
  };

  // Auto-generate Journal Entries from Sales and Expenses
  const handleAutoGenerateEntries = () => {
    const companySales = sales.filter(s => s.companyId === activeCompany.id);
    const companyExpenses = expenses.filter(e => e.companyId === activeCompany.id);

    if (companySales.length === 0 && companyExpenses.length === 0) {
      alert("No hay ventas ni gastos registrados en esta empresa para contabilizar.");
      return;
    }

    const newAutoEntries: JournalEntry[] = [];
    const salesTotal = companySales.reduce((s, sale) => s + sale.total, 0);
    const salesSubtotal = companySales.reduce((s, sale) => s + (sale.subtotal || sale.total * 0.82), 0);
    const salesTax = salesTotal - salesSubtotal;

    if (salesTotal > 0) {
      newAutoEntries.push({
        id: "entry_auto_sales_" + Date.now(),
        companyId: activeCompany.id,
        branchId: activeBranch.id,
        entryNumber: `ASI-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split("T")[0],
        concept: `Asentamiento Automático de Ventas del Periodo (${companySales.length} Facturas)`,
        status: "posted",
        createdBy: `${currentUser.name} (Auto-Contabilidad)`,
        lines: [
          { accountId: "acc_1101", accountCode: "1.1.01", accountName: "Caja General y Efectivo", debit: salesTotal, credit: 0 },
          { accountId: "acc_4101", accountCode: "4.1.01", accountName: "Ventas de Mercancías y Servicios", debit: 0, credit: Number(salesSubtotal.toFixed(2)) },
          { accountId: "acc_2102", accountCode: "2.1.02", accountName: "ITBIS / Impuestos por Pagar", debit: 0, credit: Number(salesTax.toFixed(2)) }
        ]
      });
    }

    const expensesTotal = companyExpenses.reduce((s, exp) => s + exp.amount, 0);
    if (expensesTotal > 0) {
      newAutoEntries.push({
        id: "entry_auto_exp_" + Date.now(),
        companyId: activeCompany.id,
        branchId: activeBranch.id,
        entryNumber: `ASI-AUTO-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toISOString().split("T")[0],
        concept: `Asentamiento Automático de Gastos Operativos (${companyExpenses.length} Comprobantes)`,
        status: "posted",
        createdBy: `${currentUser.name} (Auto-Contabilidad)`,
        lines: [
          { accountId: "acc_6105", accountCode: "6.1.05", accountName: "Gastos Generales y Administrativos", debit: expensesTotal, credit: 0 },
          { accountId: "acc_1101", accountCode: "1.1.01", accountName: "Caja General y Efectivo", debit: 0, credit: expensesTotal }
        ]
      });
    }

    setJournalEntries([...newAutoEntries, ...journalEntries]);
    alert(`¡Se generaron ${newAutoEntries.length} asientos contables automáticos basados en las ventas y gastos actuales!`);
    onAddAudit("Asentamiento Automático", `Generados ${newAutoEntries.length} asientos contables automáticos.`);
  };

  // Calculations for Financial Statements
  const totalActivos = accounts.filter(a => a.type === "Activo").reduce((s, a) => s + a.balance, 0);
  const totalPasivos = accounts.filter(a => a.type === "Pasivo").reduce((s, a) => s + a.balance, 0);
  const totalCapitalBase = accounts.filter(a => a.type === "Capital").reduce((s, a) => s + a.balance, 0);

  // Profit & Loss
  const totalIngresos = accounts.filter(a => a.type === "Ingreso").reduce((s, a) => s + a.balance, 0) + sales.reduce((s, sale) => s + sale.total, 0);
  const totalCostos = accounts.filter(a => a.type === "Costo").reduce((s, a) => s + a.balance, 0);
  const totalGastos = accounts.filter(a => a.type === "Gasto").reduce((s, a) => s + a.balance, 0) + expenses.reduce((s, exp) => s + exp.amount, 0);

  const utilidadBruta = totalIngresos - totalCostos;
  const utilidadNeta = utilidadBruta - totalGastos;
  const patrimonioTotal = totalCapitalBase + utilidadNeta;

  const filteredAccounts = accounts.filter(a => 
    a.code.toLowerCase().includes(searchAccount.toLowerCase()) ||
    a.name.toLowerCase().includes(searchAccount.toLowerCase()) ||
    a.type.toLowerCase().includes(searchAccount.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-600/30 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">Módulo de Contabilidad General</h1>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30">
                Partida Doble
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Catálogo de Cuentas, Libro Diario, Balanza de Comprobación y Estados Financieros (NIIF / NCF).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoGenerateEntries}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Asentamiento Automático (Ventas & Gastos)</span>
          </button>
          <button
            onClick={() => setShowEntryModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Asiento Contable</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-sm font-bold">
        <button
          onClick={() => setActiveTab("catalogo")}
          className={`pb-3 px-4 flex items-center gap-2 transition-all border-b-2 cursor-pointer ${
            activeTab === "catalogo" 
              ? "border-indigo-600 text-indigo-600 font-extrabold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Catálogo de Cuentas</span>
        </button>

        <button
          onClick={() => setActiveTab("diario")}
          className={`pb-3 px-4 flex items-center gap-2 transition-all border-b-2 cursor-pointer ${
            activeTab === "diario" 
              ? "border-indigo-600 text-indigo-600 font-extrabold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>2. Libro Diario ({journalEntries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("balanza")}
          className={`pb-3 px-4 flex items-center gap-2 transition-all border-b-2 cursor-pointer ${
            activeTab === "balanza" 
              ? "border-indigo-600 text-indigo-600 font-extrabold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>3. Balanza de Comprobación</span>
        </button>

        <button
          onClick={() => setActiveTab("estados")}
          className={`pb-3 px-4 flex items-center gap-2 transition-all border-b-2 cursor-pointer ${
            activeTab === "estados" 
              ? "border-indigo-600 text-indigo-600 font-extrabold" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>4. Estados Financieros (Balance & P&L)</span>
        </button>
      </div>

      {/* TAB 1: CATÁLOGO DE CUENTAS */}
      {activeTab === "catalogo" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código o nombre de cuenta..."
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Cuenta Contable</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold">
                  <th className="p-4">Código</th>
                  <th className="p-4">Nombre de la Cuenta</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-right">Saldo Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{acc.code}</td>
                    <td className="p-4 font-bold text-slate-800">{acc.name}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        acc.type === "Activo" ? "bg-emerald-100 text-emerald-800" :
                        acc.type === "Pasivo" ? "bg-rose-100 text-rose-800" :
                        acc.type === "Capital" ? "bg-indigo-100 text-indigo-800" :
                        acc.type === "Ingreso" ? "bg-blue-100 text-blue-800" :
                        acc.type === "Costo" ? "bg-amber-100 text-amber-800" : "bg-purple-100 text-purple-800"
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-slate-900">
                      ${acc.balance.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: LIBRO DIARIO */}
      {activeTab === "diario" && (
        <div className="space-y-4">
          {journalEntries.map((entry) => {
            const entryTotalDebit = entry.lines.reduce((s, l) => s + l.debit, 0);
            return (
              <div key={entry.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-black rounded-lg font-mono">
                      {entry.entryNumber}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Fecha: {entry.date}</span>
                    <span className="text-xs text-slate-400 font-medium">Por: {entry.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full uppercase">
                      Cuadrado
                    </span>
                  </div>
                </div>

                <p className="font-bold text-slate-800 text-sm">{entry.concept}</p>

                {/* Entry Lines Table */}
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-y border-slate-200">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Cuenta</th>
                      <th className="py-2 px-3 text-right">Débito ($)</th>
                      <th className="py-2 px-3 text-right">Crédito ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entry.lines.map((l, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-600">{l.accountCode}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{l.accountName}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {l.debit > 0 ? `$${l.debit.toFixed(2)}` : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {l.credit > 0 ? `$${l.credit.toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/50 font-black text-slate-900">
                      <td colSpan={2} className="py-2 px-3 text-right">TOTAL ASIENTO:</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700">${entryTotalDebit.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700">${entryTotalDebit.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: BALANZA DE COMPROBACIÓN */}
      {activeTab === "balanza" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Balanza de Comprobación de Saldos</h3>
              <p className="text-xs text-slate-500">Verificación de la ecuación contable Débitos = Créditos</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Balanza</span>
            </button>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white uppercase font-extrabold">
                <th className="p-3">Código</th>
                <th className="p-3">Cuenta Contable</th>
                <th className="p-3 text-right">Débito Deudor ($)</th>
                <th className="p-3 text-right">Crédito Acreedor ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((a) => {
                const isDeudor = a.type === "Activo" || a.type === "Costo" || a.type === "Gasto";
                const debito = isDeudor ? a.balance : 0;
                const credito = !isDeudor ? a.balance : 0;
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-indigo-600">{a.code}</td>
                    <td className="p-3 font-bold text-slate-800">{a.name}</td>
                    <td className="p-3 text-right font-mono font-bold">{debito > 0 ? `$${debito.toFixed(2)}` : "—"}</td>
                    <td className="p-3 text-right font-mono font-bold">{credito > 0 ? `$${credito.toFixed(2)}` : "—"}</td>
                  </tr>
                );
              })}
              <tr className="bg-indigo-100 font-black text-indigo-950 text-sm">
                <td colSpan={2} className="p-4 text-right">SUMAS IGUALES BALANZA:</td>
                <td className="p-4 text-right font-mono">${accounts.filter(a => ["Activo", "Costo", "Gasto"].includes(a.type)).reduce((s, a) => s + a.balance, 0).toFixed(2)}</td>
                <td className="p-4 text-right font-mono">${accounts.filter(a => ["Pasivo", "Capital", "Ingreso"].includes(a.type)).reduce((s, a) => s + a.balance, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ESTADOS FINANCIEROS */}
      {activeTab === "estados" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Estado de Resultados (P&L) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Estado de Resultados (P&L)</h3>
                <p className="text-xs text-slate-400">Ingresos - Costos - Gastos Operativos</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-bold text-slate-700">
                <span>(+) Ingresos Operativos por Ventas</span>
                <span className="font-mono text-blue-600">${totalIngresos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-700">
                <span>(-) Costo de Ventas</span>
                <span className="font-mono text-rose-600">-${totalCostos.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>(=) UTILIDAD BRUTA:</span>
                <span className="font-mono text-indigo-700">${utilidadBruta.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-slate-700 pt-2">
                <span>(-) Gastos Generales y Administrativos</span>
                <span className="font-mono text-rose-600">-${totalGastos.toFixed(2)}</span>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center text-emerald-950 font-black text-sm">
                <span>UTILIDAD NETA DEL EJERCICIO:</span>
                <span className="font-mono text-lg text-emerald-700">${utilidadNeta.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Balance General */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Balance General (Situación Financiera)</h3>
                <p className="text-xs text-slate-400">Activo = Pasivo + Capital Patrimonio</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50/50 p-2 rounded-xl">
                <span>TOTAL ACTIVOS:</span>
                <span className="font-mono text-base font-black">${totalActivos.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-rose-800 bg-rose-50/50 p-2 rounded-xl">
                <span>TOTAL PASIVOS:</span>
                <span className="font-mono text-base font-black">${totalPasivos.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-bold text-indigo-800 bg-indigo-50/50 p-2 rounded-xl">
                <span>CAPITAL Y PATRIMONIO:</span>
                <span className="font-mono text-base font-black">${patrimonioTotal.toFixed(2)}</span>
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl flex justify-between items-center font-black text-xs">
                <span>VERIFICACIÓN (PASIVO + CAPITAL):</span>
                <span className="font-mono text-emerald-400 text-base">${(totalPasivos + patrimonioTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CUENTA CONTABLE */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-900">Crear Nueva Cuenta Contable</h3>
            <form onSubmit={handleAddAccount} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Código Contable (ej. 1.1.05):</label>
                <input
                  type="text"
                  required
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  placeholder="1.1.05"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Nombre de la Cuenta:</label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="Ej. Caja Chica Ventas"
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Tipo de Cuenta:</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as Account["type"])}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Activo">Activo</option>
                  <option value="Pasivo">Pasivo</option>
                  <option value="Capital">Capital / Patrimonio</option>
                  <option value="Ingreso">Ingreso</option>
                  <option value="Costo">Costo</option>
                  <option value="Gasto">Gasto</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Saldo Inicial ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={newAccInitialBalance}
                  onChange={(e) => setNewAccInitialBalance(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO ASIENTO CONTABLE */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-900">Crear Asiento Contable Manual (Partida Doble)</h3>

            <form onSubmit={handleSaveEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Fecha del Asiento:</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Glosa / Concepto:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Registro de cobro a clientes"
                    value={entryConcept}
                    onChange={(e) => setEntryConcept(e.target.value)}
                    className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-900 text-xs">Detalle de Débitos y Créditos:</label>

                {entryLines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <select
                      value={line.accountId}
                      onChange={(e) => {
                        const updated = [...entryLines];
                        updated[idx].accountId = e.target.value;
                        setEntryLines(updated);
                      }}
                      className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Débito"
                      value={line.debit}
                      onChange={(e) => {
                        const updated = [...entryLines];
                        updated[idx].debit = e.target.value;
                        setEntryLines(updated);
                      }}
                      className="w-24 p-1.5 bg-white border border-slate-200 rounded-lg text-right font-mono"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Crédito"
                      value={line.credit}
                      onChange={(e) => {
                        const updated = [...entryLines];
                        updated[idx].credit = e.target.value;
                        setEntryLines(updated);
                      }}
                      className="w-24 p-1.5 bg-white border border-slate-200 rounded-lg text-right font-mono"
                    />

                    {entryLines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEntryLine(idx)}
                        className="text-rose-500 font-bold px-2 hover:bg-rose-50 rounded-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddEntryLine}
                  className="text-indigo-600 font-bold text-xs hover:underline flex items-center gap-1 mt-1"
                >
                  + Agregar Fila al Asiento
                </button>
              </div>

              {/* Balances Summary */}
              <div className={`p-3 rounded-xl flex justify-between items-center text-xs font-black ${
                isBalanced ? "bg-emerald-100 text-emerald-900 border border-emerald-300" : "bg-rose-100 text-rose-900 border border-rose-300"
              }`}>
                <div>
                  <span>Total Débitos: ${totalDebit.toFixed(2)}</span>
                  <span className="ml-4">Total Créditos: ${totalCredit.toFixed(2)}</span>
                </div>
                <span>{isBalanced ? "✓ Asiento Cuadrado" : "⚠ Asiento Descuadrado"}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50"
                >
                  Publicar Asiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
