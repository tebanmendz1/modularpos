import React, { useState, useEffect } from "react";
import { 
  Building2, UserCheck, ShieldAlert, Cpu, ShoppingCart, 
  Package, BarChart3, Users, Award, Wallet, Truck, 
  Utensils, ClipboardList, Settings, ChevronRight, Bot, 
  LogOut, Key, MapPin, Layers, Database, CalendarClock, 
  DollarSign, CheckCircle2, AlertTriangle, PlayCircle, Plus, Sparkles
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import LoginModule from "./components/LoginModule";
import OfflineIndicator from "./components/OfflineIndicator";
import PublicStorefront from "./components/PublicStorefront";
import PublicContractPage from "./components/PublicContractPage";
import BillingNoticeBanner from "./components/BillingNoticeBanner";

import { Company, User, Branch, Warehouse, Product, Sale, Customer, CashSession, AuditLog, SyncQueueItem, Supplier, PurchaseOrder, Expense, Employee, PlanType, isTabAllowedForUser, getAllowedTabsForUser, isDemoCompany, Quote, FerreteriaOrder } from "./types";

const POSModule = React.lazy(() => import("./components/POSModule"));
const InventoryModule = React.lazy(() => import("./components/InventoryModule"));
const ReportsModule = React.lazy(() => import("./components/ReportsModule"));
const LoyaltyModule = React.lazy(() => import("./components/LoyaltyModule"));
const CreditModule = React.lazy(() => import("./components/CreditModule"));
const RestaurantModule = React.lazy(() => import("./components/RestaurantModule"));
const ExpensesModule = React.lazy(() => import("./components/ExpensesModule"));
const PurchasesModule = React.lazy(() => import("./components/PurchasesModule"));
const QuotesModule = React.lazy(() => import("./components/QuotesModule"));
const FiscalModule = React.lazy(() => import("./components/FiscalModule"));
const PayrollModule = React.lazy(() => import("./components/PayrollModule"));
const DeliveryModule = React.lazy(() => import("./components/DeliveryModule"));
const IntegrationsModule = React.lazy(() => import("./components/IntegrationsModule"));
const AdminModule = React.lazy(() => import("./components/AdminModule"));
const CashAdvanceModule = React.lazy(() => import("./components/CashAdvanceModule"));
const FinancialReportsModule = React.lazy(() => import("./components/FinancialReportsModule"));
const ManufactureModule = React.lazy(() => import("./components/ManufactureModule"));
const ECommerceModule = React.lazy(() => import("./components/ECommerceModule"));
const SubscriptionsModule = React.lazy(() => import("./components/SubscriptionsModule"));
const SuperAdminModule = React.lazy(() => import("./components/SuperAdminModule"));
const AndroidMobileAppModule = React.lazy(() => import("./components/AndroidMobileAppModule"));
const AccountingModule = React.lazy(() => import("./components/AccountingModule"));
const FerreteriaModule = React.lazy(() => import("./components/FerreteriaModule"));





export default function App() {
  const publicContractMatch = window.location.pathname.match(/^\/contracts\/([^/]+)$/);
  if (publicContractMatch) return <PublicContractPage token={decodeURIComponent(publicContractMatch[1])} />;
  // Global States loaded from Server or LocalStorage
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [syncResults, setSyncResults] = useState<any[] | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSession[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Restaurant Shared Floor States
  const [restaurantTables, setRestaurantTables] = useState<any[]>(() => {
    const saved = localStorage.getItem("bistro_restaurant_tables_v3");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default below
      }
    }
    return [
      { id: "t1", tableName: "Mesa 1 (Terraza)", covers: 4, status: "occupied", timeElapsed: "45 min", items: [
        { productId: "prod_bistro_mofongo", productName: "Mofongo de Camarones", qty: 2, price: 650, cost: 260, tax: 0.18 },
        { productId: "prod_bistro_presidente", productName: "Presidente Grande Fria", qty: 3, price: 220, cost: 90, tax: 0.18 },
        { productId: "prod_bistro_agua", productName: "Agua Planeta Azul", qty: 2, price: 75, cost: 20, tax: 0.18 }
      ], payments: [], abonos: 0, preCuentaPrinted: false },
      { id: "t2", tableName: "Mesa 2 (Salón principal)", covers: 2, status: "free", timeElapsed: "—", items: [], payments: [], abonos: 0, preCuentaPrinted: false },
      { id: "t3", tableName: "Mesa 3 (VIP)", covers: 6, status: "occupied", timeElapsed: "1 hr 12 min", items: [
        { productId: "prod_bistro_ribeye", productName: "Corte Angus Ribeye 12oz", qty: 3, price: 1450, cost: 580, tax: 0.18 },
        { productId: "prod_bistro_vino", productName: "Botella Vino Tinto Rioja", qty: 1, price: 2800, cost: 1120, tax: 0.18 },
        { productId: "prod_bistro_tresleches", productName: "Postre Tres Leches de la Casa", qty: 3, price: 350, cost: 140, tax: 0.18 }
      ], payments: [], abonos: 0, preCuentaPrinted: false },
      { id: "t4", tableName: "Mesa 4 (Terraza)", covers: 2, status: "billing", timeElapsed: "55 min", items: [
        { productId: "prod_bistro_burger", productName: "Burger Bistro con Papas", qty: 2, price: 480, cost: 190, tax: 0.18 },
        { productId: "prod_bistro_mojito", productName: "Coctel Mojito Clásico", qty: 4, price: 320, cost: 120, tax: 0.18 }
      ], payments: [], abonos: 0, preCuentaPrinted: false },
      { id: "t5", tableName: "Mesa 5 (Salón principal)", covers: 4, status: "free", timeElapsed: "—", items: [], payments: [], abonos: 0, preCuentaPrinted: false },
      { id: "tb1", tableName: "Barra Asiento 1", covers: 1, status: "occupied", timeElapsed: "20 min", items: [
        { productId: "prod_bistro_tequila", productName: "Servicio de Tequila Patrón", qty: 2, price: 450, cost: 180, tax: 0.18 }
      ], payments: [], abonos: 0, preCuentaPrinted: false },
      { id: "tb2", tableName: "Barra Asiento 2", covers: 1, status: "free", timeElapsed: "—", items: [], payments: [], abonos: 0, preCuentaPrinted: false }
    ];
  });

  const [activeTableId, setActiveTableId] = useState<string | null>(null);

  // Persist restaurant tables
  useEffect(() => {
    localStorage.setItem("bistro_restaurant_tables_v3", JSON.stringify(restaurantTables));
  }, [restaurantTables]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState("pos");
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);

  // Customization config states
  const [allowOutOfStock, setAllowOutOfStock] = useState(false);
  const [requireCustomer, setRequireCustomer] = useState(false);
  const [receiptMessage, setReceiptMessage] = useState("");

  // Load Database State on Init
  useEffect(() => {
    const controller = new AbortController();
    const requestTimeout = window.setTimeout(() => controller.abort(), 8_000);
    const loadStartupCache = (): boolean => {
      const cached = localStorage.getItem("pos_db_backup");
      if (!cached) return false;
      try {
        const data = JSON.parse(cached);
        if (!Array.isArray(data.companies) || data.companies.length === 0) return false;
        const defaultComp = data.companies[0] as Company;
        const safeBranches = Array.isArray(data.branches) ? data.branches : [];
        setCompanies(data.companies);
        setBranches(safeBranches);
        setWarehouses(Array.isArray(data.warehouses) ? data.warehouses : []);
        setUsers(Array.isArray(data.users) ? data.users : []);
        setProducts(Array.isArray(data.products) ? data.products : []);
        setSales(Array.isArray(data.sales) ? data.sales : []);
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
        setCashSessions(Array.isArray(data.cashSessions) ? data.cashSessions : []);
        setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
        setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
        setPurchaseOrders(Array.isArray(data.purchaseOrders) ? data.purchaseOrders : []);
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        setEmployees(Array.isArray(data.employees) ? data.employees : []);
        setActiveCompany(defaultComp);
        setActiveBranch(safeBranches.find((branch: Branch) => branch.companyId === defaultComp.id) || safeBranches[0] || null);
        setCurrentUser(null);
        if (defaultComp.settings) {
          setAllowOutOfStock(Boolean(defaultComp.settings.allowOutOfStock));
          setRequireCustomer(Boolean(defaultComp.settings.requireCustomer));
          setReceiptMessage(defaultComp.settings.receiptMessage || "");
        }
        return true;
      } catch (cacheError) {
        console.warn("La copia local de inicio no es vÃ¡lida.", cacheError);
        localStorage.removeItem("pos_db_backup");
        return false;
      }
    };
    const initDb = async () => {
      try {
        // Read local offline sync queue
        const savedQueue = localStorage.getItem("pos_sync_queue");
        if (savedQueue) setSyncQueue(JSON.parse(savedQueue));

        // Do not block the interface while the cloud database wakes up.
        if (loadStartupCache()) {
          setIsOnline(false);
          setLoading(false);
        }

        const response = await fetch("/api/db", {
          cache: "no-store",
          signal: controller.signal
        });
        if (response.ok) {
          const data = await response.json();
          if (!Array.isArray(data.companies) || data.companies.length === 0) {
            throw new Error("La base de datos no contiene empresas vÃ¡lidas");
          }
          setCompanies(data.companies);
          setBranches(data.branches);
          setWarehouses(data.warehouses);
          setUsers(data.users);
          setProducts(data.products);
          setSales(data.sales);
          setCustomers(data.customers);
          setCashSessions(data.cashSessions);
          setAuditLogs(data.auditLogs);
          setSuppliers(data.suppliers || []);
          setPurchaseOrders(data.purchaseOrders || []);
          setExpenses(data.expenses || []);
          setEmployees(data.employees || []);

          const savedQuotes = localStorage.getItem("pos_quotes");
          if (savedQuotes) setQuotes(JSON.parse(savedQuotes));

          // Seed default choices
          const defaultComp = data.companies[0];
          setActiveCompany(defaultComp);
          
          const defaultBranch = data.branches.find((b: Branch) => b.companyId === defaultComp.id);
          setActiveBranch(defaultBranch);

          // Render login page first
          setCurrentUser(null);

          // Seed config variables
          if (defaultComp) {
            setAllowOutOfStock(defaultComp.settings.allowOutOfStock);
            setRequireCustomer(defaultComp.settings.requireCustomer);
            setReceiptMessage(defaultComp.settings.receiptMessage);
          }

          // Save local backup cache
          localStorage.setItem("pos_db_backup", JSON.stringify(data));
        } else {
          throw new Error("Conexión con servidor fallida");
        }
      } catch (err) {
        console.warn("Offline detectado en el inicio, cargando caché local.");
        setIsOnline(false);
        const cached = localStorage.getItem("pos_db_backup");
        if (cached) {
          const data = JSON.parse(cached);
          setCompanies(data.companies);
          setBranches(data.branches);
          setWarehouses(data.warehouses);
          setUsers(data.users);
          setProducts(data.products);
          setSales(data.sales);
          setCustomers(data.customers);
          setCashSessions(data.cashSessions);
          setAuditLogs(data.auditLogs);
          setSuppliers(data.suppliers || []);
          setPurchaseOrders(data.purchaseOrders || []);
          setExpenses(data.expenses || []);
          setEmployees(data.employees || []);

          const savedQuotes = localStorage.getItem("pos_quotes");
          if (savedQuotes) setQuotes(JSON.parse(savedQuotes));

          const defaultComp = data.companies[0];
          setActiveCompany(defaultComp);
          setActiveBranch(data.branches.find((b: Branch) => b.companyId === defaultComp.id));
          setCurrentUser(null);
        }
      } finally {
        window.clearTimeout(requestTimeout);
        setLoading(false);
      }
    };

    void initDb();
    return () => {
      window.clearTimeout(requestTimeout);
      controller.abort();
    };
  }, []);

  // Update active company settings bindings
  useEffect(() => {
    if (activeCompany) {
      setAllowOutOfStock(activeCompany.settings.allowOutOfStock);
      setRequireCustomer(activeCompany.settings.requireCustomer);
      setReceiptMessage(activeCompany.settings.receiptMessage);
    }
  }, [activeCompany]);

  // Real-time synchronization between Web Browser, Pake Desktop App, and multi-device sessions
  useEffect(() => {
    const syncDataWithServer = async () => {
      if (!isOnline) return;
      try {
        const res = await fetch(`/api/db?t=${Date.now()}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.users)) {
            if (Array.isArray(data.companies)) {
              setCompanies((prev) => (JSON.stringify(prev) !== JSON.stringify(data.companies) ? data.companies : prev));
              setActiveCompany((current) => current
                ? data.companies.find((company: Company) => company.id === current.id) || current
                : current
              );
            }
            setUsers((prev) => (JSON.stringify(prev) !== JSON.stringify(data.users) ? data.users : prev));
            if (Array.isArray(data.branches)) {
              setBranches((prev) => (JSON.stringify(prev) !== JSON.stringify(data.branches) ? data.branches : prev));
            }
            if (Array.isArray(data.warehouses)) {
              setWarehouses((prev) => (JSON.stringify(prev) !== JSON.stringify(data.warehouses) ? data.warehouses : prev));
            }
            if (Array.isArray(data.products)) {
              setProducts((prev) => (JSON.stringify(prev) !== JSON.stringify(data.products) ? data.products : prev));
            }
            if (Array.isArray(data.sales)) {
              setSales((prev) => (JSON.stringify(prev) !== JSON.stringify(data.sales) ? data.sales : prev));
            }
            localStorage.setItem("pos_db_backup", JSON.stringify(data));
          }
        }
      } catch (err) {
        console.warn("Real-time background sync notice:", err);
      }
    };

    // Poll every 4 seconds for instant cross-app synchronization (Browser <-> Pake Desktop App)
    const syncInterval = setInterval(syncDataWithServer, 4000);
    const handleFocus = () => syncDataWithServer();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [isOnline]);

  // Helper to persist current DB state to server
  const saveDbStateToServer = async (customState?: any) => {
    if (!isOnline) return;

    const stateToSave = {
      companies,
      branches,
      warehouses,
      users,
      products,
      sales,
      customers,
      cashSessions,
      auditLogs,
      suppliers,
      purchaseOrders,
      expenses,
      employees,
      ...customState
    };

    try {
      await fetch("/api/db/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stateToSave)
      });
      localStorage.setItem("pos_db_backup", JSON.stringify(stateToSave));
    } catch (err) {
      console.error("Error al persistir base de datos en el servidor", err);
    }
  };

  // Helper to add queue item offline
  const queueOfflineItem = (type: 'sale' | 'customer' | 'cash_session' | 'stock_adjust' | 'audit', data: any) => {
    const newItem: SyncQueueItem = {
      id: "queue_" + Math.random().toString(36).slice(2, 9),
      type,
      companyId: activeCompany?.id || "unknown",
      data,
      timestamp: Date.now()
    };
    const updatedQueue = [...syncQueue, newItem];
    setSyncQueue(updatedQueue);
    localStorage.setItem("pos_sync_queue", JSON.stringify(updatedQueue));
  };

  // TRIGGER SYNC DISPATCHER (Online reconnect)
  const triggerSync = async () => {
    if (syncQueue.length === 0 || isSyncing) return;
    setIsSyncing(true);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: syncQueue })
      });

      if (response.ok) {
        const data = await response.json();
        setSyncResults(data.results);

        // Clear local queue upon synchronization
        setSyncQueue([]);
        localStorage.removeItem("pos_sync_queue");

        // Reload fresh unified db from cloud
        const dbRes = await fetch("/api/db");
        if (dbRes.ok) {
          const freshDb = await dbRes.json();
          setCompanies(freshDb.companies);
          setBranches(freshDb.branches);
          setWarehouses(freshDb.warehouses);
          setUsers(freshDb.users);
          setProducts(freshDb.products);
          setSales(freshDb.sales);
          setCustomers(freshDb.customers);
          setCashSessions(freshDb.cashSessions);
          setAuditLogs(freshDb.auditLogs);
          setSuppliers(freshDb.suppliers || []);
          setPurchaseOrders(freshDb.purchaseOrders || []);
          setExpenses(freshDb.expenses || []);
          setEmployees(freshDb.employees || []);

          // keep current selects but refer to fresh objects
          if (activeCompany) setActiveCompany(freshDb.companies.find((c: any) => c.id === activeCompany.id));
          if (currentUser) setCurrentUser(freshDb.users.find((u: any) => u.id === currentUser.id));
          if (activeBranch) setActiveBranch(freshDb.branches.find((b: any) => b.id === activeBranch.id));

          localStorage.setItem("pos_db_backup", JSON.stringify(freshDb));
        }
      }
    } catch (err) {
      console.error("Fallo al procesar sincronización en el servidor", err);
      alert("No se pudo conectar al servidor de sincronización. Compruebe su conexión.");
    } finally {
      setIsSyncing(false);
    }
  };

  // AUDIT LOG LOGGER
  const handleAddAudit = (action: string, details: string, prev?: string, newVal?: string) => {
    const log: AuditLog = {
      id: "aud_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany?.id || "superadmin",
      userId: currentUser?.id || "guest",
      userName: currentUser?.name || "Terminal de Ventas",
      role: currentUser?.role || "Operador",
      date: new Date().toISOString(),
      action,
      details,
      synced: isOnline
    };

    const updatedLogs = [log, ...auditLogs];
    setAuditLogs(updatedLogs);

    if (isOnline) {
      saveDbStateToServer({
        companies, branches, warehouses, users, products, sales, customers, cashSessions,
        auditLogs: updatedLogs
      });
    } else {
      queueOfflineItem("audit", log);
    }
  };

  // ADD SALE (POS Transaction)
  const handleAddSale = (newSale: Sale) => {
    const updatedSales = [...sales, newSale];
    setSales(updatedSales);

    // Deduct stock levels locally
    const updatedProducts = products.map((p) => {
      const matchItem = newSale.items.find((item) => item.productId === p.id);
      if (matchItem && p.price > 0) {
        // deduct from branch warehouse
        const wh = warehouses.find((w) => w.branchId === newSale.branchId);
        const whId = wh ? wh.id : Object.keys(p.stock)[0] || "default";
        
        const nextStock = { ...p.stock };
        nextStock[whId] = Math.max(0, (nextStock[whId] || 0) - matchItem.qty);
        return { ...p, stock: nextStock };
      }
      return p;
    });
    setProducts(updatedProducts);

    // Deduct customer points or credit if active
    let updatedCustomers = [...customers];
    if (newSale.customerId) {
      updatedCustomers = customers.map((c) => {
        if (c.id === newSale.customerId) {
          let nextPoints = c.points;
          let nextDebt = c.currentDebt;

          // Points accumulation
          if (activeCompany?.activeModules.includes("fidelizacion")) {
            nextPoints += Math.floor(newSale.total / 100);
          }

          // Credit limits
          if (newSale.paymentMethod === "Crédito") {
            nextDebt += newSale.total;
          }

          return { ...c, points: nextPoints, currentDebt: nextDebt };
        }
        return c;
      });
      setCustomers(updatedCustomers);
    }

    if (isOnline) {
      saveDbStateToServer({
        companies, branches, warehouses, users,
        products: updatedProducts,
        sales: updatedSales,
        customers: updatedCustomers,
        cashSessions, auditLogs
      });
    } else {
      queueOfflineItem("sale", newSale);
    }
  };

  // REGISTER CUSTOMER
  const handleAddCustomer = (newCustomer: Customer) => {
    const updated = [...customers, newCustomer];
    setCustomers(updated);

    if (isOnline) {
      saveDbStateToServer({
        companies, branches, warehouses, users, products, sales,
        customers: updated,
        cashSessions, auditLogs
      });
    } else {
      queueOfflineItem("customer", newCustomer);
    }
  };

  // CASH SESSION SHIFT OPENING
  const handleOpenCashSession = (newSession: CashSession) => {
    const updated = [...cashSessions, newSession];
    setCashSessions(updated);

    if (isOnline) {
      saveDbStateToServer({
        companies, branches, warehouses, users, products, sales, customers,
        cashSessions: updated,
        auditLogs
      });
    } else {
      queueOfflineItem("cash_session", newSession);
    }
  };

  // CASH SESSION TURN CLOSING (ARQUEO)
  const handleCloseCashSession = (sessionId: string, closedFund: number) => {
    const updated = cashSessions.map((cs) => {
      if (cs.id === sessionId) {
        return {
          ...cs,
          status: "closed" as const,
          closeDate: new Date().toISOString(),
          closedFund,
          synced: isOnline
        };
      }
      return cs;
    });
    setCashSessions(updated);

    if (isOnline) {
      saveDbStateToServer({
        companies, branches, warehouses, users, products, sales, customers,
        cashSessions: updated,
        auditLogs
      });
    } else {
      const closingObj = updated.find((c) => c.id === sessionId);
      queueOfflineItem("cash_session", closingObj);
    }
  };

  // INTERNAL CASH FLOWS (Deposits/Withdrawals)
  const handleCashInSession = (amount: number, type: 'in' | 'out') => {
    const updated = cashSessions.map((cs) => {
      const activeSession = cs.companyId === activeCompany?.id && cs.branchId === activeBranch?.id && cs.status === "open";
      if (activeSession) {
        return {
          ...cs,
          cashIn: type === "in" ? cs.cashIn + amount : cs.cashIn,
          cashOut: type === "out" ? cs.cashOut + amount : cs.cashOut,
          synced: isOnline
        };
      }
      return cs;
    });

    setCashSessions(updated);
    if (isOnline) {
      saveDbStateToServer({
        companies, branches, warehouses, users, products, sales, customers,
        cashSessions: updated,
        auditLogs
      });
    }
  };

  // SUPERADMIN WORKSPACE: PLAN AND LICENSE MANAGER
  const handleToggleModule = (companyId: string, moduleName: string) => {
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        const hasModule = c.activeModules.includes(moduleName);
        const nextModules = hasModule
          ? c.activeModules.filter((m) => m !== moduleName)
          : [...c.activeModules, moduleName];

        handleAddAudit(
          "Licencia Módulo",
          `Módulo "${moduleName}" ${hasModule ? "desactivado" : "activado"} para la empresa ${c.name}`
        );

        return { ...c, activeModules: nextModules };
      }
      return c;
    });

    setCompanies(updatedCompanies);
    if (activeCompany?.id === companyId) {
      setActiveCompany(updatedCompanies.find((c) => c.id === companyId) || null);
    }

    if (isOnline) {
      saveDbStateToServer({
        forceServerSave: true,
        companies: updatedCompanies
      });
    }
  };

  const handleUpdateCompaniesList = (cList: Company[]) => {
    setCompanies(cList);
    setActiveCompany((current) => current
      ? cList.find((company) => company.id === current.id) || current
      : current
    );
    const cached = localStorage.getItem("pos_db_backup");
    if (cached) {
      try {
        localStorage.setItem("pos_db_backup", JSON.stringify({ ...JSON.parse(cached), companies: cList }));
      } catch {
        // A damaged cache must not block an already confirmed cloud update.
      }
    }
    if (isOnline) {
      saveDbStateToServer({
        forceServerSave: true,
        companies: cList
      });
    }
  };

  const handleUpdateProductsCatalog = (prods: Product[]) => {
    setProducts(prods);
    if (isOnline) {
      saveDbStateToServer({
        products: prods
      });
    }
  };

  const handleUpdateUsers = (uList: User[]) => {
    setUsers(uList);
    if (isOnline) {
      saveDbStateToServer({ users: uList });
    }
  };

  const handleUpdateBranches = (bList: Branch[]) => {
    setBranches(bList);
    if (isOnline) {
      saveDbStateToServer({ branches: bList });
    }
  };

  const handleUpdateWarehouses = (wList: Warehouse[]) => {
    setWarehouses(wList);
    if (isOnline) {
      saveDbStateToServer({ warehouses: wList });
    }
  };

  const handleUpdateCustomersList = (custs: Customer[]) => {
    setCustomers(custs);
    if (isOnline) {
      saveDbStateToServer({
        customers: custs
      });
    }
  };

  const handleUpdateSuppliersList = (sups: Supplier[]) => {
    setSuppliers(sups);
    if (isOnline) {
      saveDbStateToServer({ suppliers: sups });
    }
  };

  const handleUpdatePurchaseOrdersList = (posList: PurchaseOrder[]) => {
    setPurchaseOrders(posList);
    if (isOnline) {
      saveDbStateToServer({ purchaseOrders: posList });
    }
  };

  const handleUpdateExpensesList = (exps: Expense[]) => {
    setExpenses(exps);
    if (isOnline) {
      saveDbStateToServer({ expenses: exps });
    }
  };

  const handleUpdateEmployeesList = (empList: Employee[]) => {
    setEmployees(empList);
    if (isOnline) {
      saveDbStateToServer({ employees: empList });
    }
  };

  const handleUpdateQuotesList = (qts: Quote[]) => {
    setQuotes(qts);
    localStorage.setItem("pos_quotes", JSON.stringify(qts));
  };

  const handleUpdateQuoteStatus = (quoteId: string, status: "facturada" | "draft" | "approved" | "expired", saleId?: string) => {
    const updatedQuotes = quotes.map((q) => {
      if (q.id === quoteId) {
        return {
          ...q,
          status,
          convertedSaleId: saleId || q.convertedSaleId
        };
      }
      return q;
    });
    setQuotes(updatedQuotes);
    localStorage.setItem("pos_quotes", JSON.stringify(updatedQuotes));
  };

  const [ferreteriaOrders, setFerreteriaOrders] = useState<FerreteriaOrder[]>(() => {

    const saved = localStorage.getItem("pos_ferreteria_orders");
    return saved ? JSON.parse(saved) : [];
  });

  const handleAddFerreteriaOrder = (order: FerreteriaOrder) => {
    const updated = [order, ...ferreteriaOrders];
    setFerreteriaOrders(updated);
    localStorage.setItem("pos_ferreteria_orders", JSON.stringify(updated));
    if (isOnline) {
      saveDbStateToServer({ ferreteriaOrders: updated });
    }
  };

  const handleUpdateFerreteriaOrdersList = (orders: FerreteriaOrder[]) => {
    setFerreteriaOrders(orders);
    localStorage.setItem("pos_ferreteria_orders", JSON.stringify(orders));
    if (isOnline) {
      saveDbStateToServer({ ferreteriaOrders: orders });
    }
  };

  const handleUpdateFerreteriaOrderStatus = (orderId: string, status: "cobrada" | "cancelada", saleId?: string) => {
    const updated = ferreteriaOrders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          convertedSaleId: saleId || o.convertedSaleId
        };
      }
      return o;
    });
    setFerreteriaOrders(updated);
    localStorage.setItem("pos_ferreteria_orders", JSON.stringify(updated));
    if (isOnline) {
      saveDbStateToServer({ ferreteriaOrders: updated });
    }
  };


  // CUSTOMIZATION/CONFIG SAVE

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;

    const updatedCompanies = companies.map((c) => {
      if (c.id === activeCompany.id) {
        return {
          ...c,
          settings: {
            ...c.settings,
            allowOutOfStock,
            requireCustomer,
            receiptMessage
          }
        };
      }
      return c;
    });

    setCompanies(updatedCompanies);
    setActiveCompany(updatedCompanies.find((c) => c.id === activeCompany.id) || null);

    handleAddAudit(
      "Personalización",
      `Preferencias de facturación y tickets modificadas para ${activeCompany.name}.`
    );
  };



  const getInitials = (nameStr: string) => {
    if (!nameStr) return "U";
    return nameStr.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };


  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300">
        <Cpu className="w-12 h-12 text-sky-500 animate-spin mb-4" />
        <h3 className="font-bold text-sm tracking-widest uppercase">Inicializando Motor FacturaPOS Cloud</h3>
        <p className="text-xs text-slate-500 mt-1">Seeding database and credentials cache...</p>
      </div>
    );
  }

  // Standalone Public E-Commerce Storefront Route
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const storeParam = searchParams ? (searchParams.get("store") || searchParams.get("company")) : null;
  if (storeParam && companies.length > 0) {
    const targetComp = companies.find(c => c.id === storeParam) || activeCompany || companies[0];
    return (
      <PublicStorefront
        company={targetComp}
        products={products}
        isStandalone={true}
      />
    );
  }

  if (!currentUser || !activeCompany || !activeBranch) {
    const handleRegisterCompanyAndUser = (data: { companyName: string; userName: string; email: string; pin: string }) => {
      const newCompanyId = `comp_${Date.now()}`;
      const newCompany: Company = {
        id: newCompanyId,
        name: data.companyName,
        plan: PlanType.EMPRESARIAL,
        logo: "Building2",
        color: "#6366f1",
        activeModules: [
          "pos", "inventario", "reportes", "clientes", "compras", 
          "caja_avanzada", "gastos", "cotizaciones", "facturacion_fiscal", 
          "nomina", "integraciones", "restaurante", "fidelizacion"
        ],
        maxBranches: 5,
        maxUsers: 10,
        maxDevices: 10,
        settings: {
          allowOutOfStock: true,
          requireCustomer: false,
          defaultTaxRate: 0.18,
          receiptMessage: `¡Gracias por su compra en ${data.companyName}!`,
          currency: "DOP"
        }
      };

      const newBranch: Branch = {
        id: `br_${Date.now()}`,
        companyId: newCompanyId,
        name: `${data.companyName} Central`,
        address: "Oficina Principal"
      };

      const newWarehouse: Warehouse = {
        id: `wh_${Date.now()}`,
        branchId: newBranch.id,
        name: "Almacén Principal"
      };

      const newUser: User = {
        id: `usr_${Date.now()}`,
        companyId: newCompanyId,
        name: data.userName,
        email: data.email || `${data.userName.toLowerCase().replace(/\s+/g, '')}@domain.com`,
        role: "Propietario",
        pin: data.pin,
        permissions: ["all"]
      };

      const updatedCompanies = [...companies, newCompany];
      const updatedBranches = [...branches, newBranch];
      const updatedWarehouses = [...warehouses, newWarehouse];
      const updatedUsers = [...users, newUser];

      setCompanies(updatedCompanies);
      setBranches(updatedBranches);
      setWarehouses(updatedWarehouses);
      setUsers(updatedUsers);

      setActiveCompany(newCompany);
      setActiveBranch(newBranch);
      setCurrentUser(newUser);

      // Force instant sync to server DB so company exists across Pake desktop and Web
      saveDbStateToServer({
        forceServerSave: true,
        companies: updatedCompanies,
        branches: updatedBranches,
        warehouses: updatedWarehouses,
        users: updatedUsers
      });


      const allowed = getAllowedTabsForUser(newUser, newCompany);
      setActiveTab(allowed[0] || "pos");


      if (isOnline) {
        saveDbStateToServer({
          companies: updatedCompanies,
          branches: updatedBranches,
          warehouses: updatedWarehouses,
          users: updatedUsers,
          products, sales, customers, cashSessions, auditLogs
        });
      }

      handleAddAudit("Registro de Cuenta", `Empresa "${newCompany.name}" y usuario Propietario "${newUser.name}" registrados con éxito.`);
    };

    const handleUpdateUserPin = (userId: string, newPin: string) => {
      const updatedUsers = users.map((u) => u.id === userId ? { ...u, pin: newPin } : u);
      setUsers(updatedUsers);

      if (currentUser && currentUser.id === userId) {
        setCurrentUser({ ...currentUser, pin: newPin });
      }

      if (isOnline) {
        saveDbStateToServer({
          companies,
          branches,
          warehouses,
          users: updatedUsers,
          products, sales, customers, cashSessions, auditLogs
        });
      }

      const targetUser = users.find(u => u.id === userId);
      handleAddAudit("Recuperación de PIN", `El usuario "${targetUser?.name || userId}" restableció/cambió su PIN de seguridad de 6 dígitos.`);
    };

    return (
      <LoginModule
        companies={companies}
        users={users}
        branches={branches}
        onLoginSuccess={(user, company, branch) => {
          setActiveCompany(company);
          setActiveBranch(branch);
          setCurrentUser(user);
          const allowed = getAllowedTabsForUser(user, company);
          if (allowed.length > 0) {
            setActiveTab(allowed[0]);
          } else {
            setActiveTab("pos");
          }
          handleAddAudit("Login", `Inicio de sesión exitoso para ${user.name} (${user.role})`);
        }}

        onRegisterCompanyAndUser={handleRegisterCompanyAndUser}
        onUpdateUserPin={handleUpdateUserPin}
      />
    );
  }

  return (
    <React.Suspense fallback={(
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-slate-300">
        <Cpu className="w-10 h-10 text-sky-500 animate-spin mb-3" />
        <p className="text-xs font-bold uppercase tracking-widest">Abriendo mÃ³dulo...</p>
      </div>
    )}>
    <div className="h-screen w-screen overflow-hidden bg-slate-900 flex font-sans" id="applet-viewport">
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <Sidebar
        companies={companies}
        activeCompany={activeCompany}
        setActiveCompany={setActiveCompany}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        activeBranch={activeBranch}
        setActiveBranch={setActiveBranch}
        users={users}
        branches={branches}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSuperAdminMode={isSuperAdminMode}
        setIsSuperAdminMode={setIsSuperAdminMode}
      />

      {/* CORE WORKSPACE VIEW */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-100" id="main-contents-region">
        
        {/* HEADER TOOLBAR */}
        <header className="h-14 bg-indigo-950 text-white flex items-center justify-between px-5 shadow-sm shrink-0 border-b border-indigo-900" id="header-toolbar">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-xs shrink-0">
              <div className="w-4 h-4 rounded-xs" style={{ backgroundColor: activeCompany.color }}></div>
            </div>
            <div>
              <h1 className="text-xs font-black leading-none tracking-tight text-white uppercase">
                {activeCompany.name} <span className="text-indigo-300 font-normal ml-1.5 text-[10px] lowercase">v2.3</span>
              </h1>
              <p className="text-[9px] text-indigo-200 font-medium uppercase tracking-wider mt-1">
                Sucursal: {activeBranch.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ONLINE OFFLINE STATUS INTEGRATED */}
            <OfflineIndicator
              isOnline={isOnline}
              setIsOnline={setIsOnline}
              syncQueue={syncQueue}
              triggerSync={triggerSync}
              isSyncing={isSyncing}
              syncResults={syncResults}
              clearResults={() => setSyncResults(null)}
            />

            <div className="flex items-center gap-3 border-l border-indigo-800 pl-4">
              <div className="text-right">
                <p className="text-[11px] font-bold leading-none text-white">{currentUser.name}</p>
                <p className="text-[9px] text-indigo-300 mt-0.5 font-medium">Rol: {currentUser.role}</p>
              </div>
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center border border-indigo-400 font-black text-xs text-white shadow-xs">
                {getInitials(currentUser.name)}
              </div>
              <button
                type="button"
                onClick={() => {
                  handleAddAudit("Logout", `Cierre de sesión del usuario ${currentUser.name}`);
                  setCurrentUser(null);
                }}
                className="bg-indigo-800/80 hover:bg-rose-600 text-indigo-200 hover:text-white p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold ml-1 shadow-xs"
                title="Cerrar Sesión"
                id="btn-header-logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </header>
        <BillingNoticeBanner companyId={activeCompany.id} userId={currentUser.id} />

        {/* DEMO MODE NOTICE BANNER */}
        {isDemoCompany(activeCompany.id) && (
          <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs shrink-0 border-b border-amber-600 animate-fadeIn" id="demo-mode-notice-banner">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-950 shrink-0" />
              <span>
                <strong>Modo Demostración Activo:</strong> Estás utilizando una cuenta demo para explorar el sistema. Toda modificación o prueba realizada en esta empresa se restablece automáticamente cada 24 horas.
              </span>
            </div>
            <span className="bg-amber-950 text-amber-100 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black shrink-0 hidden md:inline">
              Solo Prueba
            </span>
          </div>
        )}


        {/* ACTIVE TABS DISPATCH PANEL */}
        <div className="flex-1 flex overflow-hidden min-h-0" id="viewport-workspace-active">
          
          {!isTabAllowedForUser(activeTab, currentUser, activeCompany) ? (
            <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-8 text-center" id="access-denied-view">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs border border-rose-100">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Acceso Restringido - Permisos Insuficientes</h2>
              <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                El usuario <strong>{currentUser.name}</strong> con rol <strong className="text-slate-700">{currentUser.role}</strong> no dispone de permisos para acceder a la sección <strong className="text-indigo-600">"{activeTab}"</strong> en <strong>{activeCompany.name}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  const allowed = getAllowedTabsForUser(currentUser, activeCompany);
                  setActiveTab(allowed[0] || "pos");
                }}
                className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Ir a mi Módulo Principal Autorizado</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>

          {activeTab === "pos" && (
            <POSModule
              activeCompany={activeCompany}
              currentUser={currentUser}
              activeBranch={activeBranch}
              products={products}
              customers={customers}
              cashSessions={cashSessions}
              sales={sales}
              onAddSale={handleAddSale}
              onAddCustomer={handleAddCustomer}
              onUpdateProducts={handleUpdateProductsCatalog}
              onAddAudit={handleAddAudit}
              onOpenCashSession={handleOpenCashSession}
              onCloseCashSession={handleCloseCashSession}
              onCashInSession={handleCashInSession}
              isOnline={isOnline}
              restaurantTables={restaurantTables}
              onUpdateTables={setRestaurantTables}
              activeTableId={activeTableId}
              setActiveTableId={setActiveTableId}
              onNavigateToTab={setActiveTab}
              onUpdateQuoteStatus={handleUpdateQuoteStatus}
              ferreteriaOrders={ferreteriaOrders}
              onUpdateFerreteriaOrderStatus={handleUpdateFerreteriaOrderStatus}
            />
          )}

          {/* TAB: DESPACHO FERRETERÍA */}
          {activeTab === "ferreteria" && (
            <FerreteriaModule
              activeCompany={activeCompany}
              currentUser={currentUser}
              activeBranch={activeBranch}
              products={products}
              customers={customers}
              ferreteriaOrders={ferreteriaOrders}
              onAddFerreteriaOrder={handleAddFerreteriaOrder}
              onUpdateFerreteriaOrders={handleUpdateFerreteriaOrdersList}
              onAddCustomer={handleAddCustomer}
              onAddAudit={handleAddAudit}
              onNavigateToPOS={() => setActiveTab("pos")}
            />
          )}


          {/* TAB: STOCK & CATALOG MANAGER */}
          {activeTab === "inventario" && (
            <InventoryModule
              activeCompany={activeCompany}
              activeBranch={activeBranch}
              products={products}
              warehouses={warehouses}
              onUpdateProducts={handleUpdateProductsCatalog}
              onAddAudit={handleAddAudit}
              isOnline={isOnline}
              currentUser={currentUser}
            />
          )}

          {/* TAB: RESTAURANT TABLE COMMANDS */}
          {activeTab === "restaurante" && (
            <RestaurantModule
              activeCompany={activeCompany}
              onSetCartItems={(items) => {
                localStorage.setItem("pos_pending_load_cart", JSON.stringify(items));
              }}
              onNavigateToPOS={() => setActiveTab("pos")}
              onAddAudit={handleAddAudit}
              restaurantTables={restaurantTables}
              onUpdateTables={setRestaurantTables}
              activeTableId={activeTableId}
              setActiveTableId={setActiveTableId}
              onNavigateToTab={setActiveTab}
              customers={customers}
              onAddSale={handleAddSale}
              currentUser={currentUser}
              activeBranch={activeBranch}
              sales={sales}
            />
          )}

          {/* TAB: CUSTOMER LOYALTY */}
          {activeTab === "fidelizacion" && (
            <LoyaltyModule
              activeCompany={activeCompany}
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onAddAudit={handleAddAudit}
              isOnline={isOnline}
            />
          )}

          {/* TAB: CUSTOMER CREDIT & ACCOUNTS RECEIVABLES */}
          {activeTab === "clientes" && (
            <CreditModule
              activeCompany={activeCompany}
              customers={customers}
              onUpdateCustomers={handleUpdateCustomersList}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: ANALYTICAL REPORTS */}
          {activeTab === "reportes" && (
            <ReportsModule
              activeCompany={activeCompany}
              sales={sales}
              products={products}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: GASTOS */}
          {activeTab === "gastos" && (
            <ExpensesModule
              activeCompany={activeCompany}
              activeBranch={activeBranch}
              expenses={expenses}
              cashSessions={cashSessions}
              onUpdateExpenses={handleUpdateExpensesList}
              onCashOutSession={handleCashInSession}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: COMPRAS Y PROVEEDORES */}
          {activeTab === "compras" && (
            <PurchasesModule
              activeCompany={activeCompany}
              activeBranch={activeBranch}
              products={products}
              warehouses={warehouses}
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              onUpdateSuppliers={handleUpdateSuppliersList}
              onUpdatePurchaseOrders={handleUpdatePurchaseOrdersList}
              onUpdateProducts={handleUpdateProductsCatalog}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: COTIZACIONES */}
          {activeTab === "cotizaciones" && (
            <QuotesModule
              activeCompany={activeCompany}
              activeBranch={activeBranch}
              products={products}
              customers={customers}
              quotes={quotes}
              onUpdateQuotes={handleUpdateQuotesList}
              onNavigateToPOS={() => setActiveTab("pos")}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: FACTURACION FISCAL / NCF */}
          {activeTab === "ncf" && activeCompany && activeBranch && (
            <FiscalModule
              activeCompany={activeCompany}
              activeBranch={activeBranch}
              sales={sales}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: NOMINA Y PERSONAL */}
          {activeTab === "nomina" && activeCompany && (
            <PayrollModule
              activeCompany={activeCompany}
              employees={employees}
              sales={sales}
              onUpdateEmployees={handleUpdateEmployeesList}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: DELIVERY LOGISTICS */}
          {activeTab === "delivery" && activeCompany && activeBranch && (
            <DeliveryModule
              activeCompany={activeCompany}
              activeBranch={activeBranch}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: INTEGRACIONES */}
          {activeTab === "integraciones" && activeCompany && (
            <IntegrationsModule
              activeCompany={activeCompany}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: TENANT ADMINISTRATION & PERMISSIONS SUITE */}
          {activeTab === "config" && (
            <AdminModule
              activeCompany={activeCompany}
              users={users}
              branches={branches}
              warehouses={warehouses}
              auditLogs={auditLogs}
              onUpdateUsers={handleUpdateUsers}
              onUpdateBranches={handleUpdateBranches}
              onUpdateWarehouses={handleUpdateWarehouses}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: ADVANCED TREASURY & FUND RECONCILIATIONS */}
          {activeTab === "caja_avanzada" && activeCompany && activeBranch && (
            <CashAdvanceModule
              activeCompany={activeCompany}
              currentUser={currentUser}
              activeBranch={activeBranch}
              branches={branches}
              cashSessions={cashSessions}
              sales={sales}
              onOpenCashSession={handleOpenCashSession}
              onCloseCashSession={handleCloseCashSession}
              onCashInSession={handleCashInSession}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: FINANCIAL REPORTS (PROFIT/LOSS & COGS) */}
          {activeTab === "reportes_financieros" && (
            <FinancialReportsModule
              activeCompany={activeCompany}
              sales={sales}
              expenses={expenses}
              products={products}
            />
          )}

          {/* TAB: MANUFACTURING & RECIPE BOM PROCESSOR */}
          {activeTab === "manufactura" && (
            <ManufactureModule
              activeCompany={activeCompany}
              products={products}
              warehouses={warehouses}
              onUpdateProducts={handleUpdateProductsCatalog}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: ECOMMERCE QUEUE & CATALOG SYNCHRONIZER */}
          {activeTab === "ecommerce" && (
            <ECommerceModule
              activeCompany={activeCompany}
              products={products}
              customers={customers}
              onAddSale={handleAddSale}
              onAddAudit={handleAddAudit}
              onNavigateToPOS={() => setActiveTab("pos")}
            />
          )}

          {/* TAB: SUBSCRIPTIONS & PERIODIC MEMBERSHIPS */}
          {activeTab === "suscripciones" && (
            <SubscriptionsModule
              activeCompany={activeCompany}
              currentUser={currentUser}
              customers={customers}
              onAddSale={handleAddSale}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: CONTABILIDAD GENERAL & PARTIDA DOBLE */}
          {activeTab === "contabilidad" && (
            <AccountingModule
              activeCompany={activeCompany}
              currentUser={currentUser}
              activeBranch={activeBranch}
              sales={sales}
              expenses={expenses}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: ANDROID MOBILE APP & REST API CONNECTOR */}
          {activeTab === "android_app" && (
            <AndroidMobileAppModule
              activeCompany={activeCompany}
              currentUser={currentUser}
              activeBranch={activeBranch}
              products={products}
              customers={customers}
              sales={sales}
              expenses={expenses}
              onAddSale={handleAddSale}
              onAddExpense={(newExp) => {
                setExpenses((prev) => [...prev, newExp]);
                if (isOnline) saveDbStateToServer({ expenses: [...expenses, newExp] });
              }}
              onUpdateProductStock={(productId, newStock) => {
                const updated = products.map((p) => {
                  if (p.id === productId) {
                    return { ...p, stock: { ...p.stock, [activeBranch.id]: newStock } };
                  }
                  return p;
                });
                setProducts(updated);
                if (isOnline) saveDbStateToServer({ products: updated });
              }}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: SUPERADMIN - LICENSE, MULTI-TENANTS MODULE MANAGER */}
          {activeTab === "superadmin" && (
            <SuperAdminModule
              companies={companies}
              onUpdateCompanies={handleUpdateCompaniesList}

              users={users}
              onUpdateUsers={handleUpdateUsers}
              branches={branches}
              onUpdateBranches={handleUpdateBranches}
              warehouses={warehouses}
              onUpdateWarehouses={handleUpdateWarehouses}
              sales={sales}
              onAddSale={handleAddSale}
              products={products}
              onUpdateProducts={handleUpdateProductsCatalog}
              customers={customers}
              currentUserId={currentUser.id}
              onAddAudit={handleAddAudit}
            />
          )}

          {/* TAB: SUPERADMIN - GLOBAL AUDIT LOGS */}
          {activeTab === "global_audit" && (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-800 space-y-6" id="audit-viewport">
              <div>
                <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600 animate-bounce" />
                  Consola de Auditoría Global (Cripto-Audit Logs)
                </h2>
                <p className="text-xs text-slate-500 mt-1">Bitácora central inmutable de eventos operacionales del POS: Arqueos de caja, lecturas de balanzas pesables y registros fiscales.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Fecha / Hora</th>
                        <th className="p-3">Empresa</th>
                        <th className="p-3">Operador</th>
                        <th className="p-3">Acción Registrada</th>
                        <th className="p-3">Detalle Técnico</th>
                        <th className="p-3 text-center">Canal Sync</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">Sin eventos de auditoría registrados en este turno.</td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono text-[10.5px] text-slate-400">
                              {new Date(log.date).toLocaleString()}
                            </td>
                            <td className="p-3 font-bold uppercase text-slate-600">
                              {companies.find((c) => c.id === log.companyId)?.name || "SuperAdmin"}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">{log.userName}</div>
                              <span className="text-[10px] text-slate-400 uppercase font-bold">{log.role}</span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded text-[10.5px] font-bold">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 text-slate-600 leading-relaxed font-mono text-[10.5px]">{log.details}</td>
                            <td className="p-3 text-center">
                              {log.synced ? (
                                <span className="text-emerald-600 font-bold">Cloud</span>
                              ) : (
                                <span className="text-amber-600 font-bold animate-pulse">Local Offline</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
            </>
          )}

        </div>

        
        {/* FOOTER STATUS BAR */}
        <footer className="h-8 bg-slate-800 text-slate-400 text-[10px] px-4 flex items-center justify-between shrink-0 border-t border-slate-700" id="footer-status-bar">
          <div className="flex gap-4">
            <span>Terminal: <strong className="text-slate-200">POS-001</strong></span>
            <span className="border-l border-slate-700 pl-4 uppercase font-bold tracking-wider text-[9px]">Licencia: <strong className="text-slate-200">Plan {activeCompany.plan}</strong> (Activa)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`}></span>
              <span className="font-medium">Internet: {isOnline ? "Estable" : "Offline / Sin Conexión"}</span>
            </div>
            <span className="border-l border-slate-700 pl-4 font-mono text-[9px]">v2.3.1 - build 0092</span>
          </div>
        </footer>

      </div>
    </div>
    </React.Suspense>
  );
}
