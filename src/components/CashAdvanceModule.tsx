import React, { useState } from "react";
import { 
  Landmark, ArrowUpRight, ArrowDownLeft, RefreshCw, 
  Wallet, TrendingUp, CheckCircle2, AlertTriangle, 
  DollarSign, FileText, Plus, ShieldAlert, History,
  Printer, Coins, CreditCard, ChevronRight, Check, X, ArrowRight
} from "lucide-react";
import { Company, User, Branch, CashSession, Sale } from "../types";

interface CashAdvanceModuleProps {
  activeCompany: Company;
  currentUser: User;
  activeBranch: Branch;
  branches?: Branch[];
  cashSessions: CashSession[];
  sales: Sale[];
  onOpenCashSession: (session: CashSession) => void;
  onCloseCashSession: (sessionId: string, closedFund: number) => void;
  onCashInSession: (amount: number, type: 'in' | 'out', reason?: string) => void;
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
}

interface CashTransfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  amount: number;
  date: string;
  user: string;
  status: "pending" | "completed";
}

interface CashFlowMovement {
  id: string;
  type: "in" | "out";
  amount: number;
  reason: string;
  date: string;
  user: string;
  reconciled: boolean;
}

interface ArqueoReport {
  sessionId: string;
  sessionName: string;
  userName: string;
  openDate: string;
  closeDate: string;
  initialFund: number;
  initialBreakdown: Record<string, number>;
  finalBreakdownDop: Record<string, number>;
  finalBreakdownUsd: Record<string, number>;
  usdExchangeRate: number;
  expectedCash: number;
  expectedCard: number;
  expectedTransfer: number;
  actualCashDop: number;
  actualCashUsd: number;
  actualCashUsdConverted: number;
  actualCashTotal: number;
  actualCard: number;
  actualTransfer: number;
  diffCash: number;
  diffCard: number;
  diffTransfer: number;
  diffTotal: number;
  comment: string;
}

const DOP_DENOMINATIONS = [
  { value: 2000, label: "RD$ 2,000" },
  { value: 1000, label: "RD$ 1,000" },
  { value: 500, label: "RD$ 500" },
  { value: 200, label: "RD$ 200" },
  { value: 100, label: "RD$ 100" },
  { value: 50, label: "RD$ 50" },
  { value: 25, label: "RD$ 25 (Moneda)" },
  { value: 10, label: "RD$ 10 (Moneda)" },
  { value: 5, label: "RD$ 5 (Moneda)" },
  { value: 1, label: "RD$ 1 (Moneda)" }
];

const USD_DENOMINATIONS = [
  { value: 100, label: "US$ 100" },
  { value: 50, label: "US$ 50" },
  { value: 20, label: "US$ 20" },
  { value: 10, label: "US$ 10" },
  { value: 5, label: "US$ 5" },
  { value: 1, label: "US$ 1" }
];

