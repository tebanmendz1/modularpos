import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Minus, Trash2, ArrowRight, 
  Coins, CreditCard, Layers, Tag, UserPlus, 
  Pause, RotateCcw, Receipt, Scale, AlertTriangle, 
  Lock, Key, Printer, Sparkles, Check, CheckCircle2,
  DollarSign, FileText, Gift, ChevronDown, RefreshCw, Barcode, Truck,
  Landmark, ShieldCheck, ShieldAlert, AlertCircle, X, Hammer
} from "lucide-react";
import { Product, Sale, SaleItem, Customer, CashSession, User, Branch, FerreteriaOrder } from "../types";

const MOCK_RNC_DB: Record<string, { name: string; activity: string; address: string }> = {
  "101010101": { name: "Cervecería Nacional Dominicana, S.A.", activity: "Fabricación de Cervezas, Maltas y Bebidas no Alcohólicas", address: "Av. Autopista 30 de Mayo, Santo Domingo" },
  "130005341": { name: "Claro Dominicana (Compañía Dominicana de Teléfonos, S.A.)", activity: "Telecomunicaciones Alámbricas, Inalámbricas e Internet", address: "Av. John F. Kennedy, Santo Domingo" },
  "101111119": { name: "Banco Popular Dominicano, S.A. - Banco Múltiple", activity: "Servicios de Intermediación Financiera y Banca Múltiple", address: "Av. John F. Kennedy esq. Máximo Gómez, Santo Domingo" },
  "101013451": { name: "Grupo Ramos, S.A.S. (La Sirena / Super Pola)", activity: "Venta al por menor en grandes almacenes y supermercados", address: "Av. Winston Churchill, Santo Domingo" },
  "101017902": { name: "Mercasid, S.A. (Grupo SID)", activity: "Fabricación de aceites, grasas comestibles, jabones y derivados", address: "Av. Máximo Gómez, Santo Domingo" },
  "101021454": { name: "Induveca, S.A.", activity: "Elaboración de productos cárnicos, embutidos y lácteos", address: "Autopista Duarte Km 2, La Vega" },
  "101850125": { name: "Altice Dominicana, S.A.", activity: "Proveedores de Servicios de Telecomunicaciones Móviles y Fijas", address: "Av. Núñez de Cáceres #8, Santo Domingo" },
  "101000325": { name: "Nestlé Dominicana, S.A.", activity: "Fabricación e Importación de productos lácteos y alimenticios", address: "Av. Abraham Lincoln, Santo Domingo" },
  "101001429": { name: "Supermercados Nacional (Centro Cuesta Nacional - CCN, S.A.S.)", activity: "Venta al por menor de productos de consumo masivo", address: "Av. Luperón esq. Gustavo Mejía Ricart, Santo Domingo" },
  "123456789": { name: "Constructora del Caribe, S.R.L.", activity: "Servicios de Ingeniería, Obras Civiles y Edificaciones", address: "Av. Sarasota, Bella Vista, Santo Domingo" },
  "987654321": { name: "Farmacia El Sol, S.R.L.", activity: "Venta de medicamentos, productos farmacéuticos y cuidado personal", address: "Av. 27 de Febrero, Santiago" }
};

interface POSModuleProps {
  activeCompany: any;
  currentUser: User;
  activeBranch: Branch;
  products: Product[];
  customers: Customer[];
  cashSessions: CashSession[];
  sales: Sale[];
  onAddSale: (sale: Sale) => void;
  onAddCustomer: (cust: Customer) => void;
  onUpdateProducts: (prods: Product[]) => void;
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
  onOpenCashSession: (session: CashSession) => void;
  onCloseCashSession: (sessionId: string, closedFund: number) => void;
  onCashInSession: (amount: number, type: 'in' | 'out') => void;
  isOnline: boolean;
  restaurantTables: any[];
  onUpdateTables: (tables: any[]) => void;
  activeTableId: string | null;
  setActiveTableId: (id: string | null) => void;
  onNavigateToTab: (tab: string) => void;
  onUpdateQuoteStatus?: (quoteId: string, status: "facturada", saleId: string) => void;
  ferreteriaOrders?: FerreteriaOrder[];
  onUpdateFerreteriaOrderStatus?: (orderId: string, status: "cobrada", saleId: string) => void;
}


