import React, { useState, useEffect } from "react";
import { 
  Coffee, Layers, Users, PlusCircle, Receipt, Trash2, 
  ArrowRight, Play, CheckSquare, Clock, Printer, Split, 
  Coins, Ban, Edit2, Plus, Minus, UserCheck, CheckCircle2, 
  X, Settings, ShoppingBag, CreditCard, UtensilsCrossed 
} from "lucide-react";

import { Customer } from "../types";

interface RestaurantModuleProps {
  activeCompany: any;
  onSetCartItems: (items: any[]) => void;
  onNavigateToPOS: () => void;
  onAddAudit: (action: string, details: string) => void;
  restaurantTables: any[];
  onUpdateTables: (tables: any[]) => void;
  activeTableId: string | null;
  setActiveTableId: (id: string | null) => void;
  onNavigateToTab: (tab: string) => void;
  customers: Customer[];
  onAddSale?: (sale: any) => void;
  currentUser?: any;
  activeBranch?: any;
  sales?: any[];
}

export default function RestaurantModule({
  activeCompany,
  onSetCartItems,
  onNavigateToPOS,
  onAddAudit,
  restaurantTables,
  onUpdateTables,
  activeTableId,
  setActiveTableId,
  onNavigateToTab,
  customers,
  onAddSale,
  currentUser,
  activeBranch,
  sales = []
}: RestaurantModuleProps) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Modal selector: 'config' | 'quick_add' | 'split' | 'abono' | 'cxc' | 'cobro' | 'add_table' | 'add_area' | null
  const [activeModal, setActiveModal] = useState<"config" | "quick_add" | "split" | "abono" | "cxc" | "cobro" | "add_table" | "add_area" | null>(null);

  // Area / Salón filter & custom salones state
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>("all");
  const [customAreas, setCustomAreas] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("bistro_custom_areas");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // default below
    }
    return ["Salón Principal", "Terraza", "Área VIP", "Barra / Bar", "Exterior Patio"];
  });

  // Form states for Add Table & Add Area
  const [newTableName, setNewTableName] = useState("");
  const [newTableArea, setNewTableArea] = useState("Salón Principal");
  const [newTableCovers, setNewTableCovers] = useState("4");
  const [newAreaName, setNewAreaName] = useState("");

  // Helper to extract or resolve area for a table
  const getTableArea = (table: any): string => {
    if (table.area) return table.area;
    const nameLower = (table.tableName || "").toLowerCase();
    if (nameLower.includes("terraza")) return "Terraza";
    if (nameLower.includes("vip")) return "Área VIP";
    if (nameLower.includes("barra")) return "Barra / Bar";
    if (nameLower.includes("patio") || nameLower.includes("exterior")) return "Exterior Patio";
    return "Salón Principal";
  };

  // List of all unique available areas/salones
  const availableAreas = Array.from(new Set([
    ...customAreas,
    ...restaurantTables.map(t => getTableArea(t))
  ]));

  // Filtered tables list according to selected area
  const filteredTables = selectedAreaFilter === "all" 
    ? restaurantTables 
    : restaurantTables.filter(t => getTableArea(t) === selectedAreaFilter);

  // Restaurant Modal Notice States
  const [restNoticeMsg, setRestNoticeMsg] = useState<string>("");
  const [showRestNoticeModal, setShowRestNoticeModal] = useState<boolean>(false);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);

  // Add Table Form Submit
  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTableName.trim()) {
      setRestNoticeMsg("Por favor ingrese el nombre o número de la mesa.");
      setShowRestNoticeModal(true);
      return;
    }
    const areaToAssign = newTableArea.trim() || "Salón Principal";
    const coversVal = parseInt(newTableCovers) || 4;

    const newTable = {
      id: "t_" + Math.random().toString(36).slice(2, 8),
      tableName: newTableName.trim(),
      area: areaToAssign,
      covers: coversVal,
      status: "free",
      timeElapsed: "—",
      items: [],
      payments: [],
      abonos: 0,
      preCuentaPrinted: false
    };

    const updatedTables = [...restaurantTables, newTable];
    onUpdateTables(updatedTables);
    onAddAudit("Mesas & Salones", `Nueva mesa creada: "${newTable.tableName}" en ${newTable.area} (Capacidad: ${coversVal} personas)`);

    // Reset & Close
    setNewTableName("");
    setActiveModal(null);
    setSelectedTableId(newTable.id);
  };

  // Add Area Form Submit
  const handleAddAreaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) {
      setRestNoticeMsg("Por favor ingrese el nombre del salón o área.");
      setShowRestNoticeModal(true);
      return;
    }
    const nameClean = newAreaName.trim();
    if (!customAreas.includes(nameClean)) {
      const updated = [...customAreas, nameClean];
      setCustomAreas(updated);
      localStorage.setItem("bistro_custom_areas", JSON.stringify(updated));
      onAddAudit("Mesas & Salones", `Nuevo salón / área registrado: "${nameClean}"`);
    }
    setSelectedAreaFilter(nameClean);
    setNewAreaName("");
    setNewTableArea(nameClean);
    // Switch to adding a table in this new salon directly
    setActiveModal("add_table");
  };

  // Delete Table Handler
  const handleDeleteTable = (tableId: string) => {
    const targetTable = restaurantTables.find(t => t.id === tableId);
    if (!targetTable) return;
    if (targetTable.status !== "free") {
      setRestNoticeMsg("No se puede eliminar una mesa ocupada o con consumos activos. Primero liquide o cancele la comanda.");
      setShowRestNoticeModal(true);
      return;
    }
    setDeletingTableId(tableId);
  };

  const confirmDeleteTable = (tableId: string) => {
    const targetTable = restaurantTables.find(t => t.id === tableId);
    if (!targetTable) return;
    const updated = restaurantTables.filter(t => t.id !== tableId);
    onUpdateTables(updated);
    onAddAudit("Mesas & Salones", `Mesa eliminada del mapa: "${targetTable.tableName}"`);
    setSelectedTableId(null);
    setActiveModal(null);
    setDeletingTableId(null);
  };


  // Fiscal Comprobante states for Cobro
  const [applyFiscal, setApplyFiscal] = useState(false);
  const [cobroNcfType, setCobroNcfType] = useState<string>("B02"); // default B02 (Consumo) or B01 (Crédito Fiscal)
  const [cobroRnc, setCobroRnc] = useState("");
  const [cobroRazonSocial, setCobroRazonSocial] = useState("");

  // Completed receipt dialog state
  const [showCompletedReceipt, setShowCompletedReceipt] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState<any | null>(null);

  // Checkout/Payment (Cobro) states for Pre-cuenta tables
  const [cobroMethod, setCobroMethod] = useState<"Efectivo" | "Tarjeta" | "Transferencia" | "Mixto">("Efectivo");
  const [cobroCashPaid, setCobroCashPaid] = useState("");
  const [cobroMixtoCash, setCobroMixtoCash] = useState("");
  const [cobroMixtoCard, setCobroMixtoCard] = useState("");
  const [cobroMixtoTransfer, setCobroMixtoTransfer] = useState("");
  const [cobroReference, setCobroReference] = useState("");

  // Dynamically resolve the selected table to avoid stale-state rendering
  const selectedTable = restaurantTables.find(t => t.id === selectedTableId) || null;

  // New item helper inside comanda quick form
  const [newProductName, setNewProductName] = useState("");
  const [newProductQty, setNewProductQty] = useState("1");
  const [newProductPrice, setNewProductPrice] = useState("");

  // Partial Payment (Abono) state
  const [abonoAmount, setAbonoAmount] = useState("");
  const [abonoMethod, setAbonoMethod] = useState("Efectivo");

  // Split account state
  const [splitParts, setSplitParts] = useState("2");

  // Pre-Cuenta printable receipt dialog state
  const [showPreCuentaReceipt, setShowPreCuentaReceipt] = useState(false);

  // Customer selection for CXC
  const [cxcCustomerId, setCxcCustomerId] = useState("");

  // Specialized thermal printing helper
  const handlePrintCompletedReceipt = () => {
    const printContent = document.getElementById("restaurant-thermal-receipt")?.innerHTML;
    if (!printContent) return;

    let iframe = document.getElementById("silent-print-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "silent-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Recibo de Pago - Transacción ${completedSaleData?.id || ""}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                width: 76mm;
                margin: 0 auto;
                padding: 10px 4px;
                font-size: 13px;
                line-height: 1.5;
                color: #000;
                background-color: #fff;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .border-b { border-bottom: 1px dashed #000; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .py-2 { padding-top: 8px; padding-bottom: 8px; }
              .py-4 { padding-top: 15px; padding-bottom: 15px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .grid { display: grid; grid-template-columns: repeat(12, 1fr); }
              .col-span-7 { grid-column: span 7; }
              .col-span-2 { grid-column: span 2; }
              .col-span-3 { grid-column: span 3; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .pl-3 { padding-left: 12px; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 14px; }
              .font-mono { font-family: monospace; font-weight: bold; }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        if (iframe?.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
      }, 150);
    }
  };

  // Automatically trigger thermal print dialog on successful checkout
  useEffect(() => {
    if (showCompletedReceipt && completedSaleData) {
      const timer = setTimeout(() => {
        handlePrintCompletedReceipt();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showCompletedReceipt, completedSaleData]);

  // Calculations for selected table
  const getTableSubtotal = (table: any) => {
    if (!table || !table.items) return 0;
    return table.items.reduce((sum: number, item: any) => sum + (item.price * item.qty), 0);
  };

  const getTableTax = (table: any) => {
    return getTableSubtotal(table) * 0.18; // 18% ITBIS
  };

  const getTableTip = (table: any) => {
    return getTableSubtotal(table) * 0.10; // 10% Propina de Ley Dominicana
  };

  const getTableGrandTotal = (table: any) => {
    if (!table) return 0;
    const sub = getTableSubtotal(table);
    const tax = sub * 0.18;
    const tip = sub * 0.10;
    return sub + tax + tip;
  };

  const getTablePendingBalance = (table: any) => {
    if (!table) return 0;
    const total = getTableGrandTotal(table);
    const abonos = table.abonos || 0;
    return Math.max(0, total - abonos);
  };

  // Add item to table comanda
  const handleAddProductToTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    const qty = parseInt(newProductQty) || 1;
    const price = parseFloat(newProductPrice) || 0;
    if (!newProductName.trim() || price <= 0) {
      alert("Ingrese un nombre de platillo y precio válidos.");
      return;
    }

    const updatedTables = restaurantTables.map((t) => {
      if (t.id === selectedTable.id) {
        return {
          ...t,
          status: "occupied" as const,
          timeElapsed: t.timeElapsed === "—" ? "1 min" : t.timeElapsed,
          items: [
            ...(t.items || []),
            { 
              productId: `prod_bistro_comanda_${Math.random().toString(36).substring(2, 6)}`,
              productName: newProductName, 
              qty, 
              price,
              cost: price * 0.40,
              tax: 0.18
            }
          ]
        };
      }
      return t;
    });

    onUpdateTables(updatedTables);

    onAddAudit(
      "Comanda Mesa",
      `Se agregó ${qty}x ${newProductName} a la comanda de la ${selectedTable.tableName}`
    );

    setNewProductName("");
    setNewProductQty("1");
    setNewProductPrice("");
    setActiveModal(null); // Close modal on success
  };

  // 2. Abrir el POS
  const handleOpenPOSForTable = (table: any) => {
    setActiveTableId(table.id);
    onNavigateToTab("pos");
    onAddAudit(
      "Abrir POS Mesa",
      `Se abrió el punto de venta para gestionar la comanda de la ${table.tableName}`
    );
  };

  // 5. Pre Cuenta
  const handlePrintPreCuenta = (table: any) => {
    const updatedTables = restaurantTables.map((t) => {
      if (t.id === table.id) {
        return { ...t, status: "billing" as const, preCuentaPrinted: true };
      }
      return t;
    });
    onUpdateTables(updatedTables);
    setShowPreCuentaReceipt(true);
    onAddAudit(
      "Imprimir Pre-Cuenta",
      `Se generó y visualizó la Pre-Cuenta de la ${table.tableName}`
    );
  };

  // 9. Abonar a Cuenta
  const handleRegisterAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    const amount = parseFloat(abonoAmount) || 0;
    const balance = getTablePendingBalance(selectedTable);

    if (amount <= 0) {
      alert("Ingrese un monto de abono mayor a cero.");
      return;
    }

    if (amount > balance) {
      alert(`El abono no puede exceder el balance pendiente de RD$ ${balance.toLocaleString()}.`);
      return;
    }

    const updatedTables = restaurantTables.map((t) => {
      if (t.id === selectedTable.id) {
        const newAbonoSum = (t.abonos || 0) + amount;
        const isFullyPaid = getTableGrandTotal({ ...t, abonos: newAbonoSum }) - newAbonoSum <= 0.1;
        return {
          ...t,
          abonos: newAbonoSum,
          status: isFullyPaid ? ("free" as const) : t.status,
          items: isFullyPaid ? [] : t.items,
          abonosLog: [...(t.abonosLog || []), { date: new Date().toISOString(), amount, method: abonoMethod }]
        };
      }
      return t;
    });

    onUpdateTables(updatedTables);
    onAddAudit(
      "Abono Registrado",
      `Abono de RD$ ${amount.toLocaleString()} (${abonoMethod}) registrado para la ${selectedTable.tableName}`
    );

    alert(`Abono de RD$ ${amount.toLocaleString()} registrado con éxito.`);
    setAbonoAmount("");
    setActiveModal(null); // Close modal
  };

  // 8. Dividir Cuenta
  const handlePayDividedPart = (partAmount: number) => {
    if (!selectedTable) return;
    const amount = parseFloat(partAmount.toFixed(2));
    const balance = getTablePendingBalance(selectedTable);

    if (amount > balance) {
      alert("El cobro excede el balance pendiente.");
      return;
    }

    const updatedTables = restaurantTables.map((t) => {
      if (t.id === selectedTable.id) {
        const newAbonoSum = (t.abonos || 0) + amount;
        const isFullyPaid = getTableGrandTotal({ ...t, abonos: newAbonoSum }) - newAbonoSum <= 0.1;
        return {
          ...t,
          abonos: newAbonoSum,
          status: isFullyPaid ? ("free" as const) : t.status,
          items: isFullyPaid ? [] : t.items,
          abonosLog: [...(t.abonosLog || []), { date: new Date().toISOString(), amount, method: "Tarjeta/Dividido" }]
        };
      }
      return t;
    });

    onUpdateTables(updatedTables);
    onAddAudit(
      "Pago Fraccionado",
      `Cobro de parte de cuenta por RD$ ${amount.toLocaleString()} para la ${selectedTable.tableName}`
    );

    alert(`Se procesó el cobro de la fracción por RD$ ${amount.toLocaleString()} con éxito.`);
    setActiveModal(null);
  };

  // 7. Mandar a CXC (Credit Account)
  const handleSendToCXC = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    if (!cxcCustomerId) {
      alert("Por favor, seleccione un cliente para mandar la comanda a cuentas por cobrar.");
      return;
    }

    const customer = customers.find(c => c.id === cxcCustomerId);
    if (!customer) return;

    const pendingTotal = getTablePendingBalance(selectedTable);
    const remainingCredit = customer.creditLimit - customer.currentDebt;

    if (pendingTotal > remainingCredit) {
      alert(`Límite de crédito excedido para ${customer.name}. Disponible: RD$ ${remainingCredit.toLocaleString()}`);
      return;
    }

    // Assign debt to customer
    customer.currentDebt += pendingTotal;

    // Release table
    const updatedTables = restaurantTables.map((t) => {
      if (t.id === selectedTable.id) {
        return { ...t, status: "free" as const, timeElapsed: "—", items: [], abonos: 0, preCuentaPrinted: false, customerId: undefined, notes: "" };
      }
      return t;
    });
    onUpdateTables(updatedTables);

    onAddAudit(
      "Cargar a CXC",
      `Cargado saldo pendiente de RD$ ${pendingTotal.toLocaleString()} a la cuenta de crédito de ${customer.name} desde ${selectedTable.tableName}`
    );

    alert(`Saldo de RD$ ${pendingTotal.toLocaleString()} cargado correctamente a la cuenta de crédito (CXC) de ${customer.name}. Mesa liberada.`);
    setCxcCustomerId("");
    setActiveModal(null);
    setSelectedTableId(null);
  };

  // 10. Anular Comanda / Mesa
  const handleAnularMesa = (tableId: string) => {
    if (window.confirm("¿Está seguro de anular esta comanda? Esta acción eliminará todos los platos servidos y restablecerá la mesa a Disponible.")) {
      const updatedTables = restaurantTables.map((t) => {
        if (t.id === tableId) {
          return { ...t, status: "free" as const, timeElapsed: "—", items: [], abonos: 0, preCuentaPrinted: false, customerId: undefined, notes: "" };
        }
        return t;
      });
      onUpdateTables(updatedTables);
      onAddAudit(
        "Anular Comanda",
        `Se anuló la comanda de la mesa ID: ${tableId}`
      );
      setSelectedTableId(null);
    }
  };

  // NCF sequence helper for Restaurant Module
  const getNextNcf = (type: string) => {
    const list = sales || [];
    const fiscalSales = list.filter((s: any) => s.companyId === activeCompany?.id && s.ncf?.startsWith(type));
    const nextSeq = fiscalSales.length + 1;
    if (type.startsWith("E")) {
      return `${type}${String(nextSeq).padStart(10, "0")}`;
    }
    return `${type}${String(nextSeq).padStart(8, "0")}`;
  };

  // 11. Cobrar & Liquidar Mesa Pre-cuenta
  const handleProcessCobroPreCuenta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;

    const pendingTotal = getTablePendingBalance(selectedTable);

    let finalPaymentMethod = cobroMethod;
    let paymentDetails: any = {};
    let isFullyPaid = false;
    let totalPaid = 0;

    if (cobroMethod === "Efectivo") {
      const cashValue = parseFloat(cobroCashPaid) || 0;
      if (cashValue < pendingTotal - 0.05) {
        alert(`El efectivo recibido (RD$ ${cashValue.toLocaleString()}) debe ser igual o mayor al monto pendiente (RD$ ${pendingTotal.toLocaleString()}).`);
        return;
      }
      totalPaid = pendingTotal;
      paymentDetails = {
        cashPaid: cashValue,
        change: Math.max(0, cashValue - pendingTotal),
      };
      isFullyPaid = true;
    } else if (cobroMethod === "Tarjeta") {
      totalPaid = pendingTotal;
      paymentDetails = {
        cardLast4: cobroReference ? cobroReference.slice(-4) : "xxxx",
      };
      isFullyPaid = true;
    } else if (cobroMethod === "Transferencia") {
      totalPaid = pendingTotal;
      paymentDetails = {
        reference: cobroReference,
      };
      isFullyPaid = true;
    } else if (cobroMethod === "Mixto") {
      const cashVal = parseFloat(cobroMixtoCash) || 0;
      const cardVal = parseFloat(cobroMixtoCard) || 0;
      const transVal = parseFloat(cobroMixtoTransfer) || 0;
      const sum = cashVal + cardVal + transVal;

      if (sum < pendingTotal - 0.05) {
        alert(`La suma de los montos ingresados (RD$ ${sum.toLocaleString()}) es menor que el total pendiente (RD$ ${pendingTotal.toLocaleString()}).`);
        return;
      }

      totalPaid = pendingTotal;
      paymentDetails = {
        split: {
          Efectivo: cashVal,
          Tarjeta: cardVal,
          Transferencia: transVal
        },
        change: Math.max(0, sum - pendingTotal),
      };
      isFullyPaid = true;
    }

    if (isFullyPaid) {
      // Generate NCF details if required
      let assignedNcf = "";
      let assignedNcfType = "NONE";
      if (applyFiscal) {
        assignedNcf = getNextNcf(cobroNcfType);
        const ncfNames: Record<string, string> = {
          B01: "NCF Crédito Fiscal (B01)",
          B02: "NCF Consumo (B02)",
          B14: "NCF Regímenes Especiales (B14)",
          B15: "NCF Gubernamental (B15)",
          E31: "e-CF Crédito Fiscal Electrónico (E31)",
          E32: "e-CF Consumo Electrónico (E32)",
          E45: "e-CF Regímenes Especiales Electrónico (E45)",
          E47: "e-CF Gubernamental Electrónico (E47)"
        };
        assignedNcfType = ncfNames[cobroNcfType] || "Comprobante Fiscal";
      }

      const saleItems = (selectedTable.items || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        cost: item.cost || item.price * 0.40,
        qty: item.qty,
        discount: 0,
        tax: item.tax || 0.18,
      }));

      const sub = getTableSubtotal(selectedTable);
      const tax = getTableTax(selectedTable);
      const tip = getTableTip(selectedTable);
      const grandTotal = getTableGrandTotal(selectedTable);

      // Save sale details for the print view dialog
      const saleDetails = {
        id: "sale_" + Math.random().toString(36).substring(2, 9),
        tableName: selectedTable.tableName,
        items: saleItems,
        subtotal: sub,
        tax: tax,
        tip: tip,
        grandTotal: grandTotal,
        pendingTotal: pendingTotal,
        paymentMethod: finalPaymentMethod,
        paymentDetails: paymentDetails,
        ncf: assignedNcf,
        ncfType: assignedNcfType,
        rnc: applyFiscal ? cobroRnc : "",
        razonSocial: applyFiscal ? cobroRazonSocial : "",
        date: new Date().toISOString(),
      };
      setCompletedSaleData(saleDetails);

      // 1. Construct a Sale object if onAddSale is available!
      if (onAddSale) {
        const newSale = {
          id: saleDetails.id,
          uuid: "synced_" + Math.random().toString(36).substring(2, 9),
          companyId: activeCompany?.id || "comp_bistro",
          branchId: activeBranch?.id || "br_bistro_main",
          userId: currentUser?.id || "user_bistro_waiter",
          date: saleDetails.date,
          items: saleItems,
          total: grandTotal,
          discount: 0,
          tax: tax,
          paymentMethod: finalPaymentMethod === "Mixto" ? "Dividido" : finalPaymentMethod,
          paymentDetails: paymentDetails,
          status: "completed" as const,
          ncf: assignedNcf,
          ncfType: assignedNcfType,
          customerId: selectedTable.customerId,
          notes: `Pago Mesa ${selectedTable.tableName} (${finalPaymentMethod})` +
                 (applyFiscal && cobroRnc ? ` | RNC/Cédula: ${cobroRnc} - ${cobroRazonSocial}` : ""),
          synced: true,
        };

        onAddSale(newSale);
      }

      // 2. Clear table
      const updatedTables = restaurantTables.map((t) => {
        if (t.id === selectedTable.id) {
          return {
            ...t,
            status: "free" as const,
            timeElapsed: "—",
            items: [],
            abonos: 0,
            preCuentaPrinted: false,
            customerId: undefined,
            notes: "",
            abonosLog: []
          };
        }
        return t;
      });

      onUpdateTables(updatedTables);

      // 3. Log to audit
      onAddAudit(
        "Mesa Liquidada",
        `Se cobró y cerró la comanda de la ${selectedTable.tableName} por un monto de RD$ ${pendingTotal.toLocaleString()} con método ${finalPaymentMethod}.` +
        (applyFiscal ? ` Comprobante Fiscal: ${assignedNcf}` : "")
      );

      // 4. Open completed receipt screen and trigger auto-print
      setActiveModal(null);
      setApplyFiscal(false);
      setCobroRnc("");
      setCobroRazonSocial("");
      setShowCompletedReceipt(true);
      setSelectedTableId(null);
    }
  };

  const occupiedCount = restaurantTables.filter(t => t.status !== "free").length;
  const freeCount = restaurantTables.filter(t => t.status === "free").length;
  const occupancyPct = Math.round((occupiedCount / restaurantTables.length) * 100) || 0;

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800 animate-fade-in" id="restaurant-module-root">
      
      {/* LEFT: FLOORS MAP & STATS */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4" id="restaurant-floor-section">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-600" />
              Módulo de Salón & Mapa de Mesas
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Haga clic en cualquier mesa para renombrarla, tomar pedidos con el POS, registrar abonos, dividir cuentas o emitir pre-cuentas.
            </p>
          </div>

          <div className="flex gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg">Libres ({freeCount})</span>
            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg">Ocupadas ({occupiedCount})</span>
            <span className="px-2.5 py-1 bg-sky-600 text-white rounded-lg">Ocupación: {occupancyPct}%</span>
          </div>
        </div>

        {/* AREA / SALONES SELECTOR BAR AND ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          {/* AREA TABS */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedAreaFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedAreaFilter === "all"
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos los Salones ({restaurantTables.length})</span>
            </button>

            {availableAreas.map((area) => {
              const areaTablesCount = restaurantTables.filter(t => getTableArea(t) === area).length;
              const isSelected = selectedAreaFilter === area;
              return (
                <button
                  key={area}
                  onClick={() => setSelectedAreaFilter(area)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{area}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {areaTablesCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ACTION BUTTONS: ADD TABLE & ADD SALON */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setNewTableArea(selectedAreaFilter === "all" ? availableAreas[0] || "Salón Principal" : selectedAreaFilter);
                setActiveModal("add_table");
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-transform active:scale-98"
              id="btn-add-table"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Mesa</span>
            </button>

            <button
              onClick={() => setActiveModal("add_area")}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
              id="btn-add-area"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Añadir Salón</span>
            </button>
          </div>
        </div>

        {/* DINING ROOM GRID */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs overflow-y-auto animate-fade-in" id="restaurant-tables-map">
          {filteredTables.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Coffee className="w-10 h-10 mb-2 text-slate-300" />
              <p className="font-bold text-sm text-slate-700">No hay mesas en este salón ("{selectedAreaFilter}")</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Haga clic en el botón "Añadir Mesa" para incorporar la primera mesa a este espacio.</p>
              <button
                onClick={() => {
                  setNewTableArea(selectedAreaFilter === "all" ? "Salón Principal" : selectedAreaFilter);
                  setActiveModal("add_table");
                }}
                className="mt-4 bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Mesa en {selectedAreaFilter}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTables.map((table) => {
                const totalAmount = getTableGrandTotal(table);
                const abonos = table.abonos || 0;
                const pending = getTablePendingBalance(table);
                const tableArea = getTableArea(table);

                let statusColor = "border-slate-200 hover:border-slate-300 bg-slate-50/50";
                let badgeColor = "bg-slate-200 text-slate-600";
                let badgeText = "Disponible";

                if (table.status === "occupied") {
                  statusColor = "border-amber-400 hover:border-amber-500 bg-amber-50/10";
                  badgeColor = "bg-amber-100 text-amber-700 animate-pulse";
                  badgeText = "Ocupada";
                } else if (table.status === "billing") {
                  statusColor = "border-sky-400 hover:border-sky-500 bg-sky-50/10";
                  badgeColor = "bg-sky-100 text-sky-700";
                  badgeText = "Pre-Cuenta";
                }

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={`border-2 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between h-44 ${statusColor} ${
                      selectedTableId === table.id ? "ring-2 ring-indigo-600 shadow-md animate-scale-up" : "hover:scale-[1.02]"
                    }`}
                    id={`table-card-${table.id}`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded ${badgeColor}`}>
                          {badgeText}
                        </span>
                        {table.status !== "free" && (
                          <span className="text-[9px] text-slate-400 flex items-center gap-0.5 font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            {table.timeElapsed}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-bold text-xs text-slate-800 mt-2.5 leading-snug">
                        {table.tableName}
                      </h3>
                      
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9.5px] text-slate-400 font-medium">Capacidad: {table.covers || 2} paxs</span>
                        <span className="text-[8.5px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 truncate max-w-[100px]">
                          {tableArea}
                        </span>
                      </div>
                    </div>

                    {table.status !== "free" ? (
                      <div className="flex justify-between items-end border-t border-slate-100/80 pt-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase font-bold">Consumo Neto</span>
                          <div className="font-bold text-slate-900 font-mono text-[11px]">RD$ {totalAmount.toLocaleString()}</div>
                          {abonos > 0 && (
                            <div className="text-emerald-600 text-[9px] font-bold">
                              Abonado: RD$ {abonos.toLocaleString()}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block text-[8px] uppercase font-bold">Por Pagar</span>
                          <div className="font-black text-rose-600 font-mono text-[11px]">
                            RD$ {pending.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 italic font-medium flex justify-between items-center border-t border-slate-100/60 pt-2">
                        <span>Vacía, disponible</span>
                        <span className="text-[9px] text-indigo-500 font-bold hover:underline">Abrir Comanda &rarr;</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* RIGHT PANEL: SELECTED TABLE ACTIONS & DETAILS */}
      <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto p-5 shrink-0 flex flex-col justify-between" id="restaurant-table-panel">
        {selectedTable ? (
          <div className="space-y-5 animate-in slide-in-from-right duration-200 h-full flex flex-col justify-between">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Controles de Servicio</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Ambiente: {selectedTable.tableName}</p>
                </div>
                <button 
                  onClick={() => setSelectedTableId(null)} 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1 bg-indigo-50 rounded-lg cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Basic Meta Info (Inline Display Only - Actions are in Modals) */}
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-800">{selectedTable.tableName}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Capacidad: {selectedTable.covers} comensales</div>
                </div>
                <button
                  onClick={() => setActiveModal("config")}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="Configurar Nombre y Capacidad"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* COMANDA ITEM LIST */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <span>Platos Servidos ({selectedTable.items?.length || 0})</span>
                  <span className="text-slate-500 font-mono">Consumo</span>
                </div>
                
                {!selectedTable.items || selectedTable.items.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-xs text-slate-400 font-medium">
                    No hay platos ordenados en esta mesa todavía.
                  </div>
                ) : (
                  <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150 max-h-52 overflow-y-auto">
                    {selectedTable.items.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs p-1 border-b border-slate-200/50 last:border-0">
                        <div className="text-slate-700">
                          <span className="font-bold text-slate-950 font-mono mr-1">{it.qty}x</span> {it.productName}
                        </div>
                        <span className="font-bold font-mono text-slate-800">RD$ {(it.price * it.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    
                    <div className="flex justify-between items-center font-bold text-[11px] border-t border-slate-200 pt-2.5 text-slate-900 mt-2 px-1">
                      <span>Subtotal Neto:</span>
                      <span className="font-mono">RD$ {getTableSubtotal(selectedTable).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
                      <span>18% ITBIS + 10% Ley:</span>
                      <span className="font-mono">RD$ {(getTableTax(selectedTable) + getTableTip(selectedTable)).toLocaleString()}</span>
                    </div>
                    {selectedTable.abonos > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-emerald-600 font-bold px-1">
                        <span>Abonos Recibidos:</span>
                        <span className="font-mono">-RD$ {selectedTable.abonos.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center font-black text-xs text-indigo-900 bg-indigo-50 p-2.5 rounded-xl mt-1.5 border border-indigo-100">
                      <span>SALDO PENDIENTE:</span>
                      <span className="font-mono text-sm">
                        RD$ {getTablePendingBalance(selectedTable).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ACTION TRIGGERS INSTEAD OF INLINE FORMS */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Acciones del Flujo de Salón</span>

              {/* 2. Abrir el POS button (Primary) */}
              <button
                onClick={() => handleOpenPOSForTable(selectedTable)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-[0.98]"
              >
                <ShoppingBag className="w-4 h-4" />
                2. Abrir Comanda en Caja POS
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* 6. Cobrar Pre-Cuenta (Green Primary) */}
              {selectedTable.status === "billing" && (
                <button
                  onClick={() => {
                    setCobroMethod("Efectivo");
                    setCobroCashPaid(getTablePendingBalance(selectedTable).toString());
                    setCobroMixtoCash("");
                    setCobroMixtoCard("");
                    setCobroMixtoTransfer("");
                    setCobroReference("");
                    setActiveModal("cobro");
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-emerald-600/10 cursor-pointer transition-all active:scale-[0.98] border border-emerald-500"
                  id="btn-cobrar-precuenta-trigger"
                >
                  <CreditCard className="w-4.5 h-4.5" />
                  Cobrar y Liquidar Pre-Cuenta
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {/* Add Quick Item Trigger Modal */}
                <button
                  onClick={() => setActiveModal("quick_add")}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-500" />
                  Agregar Plato
                </button>

                {/* 5. Pre Cuenta Trigger */}
                <button
                  onClick={() => handlePrintPreCuenta(selectedTable)}
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  5. Pre-Cuenta
                </button>
              </div>

              {selectedTable.items && selectedTable.items.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* 9. Abonar a Cuenta trigger */}
                    <button
                      onClick={() => setActiveModal("abono")}
                      className="py-2.5 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Coins className="w-4 h-4" />
                      9. Abonar RD$
                    </button>

                    {/* 8. Dividir Cuenta trigger */}
                    <button
                      onClick={() => setActiveModal("split")}
                      className="py-2.5 bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Split className="w-4 h-4" />
                      8. Dividir Cuenta
                    </button>
                  </div>

                  {/* 7. Mandar a CXC trigger */}
                  <button
                    onClick={() => setActiveModal("cxc")}
                    className="w-full py-2.5 bg-sky-50/50 hover:bg-sky-50 border border-sky-150 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserCheck className="w-4 h-4" />
                    7. Mandar a Cuentas por Cobrar
                  </button>
                </div>
              )}

              {/* 10. Anular Comanda */}
              {selectedTable.status !== "free" && (
                <button
                  type="button"
                  onClick={() => handleAnularMesa(selectedTable.id)}
                  className="w-full py-2 border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  10. Anular Mesa (Reset)
                </button>
              )}
            </div>
          </div>
        ) : (
          /* INITIAL DEFAULT VIEW */
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
            <Users className="w-12 h-12 text-slate-200 mb-2 animate-pulse" />
            <p className="text-xs font-bold text-slate-700">Seleccione una Mesa del Salón</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-60 leading-relaxed">
              Haga clic en cualquiera de las mesas del mapa de la izquierda para ver su comanda de mozo activa, agregar consumo, emitir pre-cuentas o liquidar cuentas.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* MODAL MODES TO SAVE SCREEN SPACE */}
      {/* ======================================================= */}

      {/* 1. CONFIG MODAL */}
      {activeModal === "config" && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm">Configuración de Mesa</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre / Identificador de la Mesa</label>
                <input
                  type="text"
                  value={selectedTable.tableName}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const updated = restaurantTables.map(t => t.id === selectedTable.id ? { ...t, tableName: newName } : t);
                    onUpdateTables(updated);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-indigo-500 font-sans"
                  placeholder="Ej: Mesa 12"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Salón / Área Asignada</label>
                <select
                  value={getTableArea(selectedTable)}
                  onChange={(e) => {
                    const newAreaVal = e.target.value;
                    const updated = restaurantTables.map(t => t.id === selectedTable.id ? { ...t, area: newAreaVal } : t);
                    onUpdateTables(updated);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Comensales (Capacidad Máxima)</label>
                <input
                  type="number"
                  min={1}
                  value={selectedTable.covers || 4}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const updated = restaurantTables.map(t => t.id === selectedTable.id ? { ...t, covers: val } : t);
                    onUpdateTables(updated);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold font-mono focus:outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors text-center"
                >
                  Guardar Cambios
                </button>

                {selectedTable.status === "free" && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTable(selectedTable.id)}
                    className="w-full py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold cursor-pointer transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Mesa del Mapa</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD TABLE */}
      {activeModal === "add_table" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm">Añadir Nueva Mesa al Mapa</h3>
            </div>

            <form onSubmit={handleAddTableSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre / Número de Mesa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mesa 10, Terraza 4, VIP 2"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Salón / Área *</label>
                <select
                  value={newTableArea}
                  onChange={(e) => setNewTableArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                >
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Capacidad (Comensales)</label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="4"
                  value={newTableCovers}
                  onChange={(e) => setNewTableCovers(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Crear Mesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SALÓN / AREA */}
      {activeModal === "add_area" && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm">Crear Nuevo Salón / Área</h3>
            </div>

            <form onSubmit={handleAddAreaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre del Salón o Área *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Terraza al Aire Libre, Zona VIP 2, Rooftop Bar"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Crear Salón
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUICK ADD ITEM MODAL */}
      {activeModal === "quick_add" && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm">Servicio Rápido de Mozos</h3>
            </div>

            <form onSubmit={handleAddProductToTable} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Platillo o Bebida</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mofongo de Camarones o Cerveza Grande"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Cant"
                    value={newProductQty}
                    onChange={(e) => setNewProductQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Precio Unitario RD$</label>
                  <input
                    type="number"
                    required
                    placeholder="RD$ 450"
                    value={newProductPrice}
                    onChange={(e) => setNewProductPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Agregar a Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. REGISTRAR ABONO MODAL */}
      {activeModal === "abono" && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm">Registrar Abono o Depósito</h3>
            </div>

            <form onSubmit={handleRegisterAbono} className="space-y-4 text-xs">
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs space-y-1">
                <div className="flex justify-between text-indigo-900 font-bold">
                  <span>Balance Total:</span>
                  <span>RD$ {getTableGrandTotal(selectedTable).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-extrabold">
                  <span>Pendiente de Pago:</span>
                  <span>RD$ {getTablePendingBalance(selectedTable).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Monto del Abono RD$</label>
                <input
                  type="number"
                  required
                  placeholder="Monto a abonar"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Método de Pago</label>
                <select
                  value={abonoMethod}
                  onChange={(e) => setAbonoMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:bg-white"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. DIVIDIR CUENTA MODAL */}
      {activeModal === "split" && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <Split className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-sm">Dividir Cuenta de Mesa</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div className="flex justify-between text-slate-500 font-bold">
                  <span>Saldo Pendiente:</span>
                  <span className="font-mono">RD$ {getTablePendingBalance(selectedTable).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Número de Personas (Partes)</label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={splitParts}
                  onChange={(e) => setSplitParts(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-center rounded-xl font-mono text-sm py-2.5 font-bold focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 text-center">
                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide">Fórmula de Fracción</div>
                <div className="text-xl font-black text-indigo-950 font-mono mt-1">
                  RD$ {(getTablePendingBalance(selectedTable) / (parseInt(splitParts) || 2)).toLocaleString()} c/u
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const parts = parseInt(splitParts) || 2;
                    const partTotal = getTablePendingBalance(selectedTable) / parts;
                    handlePayDividedPart(partTotal);
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer flex items-center justify-center gap-1"
                >
                  <CreditCard className="w-4 h-4" />
                  Cobrar 1 Parte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. CXC MODAL */}
      {activeModal === "cxc" && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
              <UserCheck className="w-5 h-5 text-sky-600" />
              <h3 className="font-extrabold text-sm">Cargar a Cuenta por Cobrar</h3>
            </div>

            <form onSubmit={handleSendToCXC} className="space-y-4 text-xs">
              <div className="bg-sky-50 border border-sky-100 p-3.5 rounded-xl space-y-1">
                <div className="flex justify-between text-sky-900 font-bold">
                  <span>Total a Deber:</span>
                  <span className="font-mono">RD$ {getTablePendingBalance(selectedTable).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Seleccionar Cliente de la Lista</label>
                <select
                  required
                  value={cxcCustomerId}
                  onChange={(e) => setCxcCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-semibold cursor-pointer focus:outline-none focus:bg-white"
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {customers.map(c => {
                    const disp = c.creditLimit - c.currentDebt;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} (Disp: RD$ {disp.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
                >
                  Confirmar CXC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. COBRO MODAL (LIQUIDAR PRE-CUENTA) */}
      {activeModal === "cobro" && selectedTable && (() => {
        const pendingTotal = getTablePendingBalance(selectedTable);
        const parsedCash = parseFloat(cobroCashPaid) || 0;
        
        // Mixto calculations
        const mixtoCashVal = parseFloat(cobroMixtoCash) || 0;
        const mixtoCardVal = parseFloat(cobroMixtoCard) || 0;
        const mixtoTransferVal = parseFloat(cobroMixtoTransfer) || 0;
        const mixtoSum = mixtoCashVal + mixtoCardVal + mixtoTransferVal;
        
        const isMixtoValid = mixtoSum >= pendingTotal - 0.05;
        const isEfectivoValid = parsedCash >= pendingTotal - 0.05;
        
        const isFiscalFieldsValid = !applyFiscal || (
          (["B02", "E32"].includes(cobroNcfType)) || 
          (cobroRnc.trim() !== "" && cobroRazonSocial.trim() !== "")
        );

        const isCobroValid = (cobroMethod === "Efectivo" ? isEfectivoValid : (cobroMethod === "Mixto" ? isMixtoValid : true)) && isFiscalFieldsValid;
        
        // Cambio logic
        const efectivoChange = Math.max(0, parsedCash - pendingTotal);
        const mixtoChange = Math.max(0, mixtoSum - pendingTotal);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in" id="cobro-precuenta-modal">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-100 relative max-h-[95vh] overflow-y-auto">
              <button 
                onClick={() => setActiveModal(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 border border-slate-100 rounded-full p-1 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2">
                <CreditCard className="w-5 h-5 text-emerald-600 animate-bounce" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-950">Cobrar y Cerrar Pre-Cuenta</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mesa: {selectedTable.tableName}</p>
                </div>
              </div>

              {/* Total Summary Box */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl text-center mb-4 shadow-sm border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Balance Neto Pendiente</span>
                <span className="text-2xl font-black font-mono text-emerald-400 block mt-1">
                  RD$ {pendingTotal.toLocaleString()}
                </span>
                <div className="flex justify-center gap-3 text-[10px] text-slate-400 mt-2 border-t border-slate-800 pt-2 font-medium">
                  <span>Subtotal: RD$ {getTableSubtotal(selectedTable).toLocaleString()}</span>
                  <span>Impuestos: RD$ {(getTableTax(selectedTable) + getTableTip(selectedTable)).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Method selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Seleccione el Método de Pago</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "Efectivo", name: "Efectivo", desc: "Pago cash", icon: Coins, color: "text-amber-500 bg-amber-50" },
                      { id: "Tarjeta", name: "Tarjeta", desc: "Débito / Crédito", icon: CreditCard, color: "text-sky-500 bg-sky-50" },
                      { id: "Transferencia", name: "Transferencia", desc: "BPD, Reservas...", icon: CheckSquare, color: "text-indigo-500 bg-indigo-50" },
                      { id: "Mixto", name: "Mixto / Combinado", desc: "Varios métodos", icon: Layers, color: "text-purple-500 bg-purple-50" }
                    ].map((item) => {
                      const Icon = item.icon;
                      const isActive = cobroMethod === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCobroMethod(item.id as any)}
                          className={`flex flex-col items-start p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            isActive 
                              ? "bg-slate-50 border-slate-900 ring-1 ring-slate-900" 
                              : "bg-white border-slate-200 hover:bg-slate-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`p-1 rounded-lg ${item.color}`}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-xs font-bold text-slate-900">{item.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 font-medium">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Method Details Forms */}
                <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-3">
                  {cobroMethod === "Efectivo" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Monto de Efectivo Recibido RD$</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">RD$</span>
                          <input
                            type="number"
                            required
                            min={pendingTotal}
                            value={cobroCashPaid}
                            onChange={(e) => setCobroCashPaid(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            placeholder="0.00"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Fast Cash Helpers */}
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Exacto", val: pendingTotal },
                          { label: "+100", val: Math.ceil((pendingTotal + 100) / 100) * 100 },
                          { label: "+200", val: Math.ceil((pendingTotal + 200) / 100) * 100 },
                          { label: "+500", val: Math.ceil((pendingTotal + 500) / 500) * 500 },
                          { label: "+1000", val: Math.ceil((pendingTotal + 1000) / 1000) * 1000 }
                        ].map((btn, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCobroCashPaid(btn.val.toString())}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 cursor-pointer transition-colors"
                          >
                            {btn.label === "Exacto" ? "Exacto" : `RD$ ${btn.val}`}
                          </button>
                        ))}
                      </div>

                      {parsedCash >= pendingTotal && (
                        <div className="flex justify-between items-center text-xs text-emerald-700 font-extrabold bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200/50">
                          <span className="flex items-center gap-1">Cambio / Devuelta:</span>
                          <span className="font-mono text-sm">RD$ {efectivoChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {parsedCash > 0 && parsedCash < pendingTotal && (
                        <div className="text-[10px] text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2 rounded-xl">
                          ⚠️ El efectivo ingresado es insuficiente para liquidar el total. Falta RD$ {(pendingTotal - parsedCash).toLocaleString()}.
                        </div>
                      )}
                    </div>
                  )}

                  {(cobroMethod === "Tarjeta" || cobroMethod === "Transferencia") && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-slate-500 bg-sky-50 p-2 rounded-lg border border-sky-100 font-medium">
                        ℹ️ El monto de <strong>RD$ {pendingTotal.toLocaleString()}</strong> se procesará en su totalidad con este método de pago.
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                          {cobroMethod === "Tarjeta" ? "Últimos 4 Dígitos de Tarjeta / Voucher" : "Número de Transacción / Referencia"}
                        </label>
                        <input
                          type="text"
                          value={cobroReference}
                          onChange={(e) => setCobroReference(e.target.value)}
                          placeholder={cobroMethod === "Tarjeta" ? "Ej: 1234" : "Ej: Ref 9988112"}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {cobroMethod === "Mixto" && (
                    <div className="space-y-3">
                      <div className="text-[9.5px] text-purple-700 bg-purple-50/70 p-2 rounded-lg border border-purple-100 leading-snug font-semibold">
                        Asigne montos en los métodos requeridos para cubrir el balance total de <strong>RD$ {pendingTotal.toLocaleString()}</strong>.
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Monto en Efectivo RD$</label>
                          <input
                            type="number"
                            value={cobroMixtoCash}
                            onChange={(e) => setCobroMixtoCash(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Monto en Tarjeta RD$</label>
                          <input
                            type="number"
                            value={cobroMixtoCard}
                            onChange={(e) => setCobroMixtoCard(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-1">Monto en Transferencia RD$</label>
                          <input
                            type="number"
                            value={cobroMixtoTransfer}
                            onChange={(e) => setCobroMixtoTransfer(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono font-bold"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Mixto Totals Validation Card */}
                      <div className="border-t border-slate-200/80 pt-2.5 mt-2 space-y-1.5 text-[11px] font-bold text-slate-700">
                        <div className="flex justify-between">
                          <span>Suma Ingresada:</span>
                          <span className="font-mono text-slate-900">RD$ {mixtoSum.toLocaleString()}</span>
                        </div>
                        {mixtoSum < pendingTotal && (
                          <div className="flex justify-between text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-100 text-[10px]">
                            <span>Pendiente de Cubrir:</span>
                            <span className="font-mono">RD$ {(pendingTotal - mixtoSum).toLocaleString()}</span>
                          </div>
                        )}
                        {mixtoSum >= pendingTotal && (
                          <div className="flex justify-between text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100 text-[10px]">
                            <span>Cambio en Efectivo:</span>
                            <span className="font-mono">RD$ {mixtoChange.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* COMPROBANTE FISCAL SECTION */}
                <div className="border border-slate-200/80 rounded-2xl p-3.5 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-black text-slate-800">¿Aplicar Comprobante Fiscal (NCF)?</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full">Opcional</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApplyFiscal(!applyFiscal)}
                      className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        applyFiscal ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          applyFiscal ? "translate-x-4.5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {applyFiscal && (
                    <div className="space-y-3 pt-2.5 border-t border-slate-200/50 animate-fade-in">
                      {/* NCF Type Selection */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tipo de Comprobante (DGII)</label>
                        <select
                          value={cobroNcfType}
                          onChange={(e) => setCobroNcfType(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="B01">Factura de Crédito Fiscal (B01)</option>
                          <option value="B02">Factura de Consumo (B02)</option>
                          <option value="B14">Regímenes Especiales de Tributación (B14)</option>
                          <option value="B15">Comprobante Gubernamental (B15)</option>
                          <option value="E31">e-CF de Crédito Fiscal Electrónico (E31)</option>
                          <option value="E32">e-CF de Consumo Electrónico (E32)</option>
                          <option value="E45">e-CF de Regímenes Especiales (E45)</option>
                          <option value="E47">e-CF Gubernamental Electrónico (E47)</option>
                        </select>
                      </div>

                      {/* Next NCF Number Preview */}
                      <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-100 text-[10px] font-bold">
                        <span>NCF Secuencial Asignado:</span>
                        <span className="font-mono text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-200/50 shadow-2xs font-extrabold">{getNextNcf(cobroNcfType)}</span>
                      </div>

                      {/* Select existing customer or manual input */}
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Buscar Cliente Registrado (Opcional)</label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const found = customers.find(c => c.id === val);
                              if (found) {
                                setCobroRnc(found.rncOrCedula || "");
                                setCobroRazonSocial(found.name || "");
                              }
                            } else {
                              setCobroRnc("");
                              setCobroRazonSocial("");
                            }
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">-- Ingreso Manual / Consumidor Final --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.rncOrCedula ? `(${c.rncOrCedula})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* RNC and Razon Social manual inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">
                            RNC / Cédula {(!["B02", "E32"].includes(cobroNcfType)) && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            required={applyFiscal && !["B02", "E32"].includes(cobroNcfType)}
                            value={cobroRnc}
                            onChange={(e) => setCobroRnc(e.target.value)}
                            placeholder="Ej: 131882312"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 block mb-1">
                            Razón Social / Cliente {(!["B02", "E32"].includes(cobroNcfType)) && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            required={applyFiscal && !["B02", "E32"].includes(cobroNcfType)}
                            value={cobroRazonSocial}
                            onChange={(e) => setCobroRazonSocial(e.target.value)}
                            placeholder="Ej: SRL, Inc o Persona"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      
                      {(!["B02", "E32"].includes(cobroNcfType)) && !cobroRnc.trim() && (
                        <div className="text-[8.5px] font-bold text-amber-600 bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                          ⚠️ Para este comprobante se requiere ingresar RNC y Nombre del cliente.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-3 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessCobroPreCuenta}
                    disabled={!isCobroValid}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-black shadow-md disabled:shadow-none cursor-pointer transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    Confirmar Cobro
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. PRE-CUENTA TICKET MODAL */}
      {showPreCuentaReceipt && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full border border-slate-100 relative">
            <div className="absolute right-4 top-4">
              <button 
                onClick={() => setShowPreCuentaReceipt(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h3 className="font-black text-sm uppercase">{activeCompany?.name || "BISTRO GOURMET"}</h3>
              <p className="text-[9px] font-bold text-slate-600">RNC: 1-01-99887-2</p>
              <p className="text-[9px] text-slate-500">Tel: 809-555-0199</p>
              <div className="bg-slate-100 p-1 rounded font-bold text-slate-800 text-center text-[10px] my-2 tracking-wide uppercase">
                *** PRE-CUENTA DE CONSUMO ***
              </div>
              <p className="text-[9px] text-slate-400">{new Date().toLocaleString()}</p>
            </div>

            <div className="space-y-1.5 text-[10px] border-b border-dashed border-slate-300 py-3">
              <p><span className="font-bold">MESA / AMBIENTE:</span> {selectedTable.tableName}</p>
              <p><span className="font-bold">COMENSALES:</span> {selectedTable.covers} personas</p>
              <p><span className="font-bold">ESTADO COMANDA:</span> Impresa para Cobro</p>
            </div>

            <div className="space-y-1.5 border-b border-dashed border-slate-300 py-3 text-[10px]">
              <div className="grid grid-cols-12 text-slate-500 font-bold uppercase text-[8.5px] pb-1">
                <span className="col-span-7">Concepto Platillo/Bebida</span>
                <span className="col-span-2 text-center">Cant</span>
                <span className="col-span-3 text-right">Total</span>
              </div>
              {(selectedTable.items || []).map((item: any, index: number) => (
                <div key={index} className="grid grid-cols-12 text-slate-800 font-semibold leading-snug">
                  <span className="col-span-7 truncate font-bold text-slate-900">{item.productName}</span>
                  <span className="col-span-2 text-center">{item.qty}</span>
                  <span className="col-span-3 text-right font-mono">RD${(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 text-right text-[11px] font-semibold py-3 border-b border-dashed border-slate-300">
              <p><span className="text-slate-500 font-sans">Subtotal Neto:</span> RD$ {getTableSubtotal(selectedTable).toLocaleString()}</p>
              <p><span className="text-slate-500 font-sans">18% ITBIS Dominicana:</span> RD$ {getTableTax(selectedTable).toLocaleString()}</p>
              <p><span className="text-slate-500 font-sans">10% Propina de Ley:</span> RD$ {getTableTip(selectedTable).toLocaleString()}</p>
              <div className="text-xs font-black border-t border-slate-200 pt-1 flex justify-between mt-2 text-slate-900">
                <span>TOTAL CONSUMO:</span>
                <span className="font-mono">RD$ {getTableGrandTotal(selectedTable).toLocaleString()}</span>
              </div>
              {selectedTable.abonos > 0 && (
                <div className="text-xs font-bold text-emerald-600 flex justify-between">
                  <span>Abonado a la fecha:</span>
                  <span className="font-mono">-RD$ {selectedTable.abonos.toLocaleString()}</span>
                </div>
              )}
              <div className="text-sm font-black text-indigo-900 bg-indigo-50 p-2 rounded-lg flex justify-between mt-1 border border-indigo-100">
                <span>REMANENTE DE PAGO:</span>
                <span className="font-mono font-black text-indigo-950">RD$ {getTablePendingBalance(selectedTable).toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center pt-3 text-[8.5px] text-slate-400 space-y-1">
              <p className="font-bold text-slate-700 uppercase">*** NO ES UN COMPROBANTE DE PAGO ***</p>
              <p>Por favor, presente este documento en caja para emitir su Factura de Crédito Fiscal o Consumo válida de ley.</p>
            </div>
            
            <button
              onClick={() => {
                window.print();
                setShowPreCuentaReceipt(false);
              }}
              className="mt-4 w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Confirmar & Imprimir Físico
            </button>
          </div>
        </div>
      )}

      {/* 7. COMPLETED SALE TICKET MODAL */}
      {showCompletedReceipt && completedSaleData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-fade-in" id="completed-receipt-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 relative">
            <div className="absolute right-4 top-4">
              <button 
                onClick={() => {
                  setShowCompletedReceipt(false);
                  setCompletedSaleData(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Print Notification Banner */}
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-100 text-xs font-bold mb-4 flex items-start gap-2 animate-pulse">
              <Printer className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-emerald-950">¡Pago Registrado Exitosamente!</p>
                <p className="text-[10px] text-emerald-700 font-medium mt-0.5">El ticket térmico ha sido enviado a la cola del navegador. Si no se abrió el diálogo de impresión, haz clic en el botón inferior.</p>
              </div>
            </div>

            {/* Thermal receipt viewport */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[50vh] overflow-y-auto mb-4 font-mono text-[11px] text-slate-900 leading-snug shadow-inner" id="completed-thermal-receipt-body">
              <div className="text-center pb-3 border-b border-dashed border-slate-400">
                <h4 className="font-black text-sm uppercase tracking-wide">{activeCompany?.name || "BISTRO GOURMET"}</h4>
                <p className="text-[10px] font-bold text-slate-600">RNC: 1-01-99887-2</p>
                <p className="text-[10px] text-slate-500">TELÉFONO: 809-555-0199</p>
                <p className="text-[9px] text-slate-400">AV. WINSTON CHURCHILL, SD</p>
                <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase">Factura de Crédito de Salón</p>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                <p><span className="font-bold">FECHA:</span> {new Date(completedSaleData.date).toLocaleString()}</p>
                <p><span className="font-bold">TRANSACCIÓN ID:</span> {completedSaleData.id}</p>
                <p><span className="font-bold">MESA / AMBIENTE:</span> {completedSaleData.tableName}</p>
                <p><span className="font-bold">MÉT. PAGO:</span> <span className="uppercase font-bold text-indigo-900">{completedSaleData.paymentMethod}</span></p>
                
                {completedSaleData.paymentDetails?.cardLast4 && (
                  <p><span className="font-bold">TARJETA:</span> ****-****-****-{completedSaleData.paymentDetails.cardLast4}</p>
                )}
                {completedSaleData.paymentDetails?.reference && (
                  <p><span className="font-bold">REFERENCIA:</span> {completedSaleData.paymentDetails.reference}</p>
                )}
                {completedSaleData.paymentDetails?.split && (
                  <div className="pl-3 text-[9px] text-slate-600 space-y-0.5">
                    {completedSaleData.paymentDetails.split.Efectivo > 0 && (
                      <p>• Efectivo: RD$ {completedSaleData.paymentDetails.split.Efectivo.toLocaleString()}</p>
                    )}
                    {completedSaleData.paymentDetails.split.Tarjeta > 0 && (
                      <p>• Tarjeta: RD$ {completedSaleData.paymentDetails.split.Tarjeta.toLocaleString()}</p>
                    )}
                    {completedSaleData.paymentDetails.split.Transferencia > 0 && (
                      <p>• Transferencia: RD$ {completedSaleData.paymentDetails.split.Transferencia.toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Fiscal Block if applicable */}
              {completedSaleData.ncf && (
                <div className="py-2.5 border-b border-dashed border-slate-400 bg-emerald-50/50 p-2 rounded border border-emerald-100 text-[10px] space-y-0.5">
                  <p className="font-black text-emerald-950 uppercase text-[9px] tracking-wider mb-0.5">--- DATOS FISCALES DGII ---</p>
                  <p><span className="font-bold text-slate-700">TIPO COMPROBANTE:</span> <span className="font-black text-slate-900">{completedSaleData.ncfType}</span></p>
                  <p><span className="font-bold text-slate-700">NCF EMITIDO:</span> <span className="font-black text-indigo-950 text-xs font-mono">{completedSaleData.ncf}</span></p>
                  {completedSaleData.rnc && (
                    <p><span className="font-bold text-slate-700">RNC/CÉDULA ADQUIRIENTE:</span> <span className="font-mono font-bold">{completedSaleData.rnc}</span></p>
                  )}
                  {completedSaleData.razonSocial && (
                    <p><span className="font-bold text-slate-700">RAZÓN SOCIAL:</span> <span className="font-bold uppercase">{completedSaleData.razonSocial}</span></p>
                  )}
                </div>
              )}

              {/* Items List */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                <div className="grid grid-cols-12 text-slate-500 font-bold uppercase text-[8.5px] pb-1">
                  <span className="col-span-7">Concepto</span>
                  <span className="col-span-2 text-center">Cant</span>
                  <span className="col-span-3 text-right">Total</span>
                </div>
                {(completedSaleData.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-12 text-slate-800 font-semibold leading-tight">
                    <span className="col-span-7 truncate font-bold text-slate-950">{item.productName}</span>
                    <span className="col-span-2 text-center">{item.qty}</span>
                    <span className="col-span-3 text-right font-mono font-bold">RD${(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-right text-[11px] font-semibold pt-2.5 text-slate-900">
                <p><span className="text-slate-500 font-sans">Subtotal Neto:</span> RD$ {completedSaleData.subtotal.toLocaleString()}</p>
                <p><span className="text-slate-500 font-sans">18% ITBIS Dominicana:</span> RD$ {completedSaleData.tax.toLocaleString()}</p>
                <p><span className="text-slate-500 font-sans">10% Propina de Ley:</span> RD$ {completedSaleData.tip.toLocaleString()}</p>
                
                <div className="text-xs font-black border-t border-slate-200 pt-1 flex justify-between mt-2 text-indigo-950 bg-indigo-50/50 p-1.5 rounded border border-indigo-100">
                  <span>TOTAL COBRADO:</span>
                  <span className="font-mono text-sm">RD$ {completedSaleData.grandTotal.toLocaleString()}</span>
                </div>

                {completedSaleData.paymentDetails?.change > 0 && (
                  <div className="text-xs font-bold text-emerald-700 flex justify-between">
                    <span>Cambio Entregado:</span>
                    <span className="font-mono">RD$ {completedSaleData.paymentDetails.change.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-4 text-[9px] text-slate-500 space-y-1 border-t border-dashed border-slate-400 mt-2.5">
                <p className="font-bold text-slate-700 uppercase">*** COMPROBANTE DE PAGO OFICIAL ***</p>
                <p>¡Gracias por su consumo! Le esperamos de vuelta pronto.</p>
                <p className="text-[7.5px] font-bold text-slate-400">Desarrollado por AI Studio Build • Impreso desde módulo de salón</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handlePrintCompletedReceipt}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Abrir Diálogo de Impresión Físico
              </button>
              <button
                onClick={() => {
                  setShowCompletedReceipt(false);
                  setCompletedSaleData(null);
                }}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Cerrar y Regresar a Sala
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTAURANT NOTICE MODAL */}
      {showRestNoticeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-white text-base">Aviso de GastroBistro</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{restNoticeMsg}</p>
            <button
              onClick={() => setShowRestNoticeModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg cursor-pointer transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE TABLE MODAL */}
      {deletingTableId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Eliminar Mesa del Salón</h3>
            <p className="text-xs text-slate-500">¿Está seguro de eliminar esta mesa del mapa interactivo?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingTableId(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDeleteTable(deletingTableId)}
                className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 cursor-pointer"
              >
                Eliminar Mesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