export default function CashAdvanceModule({
  activeCompany,
  currentUser,
  activeBranch,
  branches = [],
  cashSessions = [],
  sales = [],
  onOpenCashSession,
  onCloseCashSession,
  onCashInSession,
  onAddAudit
}: CashAdvanceModuleProps) {
  if (!activeCompany || !activeBranch) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl m-4 space-y-2">
        <div className="text-slate-700 font-bold text-sm">Cargando información de sucursal y caja...</div>
        <p className="text-slate-500 text-xs">Por favor, verifique que una sucursal activa esté seleccionada en el sistema.</p>
      </div>
    );
  }

  const compId = activeCompany.id;
  const branchId = activeBranch.id;

  // Cash sessions for active company
  const companySessions = (cashSessions || []).filter(cs => cs.companyId === compId);
  const activeSession = companySessions.find(cs => cs.branchId === branchId && cs.status === "open");

  // Local state for treasury operations
  const [initialFund, setInitialFund] = useState("5000");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [movementType, setMovementType] = useState<"in" | "out">("out");

  // ARQUEO INICIAL (Initial Cash Count breakdown)
  const [isInitialBreakdownActive, setIsInitialBreakdownActive] = useState(false);
  const [initialDopBreakdown, setInitialDopBreakdown] = useState<Record<string, number>>({
    "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "25": 0, "10": 0, "5": 0, "1": 0
  });

  // Calculated initial fund from DOP denominations
  const calculatedInitialFund = Object.entries(initialDopBreakdown).reduce(
    (sum, [denom, qty]) => sum + (parseFloat(denom) * (Number(qty) || 0)), 
    0
  );

  // ARQUEO FINAL (Final Cash Count breakdown & modal)
  const [showFinalArqueoModal, setShowFinalArqueoModal] = useState(false);
  const [finalDopBreakdown, setFinalDopBreakdown] = useState<Record<string, number>>({
    "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "25": 0, "10": 0, "5": 0, "1": 0
  });
  const [finalUsdBreakdown, setFinalUsdBreakdown] = useState<Record<string, number>>({
    "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "1": 0
  });
  const [usdExchangeRate, setUsdExchangeRate] = useState<number>(59.50);
  const [actualCard, setActualCard] = useState<string>("");
  const [actualTransfer, setActualTransfer] = useState<string>("");
  const [finalComment, setFinalComment] = useState<string>("");

  const [arqueoActiveStep, setArqueoActiveStep] = useState<"dop" | "usd" | "others" | "summary">("dop");

  // Arqueo History (Reports database in local storage)
  const [arqueoHistory, setArqueoHistory] = useState<ArqueoReport[]>(() => {
    const saved = localStorage.getItem(`pos_arqueo_reports_${compId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Arqueo Report for printing/viewing
  const [selectedArqueoToPrint, setSelectedArqueoToPrint] = useState<ArqueoReport | null>(null);

  // Reconciliation Routine (Standalone audit tool)
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [reconciliationJustification, setReconciliationJustification] = useState("");
  const [reconciliationHistory, setReconciliationHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem(`pos_reconciliations_${compId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Cash Transfers
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [targetBranchId, setTargetBranchId] = useState("");
  const [transfers, setTransfers] = useState<CashTransfer[]>(() => {
    const saved = localStorage.getItem(`pos_transfers_${compId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // General movements
  const [movements, setMovements] = useState<CashFlowMovement[]>(() => {
    const saved = localStorage.getItem(`pos_movements_${compId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Destination branches available for transfer (belonging to active company, excluding current active branch)
  const otherBranches = (branches || []).filter(
    (b) => b.companyId === compId && b.id !== branchId
  );

  // Calculate stats for current active session sales
  const sessionSales = (sales || []).filter(s => 
    s.companyId === compId &&
    s.branchId === branchId &&
    s.status === "completed" &&
    activeSession &&
    new Date(s.date) >= new Date(activeSession.openDate)
  );

  const cashSales = sessionSales.reduce((sum, s) => {
    if (s.paymentMethod === "Efectivo") return sum + s.total;
    if (s.paymentMethod === "Dividido") return sum + (s.paymentDetails?.split?.Efectivo || 0);
    return sum;
  }, 0);

  const cardSales = sessionSales.reduce((sum, s) => {
    if (s.paymentMethod === "Tarjeta") return sum + s.total;
    if (s.paymentMethod === "Dividido") return sum + (s.paymentDetails?.split?.Tarjeta || 0);
    return sum;
  }, 0);

  const transferSales = sessionSales.reduce((sum, s) => {
    if (s.paymentMethod === "Transferencia") return sum + s.total;
    return sum;
  }, 0);

  // Calculate stats
  const totalCashIn = movements.filter(m => m.type === "in").reduce((sum, m) => sum + m.amount, 0);
  const totalCashOut = movements.filter(m => m.type === "out").reduce((sum, m) => sum + m.amount, 0);
  
  // Theoretical Cash = Initial fund + manual cash in/out (movements) + POS Cash sales
  const theoreticalBalance = (activeSession?.initialFund || 0) + (activeSession?.cashIn || 0) - (activeSession?.cashOut || 0) + cashSales;

  // Expected methods for Closing Arqueo
  const expectedCash = theoreticalBalance;
  const expectedCard = cardSales;
  const expectedTransfer = transferSales;
  const expectedGrandTotal = expectedCash + expectedCard + expectedTransfer;

  // Real-time final counts
  const countedDopCash = Object.entries(finalDopBreakdown).reduce(
    (sum, [denom, qty]) => sum + (parseFloat(denom) * (Number(qty) || 0)), 
    0
  );
  const countedUsdCash = Object.entries(finalUsdBreakdown).reduce(
    (sum, [denom, qty]) => sum + (parseFloat(denom) * (Number(qty) || 0)), 
    0
  );
  const usdInDop = countedUsdCash * usdExchangeRate;
  const totalCountedCash = countedDopCash + usdInDop;
  const totalCountedCard = parseFloat(actualCard) || 0;
  const totalCountedTransfer = parseFloat(actualTransfer) || 0;
  const grandTotalCounted = totalCountedCash + totalCountedCard + totalCountedTransfer;

  // Differences
  const diffCash = totalCountedCash - expectedCash;
  const diffCard = totalCountedCard - expectedCard;
  const diffTransfer = totalCountedTransfer - expectedTransfer;
  const diffTotal = grandTotalCounted - expectedGrandTotal;

  // Custom high-contrast printing proxy to prevent iframe or container-style print blockages
  const handlePrintArqueoReceipt = () => {
    const printContent = document.getElementById("printable-ticket-content")?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Arqueo de Caja - Sesión ${selectedArqueoToPrint?.sessionId || ""}</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                width: 76mm;
                margin: 0 auto;
                padding: 10px 4px;
                font-size: 13px;
                line-height: 1.5;
                color: #000;
                background-color: #fff;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .font-semibold { font-weight: 600; }
              .font-black { font-weight: 900; }
              .font-extrabold { font-weight: 800; }
              .uppercase { text-transform: uppercase; }
              .italic { font-style: italic; }
              .leading-tight { line-height: 1.25; }
              .w-full { width: 100%; }
              .w-16 { width: 64px; }
              .break-all { word-break: break-all; }
              .shrink-0 { flex-shrink: 0; }

              .p-4 { padding: 16px; }
              .pt-1 { padding-top: 4px; }
              .pt-1\\.5 { padding-top: 6px; }
              .pt-2 { padding-top: 8px; }
              .pt-4 { padding-top: 16px; }
              .pt-8 { padding-top: 32px; }
              .pb-2 { padding-bottom: 8px; }
              .pb-2\\.5 { padding-bottom: 10px; }
              .pl-1\\.5 { padding-left: 6px; }
              
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .mb-2 { margin-bottom: 8px; }
              .mt-0\\.5 { margin-top: 2px; }
              .mt-1 { margin-top: 4px; }
              .mt-1\\.5 { margin-top: 6px; }
              .mt-4 { margin-top: 16px; }

              .space-y-0\\.5 > * + * { margin-top: 2px; }
              .space-y-1 > * + * { margin-top: 4px; }
              .space-y-1\\.5 > * + * { margin-top: 6px; }
              .space-y-2 > * + * { margin-top: 8px; }
              .space-y-3 > * + * { margin-top: 12px; }
              .space-y-4 > * + * { margin-top: 16px; }

              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-start { align-items: flex-start; }
              .gap-1 { gap: 4px; }
              .gap-4 { gap: 16px; }
              .grid { display: grid; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
              
              .border-t { border-top: 1px solid #000; }
              .border-b { border-bottom: 1px solid #000; }
              .border-l-2 { border-left: 2px solid #000; }
              .border-dashed { border-style: dashed !important; }
              .border-double { border-top: 3px double #000; border-bottom: 3px double #000; }
              
              .text-[8px] { font-size: 8px; }
              .text-[8.5px] { font-size: 8.5px; }
              .text-[9px] { font-size: 9px; }
              .text-[9.5px] { font-size: 9.5px; }
              .text-[10px] { font-size: 10px; }
              .text-[10.5px] { font-size: 10.5px; }
              .text-[11px] { font-size: 11px; }
              .text-xs { font-size: 12px; }
              .text-sm { font-size: 14px; }

              /* Force absolute black text and borders to prevent blurry color-dithering on thermal printer */
              .text-slate-900, .text-slate-800, .text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400, .text-emerald-600, .text-red-500, .text-red-600 { 
                color: #000 !important; 
              }
              .border-slate-300, .border-slate-200, .border-slate-150, .border-slate-100, .border-indigo-200 { 
                border-color: #000 !important; 
              }
              .bg-white { background-color: #fff; }
              .bg-slate-50 { background-color: #fff; border: 1px solid #000; padding: 6px; }

              .font-mono { 
                font-family: Consolas, "SF Mono", Monaco, "Courier New", monospace; 
                font-weight: bold; 
              }
              @media print {
                body { width: 76mm; margin: 0; padding: 10px 4px; }
              }
            </style>
          </head>
          <body>
            <div id="printable-ticket-content" class="bg-white p-4 text-slate-900 border border-slate-150 rounded-xl space-y-4 shadow-sm text-xs select-text font-mono">
              ${printContent}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      alert("La ventana emergente de impresión fue bloqueada por el navegador. Habilitación requerida para imprimir tickets automáticamente, o se procederá con la ventana actual.");
      window.print();
    }
  };

  // Handle Opening Session
  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const fund = isInitialBreakdownActive ? calculatedInitialFund : parseFloat(initialFund);
    if (isNaN(fund) || fund < 0) {
      alert("Monto inicial no válido.");
      return;
    }

    const newSession: CashSession = {
      id: "cs_" + Math.random().toString(36).slice(2, 9),
      companyId: compId,
      branchId: branchId,
      userId: currentUser?.id || "usr_cajero",
      userName: currentUser?.name || "Cajero",
      openDate: new Date().toISOString(),
      initialFund: fund,
      cashIn: 0,
      cashOut: 0,
      status: "open",
      synced: false
    };

    onOpenCashSession(newSession);

    // Save initial breakdown to memory
    if (isInitialBreakdownActive) {
      const savedBreakdowns = localStorage.getItem(`pos_initial_breakdowns_${activeCompany.id}`);
      const breakdowns = savedBreakdowns ? JSON.parse(savedBreakdowns) : {};
      breakdowns[newSession.id] = initialDopBreakdown;
      localStorage.setItem(`pos_initial_breakdowns_${activeCompany.id}`, JSON.stringify(breakdowns));
    }

    onAddAudit("Abrir Caja", `Caja abierta en sucursal con un fondo inicial de ${activeCompany.settings.currency} $${fund}`);
  };

  // Handle Closing Session (Triggers the final detailed count submission)
  const handleConfirmFinalArqueo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    // Create a detailed Arqueo report
    const savedBreakdowns = localStorage.getItem(`pos_initial_breakdowns_${activeCompany.id}`);
    const initialBreakdowns = savedBreakdowns ? JSON.parse(savedBreakdowns) : {};
    const sessionInitialBreakdown = initialBreakdowns[activeSession.id] || {};

    const newArqueo: ArqueoReport = {
      sessionId: activeSession.id,
      sessionName: `Turno de ${activeSession.userName}`,
      userName: activeSession.userName,
      openDate: activeSession.openDate,
      closeDate: new Date().toISOString(),
      initialFund: activeSession.initialFund,
      initialBreakdown: sessionInitialBreakdown,
      finalBreakdownDop: finalDopBreakdown,
      finalBreakdownUsd: finalUsdBreakdown,
      usdExchangeRate: usdExchangeRate,
      expectedCash: expectedCash,
      expectedCard: expectedCard,
      expectedTransfer: expectedTransfer,
      actualCashDop: countedDopCash,
      actualCashUsd: countedUsdCash,
      actualCashUsdConverted: usdInDop,
      actualCashTotal: totalCountedCash,
      actualCard: totalCountedCard,
      actualTransfer: totalCountedTransfer,
      diffCash: diffCash,
      diffCard: diffCard,
      diffTransfer: diffTransfer,
      diffTotal: diffTotal,
      comment: finalComment.trim() || "Cierre de caja de rutina realizado sin novedades."
    };

    // Save report to list
    const updated = [newArqueo, ...arqueoHistory];
    setArqueoHistory(updated);
    localStorage.setItem(`pos_arqueo_reports_${activeCompany.id}`, JSON.stringify(updated));

    // Close cash session in backend/state
    onCloseCashSession(activeSession.id, totalCountedCash);

    // Audit log
    onAddAudit(
      "Arqueo de Cierre",
      `Arqueo de caja final por ${currentUser.name}. Esperado: $${expectedGrandTotal.toFixed(2)}, Contado: $${grandTotalCounted.toFixed(2)}. Diferencia: $${diffTotal.toFixed(2)}`
    );

    // Open printing view automatically
    setSelectedArqueoToPrint(newArqueo);

    // Reset local modal states
    setShowFinalArqueoModal(false);
    setFinalDopBreakdown({ "2000": 0, "1000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "25": 0, "10": 0, "5": 0, "1": 0 });
    setFinalUsdBreakdown({ "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "1": 0 });
    setActualCard("");
    setActualTransfer("");
    setFinalComment("");
    setArqueoActiveStep("dop");
  };

  // Handle manual Cash Movement
  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(movementAmount);
    if (isNaN(amt) || amt <= 0 || !movementReason.trim()) return;

    const newMov: CashFlowMovement = {
      id: "mov_" + Math.random().toString(36).slice(2, 9),
      type: movementType,
      amount: amt,
      reason: movementReason.trim(),
      date: new Date().toISOString(),
      user: currentUser.name,
      reconciled: false
    };

    const updated = [newMov, ...movements];
    setMovements(updated);
    localStorage.setItem(`pos_movements_${activeCompany.id}`, JSON.stringify(updated));

    // Also trigger update on active cash session if open
    if (activeSession) {
      onCashInSession(amt, movementType, movementReason.trim());
    }

    onAddAudit(
      movementType === "in" ? "Entrada de Caja" : "Salida de Caja",
      `Movimiento de tesorería registrado por ${currentUser.name}: ${movementReason} por $${amt}`
    );

    setMovementAmount("");
    setMovementReason("");
    alert("Movimiento de tesorería registrado correctamente.");
  };

  // Handle Transfer
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0 || !targetBranchId) {
      alert("Por favor complete todos los datos requeridos.");
      return;
    }

    const newTr: CashTransfer = {
      id: "tr_" + Math.random().toString(36).slice(2, 9),
      fromBranchId: activeBranch.id,
      toBranchId: targetBranchId,
      amount: amt,
      date: new Date().toISOString(),
      user: currentUser.name,
      status: "completed"
    };

    const updated = [newTr, ...transfers];
    setTransfers(updated);
    localStorage.setItem(`pos_transfers_${activeCompany.id}`, JSON.stringify(updated));

    // Deduct from current cash flows
    const newMov: CashFlowMovement = {
      id: "mov_" + Math.random().toString(36).slice(2, 9),
      type: "out",
      amount: amt,
      reason: `Transferencia enviada a sucursal ID: ${targetBranchId}`,
      date: new Date().toISOString(),
      user: currentUser.name,
      reconciled: true
    };
    const updatedMovements = [newMov, ...movements];
    setMovements(updatedMovements);
    localStorage.setItem(`pos_movements_${activeCompany.id}`, JSON.stringify(updatedMovements));

    onAddAudit(
      "Transferencia entre Cajas",
      `Transferencia inter-sucursal por $${amt} registrada por ${currentUser.name}.`
    );

    setTransferAmount("");
    setTargetBranchId("");
    setShowTransferModal(false);
    alert("Transferencia inter-sucursal despachada con éxito.");
  };

  // Standalone count reconciliation (Routine Audit tool)
  const handleReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedCash);
    if (isNaN(counted)) return;

    const diff = counted - theoreticalBalance;
    const newRecon = {
      id: "recon_" + Math.random().toString(36).slice(2, 9),
      date: new Date().toISOString(),
      user: currentUser.name,
      theoretical: theoreticalBalance,
      counted: counted,
      difference: diff,
      justification: reconciliationJustification.trim() || "Conciliación de rutina sin novedad"
    };

    const updated = [newRecon, ...reconciliationHistory];
    setReconciliationHistory(updated);
    localStorage.setItem(`pos_reconciliations_${activeCompany.id}`, JSON.stringify(updated));

    onAddAudit(
      "Conciliación de Caja",
      `Arqueo realizado por ${currentUser.name}. Teórico: $${theoreticalBalance}, Contado: $${counted}. Diferencia: $${diff}`,
      theoreticalBalance.toString(),
      counted.toString()
    );

    setCountedCash("");
    setReconciliationJustification("");
    setShowReconciliation(false);
    alert(`Arqueo guardado con éxito. Diferencia registrada: $${diff}`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50" id="cash-advance-root">
      
      {/* Subheader */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Caja y Tesorería Avanzada</h2>
            <p className="text-[10px] text-slate-400 font-medium">Gestione múltiples cajas, controle flujos de efectivo, apruebe gastos de caja chica y realice arqueos de conciliación.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          
          {/* Active Session Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Estado de Turno</span>
              <h4 className="font-extrabold text-sm text-slate-800">
                {activeSession ? "Turno Activo" : "Caja Cerrada"}
              </h4>
              <p className="text-[10px] text-slate-400">
                {activeSession ? `Operador: ${activeSession.userName}` : "Requiere apertura"}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${activeSession ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Theoretical Balance (Cash in hand expected) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Efectivo Teórico</span>
              <h4 className="font-extrabold text-sm text-slate-900">
                {activeCompany.settings.currency} ${theoreticalBalance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[10px] text-slate-400">Fondo + Ventas + Depósitos - Gastos</p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Expected Card sales */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tarjetas Teóricas</span>
              <h4 className="font-extrabold text-sm text-emerald-600 font-mono">
                {activeCompany.settings.currency} ${expectedCard.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[10px] text-slate-400">Ventas con tarjetas en turno</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* Expected Transfer sales */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Transferencias Esperadas</span>
              <h4 className="font-extrabold text-sm text-blue-600 font-mono">
                {activeCompany.settings.currency} ${expectedTransfer.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
              </h4>
              <p className="text-[10px] text-slate-400">Ventas vía banco en turno</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Landmark className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Central Operations Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Column 1: Opening / Closing Control */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Control de Apertura y Cierre</h3>
            
            {!activeSession ? (
              <form onSubmit={handleOpenSession} className="space-y-3.5 pt-2">
                <p className="text-[11px] text-slate-500 leading-relaxed">No hay un turno de caja abierto para esta sucursal en este momento. Introduzca el fondo de caja inicial o realice el arqueo de apertura.</p>
                
                {/* Opening Mode Toggler */}
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setIsInitialBreakdownActive(false)}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${
                      !isInitialBreakdownActive ? "bg-white text-slate-800 shadow-3xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Monto Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsInitialBreakdownActive(true)}
                    className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${
                      isInitialBreakdownActive ? "bg-indigo-600 text-white shadow-3xs" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Arqueo por Denominación
                  </button>
                </div>

                {!isInitialBreakdownActive ? (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Fondo de Caja Inicial *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        required
                        value={initialFund}
                        onChange={(e) => setInitialFund(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 border border-slate-100 bg-slate-50/50 p-3 rounded-2xl max-h-[220px] overflow-y-auto">
                    <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Conteo de Billetes DOP</span>
                    <div className="space-y-1.5 pt-1">
                      {DOP_DENOMINATIONS.map((denom) => (
                        <div key={denom.value} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-slate-600 w-24 text-[11px]">{denom.label}</span>
                          <span className="text-slate-400">x</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={initialDopBreakdown[denom.value.toString()] || ""}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setInitialDopBreakdown(prev => ({ ...prev, [denom.value.toString()]: val }));
                            }}
                            className="w-16 text-center py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold focus:outline-hidden focus:border-indigo-500"
                          />
                          <span className="font-mono text-slate-500 w-16 text-right text-[11px]">
                            ${((initialDopBreakdown[denom.value.toString()] || 0) * denom.value).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-xs font-black text-indigo-800">
                      <span>Total Arqueo:</span>
                      <span className="font-mono">${calculatedInitialFund.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer transition-all uppercase tracking-wide"
                >
                  Abrir Turno de Caja {isInitialBreakdownActive ? `($${calculatedInitialFund.toLocaleString()})` : ""}
                </button>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-slate-700">
                    <p className="font-bold text-emerald-800">Turno Abierto</p>
                    <p className="mt-0.5">Operador: <span className="font-bold text-slate-950">{activeSession.userName}</span></p>
                    <p className="mt-0.5">Iniciado: <span className="font-mono text-slate-600 font-bold">{new Date(activeSession.openDate).toLocaleTimeString()} - {new Date(activeSession.openDate).toLocaleDateString()}</span></p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 text-[11px] space-y-1.5 border border-slate-100 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fondo Inicial:</span>
                    <span className="font-bold text-slate-700">${activeSession.initialFund.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ventas en Efectivo:</span>
                    <span className="font-bold text-emerald-600">+${cashSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Depósitos manuales:</span>
                    <span className="font-bold text-slate-600">+${activeSession.cashIn.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Retiros / Gastos:</span>
                    <span className="font-bold text-red-600">-${activeSession.cashOut.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-slate-800 font-bold">
                    <span>Teórico Total Caja:</span>
                    <span>${theoreticalBalance.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Populate theoretical values as starting counts for ease
                    setActualCard(expectedCard.toString());
                    setActualTransfer(expectedTransfer.toString());
                    setShowFinalArqueoModal(true);
                  }}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer transition-all uppercase tracking-wide flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Cerrar Turno (Arqueo Final)
                </button>
              </div>
            )}

            {/* Quick Actions Links */}
            <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
              <button
                onClick={() => setShowReconciliation(true)}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                Auditoría / Conciliación Express
              </button>
              <button
                onClick={() => {
                  if (otherBranches.length === 0) {
                    alert(`Opción no disponible: Su empresa (${activeCompany.name}) solo posee 1 sucursal activa (${activeBranch.name}). Para realizar transferencias inter-sucursal, necesita al menos 2 sucursales registradas.`);
                    return;
                  }
                  setShowTransferModal(true);
                }}
                className={`w-full border font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                  otherBranches.length === 0
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                }`}
                title={otherBranches.length === 0 ? "Su empresa cuenta con 1 sola sucursal" : "Transferir fondos a otra sucursal"}
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin-slow" />
                Transferir entre Cajas/Sucursales {otherBranches.length === 0 ? "(Sucursal Única)" : ""}
              </button>
            </div>
          </div>

          {/* Column 2: Register Cash Flow (Entradas/Salidas de Caja Chica) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Registrar Entrada / Salida de Efectivo</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">Deposite fondos adicionales para cambio de caja chica o registre salidas para compras de emergencia, suministros o almuerzos.</p>

            <form onSubmit={handleAddMovement} className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType("in")}
                  className={`py-2 rounded-xl border font-bold text-xs text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    movementType === "in" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>Entrada (+ IN)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("out")}
                  className={`py-2 rounded-xl border font-bold text-xs text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                    movementType === "out" 
                      ? "bg-red-50 text-red-700 border-red-300" 
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-red-600" />
                  <span>Salida (- OUT)</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Monto del Movimiento *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">Motivo / Justificación *</label>
                <textarea
                  required
                  rows={2}
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-hidden text-slate-800 font-semibold"
                  placeholder="Ej. Compra de papel para impresora o botellones de agua..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer transition-all"
              >
                Registrar Movimiento de Tesorería
              </button>
            </form>
          </div>

          {/* Column 3: History list of Movements */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">Gastos & Entradas Recientes</h3>
                <History className="w-4 h-4 text-slate-400" />
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[190px] pt-1">
                {movements.map((mov) => (
                  <div key={mov.id} className="py-2.5 flex items-start justify-between text-[11px]">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-800 block leading-tight">{mov.reason}</span>
                      <span className="text-[10px] text-slate-400">Por {mov.user} • {new Date(mov.date).toLocaleTimeString()}</span>
                    </div>
                    <span className={`font-mono font-bold shrink-0 ${mov.type === 'in' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {mov.type === 'in' ? '+' : '-'}${mov.amount}
                    </span>
                  </div>
                ))}
                {movements.length === 0 && (
                  <p className="text-center py-8 text-slate-400 italic">No hay movimientos registrados en este turno.</p>
                )}
              </div>
            </div>

            {/* Reconciliation Logs Summary */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-700 uppercase tracking-widest block mb-1">Últimas Auditorías Rápidas</span>
              {reconciliationHistory.slice(0, 2).map((rec) => (
                <div key={rec.id} className="flex justify-between">
                  <span>Diferencia:</span>
                  <span className={`font-mono font-bold ${rec.difference >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${rec.difference >= 0 ? '+' : ''}{rec.difference}
                  </span>
                </div>
              ))}
              {reconciliationHistory.length === 0 && (
                <span className="italic">No se han realizado auditorías rápidas.</span>
              )}
            </div>

          </div>

        </div>

        {/* SECTION: ARQUEOS DE CIERRE REALIZADOS (HISTORIAL COMPLETO DE ARQUEOS) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">Historial de Arqueos de Cierre Realizados</h3>
              <p className="text-[10px] text-slate-400">Registro histórico de cierres de caja detallados por denominación con su respectivo ticket de auditoría imprimible.</p>
            </div>
            <FileText className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-4">Fecha Cierre</th>
                  <th className="py-2.5 px-4">Cajero / Operador</th>
                  <th className="py-2.5 px-4 text-right">Inicial</th>
                  <th className="py-2.5 px-4 text-right">Esperado (Mecanizado)</th>
                  <th className="py-2.5 px-4 text-right">Físico Contado</th>
                  <th className="py-2.5 px-4 text-right">Diferencia Sobr/Falt</th>
                  <th className="py-2.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {arqueoHistory.map((report) => (
                  <tr key={report.sessionId} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(report.closeDate).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {report.userName}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ${report.initialFund.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      ${(report.expectedCash + report.expectedCard + report.expectedTransfer).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-950">
                      ${(report.actualCashTotal + report.actualCard + report.actualTransfer).toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono font-black ${report.diffTotal >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {report.diffTotal >= 0 ? "+" : ""}${report.diffTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedArqueoToPrint(report)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all flex items-center gap-1 mx-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir Reporte</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {arqueoHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                      No se han completado arqueos detallados de cierre de turno en este local.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: ARQUEO DE CONCILIACION EXPRESS ( standalone / routine audit ) */}
      {showReconciliation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleReconcile} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Auditoría / Conciliación de Efectivo
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Realice un recuento físico rápido del dinero en caja chica. El sistema comparará su conteo contra el balance teórico mecanizado para registrar discrepancias.
            </p>

            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-[11px] space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Fondo Inicial de Caja:</span>
                <span>${activeSession?.initialFund || 0}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Ingresos Netos Ventas Caja:</span>
                <span>+${cashSales || 0}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Depósitos manuales:</span>
                <span>+${activeSession?.cashIn || 0}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Egresos Totales Caja Chica:</span>
                <span>-${activeSession?.cashOut || 0}</span>
              </div>
              <div className="flex justify-between text-slate-850 font-bold border-t border-slate-200 pt-1.5 text-xs">
                <span>Balance Teórico Estimado:</span>
                <span className="text-indigo-600">${theoreticalBalance}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Efectivo Físico Contado *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:border-indigo-500 text-slate-900"
                  placeholder="Introduzca el dinero físico total"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Justificación de Diferencia</label>
              <textarea
                rows={2}
                value={reconciliationJustification}
                onChange={(e) => setReconciliationJustification(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-hidden text-slate-800 font-semibold"
                placeholder="Explique sobrantes o faltantes en caja chica..."
              />
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowReconciliation(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Guardar Auditoría
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: TRANSFERENCIA ENTRE CAJAS */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveTransfer} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin-slow" />
              Transferencia de Fondos Inter-Sucursal
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Envíe fondos desde su caja chica activa hacia la caja de otra sucursal. El movimiento quedará registrado como un egreso local y un ingreso pendiente de confirmación en destino.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Monto a Enviar *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Sucursal de Destino *</label>
              {otherBranches.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] font-medium leading-relaxed">
                  ⚠️ <b>Sucursal Única:</b> Su empresa cuenta con 1 sola sucursal activa ({activeBranch.name}). No existen otras sucursales para recibir transferencias de fondos.
                </div>
              ) : (
                <select
                  required
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden text-slate-800 font-bold cursor-pointer"
                >
                  <option value="">Seleccione Sucursal de Destino...</option>
                  {otherBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.address ? `(${b.address})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={otherBranches.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Despachar Transferencia
              </button>
            </div>
          </form>
        </div>
      )}

      {/* INTERACTIVE FULL ARQUEO MODAL (CLOSING SHIFT WITH ALL DETAILS) */}
      {showFinalArqueoModal && activeSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <form onSubmit={handleConfirmFinalArqueo} className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase">Arqueo Final de Cierre de Caja</h3>
                  <p className="text-[10px] text-slate-400">Paso a paso para el desglose financiero del efectivo físico, moneda extranjera, tarjetas y transferencias.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFinalArqueoModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps Navigator */}
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs font-extrabold text-slate-500">
              <button
                type="button"
                onClick={() => setArqueoActiveStep("dop")}
                className={`pb-1.5 border-b-2 px-1 transition-all ${arqueoActiveStep === "dop" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400"}`}
              >
                1. Pesos (DOP)
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <button
                type="button"
                onClick={() => setArqueoActiveStep("usd")}
                className={`pb-1.5 border-b-2 px-1 transition-all ${arqueoActiveStep === "usd" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400"}`}
              >
                2. Dólares (USD)
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <button
                type="button"
                onClick={() => setArqueoActiveStep("others")}
                className={`pb-1.5 border-b-2 px-1 transition-all ${arqueoActiveStep === "others" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400"}`}
              >
                3. Tarjetas & Transf.
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <button
                type="button"
                onClick={() => setArqueoActiveStep("summary")}
                className={`pb-1.5 border-b-2 px-1 transition-all ${arqueoActiveStep === "summary" ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-400"}`}
              >
                4. Resultados
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5">
              
              {/* STEP 1: DOP BILLS AND COINS COUNT */}
              {arqueoActiveStep === "dop" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-150">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">TOTAL EFECTIVO EN PESOS (DOP)</span>
                      <span className="text-lg font-black text-indigo-950 font-mono">RD$ {countedDopCash.toLocaleString("es-DO")}</span>
                    </div>
                    <Coins className="w-8 h-8 text-indigo-500 opacity-60" />
                  </div>

                  <p className="text-[11px] text-slate-500">Conteo del efectivo nacional en el cajón de monedas y gaveta de billetes:</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {DOP_DENOMINATIONS.map((denom) => (
                      <div key={denom.value} className="flex items-center justify-between gap-2.5 p-2 bg-slate-50 border border-slate-150 rounded-xl">
                        <div className="w-24">
                          <span className="font-bold text-slate-700 text-xs block leading-none">{denom.label}</span>
                        </div>
                        <span className="text-slate-400 text-xs">x</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={finalDopBreakdown[denom.value.toString()] || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFinalDopBreakdown(prev => ({ ...prev, [denom.value.toString()]: val }));
                          }}
                          className="w-16 py-1 px-1.5 text-center bg-white border border-slate-200 rounded-lg text-xs font-extrabold focus:outline-hidden focus:border-indigo-500"
                        />
                        <span className="text-slate-400 text-xs font-semibold w-20 text-right font-mono">
                          ${((finalDopBreakdown[denom.value.toString()] || 0) * denom.value).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: USD DENOMINATIONS COUNT */}
              {arqueoActiveStep === "usd" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-400 font-bold block">EFECTIVO EN US$ DÓLARES</span>
                      <span className="text-lg font-black text-slate-800 font-mono">US$ {countedUsdCash.toLocaleString()}</span>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-150 flex flex-col justify-between">
                      <span className="text-[10px] text-emerald-600 font-bold block">CONVERTIDO A PESOS (DOP)</span>
                      <span className="text-lg font-black text-emerald-700 font-mono">RD$ {usdInDop.toLocaleString("es-DO")}</span>
                    </div>
                  </div>

                  {/* Exchange rate input */}
                  <div className="bg-slate-50 p-3 border border-slate-150 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block">Tasa de Cambio (1 US$ = x RD$)</label>
                      <p className="text-[9.5px] text-slate-400">Configure la tasa del día estipulada por la empresa.</p>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">RD$</span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={usdExchangeRate}
                        onChange={(e) => setUsdExchangeRate(parseFloat(e.target.value) || 0)}
                        className="w-28 pl-9 pr-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-right focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">Recuento físico de divisas extranjeras recibidas en caja:</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {USD_DENOMINATIONS.map((denom) => (
                      <div key={denom.value} className="flex items-center justify-between gap-2.5 p-2 bg-slate-50 border border-slate-150 rounded-xl">
                        <div className="w-24">
                          <span className="font-bold text-slate-700 text-xs block leading-none">{denom.label}</span>
                        </div>
                        <span className="text-slate-400 text-xs">x</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={finalUsdBreakdown[denom.value.toString()] || ""}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setFinalUsdBreakdown(prev => ({ ...prev, [denom.value.toString()]: val }));
                          }}
                          className="w-16 py-1 px-1.5 text-center bg-white border border-slate-200 rounded-lg text-xs font-extrabold focus:outline-hidden focus:border-indigo-500"
                        />
                        <span className="text-slate-400 text-xs font-semibold w-20 text-right font-mono">
                          ${((finalUsdBreakdown[denom.value.toString()] || 0) * denom.value).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: OTHERS PAYMENTS (CREDIT CARD & TRANSFERS) */}
              {arqueoActiveStep === "others" && (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500">Introduzca los montos recaudados y confirmados en base a slips de tarjetas de crédito y vouchers de transferencias bancarias:</p>

                  <div className="space-y-4">
                    {/* CREDIT CARDS RECONCILIATION */}
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-emerald-600" />
                          <span className="font-bold text-slate-800 text-xs">Tarjetas de Crédito / Débito (Slips)</span>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                          Esperado: ${expectedCard.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        <span className="text-[11px] text-slate-400">Monto total sumado de los slips físicos:</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={actualCard}
                            onChange={(e) => setActualCard(e.target.value)}
                            className="w-36 pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-right focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>

                    {/* BANK TRANSFERS RECONCILIATION */}
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Landmark className="w-5 h-5 text-blue-600" />
                          <span className="font-bold text-slate-800 text-xs">Transferencias Bancarias</span>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                          Esperado: ${expectedTransfer.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        <span className="text-[11px] text-slate-400">Vouchers de transferencias confirmadas:</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={actualTransfer}
                            onChange={(e) => setActualTransfer(e.target.value)}
                            className="w-36 pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-extrabold text-right focus:outline-hidden"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: ARQUEO RESULTS & DIFFERENCE COMPARISON */}
              {arqueoActiveStep === "summary" && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    diffTotal >= 0 ? "bg-emerald-50 border-emerald-150 text-emerald-800" : "bg-red-50 border-red-150 text-red-800"
                  }`}>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider block">DIFERENCIA GENERAL DEL ARQUEO</span>
                      <h4 className="text-xl font-black font-mono">
                        {diffTotal >= 0 ? "SOBRANTE (+)" : "FALTANTE (-)"} RD$ {Math.abs(diffTotal).toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                      </h4>
                    </div>
                    <AlertTriangle className={`w-10 h-10 shrink-0 opacity-80 ${diffTotal >= 0 ? "text-emerald-600" : "text-red-500 animate-bounce"}`} />
                  </div>

                  <div className="overflow-hidden border border-slate-150 rounded-2xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-150">
                        <tr>
                          <th className="py-2.5 px-4">Método de Pago</th>
                          <th className="py-2.5 px-4 text-right">Mecanizado (Teórico)</th>
                          <th className="py-2.5 px-4 text-right">Contado (Physical)</th>
                          <th className="py-2.5 px-4 text-right">Diferencia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        <tr>
                          <td className="py-2.5 px-4">Efectivo (DOP + USD)</td>
                          <td className="py-2.5 px-4 text-right font-mono">${expectedCash.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold">${totalCountedCash.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${diffCash >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {diffCash >= 0 ? "+" : ""}${diffCash.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4">Tarjetas de Crédito</td>
                          <td className="py-2.5 px-4 text-right font-mono">${expectedCard.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold">${totalCountedCard.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${diffCard >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {diffCard >= 0 ? "+" : ""}${diffCard.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-4">Transferencias</td>
                          <td className="py-2.5 px-4 text-right font-mono">${expectedTransfer.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold">${totalCountedTransfer.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${diffTransfer >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {diffTransfer >= 0 ? "+" : ""}${diffTransfer.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                          <td className="py-3 px-4 uppercase text-[10px]">TOTAL CONCILIACIÓN</td>
                          <td className="py-3 px-4 text-right font-mono">${expectedGrandTotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold text-indigo-900">${grandTotalCounted.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</td>
                          <td className={`py-3 px-4 text-right font-mono font-black ${diffTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {diffTotal >= 0 ? "+" : ""}${diffTotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Comentarios / Justificaciones del Cierre</label>
                    <textarea
                      rows={2.5}
                      value={finalComment}
                      onChange={(e) => setFinalComment(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-hidden text-slate-800 font-semibold"
                      placeholder="Indique explicaciones pertinentes en caso de faltantes o sobrantes, novedades con slips o cancelaciones..."
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                {arqueoActiveStep !== "dop" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (arqueoActiveStep === "summary") setArqueoActiveStep("others");
                      else if (arqueoActiveStep === "others") setArqueoActiveStep("usd");
                      else if (arqueoActiveStep === "usd") setArqueoActiveStep("dop");
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Anterior
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowFinalArqueoModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                
                {arqueoActiveStep !== "summary" ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (arqueoActiveStep === "dop") setArqueoActiveStep("usd");
                      else if (arqueoActiveStep === "usd") setArqueoActiveStep("others");
                      else if (arqueoActiveStep === "others") setArqueoActiveStep("summary");
                    }}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1 cursor-pointer uppercase tracking-wider"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar Cierre y Registrar</span>
                  </button>
                )}
              </div>
            </div>

          </form>
        </div>
      )}

      {/* PRINT-READY VOUCHER MODAL FOR ARQUEO RESUMEN */}
      {selectedArqueoToPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1">
                <Printer className="w-4 h-4 text-slate-500" />
                Voucher de Auditoría de Cierre
              </h3>
              <button
                onClick={() => setSelectedArqueoToPrint(null)}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* HIGH FIDELITY PRINT TICKET EMBEDDED VIEW */}
            <div className="flex-1 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5" id="printable-arqueo-ticket-container">
              
              {/* Print layout injects a media query directly */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #printable-ticket-content, #printable-ticket-content * {
                    visibility: visible;
                  }
                  #printable-ticket-content {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                    background: white !important;
                    color: black !important;
                    padding: 0px !important;
                    border: none !important;
                    font-size: 11px !important;
                  }
                }
              `}</style>

              <div 
                id="printable-ticket-content" 
                className="bg-white p-4 text-slate-900 border border-slate-150 rounded-xl space-y-4 shadow-sm text-xs select-text font-mono"
              >

                {/* Ticket Header */}
                <div className="text-center space-y-1">
                  <h2 className="font-extrabold text-sm tracking-tight">{activeCompany.name.toUpperCase()}</h2>
                  <p className="text-[10px] text-slate-500 font-bold leading-tight">{activeBranch.name}</p>
                  <p className="text-[10px] text-slate-400">RNC: {activeCompany.rnc || "131-09852-4"}</p>
                  <div className="border-t border-dashed border-slate-300 my-2 pt-1 text-[11px] font-black text-slate-700">
                    RESUMEN DE ARQUEO DE CAJA
                  </div>
                </div>

                {/* Ticket Metadata */}
                <div className="space-y-1 text-[10.5px] text-slate-600 border-b border-dashed border-slate-200 pb-2">
                  <div className="flex justify-between">
                    <span>Sesión ID:</span>
                    <span className="font-bold text-slate-800">{selectedArqueoToPrint.sessionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cajero/Operador:</span>
                    <span className="font-bold text-slate-800">{selectedArqueoToPrint.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Apertura:</span>
                    <span className="font-bold text-slate-700">{new Date(selectedArqueoToPrint.openDate).toLocaleDateString()} {new Date(selectedArqueoToPrint.openDate).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cierre:</span>
                    <span className="font-bold text-slate-700">{new Date(selectedArqueoToPrint.closeDate).toLocaleDateString()} {new Date(selectedArqueoToPrint.closeDate).toLocaleTimeString()}</span>
                  </div>
                </div>

                {/* Cash count details */}
                <div className="space-y-1 text-[10.5px]">
                  <div className="font-black text-slate-800 uppercase tracking-tight text-[9.5px]">DESGLOSE FÍSICO CONTADO</div>
                  
                  {/* DOP bills list */}
                  <div className="pl-1.5 space-y-0.5 border-l-2 border-indigo-200">
                    {Object.entries(selectedArqueoToPrint.finalBreakdownDop)
                      .filter(([_, qty]) => (qty as number) > 0)
                      .map(([denom, qty]) => (
                        <div key={denom} className="flex justify-between text-slate-500">
                          <span>{qty} billete(s) de RD${denom}</span>
                          <span>RD${((qty as number) * parseFloat(denom)).toLocaleString()}</span>
                        </div>
                      ))}
                    {Object.entries(selectedArqueoToPrint.finalBreakdownUsd)
                      .filter(([_, qty]) => (qty as number) > 0)
                      .map(([denom, qty]) => (
                        <div key={denom} className="flex justify-between text-emerald-600">
                          <span>{qty} billete(s) de US${denom} (x{selectedArqueoToPrint.usdExchangeRate})</span>
                          <span>RD${((qty as number) * parseFloat(denom) * selectedArqueoToPrint.usdExchangeRate).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>

                  <div className="pt-1.5 flex justify-between font-bold text-slate-800">
                    <span>Total Efectivo Físico:</span>
                    <span>RD$ {selectedArqueoToPrint.actualCashTotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Tarjetas (Slips):</span>
                    <span>RD$ {selectedArqueoToPrint.actualCard.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Transferencias:</span>
                    <span>RD$ {selectedArqueoToPrint.actualTransfer.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Reconcile Table */}
                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1.5">
                  <div className="font-black text-slate-800 uppercase tracking-tight text-[9.5px]">CONCILIACIÓN MECANIZADA</div>
                  
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-slate-400 uppercase tracking-widest text-[8px] font-black">
                      <span>MEDIO</span>
                      <span>TEÓRICO</span>
                      <span>FISICO</span>
                      <span>DIF.</span>
                    </div>
                    
                    <div className="flex justify-between font-mono">
                      <span className="w-16">Efectivo</span>
                      <span className="text-right w-16">${selectedArqueoToPrint.expectedCash.toFixed(0)}</span>
                      <span className="text-right w-16">${selectedArqueoToPrint.actualCashTotal.toFixed(0)}</span>
                      <span className={`text-right w-16 font-bold ${selectedArqueoToPrint.diffCash >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {selectedArqueoToPrint.diffCash >= 0 ? "+" : ""}{selectedArqueoToPrint.diffCash.toFixed(0)}
                      </span>
                    </div>

                    <div className="flex justify-between font-mono">
                      <span className="w-16">Tarjeta</span>
                      <span className="text-right w-16">${selectedArqueoToPrint.expectedCard.toFixed(0)}</span>
                      <span className="text-right w-16">${selectedArqueoToPrint.actualCard.toFixed(0)}</span>
                      <span className={`text-right w-16 font-bold ${selectedArqueoToPrint.diffCard >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {selectedArqueoToPrint.diffCard >= 0 ? "+" : ""}{selectedArqueoToPrint.diffCard.toFixed(0)}
                      </span>
                    </div>

                    <div className="flex justify-between font-mono">
                      <span className="w-16">Banco</span>
                      <span className="text-right w-16">${selectedArqueoToPrint.expectedTransfer.toFixed(0)}</span>
                      <span className="text-right w-16">${selectedArqueoToPrint.actualTransfer.toFixed(0)}</span>
                      <span className={`text-right w-16 font-bold ${selectedArqueoToPrint.diffTransfer >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {selectedArqueoToPrint.diffTransfer >= 0 ? "+" : ""}{selectedArqueoToPrint.diffTransfer.toFixed(0)}
                      </span>
                    </div>

                    <div className="pt-1.5 flex justify-between font-black text-slate-900 text-[11px]">
                      <span>TOTAL GLOBAL</span>
                      <span>RD${(selectedArqueoToPrint.expectedCash + selectedArqueoToPrint.expectedCard + selectedArqueoToPrint.expectedTransfer).toLocaleString()}</span>
                      <span>RD${(selectedArqueoToPrint.actualCashTotal + selectedArqueoToPrint.actualCard + selectedArqueoToPrint.actualTransfer).toLocaleString()}</span>
                    </div>

                    <div className={`flex justify-between font-black text-xs pt-1 ${selectedArqueoToPrint.diffTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      <span>DIFERENCIA TOTAL</span>
                      <span>{selectedArqueoToPrint.diffTotal >= 0 ? "SOBRANTE (+)" : "FALTANTE (-)"} RD$ {Math.abs(selectedArqueoToPrint.diffTotal).toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Justification Comments */}
                <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-[10px]">
                  <div className="font-bold text-slate-700">OBSERVACIONES:</div>
                  <p className="text-slate-500 leading-tight italic">{selectedArqueoToPrint.comment || "Sin observaciones adicionales."}</p>
                </div>

                {/* Signatures */}
                <div className="pt-8 grid grid-cols-2 gap-4 text-center text-[9px] text-slate-500">
                  <div className="space-y-4">
                    <div className="border-b border-slate-300 w-full"></div>
                    <span className="font-bold">CAJERO EN TURNO</span>
                  </div>
                  <div className="space-y-4">
                    <div className="border-b border-slate-300 w-full"></div>
                    <span className="font-bold">SUPERVISOR / AUDITOR</span>
                  </div>
                </div>

                {/* Receipt Footer */}
                <div className="text-center pt-4 border-t border-dashed border-slate-200 text-[8.5px] text-slate-400">
                  <p>MODULAR POS CLOUD - SISTEMA DE CAJA INTELIGENTE</p>
                  <p>Impreso el {new Date().toLocaleString()}</p>
                </div>

              </div>

            </div>

            {/* Print trigger button */}
            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedArqueoToPrint(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={handlePrintArqueoReceipt}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket (Impresora Térmica)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