export default function POSModule({
  activeCompany,
  currentUser,
  activeBranch,
  products,
  customers,
  cashSessions,
  sales,
  onAddSale,
  onAddCustomer,
  onUpdateProducts,
  onAddAudit,
  onOpenCashSession,
  onCloseCashSession,
  onCashInSession,
  isOnline,
  restaurantTables,
  onUpdateTables,
  activeTableId,
  setActiveTableId,
  onNavigateToTab,
  onUpdateQuoteStatus,
  ferreteriaOrders = [],
  onUpdateFerreteriaOrderStatus
}: POSModuleProps) {
  // POS States
  const [cart, setCart] = useState<SaleItem[]>(() => {
    const pendingCartStr = localStorage.getItem("pos_pending_load_cart");
    if (pendingCartStr) {
      try {
        const parsed = JSON.parse(pendingCartStr);
        if (Array.isArray(parsed)) {
          const mapped: SaleItem[] = parsed.map((item: any) => {
            if (!item) return null;
            // Case 1: Structure is { product: Product, qty: number, discount: number, variant?: string }
            if (item.product) {
              const prod = item.product;
              return {
                productId: prod.id,
                productName: prod.name,
                price: prod.price,
                cost: prod.cost || 0,
                qty: item.qty || 1,
                discount: item.discount || 0,
                tax: prod.tax || 0.18,
                selectedVariant: item.variant
              };
            }
            // Case 2: Structure is already a SaleItem { productId, productName, price, cost, qty, discount, tax, selectedVariant }
            if (item.productId) {
              return {
                productId: item.productId,
                productName: item.productName || "Producto",
                price: item.price || 0,
                cost: item.cost || 0,
                qty: item.qty || 1,
                discount: item.discount || 0,
                tax: item.tax || 0.18,
                selectedVariant: item.selectedVariant
              };
            }
            return null;
          }).filter(Boolean) as SaleItem[];
          localStorage.removeItem("pos_pending_load_cart");
          return mapped;
        }
      } catch (e) {
        console.error("Error parsing pos_pending_load_cart", e);
      }
    }
    return [];
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    const pendingCustId = localStorage.getItem("pos_pending_load_customer");
    if (pendingCustId) {
      const found = customers.find(c => c.id === pendingCustId);
      if (found) {
        localStorage.removeItem("pos_pending_load_customer");
        return found;
      }
    }
    return null;
  });
  const [cartDiscount, setCartDiscount] = useState<number>(0); // discount percent
  const [notes, setNotes] = useState("");

  const prevActiveTableIdRef = React.useRef<string | null>(null);

  // Fallback / Robust double-check to load pending items or customers on component mount
  useEffect(() => {
    const pendingCartStr = localStorage.getItem("pos_pending_load_cart");
    if (pendingCartStr) {
      try {
        const parsed = JSON.parse(pendingCartStr);
        if (Array.isArray(parsed)) {
          const mapped: SaleItem[] = parsed.map((item: any) => {
            if (!item) return null;
            if (item.product) {
              const prod = item.product;
              return {
                productId: prod.id,
                productName: prod.name,
                price: prod.price,
                cost: prod.cost || 0,
                qty: item.qty || 1,
                discount: item.discount || 0,
                tax: prod.tax || 0.18,
                selectedVariant: item.variant
              };
            }
            if (item.productId) {
              return {
                productId: item.productId,
                productName: item.productName || "Producto",
                price: item.price || 0,
                cost: item.cost || 0,
                qty: item.qty || 1,
                discount: item.discount || 0,
                tax: item.tax || 0.18,
                selectedVariant: item.selectedVariant
              };
            }
            return null;
          }).filter(Boolean) as SaleItem[];
          if (mapped.length > 0) {
            setCart(mapped);
          }
          localStorage.removeItem("pos_pending_load_cart");
        }
      } catch (e) {
        console.error("Error parsing pos_pending_load_cart in useEffect", e);
      }
    }

    const pendingIsWeb = localStorage.getItem("pos_pending_is_web_order");
    if (pendingIsWeb === "true") {
      setIsWebOrder(true);
      setPaymentMethod("Pago Contra Entrega");
      localStorage.removeItem("pos_pending_is_web_order");
    }

    const pendingNotes = localStorage.getItem("pos_pending_load_notes");
    if (pendingNotes) {
      setNotes(pendingNotes);
      localStorage.removeItem("pos_pending_load_notes");
    }

    const pendingCustId = localStorage.getItem("pos_pending_load_customer");
    if (pendingCustId) {
      const found = customers.find(c => c.id === pendingCustId);
      if (found) {
        setSelectedCustomer(found);
        localStorage.removeItem("pos_pending_load_customer");
      }
    }
  }, [customers]);

  // Synchronize active table items into POS cart when activeTableId changes!
  useEffect(() => {
    if (activeTableId) {
      const table = restaurantTables.find(t => t.id === activeTableId);
      if (table) {
        // Load table items into POS cart
        const mappedItems: SaleItem[] = (table.items || []).map((it: any) => ({
          productId: it.productId || `prod_bistro_comanda_${Math.random().toString(36).substring(2, 6)}`,
          productName: it.productName,
          price: it.price,
          cost: it.cost || it.price * 0.40,
          qty: it.qty,
          discount: 0,
          tax: 0.18
        }));
        setCart(mappedItems);
        
        // Load associated customer
        if (table.customerId) {
          const cust = customers.find(c => c.id === table.customerId);
          setSelectedCustomer(cust || null);
        } else {
          setSelectedCustomer(null);
        }
        
        setNotes(table.notes || "");
      }
    } else {
      // Clear cart when leaving table mode
      if (prevActiveTableIdRef.current !== null) {
        setCart([]);
        setSelectedCustomer(null);
        setNotes("");
      }
    }
    prevActiveTableIdRef.current = activeTableId;
  }, [activeTableId]);

  // Real-time automatic saver: sync POS cart changes back to the active table order
  const saveCartToActiveTable = (currentCart: SaleItem[], currentCustomer: Customer | null, currentNotes: string) => {
    if (!activeTableId) return;
    
    const updated = restaurantTables.map(t => {
      if (t.id === activeTableId) {
        const mappedItems = currentCart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          cost: item.cost,
          qty: item.qty,
          discount: item.discount,
          tax: item.tax
        }));
        
        return {
          ...t,
          status: currentCart.length > 0 ? "occupied" : "free",
          items: mappedItems,
          customerId: currentCustomer?.id,
          notes: currentNotes
        };
      }
      return t;
    });
    
    onUpdateTables(updated);
  };

  useEffect(() => {
    if (activeTableId) {
      saveCartToActiveTable(cart, selectedCustomer, notes);
    }
  }, [cart, selectedCustomer, notes, activeTableId]);

  // Cash Session State
  const activeSession = cashSessions.find(
    (cs) => cs.companyId === activeCompany.id && cs.branchId === activeBranch.id && cs.status === "open"
  );
  const [initialFundInput, setInitialFundInput] = useState<string>("5000");
  const [cashFlowAmount, setCashFlowAmount] = useState<string>("");
  const [cashFlowDesc, setCashFlowDesc] = useState("");
  const [cashFlowType, setCashFlowType] = useState<'in' | 'out'>('out');
  const [showCashCloseModal, setShowCashCloseModal] = useState(false);
  const [showCashOpenModal, setShowCashOpenModal] = useState(false);
  const [showCashMoveModal, setShowCashMoveModal] = useState(false);
  const [closeFundInput, setCloseFundInput] = useState<string>("");

  // Strict Module Rule Validation State
  const [showRuleErrorModal, setShowRuleErrorModal] = useState<boolean>(false);
  const [ruleErrorModalMsg, setRuleErrorModalMsg] = useState<string>("");

  // Suspended Sales
  const [suspendedSales, setSuspendedSales] = useState<{ id: string; title: string; cart: SaleItem[]; customer: Customer | null; notes: string }[]>([]);
  const [suspendTitle, setSuspendTitle] = useState("");
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [isWebOrder, setIsWebOrder] = useState<boolean>(() => {
    return localStorage.getItem("pos_pending_is_web_order") === "true";
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    return localStorage.getItem("pos_pending_is_web_order") === "true" ? "Pago Contra Entrega" : "Efectivo";
  });
  const [cashPaid, setCashPaid] = useState<string>("");
  const [cardLast4, setCardLast4] = useState<string>("");
  const [splitCash, setSplitCash] = useState<string>("");
  const [splitCard, setSplitCard] = useState<string>("");
  
  // Redeem loyalty points / credit
  const [usePoints, setUsePoints] = useState(false);
  const [useCredit, setUseCredit] = useState(false);

  // Dominican Fiscal Sequence (NCF) - Default is NONE (Sin NCF, Opcional)
  const [ncfType, setNcfType] = useState<string>("NONE");
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Quote Conversion State
  const [loadedQuoteId, setLoadedQuoteId] = useState<string | null>(() => {
    return localStorage.getItem("pos_pending_load_quote_id");
  });

  // Ferretería Queue Pickup State
  const [showFerreteriaQueueModal, setShowFerreteriaQueueModal] = useState(false);
  const [loadedFerreteriaOrder, setLoadedFerreteriaOrder] = useState<FerreteriaOrder | null>(null);
  const [ferreteriaQueueSearch, setFerreteriaQueueSearch] = useState("");



  // STRICT ACTIVE MODULE RULES VALIDATION
  const validateActiveModuleRules = (): { valid: boolean; message?: string } => {
    const activeMods = activeCompany.activeModules || [];

    // 1. Control de Caja & Tesorería Rule
    const isCashControlActive = activeMods.includes("caja_avanzada") || activeMods.includes("pos");
    if (isCashControlActive) {
      if (!activeSession || activeSession.status !== "open") {
        return {
          valid: false,
          message: "🔴 VENTA BLOQUEADA POR REGLA DE CAJA: El módulo de Control de Caja está activo y NO existe una caja abierta en esta sucursal. Debe aperturar el turno de caja con su fondo inicial antes de realizar ventas."
        };
      }
    }

    // 2. Inventario & Stock Rule
    if (activeMods.includes("inventario") && activeCompany.settings?.preventNegativeStock) {
      for (const item of cart) {
        const prod = products.find((p) => p.id === item.productId);
        if (prod && prod.stock < item.qty) {
          return {
            valid: false,
            message: `❌ VENTA BLOQUEADA POR REGLA DE INVENTARIO: El producto "${item.productName}" solo cuenta con ${prod.stock} unidades en inventario (intentando vender ${item.qty}).`
          };
        }
      }
    }

    // 3. Comprobantes Fiscales NCF Rule
    if (activeMods.includes("facturacion_fiscal") || activeMods.includes("ncf")) {
      if (activeCompany.settings?.requireNcf && ncfType === "NONE") {
        return {
          valid: false,
          message: "❌ VENTA BLOQUEADA POR REGLA FISCAL: La empresa exige seleccionar un tipo de Comprobante Fiscal NCF (B01, B02, etc.) para cada factura."
        };
      }
      if ((ncfType === "B01" || ncfType === "E31") && (!selectedCustomer || !selectedCustomer.rncOrCedula || selectedCustomer.rncOrCedula.trim().length < 9)) {
        return {
          valid: false,
          message: "❌ VENTA BLOQUEADA POR REGLA FISCAL: Para comprobantes de Crédito Fiscal (B01 / e-CF E31), debe seleccionar un cliente que posea un RNC o Cédula registrado de al menos 9 dígitos."
        };
      }
    }

    // 4. Clientes & Crédito Rule
    if (activeMods.includes("clientes") && paymentMethod === "Crédito") {
      if (!selectedCustomer) {
        return {
          valid: false,
          message: "❌ VENTA BLOQUEADA POR REGLA DE CRÉDITO: Debe seleccionar un cliente registrado para realizar ventas a crédito."
        };
      }
      const grandTotal = getGrandTotal();
      const availableCredit = selectedCustomer.creditLimit - selectedCustomer.currentDebt;
      if (grandTotal > availableCredit) {
        return {
          valid: false,
          message: `❌ VENTA BLOQUEADA POR REGLA DE CRÉDITO: El total de la venta ($${grandTotal.toFixed(2)}) supera el crédito disponible del cliente ($${availableCredit.toFixed(2)}).`
        };
      }
    }

    return { valid: true };
  };

  const handleAttemptCheckout = () => {
    if (cart.length === 0) return;
    const ruleCheck = validateActiveModuleRules();
    if (!ruleCheck.valid) {
      setRuleErrorModalMsg(ruleCheck.message || "Acción restringida por regla de módulo activo.");
      setShowRuleErrorModal(true);
      return;
    }
    setCashPaid(getGrandTotal().toFixed(2));
    setShowCheckout(true);
  };

  // Specialized thermal printing helper for completed POS sales with solid black, high-contrast typography
  // Safe in-frame thermal printing (using hidden iframe to prevent white screen and popup blocker issues)
  const handlePrintCompletedReceipt = () => {
    const printContent = document.getElementById("thermal-ticket-layout")?.innerHTML;
    if (!printContent) return;

    let iframe = document.getElementById("silent-print-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "silent-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
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
            <title>Recibo de Pago - POS</title>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              html {
                width: 80mm;
                margin: 0;
                padding: 0;
                background: #fff;
              }
              body {
                box-sizing: border-box;
                font-family: "Courier New", Courier, monospace;
                width: 72mm;
                margin: 0 4mm;
                padding: 3mm 0;
                font-size: 10pt;
                line-height: 1.3;
                color: #000;
                background-color: #fff;
                -webkit-font-smoothing: none;
                text-rendering: geometricPrecision;
                print-color-adjust: economy;
                -webkit-print-color-adjust: economy;
              }
              *, *::before, *::after {
                box-sizing: border-box;
                max-width: 100%;
                overflow-wrap: anywhere;
                text-shadow: none !important;
                filter: none !important;
                transform: none !important;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .border-b { border-bottom: 1px dashed #000; }
              .border-t { border-top: 1px solid #000; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .py-2 { padding-top: 8px; padding-bottom: 8px; }
              .my-2 { margin-top: 8px; margin-bottom: 8px; }
              .space-y-1 > * + * { margin-top: 4px; }
              .flex { display: flex; min-width: 0; }
              .flex > * { min-width: 0; }
              .justify-between { justify-content: space-between; }
              .items-start { align-items: flex-start; }
              .gap-1 { gap: 4px; }
              .shrink-0 { flex-shrink: 0; }
              .max-w-\\[70\\%\\] { max-width: 70%; }
              .break-all { word-break: break-all; }
              .italic { font-style: italic; }
              .mt-1 { margin-top: 4px; }
              .mt-4 { margin-top: 16px; }
              .text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400, .text-sky-700, .text-rose-600 { 
                color: #000 !important; 
              }
              .bg-white { background-color: #fff; }
              .bg-slate-50 { background-color: #fff; border: 1px solid #000; padding: 6px; }
              .border-slate-200, .border-slate-300, .border-slate-100 { 
                border-color: #000 !important; 
              }
              .font-mono { 
                font-family: "Courier New", Courier, monospace;
                font-weight: 700;
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
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


  // Barcode Scanner States
  const [scanFeedback, setScanFeedback] = useState("");
  const [showScannerSim, setShowScannerSim] = useState(false);
  const [showShortcutsLegend, setShowShortcutsLegend] = useState(true);

  // Comprobante Fiscal Lookup Modal States
  const [showFiscalModal, setShowFiscalModal] = useState(false);
  const [fiscalRncInput, setFiscalRncInput] = useState("");
  const [selectedFiscalNcfType, setSelectedFiscalNcfType] = useState("B01");
  const [fiscalResultName, setFiscalResultName] = useState("");
  const [fiscalLookupStatus, setFiscalLookupStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [fiscalLookupActivity, setFiscalLookupActivity] = useState("");
  const [fiscalLookupAddress, setFiscalLookupAddress] = useState("");

  // Interactive Modals (replacing browser native confirm/prompt alerts)
  const [showConfirmCartReset, setShowConfirmCartReset] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Cash Close Denominations Breakdown & Close Receipt Ticket States
  const [denominations, setDenominations] = useState<Record<number, number>>({
    2000: 0, 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 25: 0, 10: 0, 5: 0, 1: 0
  });
  const [closedSessionSummary, setClosedSessionSummary] = useState<any | null>(null);



  const handleFiscalRncLookup = (rnc: string) => {
    const cleanRnc = rnc.trim();
    if (!cleanRnc) {
      setFiscalLookupStatus('idle');
      setFiscalResultName("");
      setFiscalLookupActivity("");
      setFiscalLookupAddress("");
      return;
    }
    setFiscalLookupStatus('searching');
    setTimeout(() => {
      const match = MOCK_RNC_DB[cleanRnc];
      if (match) {
        setFiscalResultName(match.name);
        setFiscalLookupActivity(match.activity);
        setFiscalLookupAddress(match.address);
        setFiscalLookupStatus('found');
      } else {
        setFiscalResultName(`Comercializadora RNC ${cleanRnc}`);
        setFiscalLookupActivity("Actividad Comercial No Especificada");
        setFiscalLookupAddress("República Dominicana");
        setFiscalLookupStatus('not_found');
      }
    }, 450);
  };

  // Decimal Weighable Scale Input
  const [weighingProduct, setWeighingProduct] = useState<Product | null>(null);
  const [scaleWeight, setScaleWeight] = useState<string>("1.50");

  // Keyboard Shortcuts implementation for quick sales and actions
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.tagName === "SELECT");

      // 1. ESC to close modals/reset
      if (e.key === "Escape") {
        setWeighingProduct(null);
        setShowCheckout(false);
        setShowFiscalModal(false);
        setCompletedSale(null);
        setShowCashCloseModal(false);
        setShowSuspendModal(false);
        setShowShortcutsLegend(false);
        setSearchQuery("");
        if (activeEl && "blur" in activeEl && typeof (activeEl as any).blur === "function") {
          (activeEl as HTMLElement).blur();
        }
        return;
      }

      // 2. F1: Toggle Shortcuts Guide Modal
      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcutsLegend((prev) => !prev);
        return;
      }

      // 3. F2: Focus Search / Barcode Input
      if (e.key === "F2") {
        e.preventDefault();
        const searchInput = document.getElementById("input-pos-product-search") as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 4. F3 or Alt + C: Focus Customer selection dropdown
      if (e.key === "F3" || (e.altKey && (e.key.toLowerCase() === "c" || e.code === "KeyC"))) {
        e.preventDefault();
        const customerSelect = document.getElementById("select-cart-customer") as HTMLSelectElement | null;
        if (customerSelect) {
          customerSelect.focus();
        }
        return;
      }

      // 5. F4: Open Fiscal NCF Comprobante lookup
      if (e.key === "F4") {
        e.preventDefault();
        const existingRnc = selectedCustomer?.rncOrCedula || "";
        setFiscalRncInput(existingRnc);
        setSelectedFiscalNcfType(["B01", "B14", "B15"].includes(ncfType) ? ncfType : "B01");
        setFiscalResultName(selectedCustomer?.rncOrCedula ? selectedCustomer.name : "");
        setFiscalLookupStatus(selectedCustomer?.rncOrCedula ? "found" : "idle");
        setFiscalLookupActivity("");
        setFiscalLookupAddress("");
        setShowFiscalModal(true);
        return;
      }

      // 6. F6 or Alt + D: Toggle / Cycle Cart Discount (0%, 5%, 10%, 15%)
      if (e.key === "F6" || (e.altKey && (e.key.toLowerCase() === "d" || e.code === "KeyD"))) {
        e.preventDefault();
        const discounts = [0, 5, 10, 15];
        const nextIdx = (discounts.indexOf(cartDiscount) + 1) % discounts.length;
        setCartDiscount(discounts[nextIdx]);
        return;
      }

      // 7. F7 or Alt + N: Focus / Add Order Notes
      if (e.key === "F7" || (e.altKey && (e.key.toLowerCase() === "n" || e.code === "KeyN"))) {
        e.preventDefault();
        const notesInput = document.getElementById("textarea-cart-notes") as HTMLTextAreaElement | null;
        if (notesInput) {
          notesInput.focus();
        } else {
          setShowNotesModal(true);
        }
        return;
      }

      // 8. F8 or Alt + A: Suspend Sale / Aparcar
      if (e.key === "F8" || (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA"))) {
        e.preventDefault();
        if (cart.length > 0) {
          setSuspendTitle("");
          setShowSuspendModal(true);
        }
        return;
      }

      // 9. F9: Proceed to Payment / Abrir Checkout
      if (e.key === "F9") {
        e.preventDefault();
        handleAttemptCheckout();
        return;
      }

      // 10. F10 or Enter in checkout / ticket: Confirm / Submit Payment
      if (e.key === "F10" || (e.key === "Enter" && showCheckout && activeEl?.tagName !== "TEXTAREA" && activeEl?.id !== "btn-cancel-checkout")) {
        if (showCheckout && cart.length > 0) {
          e.preventDefault();
          handleCheckoutSubmit();
          return;
        } else if (completedSale) {
          e.preventDefault();
          setCompletedSale(null);
          return;
        } else if (weighingProduct) {
          e.preventDefault();
          addWeighableToCart();
          return;
        }
      }

      // 11. Alt + B: Toggle Barcode Scanner box
      if (e.altKey && (e.key.toLowerCase() === "b" || e.code === "KeyB")) {
        e.preventDefault();
        setShowScannerSim((prev) => !prev);
        return;
      }

      // 12. Alt + V or Alt + L: Empty cart / Vaciar Carrito
      if (e.altKey && (e.key.toLowerCase() === "v" || e.code === "KeyV" || e.key.toLowerCase() === "l" || e.code === "KeyL")) {
        e.preventDefault();
        if (cart.length > 0) {
          setShowConfirmCartReset(true);
        }
        return;
      }


      // 13. Alt + R: Restore Suspended Sales
      if (e.altKey && (e.key.toLowerCase() === "r" || e.code === "KeyR")) {
        e.preventDefault();
        setShowSuspendModal(true);
        return;
      }

      // 14. Quick Cart Quantity adjustments (+, -, Delete) when not typing in text fields
      if (!isInputFocused && cart.length > 0 && !showCheckout && !completedSale && !weighingProduct) {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          const lastIdx = cart.length - 1;
          updateQty(lastIdx, cart[lastIdx].qty + 1);
          return;
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          const lastIdx = cart.length - 1;
          if (cart[lastIdx].qty > 1) {
            updateQty(lastIdx, cart[lastIdx].qty - 1);
          } else {
            removeCartItem(lastIdx);
          }
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          removeCartItem(cart.length - 1);
          return;
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    cart, 
    selectedCustomer, 
    ncfType, 
    showCheckout, 
    completedSale, 
    weighingProduct, 
    scaleWeight, 
    cashPaid, 
    cardLast4, 
    splitCash, 
    splitCard, 
    notes, 
    cartDiscount,
    activeCompany, 
    activeBranch, 
    currentUser, 
    isOnline
  ]);

  // Filter Categories
  const categories = React.useMemo(() => {
    let customCats: string[] = [];
    const saved = localStorage.getItem(`pos_categories_${activeCompany.id}`);
    if (saved) {
      try {
        customCats = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    if (!customCats || customCats.length === 0) {
      customCats = ["Abarrotes", "Bebidas", "Lácteos", "Carnes y Embutidos", "Frutas y Verduras", "Limpieza", "Ferretería", "Otros"];
    }
    const productCats = products
      .filter((p) => p.companyId === activeCompany.id)
      .map((p) => p.category)
      .filter(Boolean);
    const combined = Array.from(new Set([...customCats, ...productCats]));
    return ["Todos", ...combined];
  }, [activeCompany.id, products]);

  // Cart operations
  const addToCart = (product: Product, variantSelection?: string) => {
    // Check permission to sell
    if (currentUser.role === "Encargado de inventario") {
      setRuleErrorModalMsg("❌ ACCESO RESTRINGIDO: Su rol de Encargado de Inventario no dispone de permisos para facturar o efectuar ventas.");
      setShowRuleErrorModal(true);
      return;
    }


    if (product.isWeighable) {
      setWeighingProduct(product);
      setScaleWeight("1.50");
      return;
    }

    // Strict Rule: Inventory stock check if preventNegativeStock is enabled
    if (activeCompany.activeModules?.includes("inventario") && activeCompany.settings?.preventNegativeStock) {
      const existingInCart = cart.find(item => item.productId === product.id && item.selectedVariant === variantSelection);
      const currentQty = existingInCart ? existingInCart.qty : 0;
      if (currentQty + 1 > product.stock) {
        setRuleErrorModalMsg(`❌ VENTA BLOQUEADA POR REGLA DE INVENTARIO: El producto "${product.name}" solo dispone de ${product.stock} unidades en inventario.`);
        setShowRuleErrorModal(true);
        return;
      }
    }

    const itemTax = activeCompany.settings.defaultTaxRate;

    // Is there variant selection?
    const key = variantSelection ? `${product.id}-${variantSelection}` : product.id;
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.selectedVariant === variantSelection
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          cost: product.cost,
          qty: 1,
          discount: 0,
          tax: itemTax,
          selectedVariant: variantSelection
        }
      ]);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const code = searchQuery.trim();
      if (!code) {
        handleAttemptCheckout();
        return;
      }

      const exactMatch = products.find(
        (p) => 
          p.companyId === activeCompany.id && 
          p.price > 0 && 
          (p.barcode === code || p.sku.toLowerCase() === code.toLowerCase())
      );

      const matchedProduct = exactMatch || (filteredProducts.length > 0 ? filteredProducts[0] : null);

      if (matchedProduct) {
        addToCart(matchedProduct);
        setSearchQuery("");
        setScanFeedback(`¡Añadido: ${matchedProduct.name}!`);
        setTimeout(() => setScanFeedback(""), 2200);
        try {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.connect(gain);
          gain.connect(context.destination);
          osc.frequency.setValueAtTime(1046.5, context.currentTime);
          gain.gain.setValueAtTime(0.1, context.currentTime);
          osc.start();
          osc.stop(context.currentTime + 0.08);
        } catch (err) {
          // ignore
        }
      } else {
        setRuleErrorModalMsg(`❌ BÚSQUEDA SIN RESULTADOS: El producto o código de barras "${code}" no existe o no está registrado en el catálogo.`);
        setShowRuleErrorModal(true);
      }

    }
  };

  const addWeighableToCart = () => {
    if (!weighingProduct) return;
    const weight = parseFloat(scaleWeight) || 0;
    if (weight <= 0) return;

    const itemTax = activeCompany.settings.defaultTaxRate;
    
    setCart([
      ...cart,
      {
        productId: weighingProduct.id,
        productName: `${weighingProduct.name} (${weight} Lb)`,
        price: weighingProduct.price,
        cost: weighingProduct.cost,
        qty: weight,
        discount: 0,
        tax: itemTax
      }
    ]);

    onAddAudit(
      "Lectura de Balanza",
      `Producto pesable: ${weighingProduct.name}, peso medido: ${weight} Lb`
    );

    setWeighingProduct(null);
  };

  const updateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      const updated = cart.filter((_, i) => i !== index);
      setCart(updated);
    } else {
      const updated = [...cart];
      updated[index].qty = newQty;
      setCart(updated);
    }
  };

  const removeCartItem = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Calculations
  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const getTaxTotal = () => {
    return cart.reduce((sum, item) => {
      const itemSubtotal = item.price * item.qty;
      const discountAmount = itemSubtotal * (item.discount / 100);
      return sum + (itemSubtotal - discountAmount) * item.tax;
    }, 0);
  };

  const getBistroTip = () => {
    // Bistro has a 10% Propina Legal by Dominican law, but only for table/salon service.
    // When the sale is made directly from Venta Pos (no activeTableId), the 10% Propina Ley is not applied.
    if (activeCompany.id === "comp_bistro" && activeTableId) {
      return getSubtotal() * 0.10;
    }
    return 0;
  };

  const getDiscountTotal = () => {
    // Cart global discount + individual discounts
    const subtotal = getSubtotal();
    const globalDiscount = subtotal * (cartDiscount / 100);
    const individualDiscounts = cart.reduce((sum, item) => {
      return sum + (item.price * item.qty) * (item.discount / 100);
    }, 0);
    return globalDiscount + individualDiscounts;
  };

  const getGrandTotal = () => {
    const subtotal = getSubtotal();
    const discount = getDiscountTotal();
    const tax = getTaxTotal();
    const tip = getBistroTip();
    
    let total = subtotal - discount + tax + tip;
    
    // Redeem points discount (e.g. 1 point = 1 DOP/USD)
    if (usePoints && selectedCustomer) {
      const maxPointsDiscount = Math.min(selectedCustomer.points, total);
      total -= maxPointsDiscount;
    }

    // Subtract any registered partial payments (abonos) if we are in table mode
    if (activeTableId) {
      const activeTable = restaurantTables.find(t => t.id === activeTableId);
      if (activeTable && activeTable.abonos) {
        total -= activeTable.abonos;
      }
    }

    return Math.max(0, total);
  };

  // Open Cash Register
  const handleOpenCash = () => {
    const fund = parseFloat(initialFundInput) || 0;
    if (fund < 0) return;

    onOpenCashSession({
      id: "cs_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      userId: currentUser.id,
      userName: currentUser.name,
      openDate: new Date().toISOString(),
      initialFund: fund,
      cashIn: 0,
      cashOut: 0,
      status: "open",
      synced: isOnline
    });

    onAddAudit(
      "Apertura Caja",
      `Caja abierta por ${currentUser.name} con fondo inicial: $${fund.toFixed(2)}`
    );
  };

  // Cash In / Cash Out deposits
  const handleCashFlow = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cashFlowAmount) || 0;
    if (amount <= 0) return;

    onCashInSession(amount, cashFlowType);
    onAddAudit(
      cashFlowType === "in" ? "Depósito Caja" : "Retiro Caja",
      `${cashFlowType === "in" ? "Ingreso" : "Egreso"} de efectivo por $${amount.toFixed(2)}. Motivo: ${cashFlowDesc}`
    );

    setCashFlowAmount("");
    setCashFlowDesc("");
  };

  const getDenominationsTotal = (): number => {
    return Object.entries(denominations).reduce((sum: number, [denom, count]) => {
      const val = Number(denom);
      const cnt = Number(count) || 0;
      return sum + (val * cnt);
    }, 0);
  };


  const handlePrintCashCloseReceipt = () => {
    const printContent = document.getElementById("cash-close-ticket-layout")?.innerHTML;
    if (!printContent) return;

    let iframe = document.getElementById("silent-print-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "silent-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
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
            <title>Ticket de Arqueo y Cierre de Caja</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              html { width: 80mm; margin: 0; padding: 0; background: #fff; }
              body {
                box-sizing: border-box;
                font-family: "Courier New", Courier, monospace;
                width: 72mm;
                margin: 0 4mm;
                padding: 3mm 0;
                font-size: 10pt;
                line-height: 1.3;
                color: #000;
                background-color: #fff;
                -webkit-font-smoothing: none;
                text-rendering: geometricPrecision;
                print-color-adjust: economy;
                -webkit-print-color-adjust: economy;
              }
              *, *::before, *::after { box-sizing: border-box; max-width: 100%; overflow-wrap: anywhere; text-shadow: none !important; filter: none !important; transform: none !important; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .border-b { border-bottom: 1px dashed #000; }
              .border-t { border-top: 1px solid #000; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .space-y-1 > * + * { margin-top: 4px; }
              .flex { display: flex; min-width: 0; }
              .flex > * { min-width: 0; }
              .justify-between { justify-content: space-between; }
              .text-slate-700, .text-slate-600, .text-slate-500, .text-slate-400 { color: #000 !important; }
              .bg-white { background-color: #fff; }
              .font-mono { font-family: "Courier New", Courier, monospace; font-weight: 700; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
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

  // Close cash session
  const handleCloseCash = () => {
    if (!activeSession) return;
    const denomTotal = getDenominationsTotal();
    const manualAmount = parseFloat(closeFundInput) || 0;
    const finalAmount = denomTotal > 0 ? denomTotal : manualAmount;

    // Filter sales during this session for sales method summary breakdown
    const sessionSales = sales.filter(s => s.companyId === activeCompany.id && s.branchId === activeBranch.id);
    const cashSalesTotal = sessionSales.filter(s => s.paymentMethod === "Efectivo").reduce((a, b) => a + b.total, 0);
    const cardSalesTotal = sessionSales.filter(s => s.paymentMethod === "Tarjeta").reduce((a, b) => a + b.total, 0);
    const creditSalesTotal = sessionSales.filter(s => s.paymentMethod === "Crédito").reduce((a, b) => a + b.total, 0);
    const otherSalesTotal = sessionSales.filter(s => !["Efectivo", "Tarjeta", "Crédito"].includes(s.paymentMethod)).reduce((a, b) => a + b.total, 0);
    const totalSalesSum = cashSalesTotal + cardSalesTotal + creditSalesTotal + otherSalesTotal;

    const expected = activeSession.initialFund + activeSession.cashIn - activeSession.cashOut + cashSalesTotal;
    const diff = finalAmount - expected;

    onCloseCashSession(activeSession.id, finalAmount);

    onAddAudit(
      "Cierre Caja",
      `Caja cerrada por ${currentUser.name}. Esperado: $${expected.toFixed(2)}, Declarado: $${finalAmount.toFixed(2)}. Diferencia: $${diff.toFixed(2)}`
    );

    // Save summary object for ticket view
    setClosedSessionSummary({
      id: activeSession.id,
      cashierName: currentUser.name,
      companyName: activeCompany.name,
      branchName: activeBranch.name,
      openDate: activeSession.openDate,
      closeDate: new Date().toISOString(),
      initialFund: activeSession.initialFund,
      cashIn: activeSession.cashIn,
      cashOut: activeSession.cashOut,
      cashSalesTotal,
      cardSalesTotal,
      creditSalesTotal,
      otherSalesTotal,
      totalSalesSum,
      expectedCash: expected,
      declaredCash: finalAmount,
      difference: diff,
      denominations: { ...denominations }
    });

    setShowCashCloseModal(false);
    setCloseFundInput("");
  };


  // Suspend sale
  const handleSuspendSale = () => {
    if (cart.length === 0) return;
    const title = suspendTitle.trim() || `Ticket #${suspendedSales.length + 1}`;
    
    setSuspendedSales([
      ...suspendedSales,
      {
        id: "susp_" + Math.random().toString(36).slice(2, 9),
        title,
        cart,
        customer: selectedCustomer,
        notes
      }
    ]);

    onAddAudit(
      "Suspender Venta",
      `Venta suspendida bajo el nombre: "${title}"`
    );

    // clear register
    setCart([]);
    setSelectedCustomer(null);
    setCartDiscount(0);
    setNotes("");
    setSuspendTitle("");
    setShowSuspendModal(false);
  };

  // Recover suspended sale
  const handleRecoverSale = (item: any) => {
    setCart(item.cart);
    setSelectedCustomer(item.customer);
    setNotes(item.notes);
    setSuspendedSales(suspendedSales.filter((s) => s.id !== item.id));

    onAddAudit(
      "Recuperar Venta",
      `Se recuperó la venta suspendida: "${item.title}"`
    );
  };

  // NCF / eCF sequence helper
  const getNextNcf = (type: string) => {
    const fiscalSales = sales.filter(s => s.companyId === activeCompany.id && s.ncf?.startsWith(type));
    const nextSeq = fiscalSales.length + 1;
    if (type.startsWith("E")) {
      return `${type}${String(nextSeq).padStart(10, "0")}`;
    }
    return `${type}${String(nextSeq).padStart(8, "0")}`;
  };

  // Checkout submit
  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;

    // Strict Rule Check
    const ruleCheck = validateActiveModuleRules();
    if (!ruleCheck.valid) {
      setShowCheckout(false);
      setRuleErrorModalMsg(ruleCheck.message || "Acción restringida por regla de módulo activo.");
      setShowRuleErrorModal(true);
      return;
    }

    // If customer is required
    if (activeCompany.settings?.requireCustomer && !selectedCustomer) {
      setShowCheckout(false);
      setRuleErrorModalMsg("❌ REGLA DE FACTURACIÓN: Esta empresa requiere seleccionar o registrar un cliente antes de emitir la factura.");
      setShowRuleErrorModal(true);
      return;
    }

    const total = getGrandTotal();
    const discount = getDiscountTotal();
    const tax = getTaxTotal();
    const tip = getBistroTip();

    // Credit limit check
    if (paymentMethod === "Crédito") {
      if (!selectedCustomer) {
        setShowCheckout(false);
        setRuleErrorModalMsg("❌ REGLA DE CRÉDITO: Para realizar una venta a crédito debe seleccionar un cliente registrado.");
        setShowRuleErrorModal(true);
        return;
      }
      const remainingCredit = selectedCustomer.creditLimit - selectedCustomer.currentDebt;
      if (total > remainingCredit) {
        setShowCheckout(false);
        setRuleErrorModalMsg(`❌ REGLA DE CRÉDITO: Límite de crédito excedido. El total de la venta ($${total.toFixed(2)}) supera el crédito disponible del cliente ($${remainingCredit.toFixed(2)}).`);
        setShowRuleErrorModal(true);
        return;
      }
    }


    // Points updates
    let pointsRedeemed = 0;
    if (usePoints && selectedCustomer) {
      pointsRedeemed = Math.min(selectedCustomer.points, total);
      selectedCustomer.points -= pointsRedeemed;
    }

    // NCF number generation
    let assignedNcf: string | undefined;
    let assignedNcfType: string | undefined;
    if (ncfType !== "NONE") {
      assignedNcf = getNextNcf(ncfType);
      const ncfNames: Record<string, string> = {
        B01: "NCF Crédito Fiscal (B01)",
        B02: "NCF Consumo (B02)",
        B14: "NCF Regímenes Especiales (B14)",
        B15: "NCF Gubernamental (B15)",
        B04: "NCF Nota de Crédito (B04)",
        E31: "e-CF Crédito Fiscal Electrónico (E31)",
        E32: "e-CF Consumo Electrónico (E32)",
        E45: "e-CF Regímenes Especiales Electrónico (E45)",
        E47: "e-CF Gubernamental Electrónico (E47)"
      };
      assignedNcfType = ncfNames[ncfType] || "Comprobante Fiscal";
    }

    const newSale: Sale = {
      id: "sale_local_" + Math.random().toString(36).slice(2, 9),
      uuid: "sale_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      userId: currentUser.id,
      date: new Date().toISOString(),
      items: cart,
      total,
      discount,
      tax,
      tip,
      paymentMethod,
      paymentDetails: {
        cashPaid: paymentMethod === "Efectivo" ? parseFloat(cashPaid) || total : undefined,
        change: paymentMethod === "Efectivo" ? Math.max(0, (parseFloat(cashPaid) || total) - total) : undefined,
        cardLast4: paymentMethod === "Tarjeta" ? cardLast4 || "9999" : undefined,
        split: paymentMethod === "Dividido" ? {
          "Efectivo": parseFloat(splitCash) || 0,
          "Tarjeta": parseFloat(splitCard) || 0
        } : undefined
      },
      status: "completed",
      ncf: assignedNcf,
      ncfType: assignedNcfType,
      customerId: selectedCustomer?.id || loadedFerreteriaOrder?.customerId,
      customerName: selectedCustomer?.name || loadedFerreteriaOrder?.customerName,
      customerRnc: selectedCustomer?.rncOrCedula || loadedFerreteriaOrder?.customerRnc,
      notes: notes,
      synced: isOnline
    };

    onAddSale(newSale);

    const activePendingQuoteId = loadedQuoteId || localStorage.getItem("pos_pending_load_quote_id");
    if (activePendingQuoteId && onUpdateQuoteStatus) {
      onUpdateQuoteStatus(activePendingQuoteId, "facturada", newSale.id);
      setLoadedQuoteId(null);
      localStorage.removeItem("pos_pending_load_quote_id");
    }

    if (loadedFerreteriaOrder && onUpdateFerreteriaOrderStatus) {
      onUpdateFerreteriaOrderStatus(loadedFerreteriaOrder.id, "cobrada", newSale.id);
      setLoadedFerreteriaOrder(null);
    }


    // Sync cash income to active session
    if (activeSession && (paymentMethod === "Efectivo" || paymentMethod === "Dividido")) {
      const cashAmt = paymentMethod === "Efectivo" ? total : (parseFloat(splitCash) || 0);
      if (cashAmt > 0) {
        onCashInSession(cashAmt, 'in');
      }

    }

    onAddAudit(
      "Factura POS",
      `Venta completada por $${total.toFixed(2)} (${paymentMethod}). Comprobante: ${assignedNcf || "Ticket Simple"}`
    );

    // Save for printable ticket view
    setCompletedSale(newSale);

    // If we checked out an active table comanda, free and reset it!
    if (activeTableId) {
      const updatedTables = restaurantTables.map((t: any) => {
        if (t.id === activeTableId) {
          return { 
            ...t, 
            status: "free", 
            timeElapsed: "—", 
            items: [], 
            abonos: 0, 
            preCuentaPrinted: false, 
            customerId: undefined, 
            notes: "" 
          };
        }
        return t;
      });
      onUpdateTables(updatedTables);
      setActiveTableId(null);
      // Navigate back to Salon/Restaurant Map
      onNavigateToTab("restaurante");
    }

    // clear cart
    setCart([]);
    setSelectedCustomer(null);
    setCartDiscount(0);
    setNotes("");
    setUsePoints(false);
    setUseCredit(false);
    setCashPaid("");
    setCardLast4("");
    setSplitCash("");
    setSplitCard("");
    setIsWebOrder(false);
    setPaymentMethod("Efectivo");
    setShowCheckout(false);
  };

  // Filter products by company, search query and category
  const filteredProducts = products.filter((p) => {
    if (p.companyId !== activeCompany.id) return false;
    if (p.price === 0) return false; // Hide raw materials (price 0) from active catalog
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800" id="pos-module-root">
      {/* LEFT: PRODUCTS CATALOG */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4" id="pos-catalog-section">
        {/* CASH CONTROL MODULE STRICT STATUS BANNER */}
        {(activeCompany.activeModules?.includes("caja_avanzada") || activeCompany.activeModules?.includes("pos")) && (
          activeSession ? (
            <div className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-100 p-3 px-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl font-bold shadow-sm flex items-center justify-center">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-200">TURNO DE CAJA ABIERTO</span>
                    <span className="text-[10px] bg-emerald-900/80 border border-emerald-700/50 px-2 py-0.5 rounded-md font-mono text-emerald-300">
                      Usuario: {activeSession.userName || currentUser.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-300/90 font-medium flex items-center gap-3 mt-0.5">
                    <span>Fondo Inicial: <strong className="font-mono text-white">${activeSession.initialFund.toFixed(2)}</strong></span>
                    <span>Ventas/Ingresos: <strong className="font-mono text-white">${activeSession.cashIn.toFixed(2)}</strong></span>
                    <span>Egresos: <strong className="font-mono text-white">-${activeSession.cashOut.toFixed(2)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCashMoveModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ingreso / Egreso</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCashCloseModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Cerrar Caja</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-rose-950/85 border border-rose-500/40 text-rose-100 p-3.5 px-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-md flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-black uppercase tracking-wider text-rose-200">CAJA CERRADA — VENTAS DESHABILITADAS</span>
                  </div>
                  <p className="text-[11px] text-rose-300 mt-0.5">
                    Regla de Módulo Activo: Se requiere aperturar un turno de caja para procesar cobros y facturas en esta sucursal.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCashOpenModal(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-wide uppercase transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer border border-emerald-400/30"
                id="btn-open-cash-from-banner"
              >
                <Landmark className="w-4 h-4" />
                <span>Aperturar Caja Ahora</span>
              </button>
            </div>
          )
        )}
        {/* Keyboard Shortcuts Toolbar */}
        <div className="bg-slate-800 text-slate-100 p-2.5 px-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs border border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[11px] font-bold tracking-wide uppercase text-indigo-300">Modo Venta Rápida Activo</span>
                <span className="hidden md:inline text-[10px] text-slate-400">| Atajos de teclado listos para usar</span>
              </div>
              
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                {activeCompany.activeModules.includes("ferreteria") && (
                  <button
                    type="button"
                    onClick={() => setShowFerreteriaQueueModal(true)}
                    className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 border border-amber-400"
                  >
                    <Hammer className="w-3.5 h-3.5" />
                    <span>📥 Pedidos en Cola (Ferretería) ({ferreteriaOrders.filter(o => o.companyId === activeCompany.id && o.branchId === activeBranch.id && o.status === "pendiente_cobro").length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowShortcutsLegend(!showShortcutsLegend)}
                  className="text-[10px] bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/30 text-indigo-200 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>{showShortcutsLegend ? "Ocultar Guía" : "Ver Teclas Rápidas"}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${showShortcutsLegend ? "rotate-180" : ""}`} />
                </button>
              </div>

            </div>

            {showShortcutsLegend && (
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px] text-slate-300 font-medium animate-in slide-in-from-top-1 duration-150 shadow-inner">
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F1</kbd>
                  <span>Ver/Ocultar Guía</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F2</kbd>
                  <span>Buscar / Escáner</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F3 / Alt+C</kbd>
                  <span>Enfocar Cliente</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F4</kbd>
                  <span>Comprobante NCF</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F6 / Alt+D</kbd>
                  <span>Cambiar Descuento</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F7 / Alt+N</kbd>
                  <span>Notas del Pedido</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F8 / Alt+A</kbd>
                  <span>Aparcar Ticket</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F9 / Enter</kbd>
                  <span>Abrir Cobro</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">F10 / Enter</kbd>
                  <span>Confirmar Cobro</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">Esc</kbd>
                  <span>Cerrar Ventanas</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">Alt+V</kbd>
                  <span>Vaciar Carrito</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 text-white border-b-2 border-slate-700 rounded font-mono font-bold text-[9px] shadow-xs">+ / - / Del</kbd>
                  <span>Cantidad / Eliminar</span>
                </div>
              </div>
            )}

            {/* SEARCH AND CATEGORIES BAR */}
            <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/60 flex flex-col sm:flex-row gap-3">
              {/* Search bar */}
              <div className="relative flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar o Escanear código (Presione Enter)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-28 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                    id="input-pos-product-search"
                  />
                  {scanFeedback ? (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded-md font-bold animate-bounce">
                      {scanFeedback}
                    </div>
                  ) : (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-indigo-600 font-bold font-mono flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                      <Barcode className="w-3.5 h-3.5" />
                      <span>ESCÁNER LISTO</span>
                    </div>
                  )}
                </div>
                
                {/* Barcode scanner toggle */}
                <button
                  type="button"
                  onClick={() => setShowScannerSim(!showScannerSim)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    showScannerSim 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                  }`}
                  id="btn-toggle-scanner-sim"
                  title="Pistola de código de barras / Escáner de mano"
                >
                  <Barcode className="w-4 h-4" />
                  <span className="hidden md:inline">Lector Escáner</span>
                </button>
              </div>

              {/* Categories Scroll */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none" id="category-chips-scroll">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                    id={`btn-pos-category-${cat}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* SCANNER HELPER BOX */}
            {showScannerSim && (
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl space-y-3 animate-in slide-in-from-top duration-200" id="scanner-sim-box">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-indigo-600 animate-pulse" />
                      Lector de Código de Barras (Escáner de Mano USB/Bluetooth)
                    </h4>
                    <p className="text-[10.5px] text-indigo-700 font-medium mt-0.5">
                      Haga clic en el botón de cualquier producto a continuación para ingresar rápidamente la lectura del código de barras al carrito.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowScannerSim(false)} 
                    className="text-indigo-400 hover:text-indigo-600 font-bold text-sm cursor-pointer"
                  >
                    &times;
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {products
                    .filter((p) => p.companyId === activeCompany.id && p.price > 0)
                    .slice(0, 8)
                    .map((p) => (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          // Barcode scan event
                          const code = p.barcode || p.sku;
                          setSearchQuery(code);
                          setTimeout(() => {
                            addToCart(p);
                            setSearchQuery("");
                            setScanFeedback(`¡Escaneado: ${p.name}!`);
                            setTimeout(() => setScanFeedback(""), 2000);
                            try {
                              const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                              const osc = context.createOscillator();
                              const gain = context.createGain();
                              osc.connect(gain);
                              gain.connect(context.destination);
                              osc.frequency.setValueAtTime(1046.5, context.currentTime);
                              gain.gain.setValueAtTime(0.1, context.currentTime);
                              osc.start();
                              osc.stop(context.currentTime + 0.08);
                            } catch (err) {}
                          }, 150);
                        }}
                        className="bg-white border border-indigo-100 hover:border-indigo-400 p-2 rounded-xl text-center cursor-pointer transition-all hover:scale-97 active:scale-95 group text-xs flex flex-col justify-between h-20"
                      >
                        <div className="font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 text-[11px]">{p.name}</div>
                        <div className="font-mono text-[9px] text-indigo-500 font-semibold bg-indigo-50/50 py-0.5 rounded border border-indigo-50 mt-1">{p.barcode}</div>
                        <div className="text-[10px] text-indigo-600 font-black mt-1 flex items-center justify-center gap-1">
                          <Barcode className="w-3.5 h-3.5" />
                          <span>Gatillar</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* PRODUCT GRID */}
            <div className="flex-1 overflow-y-auto min-h-0" id="product-grid-container">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <AlertTriangle className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs">No se encontraron productos que coincidan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {filteredProducts.map((p) => {
                    // Check stock levels (total across all warehouses)
                    const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + (b as number), 0);
                    const isLowStock = totalStock <= p.minStock;

                    return (
                      <div
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="bg-white border border-slate-200/80 hover:border-indigo-500 rounded-2xl p-3 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                        id={`product-card-${p.id}`}
                      >
                        <div>
                          {p.image && (
                            <div className="w-full h-24 mb-2 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center">
                              <img src={p.image} alt={p.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform" />
                            </div>
                          )}
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[9px] font-bold text-slate-400 font-mono tracking-wider bg-slate-50 px-2 py-0.5 rounded-sm uppercase">
                              {p.category}
                            </span>
                            {isLowStock && p.price > 0 && (
                              <span className="text-[8px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-sm font-bold flex items-center gap-0.5 animate-pulse">
                                Stock Bajo
                              </span>
                            )}
                          </div>
                          
                          <h3 className="font-semibold text-xs text-slate-800 mt-2 leading-snug group-hover:text-indigo-600">
                            {p.name}
                          </h3>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] text-slate-400 font-medium">SKU: {p.sku}</div>
                            <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                              ${p.price.toFixed(2)}
                            </div>
                          </div>
                          <div className="w-7 h-7 bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 rounded-lg flex items-center justify-center transition-all">
                            {p.isWeighable ? <Scale className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: BILLING REGISTER & CART */}
          <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full shrink-0" id="pos-billing-section">
            {activeTableId && (
              <div className="bg-indigo-600 text-white p-3.5 space-y-2.5 border-b border-indigo-700 select-none animate-in slide-in-from-top duration-150">
                <div className="flex justify-between items-center gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-block w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping shrink-0"></span>
                    <span className="text-[11px] font-black uppercase tracking-wider truncate">
                      Mesa Activa: {restaurantTables.find((t: any) => t.id === activeTableId)?.tableName || "Mesa de Servicio"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Save comanda, clear POS active registry, and navigate back
                      setActiveTableId(null);
                      setCart([]);
                      setSelectedCustomer(null);
                      setNotes("");
                      onNavigateToTab("restaurante");
                    }}
                    className="text-[10px] bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold px-2 py-1 rounded-lg border border-indigo-500 cursor-pointer transition-colors shrink-0"
                  >
                    4. Cerrar Mesa & Volver
                  </button>
                </div>
                
                {/* Embedded comanda helpers inside POS */}
                <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                  <button
                    type="button"
                    onClick={() => {
                      const activeTable = restaurantTables.find((t: any) => t.id === activeTableId);
                      if (activeTable) {
                        const updated = restaurantTables.map((t: any) => t.id === activeTableId ? { ...t, status: "billing", preCuentaPrinted: true } : t);
                        onUpdateTables(updated);
                        alert(`Pre-Cuenta generada para la ${activeTable.tableName}. Proceda a imprimir el ticket térmico de cobro.`);
                      }
                    }}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white py-1 px-1.5 rounded-lg font-bold border border-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    5. Pre-Cuenta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const activeTable = restaurantTables.find((t: any) => t.id === activeTableId);
                      if (activeTable) {
                        const sub = activeTable.items.reduce((s: number, it: any) => s + (it.price * it.qty), 0);
                        const total = sub + (sub * 0.18) + (sub * 0.10);
                        const pending = total - (activeTable.abonos || 0);

                        const amtStr = prompt(`Ingrese el monto del abono para la ${activeTable.tableName} (Balance Pendiente: RD$ ${pending.toLocaleString()}):`);
                        const amt = parseFloat(amtStr || "") || 0;
                        if (amt <= 0) return;
                        if (amt > pending) {
                          alert("El abono no puede exceder el balance pendiente de la mesa.");
                          return;
                        }

                        const updated = restaurantTables.map((t: any) => {
                          if (t.id === activeTableId) {
                            const newAbonoSum = (t.abonos || 0) + amt;
                            return { ...t, abonos: newAbonoSum };
                          }
                          return t;
                        });
                        onUpdateTables(updated);
                        alert(`Abono de RD$ ${amt.toLocaleString()} registrado con éxito.`);
                      }
                    }}
                    className="bg-indigo-500 hover:bg-indigo-400 text-white py-1 px-1.5 rounded-lg font-bold border border-indigo-400 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    9. Abonar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("¿Está seguro de anular esta comanda de mesa? Se cancelarán todos los pedidos y se liberará la mesa.")) {
                        const updated = restaurantTables.map((t: any) => t.id === activeTableId ? { ...t, status: "free", items: [], abonos: 0, preCuentaPrinted: false } : t);
                        onUpdateTables(updated);
                        setActiveTableId(null);
                        setCart([]);
                        setSelectedCustomer(null);
                        setNotes("");
                        onNavigateToTab("restaurante");
                      }
                    }}
                    className="bg-rose-600 hover:bg-rose-700 text-white py-1 px-1.5 rounded-lg font-bold border border-rose-500 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    10. Anular Mesa
                  </button>
                </div>
              </div>
            )}

            {/* Selected Customer & Actions */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              {isWebOrder && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 flex items-center justify-between text-xs font-semibold text-indigo-900">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wider text-indigo-600">Pedido Web E-Commerce</span>
                      <span className="text-[10px] text-indigo-700">Cargado en carrito para facturar</span>
                    </div>
                  </div>
                  <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0">E-Commerce</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Detalles Factura</span>
                {suspendedSales.length > 0 && (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="text-[10px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
                    id="btn-trigger-suspend-drawer"
                  >
                    <Pause className="w-3 h-3" />
                    Suspendidas ({suspendedSales.length})
                  </button>
                )}
              </div>

              {/* Customer Selector */}
              <div className="space-y-1.5">
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const cust = customers.find((c) => c.id === e.target.value);
                    setSelectedCustomer(cust || null);
                    if (cust && cust.rncOrCedula) {
                      setNcfType("B01");
                    } else {
                      setNcfType("B02");
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 w-full focus:outline-hidden focus:border-indigo-500 font-medium cursor-pointer"
                  id="select-cart-customer"
                >
                  <option value="">Factura a Consumidor Final</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.rncOrCedula ? `(RNC: ${c.rncOrCedula})` : ""}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setNcfType("B02");
                    }}
                    className="w-full border border-slate-200 hover:bg-slate-50 text-slate-500 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all cursor-pointer text-center"
                    id="btn-pos-clear-customer"
                  >
                    Quitar Cliente
                  </button>
                )}
              </div>

              {/* Show selected customer metrics if fidelidad active */}
              {selectedCustomer && activeCompany.activeModules.includes("fidelizacion") && (
                <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-xs flex justify-between items-center text-emerald-800">
                  <div>
                    <span className="font-bold flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5 text-emerald-500" />
                      Fidelización: {selectedCustomer.points} pts
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">Categoría {selectedCustomer.tier}</span>
                  </div>
                  {selectedCustomer.points >= 50 && (
                    <button
                      onClick={() => setUsePoints(!usePoints)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                        usePoints 
                          ? "bg-emerald-600 text-white border-emerald-600" 
                          : "bg-white text-emerald-700 border-emerald-200"
                      }`}
                      id="btn-redeem-points"
                    >
                      {usePoints ? "Redimido!" : "Redimir Puntos"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* SHOPPING CART LIST */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" id="cart-list-container">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Receipt className="w-12 h-12 text-slate-200 mb-2 animate-bounce" />
                  <p className="text-xs">Su canasta está vacía.</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Haga clic en un producto para agregarlo.</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-start gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs relative group">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 leading-tight pr-5">{item.productName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        ${item.price.toFixed(2)} × {item.qty}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(index, item.qty - 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold font-mono">{item.qty}</span>
                      <button
                        onClick={() => updateQty(index, item.qty + 1)}
                        className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => removeCartItem(index)}
                        className="w-6 h-6 rounded-md bg-white text-rose-500 border border-slate-200 hover:bg-rose-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* CART TOTALS AND CHECKOUT */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3" id="cart-summary-totals">
              <div className="space-y-1.5 text-xs text-slate-500 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-800">${getSubtotal().toFixed(2)}</span>
                </div>
                {getDiscountTotal() > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Descuento Aplicado:</span>
                    <span className="font-mono">-${getDiscountTotal().toFixed(2)}</span>
                  </div>
                )}
                {usePoints && selectedCustomer && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Descuento de Puntos:</span>
                    <span className="font-mono">-${Math.min(selectedCustomer.points, getGrandTotal()).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>ITBIS (18% Impuesto):</span>
                  <span className="font-mono text-slate-800">${getTaxTotal().toFixed(2)}</span>
                </div>
                {activeCompany.id === "comp_bistro" && (
                  <div className="flex justify-between text-slate-600">
                    <span>Propina Legal (10%):</span>
                    <span className="font-mono">${getBistroTip().toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-900 font-bold border-t border-slate-200 pt-2.5">
                  <span>TOTAL A COBRAR:</span>
                  <span className="font-mono text-xl text-slate-950">${getGrandTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Global discount selector */}
              <div className="flex gap-2 text-xs">
                <div className="flex bg-slate-200 rounded-lg p-0.5 flex-1">
                  {[0, 5, 10, 15].map((d) => (
                    <button
                      key={d}
                      onClick={() => setCartDiscount(d)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold ${
                        cartDiscount === d ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      {d === 0 ? "Sin Dcto" : `${d}%`}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    setSuspendTitle("");
                    setShowSuspendModal(true);
                  }}
                  className="px-2.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-bold"
                  title="Aparcar Ticket / Suspender Venta"
                  id="btn-suspend-sale"
                >
                  Aparcar
                </button>
              </div>

              {!activeTableId ? (
                <button
                  onClick={handleAttemptCheckout}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  id="btn-checkout-trigger"
                >
                  <span>Proceder al Pago</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Real-time auto-saver already synced the cart items to the table!
                    setActiveTableId(null);
                    setCart([]);
                    setSelectedCustomer(null);
                    setNotes("");
                    onNavigateToTab("restaurante");
                    alert("Comanda de mesa guardada con éxito.");
                  }}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  id="btn-save-and-return-trigger"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Guardar Mesa & Volver</span>
                </button>
              )}
            </div>
          </div>

      {/* SCALE MODAL */}
      {weighingProduct && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="scale-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Scale className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Balanza Electrónica RS232/USB</h3>
                <p className="text-xs text-slate-500">Módulo de pesaje de precisión</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center mb-4">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Lectura de Balanza</div>
              <div className="text-3xl font-bold text-slate-950 font-mono tracking-wider flex justify-center items-baseline">
                <input
                  type="number"
                  step="0.05"
                  value={scaleWeight}
                  onChange={(e) => setScaleWeight(e.target.value)}
                  className="bg-transparent border-b border-slate-300 text-center w-28 text-3xl font-mono focus:outline-hidden font-bold"
                  autoFocus
                />
                <span className="text-base text-slate-500 ml-1">Lb</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Ingrese manualmente el peso simluando la balanza en el punto de venta.</p>
            </div>

            <div className="text-xs space-y-1 text-slate-600 mb-4 font-semibold">
              <div className="flex justify-between">
                <span>Producto:</span>
                <span className="text-slate-800">{weighingProduct.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Precio por Libra:</span>
                <span className="text-slate-800">${weighingProduct.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-900">
                <span>Total Estimado:</span>
                <span>${(weighingProduct.price * (parseFloat(scaleWeight) || 0)).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setWeighingProduct(null)}
                className="flex-1 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={addWeighableToCart}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Agregar Peso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: APARCAR / SUSPENDED TICKETS */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="suspend-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-1.5">
              <Pause className="w-5 h-5 text-sky-500" />
              Ventas Suspendidas / Tickets Guardados
            </h3>

            {/* List existing suspended */}
            {suspendedSales.length > 0 && (
              <div className="space-y-2 mb-5 max-h-48 overflow-y-auto pr-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Restaurar Ticket Pendiente</p>
                {suspendedSales.map((item) => (
                  <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{item.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {item.cart.length} productos • Cliente: {item.customer?.name || "Consumidor Final"}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleRecoverSale(item);
                        setShowSuspendModal(false);
                      }}
                      className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Recuperar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Suspend current cart */}
            {cart.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aparcar Carrito de Venta Actual</p>
                <input
                  type="text"
                  placeholder="Ej: Mesa 3, Juan en Espera, Pedido Teléfono..."
                  value={suspendTitle}
                  onChange={(e) => setSuspendTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2.5 focus:outline-hidden focus:border-sky-500"
                  id="input-suspend-title"
                />
                <button
                  onClick={handleSuspendSale}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  id="btn-confirm-suspend"
                >
                  Suspender Venta
                </button>
              </div>
            )}

            <button
              onClick={() => setShowSuspendModal(false)}
              className="mt-3 w-full py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
              id="btn-close-suspend-modal"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT PAYMENTS MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="checkout-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-sky-600 animate-bounce" />
              Procesar Cobro e Impuestos
            </h3>

            {/* Total Highlight */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl text-center mb-4">
              <div className="text-xs text-slate-400">Total Neto a Cobrar</div>
              <div className="text-2xl font-bold font-mono tracking-wider mt-0.5">
                ${getGrandTotal().toFixed(2)}
              </div>
            </div>

            {/* Dominican Fiscal Sequence Selector */}
            {true && (
              <div className="mb-4 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Régimen Fiscal / NCF (República Dominicana)</label>
                  <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded-full">NCF Opcional</span>
                </div>
                
                <select
                  value={ncfType}
                  onChange={(e) => {
                    const val = e.target.value;
                    const requiresRnc = ["B01", "B14", "B15", "E31", "E45", "E47"].includes(val);
                    if (requiresRnc && (!selectedCustomer || !selectedCustomer.rncOrCedula)) {
                      alert("Para emitir un comprobante de Crédito Fiscal, Régimen Especial o Gubernamental (B01, B14, B15, E31, E45, E47) debe asociar un cliente con RNC.");
                      return;
                    }
                    setNcfType(val);
                  }}
                  className="w-full bg-white border border-slate-200 rounded-lg text-xs p-2 font-semibold cursor-pointer focus:outline-hidden"
                  id="checkout-select-ncf-type"
                >
                  <option value="NONE">Ticket de Venta Simple (Sin NCF / Opcional)</option>
                  <optgroup label="Comprobantes Físicos (NCF)">
                    <option value="B02">B02 - Comprobante de Consumo</option>
                    <option value="B01">B01 - Crédito Fiscal (Requiere RNC)</option>
                    <option value="B14">B14 - Regímenes Especiales (Requiere RNC)</option>
                    <option value="B15">B15 - Gubernamental (Requiere RNC)</option>
                  </optgroup>
                  <optgroup label="Comprobantes Electrónicos (e-CF)">
                    <option value="E32">E32 - Consumo Electrónico</option>
                    <option value="E31">E31 - Crédito Fiscal Electrónico (Requiere RNC)</option>
                    <option value="E45">E45 - Regímenes Especiales Electrónico (Requiere RNC)</option>
                    <option value="E47">E47 - Gubernamental Electrónico (Requiere RNC)</option>
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    const existingRnc = selectedCustomer?.rncOrCedula || "";
                    setFiscalRncInput(existingRnc);
                    setSelectedFiscalNcfType(["B01", "B14", "B15", "E31", "E45", "E47"].includes(ncfType) ? ncfType : "E31");
                    setFiscalResultName(selectedCustomer?.rncOrCedula ? selectedCustomer.name : "");
                    setFiscalLookupStatus(selectedCustomer?.rncOrCedula ? "found" : "idle");
                    setFiscalLookupActivity("");
                    setFiscalLookupAddress("");
                    setShowFiscalModal(true);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/10"
                  id="btn-pos-fiscal-comprobante"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Configurar Comprobante Fiscal (RNC)</span>
                </button>

                {ncfType !== "NONE" && (
                  <div className="text-[10px] text-slate-500 flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-150 font-mono">
                    <span className="font-bold text-indigo-700">Comprobante Estimado:</span>
                    <span>{getNextNcf(ncfType)}</span>
                  </div>
                )}
                {selectedCustomer && (
                  <div className="bg-white px-2.5 py-1.5 rounded border border-slate-150 text-[10px] space-y-0.5">
                    <div className="flex justify-between text-slate-700 font-medium">
                      <span>Cliente:</span>
                      <span className="font-bold">{selectedCustomer.name}</span>
                    </div>
                    {selectedCustomer.rncOrCedula && (
                      <div className="flex justify-between text-emerald-600 font-bold font-mono">
                        <span>RNC/Cédula:</span>
                        <span>{selectedCustomer.rncOrCedula}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment Methods */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Método de Pago</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "Efectivo", name: "Efectivo", icon: Coins },
                  { id: "Tarjeta", name: "Tarjeta", icon: CreditCard },
                  { id: "Crédito", name: "Crédito POS", icon: FileText, disabled: !selectedCustomer || !activeCompany.activeModules.includes("clientes") },
                  { id: "Dividido", name: "Pago Combinado", icon: Layers },
                  ...(isWebOrder ? [{ id: "Pago Contra Entrega", name: "Pago Contra Entrega", icon: Truck }] : [])
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPaymentMethod(item.id)}
                      disabled={item.disabled}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        item.disabled ? "opacity-40 cursor-not-allowed bg-slate-50" : ""
                      } ${
                        paymentMethod === item.id 
                          ? "bg-sky-50 text-sky-600 border-sky-400 ring-1 ring-sky-400 font-bold" 
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                      id={`btn-payment-${item.id}`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="space-y-3 mb-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
              {paymentMethod === "Pago Contra Entrega" && (
                <div className="space-y-1.5 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                    <Truck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Pago Contra Entrega (E-Commerce)</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-snug">
                    Método exclusivo para pedidos Web. El cobro final se realizará al entregar el pedido en la dirección del cliente.
                  </p>
                </div>
              )}
              {paymentMethod === "Efectivo" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Efectivo Recibido</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      value={cashPaid}
                      onChange={(e) => setCashPaid(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-4 py-2 font-mono font-bold text-slate-900"
                      placeholder="0.00"
                    />
                  </div>
                  {parseFloat(cashPaid) > getGrandTotal() && (
                    <div className="flex justify-between items-center text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 px-2.5 py-1 rounded">
                      <span>Devuelta / Cambio:</span>
                      <span className="font-mono">${(parseFloat(cashPaid) - getGrandTotal()).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === "Tarjeta" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600">Últimos 4 Dígitos Tarjeta</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="xxxx"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-center font-mono font-bold"
                  />
                </div>
              )}

              {paymentMethod === "Dividido" && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Monto Efectivo</label>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Monto Tarjeta</label>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-mono"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "Crédito" && selectedCustomer && (
                <div className="text-xs space-y-1 text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <span className="text-slate-800">{selectedCustomer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Límite de Crédito:</span>
                    <span className="text-slate-800">${selectedCustomer.creditLimit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deuda Actual:</span>
                    <span className="text-rose-500">${selectedCustomer.currentDebt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold text-emerald-600">
                    <span>Límite Disponible:</span>
                    <span>${(selectedCustomer.creditLimit - selectedCustomer.currentDebt).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                id="btn-cancel-checkout"
              >
                Volver
              </button>
              <button
                onClick={handleCheckoutSubmit}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/10 cursor-pointer"
                id="btn-confirm-checkout"
              >
                Completar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED RECEIPT TICKET POPUP */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="receipt-modal">
          <div className="bg-slate-100 rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-slate-300 flex flex-col items-center">
            
            {/* The Ticket (thermal paper mockup) */}
            <div className="bg-white border border-slate-200 shadow-md p-5 rounded-md font-mono text-[10.5px] text-slate-700 w-full max-w-72 leading-relaxed" id="thermal-ticket-layout">
              <div className="text-center font-bold text-xs uppercase tracking-wider border-b border-dashed border-slate-300 pb-2.5 mb-2">
                {activeCompany.name}
                <div className="text-[9px] font-normal lowercase italic mt-0.5">rnc: 1-01-23456-7</div>
                <div className="text-[9px] font-medium uppercase text-slate-500 mt-1">{activeBranch.name}</div>
                <div className="text-[8px] font-normal text-slate-400 mt-0.5">{activeBranch.address}</div>
              </div>

              {completedSale.ncf && (
                <div className="bg-slate-50 border border-slate-200 p-1.5 rounded text-center mb-2 text-[9px] font-bold">
                  <div>RÉGIMEN FISCAL DOMINICANO</div>
                  <div className="text-sky-700 mt-0.5">NCF: {completedSale.ncf}</div>
                  <div className="text-slate-500 text-[8px] font-normal mt-0.5">{completedSale.ncfType}</div>
                </div>
              )}

              <div className="space-y-1 mb-2 pb-1.5 border-b border-dashed border-slate-300">
                <div>Fecha: {new Date(completedSale.date).toLocaleString()}</div>
                <div>Factura: {completedSale.id.replace("sale_local_", "LOCAL_")}</div>
                <div>Cajero: {currentUser.name}</div>
                {(completedSale.customerName || completedSale.customerRnc) && (
                  <div className="border-t border-slate-200 mt-1.5 pt-1.5 whitespace-pre-line text-[9px]">
                    <div><span className="font-bold">Razón Social:</span> {completedSale.customerName}</div>
                    {completedSale.customerRnc && (
                      <div><span className="font-bold">RNC / Cédula:</span> {completedSale.customerRnc}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5 mb-2 pb-1.5 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold text-[9px] text-slate-400 uppercase">
                  <span>Cant x Producto</span>
                  <span>Total</span>
                </div>
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-1">
                    <span className="max-w-[70%] break-all">
                      {item.qty} x {item.productName}
                    </span>
                    <span className="font-bold shrink-0">${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* totals breakdown */}
              <div className="space-y-1 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${completedSale.items.reduce((s, it) => s + (it.price*it.qty), 0).toFixed(2)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Descuento:</span>
                    <span>-${completedSale.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>ITBIS (18% Imp):</span>
                  <span>${completedSale.tax.toFixed(2)}</span>
                </div>
                {completedSale.tip !== undefined && completedSale.tip > 0 && (
                  <div className="flex justify-between">
                    <span>10% Propina Ley:</span>
                    <span>${completedSale.tip.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-slate-300">
                  <span>TOTAL FACTURADO:</span>
                  <span>${completedSale.total.toFixed(2)}</span>
                </div>
                <div className="text-[9px] text-slate-500 mt-1.5 font-medium">
                  Método Pago: {completedSale.paymentMethod}
                  {completedSale.paymentDetails?.change && ` (Entregó: $${completedSale.paymentDetails.cashPaid?.toFixed(2)} | Devuelta: $${completedSale.paymentDetails.change?.toFixed(2)})`}
                </div>
              </div>

              <div className="text-center italic mt-4 text-[8px] text-slate-400 border-t border-slate-100 pt-3 leading-snug">
                {activeCompany.settings.receiptMessage}
                <br />
                <span className="font-semibold text-slate-500 mt-1 block">Factura Electrónica Sincronizada en Cloud</span>
              </div>
            </div>

            {/* Print and Actions buttons */}
            <div className="flex flex-col gap-2 w-full max-w-72 mt-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintCompletedReceipt}
                  className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
                  id="btn-print-receipt"
                >
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>Imprimir Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = `Factura ${completedSale.id} - ${activeCompany.name}. Total: DOP$${completedSale.total.toFixed(2)}. ${completedSale.ncf ? `NCF: ${completedSale.ncf}` : ''}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 flex items-center justify-center gap-1 cursor-pointer shadow-md transition-all"
                  title="Compartir por WhatsApp"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCompletedSale(null);
                  setShowCheckout(false);
                  setCart([]);
                  setSelectedCustomer(null);
                  setCartDiscount(0);
                  setNotes("");
                  setCashPaid("");
                  setCardLast4("");
                  setSplitCash("");
                  setSplitCard("");
                  setIsWebOrder(false);
                  setPaymentMethod("Efectivo");
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 transition-all"
                id="btn-close-receipt"
              >
                <Check className="w-4 h-4" />
                <span>Iniciar Nueva Venta</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* CASH REGISTERS TURN CLOSE MODAL WITH DENOMINATIONS BREAKDOWN */}
      {showCashCloseModal && activeSession && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" id="cash-close-modal">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-fadeIn text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Arqueo y Cierre de Turno de Caja</h3>
                  <p className="text-[11px] text-slate-400">Reconciliación de efectivo por denominaciones</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashCloseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Expected Summary */}
            <div className="space-y-2 p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 font-medium">
              <div className="flex justify-between">
                <span>Fondo Inicial:</span>
                <span className="font-mono text-white font-bold">${activeSession.initialFund.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Ingresos Extra (+):</span>
                <span className="font-mono font-bold">+${activeSession.cashIn.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Retiros / Gastos (-):</span>
                <span className="font-mono font-bold">-${activeSession.cashOut.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-white text-sm">
                <span>Efectivo Esperado:</span>
                <span className="font-mono text-emerald-400">${(activeSession.initialFund + activeSession.cashIn - activeSession.cashOut).toFixed(2)}</span>
              </div>
            </div>

            {/* DENOMINATIONS GRID */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                Conteo de Billetes y Monedas (Desglose Físico)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs">
                {[2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1].map((val) => (
                  <div key={val} className="flex flex-col items-center bg-slate-900 border border-slate-800 p-2 rounded-xl">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {val >= 50 ? `BD$${val}` : `M$${val}`}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[val] || ""}
                      onChange={(e) => {
                        const count = parseInt(e.target.value) || 0;
                        setDenominations({ ...denominations, [val]: Math.max(0, count) });
                      }}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-800 text-center text-white font-mono font-extrabold rounded-lg py-1 mt-1 text-xs focus:outline-hidden focus:border-sky-500"
                    />
                    <span className="text-[9px] text-slate-500 font-mono mt-1">
                      =${((denominations[val] || 0) * val).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Declared vs Expected comparison */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Efectivo Arqueado:</span>
                <span className="text-base font-extrabold font-mono text-sky-400">
                  DOP ${getDenominationsTotal() > 0 ? getDenominationsTotal().toFixed(2) : (parseFloat(closeFundInput) || 0).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Diferencia:</span>
                {(() => {
                  const declared = getDenominationsTotal() > 0 ? getDenominationsTotal() : (parseFloat(closeFundInput) || 0);
                  const expected = activeSession.initialFund + activeSession.cashIn - activeSession.cashOut;
                  const diff = declared - expected;
                  return (
                    <span className={`text-xs font-mono font-bold ${diff < 0 ? 'text-rose-400' : diff > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {diff === 0 ? 'Cuadrado ($0.00)' : diff > 0 ? `+${diff.toFixed(2)} (Sobrante)` : `${diff.toFixed(2)} (Faltante)`}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCashCloseModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                id="btn-cancel-cash-close"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleCloseCash}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer flex items-center gap-2"
                id="btn-confirm-cash-close"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Imprimir Ticket Cierre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSED CASH SESSION TICKET RESUMEN MODAL */}
      {closedSessionSummary && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" id="closed-cash-summary-modal">
          <div className="bg-slate-100 rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-slate-300 flex flex-col items-center animate-fadeIn">
            
            {/* 80mm Thermal Ticket Print Layout */}
            <div className="bg-white border border-slate-200 shadow-md p-5 rounded-md font-mono text-[10.5px] text-slate-700 w-full max-w-72 leading-relaxed" id="cash-close-ticket-layout">
              <div className="text-center font-bold text-xs uppercase tracking-wider border-b border-dashed border-slate-300 pb-2 mb-2">
                {closedSessionSummary.companyName}
                <div className="text-[9px] font-medium uppercase text-slate-500 mt-0.5">{closedSessionSummary.branchName}</div>
                <div className="text-[10px] font-black text-rose-600 mt-1 uppercase">RESUMEN DE CIERRE DE CAJA</div>
              </div>

              <div className="space-y-1 mb-2 pb-2 border-b border-dashed border-slate-300 text-[9.5px]">
                <div>Turno ID: {closedSessionSummary.id}</div>
                <div>Cajero: {closedSessionSummary.cashierName}</div>
                <div>Apertura: {new Date(closedSessionSummary.openDate).toLocaleString()}</div>
                <div>Cierre: {new Date(closedSessionSummary.closeDate).toLocaleString()}</div>
              </div>

              <div className="space-y-1 mb-2 pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold uppercase text-[9px] text-slate-400">DESGLOSE DE OPERACIONES</div>
                <div className="flex justify-between"><span>Fondo Inicial:</span><span>${closedSessionSummary.initialFund.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ingresos Extra:</span><span>+${closedSessionSummary.cashIn.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Retiros / Gastos:</span><span>-${closedSessionSummary.cashOut.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Efectivo:</span><span>+${closedSessionSummary.cashSalesTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Tarjeta:</span><span>${closedSessionSummary.cardSalesTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Ventas Crédito:</span><span>${closedSessionSummary.creditSalesTotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
                  <span>TOTAL VENTAS:</span><span>${closedSessionSummary.totalSalesSum.toFixed(2)}</span>
                </div>
              </div>

              {/* Denominations breakdown */}
              <div className="space-y-1 mb-2 pb-2 border-b border-dashed border-slate-300">
                <div className="font-bold uppercase text-[9px] text-slate-400">DESGLOSE BILLETES Y MONEDAS</div>
                {Object.entries(closedSessionSummary.denominations || {})
                  .filter(([_, count]: any) => count > 0)
                  .map(([denom, count]: any) => (
                    <div key={denom} className="flex justify-between">
                      <span>{parseFloat(denom) >= 50 ? `Billete $${denom}` : `Moneda $${denom}`} x{count}:</span>
                      <span>${(parseFloat(denom) * count).toFixed(2)}</span>
                    </div>
                  ))}
              </div>

              {/* Reconciliation totals */}
              <div className="space-y-1 text-right border-t border-dashed border-slate-300 pt-2">
                <div className="flex justify-between">
                  <span>Efectivo Esperado:</span>
                  <span>${closedSessionSummary.expectedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Efectivo Declarado:</span>
                  <span>${closedSessionSummary.declaredCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>DIFERENCIA:</span>
                  <span className={closedSessionSummary.difference < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    ${closedSessionSummary.difference.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="text-center italic mt-4 text-[8px] text-slate-400 border-t border-slate-100 pt-2">
                Documento de Arqueo y Control Interno de Caja
              </div>
            </div>

            {/* Print and Actions buttons */}
            <div className="flex flex-col gap-2 w-full max-w-72 mt-4">
              <button
                type="button"
                onClick={handlePrintCashCloseReceipt}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                id="btn-print-cash-close-ticket"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Imprimir Ticket de Cierre</span>
              </button>

              <button
                type="button"
                onClick={() => setClosedSessionSummary(null)}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
                id="btn-close-cash-summary-modal"
              >
                <Check className="w-4 h-4" />
                <span>Aceptar y Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* COMPROBANTE FISCAL / CONSULTA RNC MODAL */}
      {showFiscalModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-60 p-4 text-slate-800" id="fiscal-comprobante-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Configuración de Comprobante Fiscal</h3>
                  <p className="text-[10px] text-slate-500">Consulte RNCs registrados en República Dominicana en tiempo real</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowFiscalModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Body Form */}
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              
              {/* NCF Type Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tipo de Comprobante (NCF/e-CF)</label>
                <select
                  value={selectedFiscalNcfType}
                  onChange={(e) => setSelectedFiscalNcfType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-3 py-2 w-full focus:outline-hidden focus:bg-white focus:border-indigo-500 font-semibold cursor-pointer"
                  id="modal-fiscal-ncf-type"
                >
                  <optgroup label="Comprobantes Electrónicos (e-CF)">
                    <option value="E32">E32 - Factura de Consumo Electrónica</option>
                    <option value="E31">E31 - Crédito Fiscal Electrónico (Deducción costos/gastos)</option>
                    <option value="E45">E45 - Regímenes Especiales Electrónico</option>
                    <option value="E47">E47 - Comprobante Gubernamental Electrónico</option>
                  </optgroup>
                  <optgroup label="Comprobantes Físicos (NCF)">
                    <option value="B02">B02 - Comprobante de Consumo (Consumidor Final)</option>
                    <option value="B01">B01 - Crédito Fiscal (Deducción costos/gastos)</option>
                    <option value="B14">B14 - Regímenes Especiales de Tributación</option>
                    <option value="B15">B15 - Comprobante Gubernamental</option>
                  </optgroup>
                </select>
              </div>

              {/* RNC Input with live query */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RNC / Cédula del Contribuyente</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="Ej. 130005341 o 101010101"
                      value={fiscalRncInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, ""); // Allow only digits
                        setFiscalRncInput(val);
                        if (val.length >= 9) {
                          handleFiscalRncLookup(val);
                        } else {
                          setFiscalLookupStatus('idle');
                          setFiscalResultName("");
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-500"
                      id="modal-fiscal-rnc-input"
                    />
                    {fiscalLookupStatus === 'searching' && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFiscalRncLookup(fiscalRncInput)}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Consultar</span>
                  </button>
                </div>
              </div>

              {/* Suggested RNC Buttons for easy demo */}
              <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">RNCs de Demostración (Clic para Cargar)</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { rnc: "130005341", label: "Claro" },
                    { rnc: "101111119", label: "Banco Popular" },
                    { rnc: "101013451", label: "Grupo Ramos" },
                    { rnc: "101010101", label: "Cervecería Nal." },
                    { rnc: "101001429", label: "Super Nacional" }
                  ].map((demo) => (
                    <button
                      key={demo.rnc}
                      type="button"
                      onClick={() => {
                        setFiscalRncInput(demo.rnc);
                        handleFiscalRncLookup(demo.rnc);
                      }}
                      className="bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 text-[10px] px-2 py-1 rounded-lg font-medium cursor-pointer transition-all"
                    >
                      {demo.label} ({demo.rnc})
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolved / Lookup status details */}
              <div className="min-h-16 flex flex-col justify-center">
                {fiscalLookupStatus === 'searching' && (
                  <p className="text-xs text-indigo-600 text-center font-medium animate-pulse">
                    Consultando base de datos DGII en tiempo real...
                  </p>
                )}

                {fiscalLookupStatus === 'found' && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-emerald-800 uppercase bg-emerald-100 px-1.5 py-0.5 rounded">RNC VALIDADO EN DGII</span>
                      <span className="text-[9px] text-emerald-600 font-mono font-bold">Activo</span>
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Nombre o Razón Social</label>
                      <input
                        type="text"
                        value={fiscalResultName}
                        onChange={(e) => setFiscalResultName(e.target.value)}
                        className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                    {fiscalLookupActivity && (
                      <p className="text-[9.5px] text-slate-600">
                        <strong className="text-emerald-800 font-bold">Actividad:</strong> {fiscalLookupActivity}
                      </p>
                    )}
                    {fiscalLookupAddress && (
                      <p className="text-[9.5px] text-slate-500 font-mono text-[9px]">
                        <strong className="text-emerald-800 font-bold">Dirección:</strong> {fiscalLookupAddress}
                      </p>
                    )}
                  </div>
                )}

                {fiscalLookupStatus === 'not_found' && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-amber-800 uppercase bg-amber-100 px-1.5 py-0.5 rounded">RNC MANUAL / NO REGISTRADO</span>
                      <span className="text-[9px] text-slate-400 font-mono font-bold">Emisión Directa</span>
                    </div>
                    <p className="text-[10px] text-amber-700 leading-snug">
                      El RNC <strong>{fiscalRncInput}</strong> no figura en los precargados. Puede digitar su nombre corporativo de manera manual para registrar la factura fiscal:
                    </p>
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase">Nombre o Razón Social *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Comercializadora Dominicana, S.R.L."
                        value={fiscalResultName}
                        onChange={(e) => setFiscalResultName(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {fiscalLookupStatus === 'idle' && (
                  <div className="text-center py-4 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    Ingrese un RNC de 9 o 11 dígitos para consultar en la base de datos de República Dominicana.
                  </div>
                )}
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowFiscalModal(false)}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!fiscalRncInput || !fiscalResultName.trim() || fiscalLookupStatus === 'searching'}
                onClick={() => {
                  const cleanRnc = fiscalRncInput.trim();
                  // Check if customer with this RNC already exists
                  let matchedCust = customers.find((c) => c.rncOrCedula === cleanRnc);
                  if (!matchedCust) {
                    // Create customer on-the-fly
                    const newCust: Customer = {
                      id: "cust_rnc_" + Math.random().toString(36).substring(2, 9),
                      companyId: activeCompany.id,
                      name: fiscalResultName.trim(),
                      rncOrCedula: cleanRnc,
                      email: `${cleanRnc}@contribuyente.gob.do`,
                      phone: "809-555-0199",
                      points: 0,
                      tier: "Bronce",
                      creditLimit: 50000,
                      currentDebt: 0,
                      synced: isOnline
                    };
                    onAddCustomer(newCust);
                    setSelectedCustomer(newCust);
                  } else {
                    // If matches, update selection
                    setSelectedCustomer(matchedCust);
                  }
                  
                  // Apply NCF Type
                  setNcfType(selectedFiscalNcfType);
                  setShowFiscalModal(false);
                  
                  onAddAudit(
                    "Configurar Fiscal",
                    `Se asoció comprobante fiscal tipo ${selectedFiscalNcfType} al cliente "${fiscalResultName.trim()}" (RNC: ${cleanRnc})`
                  );
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold shadow-md cursor-pointer text-center text-white ${
                  (!fiscalRncInput || !fiscalResultName.trim() || fiscalLookupStatus === 'searching')
                    ? "bg-slate-300 shadow-none cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10"
                }`}
              >
                Confirmar y Aplicar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CASH OPEN MODAL */}
      {showCashOpenModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-open-cash-session">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Aperturar Turno de Caja</h3>
                  <p className="text-[11px] text-slate-400">Regla Estricta: Obligatorio para realizar ventas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashOpenModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-2xl p-3.5 text-xs text-emerald-200 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>El módulo de Control de Caja está activo. Registre el monto inicial en efectivo para iniciar la jornada laboral.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                Fondo Inicial en Efectivo (DOP $) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={initialFundInput}
                  onChange={(e) => setInitialFundInput(e.target.value)}
                  placeholder="5000.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-emerald-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCashOpenModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const fund = parseFloat(initialFundInput) || 0;
                  const newSession: CashSession = {
                    id: "CS-" + Date.now().toString().slice(-6),
                    companyId: activeCompany.id,
                    branchId: activeBranch.id,
                    userId: currentUser.id,
                    userName: currentUser.name,
                    openDate: new Date().toISOString(),
                    initialFund: fund,
                    cashIn: 0,
                    cashOut: 0,
                    status: "open",
                    synced: true
                  };
                  onOpenCashSession(newSession);
                  setShowCashOpenModal(false);
                  onAddAudit("Apertura de Caja", `Caja aperturada exitosamente con fondo inicial de $${fund.toFixed(2)}`);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Aperturar Caja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASH MOVEMENT MODAL */}
      {showCashMoveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-cash-movement">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Registrar Movimiento de Caja</h3>
                  <p className="text-[11px] text-slate-400">Ingresos extra o Retiros / Gastos de caja</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashMoveModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCashFlowType('in')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  cashFlowType === 'in' 
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                + Ingreso (Depósito)
              </button>
              <button
                type="button"
                onClick={() => setCashFlowType('out')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  cashFlowType === 'out' 
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                - Egreso (Retiro / Gasto)
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Monto (DOP $) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={cashFlowAmount}
                  onChange={(e) => setCashFlowAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono font-bold focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Concepto / Justificación *
                </label>
                <input
                  type="text"
                  required
                  value={cashFlowDesc}
                  onChange={(e) => setCashFlowDesc(e.target.value)}
                  placeholder="Ej. Pago de suministros rápidos / Depósito adicional"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCashMoveModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!cashFlowAmount || parseFloat(cashFlowAmount) <= 0 || !cashFlowDesc.trim()}
                onClick={() => {
                  const amt = parseFloat(cashFlowAmount) || 0;
                  onCashInSession(amt, cashFlowType);
                  setShowCashMoveModal(false);
                  setCashFlowAmount("");
                  setCashFlowDesc("");
                  onAddAudit("Movimiento de Caja", `Movimiento de ${cashFlowType === 'in' ? 'Ingreso' : 'Egreso'} por $${amt.toFixed(2)}: ${cashFlowDesc.trim()}`);
                }}
                className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold transition-all shadow-lg cursor-pointer ${
                  cashFlowType === 'in' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                Guardar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRICT RULE ERROR MODAL */}
      {showRuleErrorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-rule-error">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-2xl text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Restricción de Módulo Activo</h3>
                <p className="text-[11px] text-rose-300/80">Regla de negocio estricta del sistema</p>
              </div>
            </div>

            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 text-xs text-rose-100 leading-relaxed font-medium shadow-inner">
              {ruleErrorModalMsg}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {ruleErrorModalMsg.includes("Control de Caja") && (
                <button
                  type="button"
                  onClick={() => {
                    setShowRuleErrorModal(false);
                    setShowCashOpenModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Landmark className="w-4 h-4" />
                  <span>Aperturar Turno Ahora</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowRuleErrorModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CART RESET VACIAR CARRITO MODAL */}
      {showConfirmCartReset && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-confirm-cart-reset">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Vaciar Carrito Actual</h3>
                <p className="text-[11px] text-slate-400">Confirmación de eliminación de artículos</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ¿Está seguro de limpiar y remover todos los <strong>{cart.length} productos</strong> agregados a la orden actual?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmCartReset(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setSelectedCustomer(null);
                  setCartDiscount(0);
                  setNotes("");
                  setLoadedFerreteriaOrder(null);
                  setIsWebOrder(false);
                  setPaymentMethod("Efectivo");
                  setShowConfirmCartReset(false);
                  onAddAudit("Vaciar Carrito", "Se limpiaron todos los productos del carrito actual");
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Sí, Vaciar Carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER NOTES MODAL */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-order-notes">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Observaciones del Pedido</h3>
                  <p className="text-[10px] text-slate-400">Notas para cocina, comanda o factura</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Sin cebolla, entregar en la puerta de servicio, factura a crédito..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500 resize-none font-sans"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowNotesModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FERRETERÍA QUEUE MODAL FOR CASHIER */}
      {activeCompany.activeModules.includes("ferreteria") && showFerreteriaQueueModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4" id="modal-ferreteria-queue">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl">
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Cola de Pre-Facturas Ferretería</h3>
                  <p className="text-xs text-slate-400">Seleccione la orden despachada por el vendedor para cobrar en caja</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFerreteriaQueueModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="search"
                  value={ferreteriaQueueSearch}
                  onChange={(event) => setFerreteriaQueueSearch(event.target.value)}
                  placeholder="Buscar por pedido, vendedor o cliente..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
              {ferreteriaOrders.filter(o => {
                const term = ferreteriaQueueSearch.trim().toLocaleLowerCase();
                return o.companyId === activeCompany.id &&
                  o.branchId === activeBranch.id &&
                  o.status === "pendiente_cobro" &&
                  (!term || o.orderName.toLocaleLowerCase().includes(term) || o.sellerName.toLocaleLowerCase().includes(term) || o.customerName.toLocaleLowerCase().includes(term));
              }).length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs font-semibold">
                  {ferreteriaQueueSearch ? "No hay órdenes que coincidan con la búsqueda." : "No hay órdenes de ferretería pendientes en esta caja."}
                </div>
              ) : (
                ferreteriaOrders.filter(o => {
                  const term = ferreteriaQueueSearch.trim().toLocaleLowerCase();
                  return o.companyId === activeCompany.id &&
                    o.branchId === activeBranch.id &&
                    o.status === "pendiente_cobro" &&
                    (!term || o.orderName.toLocaleLowerCase().includes(term) || o.sellerName.toLocaleLowerCase().includes(term) || o.customerName.toLocaleLowerCase().includes(term));
                }).map(order => (
                  <div key={order.id} className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-white text-xs truncate">{order.orderName}</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.5 rounded-full border border-amber-500/30">
                          {order.items.length} productos
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Vendedor: <span className="text-slate-200 font-semibold">{order.sellerName}</span> • Cliente: <span className="text-slate-200 font-semibold">{order.customerName}</span>
                      </div>
                      {order.notes && (
                        <div className="text-[10px] text-amber-400/90 italic mt-0.5 truncate">
                          Nota: {order.notes}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-mono font-black text-sm text-emerald-400">
                        ${order.total.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCart(order.items.map(item => ({ ...item })));
                          const foundCust = order.customerId ? customers.find(c => c.id === order.customerId) : undefined;
                          setSelectedCustomer(foundCust || null);
                          setNotes([`Pedido ferretería: ${order.orderName}`, order.notes].filter(Boolean).join(" | "));
                          setLoadedFerreteriaOrder(order);
                          setShowFerreteriaQueueModal(false);
                          onAddAudit(
                            "Cargar Orden Ferretería",
                            `Orden "${order.orderName}" cargada a la caja POS para cobrar.`
                          );
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        Cargar a Caja
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFerreteriaQueueModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
