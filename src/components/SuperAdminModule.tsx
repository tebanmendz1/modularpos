import React, { useState } from "react";
import { 
  Building2, Users, FileText, Plus, Check, X, ChevronRight, 
  Trash2, Coins, Calendar, Hash, MapPin, Warehouse, 
  UserPlus, Receipt, Sparkles, DollarSign, AlertCircle, ShieldAlert,
  Edit2, Eye, ShieldCheck, ShoppingCart, Layers, Search, ChevronDown, ChevronUp, Filter, SlidersHorizontal
} from "lucide-react";
import { Company, User, Branch, Warehouse as WarehouseType, Product, Sale, Customer, AuditLog, PlanType } from "../types";

interface SuperAdminModuleProps {
  companies: Company[];
  onUpdateCompanies: (companiesList: Company[]) => void;
  users: User[];
  onUpdateUsers: (usersList: User[]) => void;
  branches: Branch[];
  onUpdateBranches: (branchList: Branch[]) => void;
  warehouses: WarehouseType[];
  onUpdateWarehouses: (warehouseList: WarehouseType[]) => void;
  sales: Sale[];
  onAddSale: (sale: Sale) => void;
  products: Product[];
  onUpdateProducts: (productsList: Product[]) => void;
  customers: Customer[];
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
}

const ALL_SYSTEM_MODULES = [
  { key: "pos", label: "Punto de Venta (POS Core)", desc: "Módulo base para ventas rápidas, cobro multimoneda y arqueos de caja" },
  { key: "inventario", label: "Gestión de Inventario", desc: "Monitoreo de existencias por almacén, kardex, transfers y stock" },
  { key: "restaurante", label: "Mesas, Salones & Comandas", desc: "Visualización gráfica de salones y comandas para restaurantes" },
  { key: "clientes", label: "Cuentas por Cobrar & Créditos", desc: "Límites de crédito corporativo, balances y estados de cuenta" },
  { key: "fidelizacion", label: "Fidelización & Puntos", desc: "Acumulación de puntos por compras y cashback de clientes" },
  { key: "compras", label: "Compras & Proveedores", desc: "Órdenes de compra, recepción de mercancía y costos" },
  { key: "gastos", label: "Control de Gastos & Cajas Chica", desc: "Registro de egresos, comprobantes y clasificación contable" },
  { key: "caja_avanzada", label: "Caja & Tesorería Avanzada", desc: "Múltiples cajas registradoras simultáneas por sucursal" },
  { key: "contabilidad", label: "Contabilidad General & Asientos", desc: "Libro diario, catálogo de cuentas, balance y asientos" },
  { key: "reportes_financieros", label: "Finanzas & Estado Resultados", desc: "Reportes de ganancias, pérdidas, COGS y margen de ventas" },
  { key: "manufactura", label: "Recetas & Producción (BOM)", desc: "Ensamblaje y deducción de materia prima estructurada" },
  { key: "ecommerce", label: "Sincronizador E-Commerce & Tienda", desc: "Cola de órdenes de tienda web pública y catálogos online" },
  { key: "suscripciones", label: "Suscripciones & Membresías", desc: "Cobros recurrentes programados para clubes o servicios" },
  { key: "facturacion_fiscal", label: "Comprobantes Fiscales NCF", desc: "Generación de NCF (DGII República Dominicana: B01, B02, B14, B15)" },
  { key: "nomina", label: "Nómina & Recursos Humanos", desc: "Pago a personal, comisiones por ventas, horas extra y ausencias" },
  { key: "delivery", label: "Logística de Delivery & Envíos", desc: "Estado de despachos, asignación de motoristas y mapa" },
  { key: "android_app", label: "App Móvil Android (POS Mobile)", desc: "Optimización y terminal móvil táctil para dispositivos Android" },
  { key: "integraciones", label: "Integraciones Externas & API", desc: "Webhooks, API keys y conexión con sistemas ERP externos" },
  { key: "cotizaciones", label: "Cotizaciones & Proformas", desc: "Presupuestos válidos para conversión inmediata a factura" },
  { key: "reportes", label: "Reportes Estadísticos", desc: "Gráficos de ventas, rotación de productos y exportación Excel" },
  { key: "auditoria", label: "Auditoría Global & Bitácora", desc: "Registro histórico y trazabilidad de acciones de usuarios" }
];

const MEMBERSHIP_PLANS_CATALOG = [
  { id: "saas_basic", name: "Suscripción Mensual: Plan Básico", price: 2900, desc: "Acceso mensual para 1 sucursal y 3 usuarios." },
  { id: "saas_prof", name: "Suscripción Mensual: Plan Profesional", price: 5500, desc: "Acceso mensual para 3 sucursales y 10 usuarios." },
  { id: "saas_ent", name: "Suscripción Mensual: Plan Empresarial", price: 13500, desc: "Acceso mensual para sucursales y usuarios ilimitados." },
  { id: "saas_branch", name: "Licencia de Sucursal Extra", price: 1500, desc: "Habilitación de sucursal adicional no contemplada en el plan." },
  { id: "saas_user", name: "Licencia de Usuario Extra", price: 500, desc: "Habilitación de usuario extra para el panel administrativo." },
  { id: "saas_setup", name: "Servicio de Configuración Inicial", price: 4500, desc: "Migración de base de datos, capacitación y soporte de arranque." },
  { id: "saas_support", name: "Soporte Técnico Premium Mensual", price: 2500, desc: "Línea dedicada y asistencia técnica prioritaria 24/7." }
];

export default function SuperAdminModule({
  companies,
  onUpdateCompanies,
  users,
  onUpdateUsers,
  branches,
  onUpdateBranches,
  warehouses,
  onUpdateWarehouses,
  sales,
  onAddSale,
  products,
  onUpdateProducts,
  customers,
  onAddAudit
}: SuperAdminModuleProps) {
  const [activeTab, setActiveTab] = useState<"empresas" | "usuarios" | "facturas">("empresas");

  // State: Create Company Wizard
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    rnc: "",
    plan: PlanType.PROFESIONAL,
    color: "#4f46e5",
    logo: "Building2",
    maxBranches: 3,
    maxUsers: 10,
    maxDevices: 5,
    currency: "DOP",
    defaultTaxRate: 18,
    receiptMessage: "¡Gracias por su suscripción a nuestra plataforma POS SaaS!",
    activeModules: ["pos", "inventario", "reportes"] as string[],
    createDefaultData: true,
    ownerName: "Administrador General",
    ownerEmail: "propietario@comercio.com",
    ownerPin: "123456"
  });

  // State: Search & Filter Companies
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [companyPlanFilter, setCompanyPlanFilter] = useState<string>("all");
  const [expandedCompanyIds, setExpandedCompanyIds] = useState<string[]>([]);

  const toggleExpandCompany = (id: string) => {
    setExpandedCompanyIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleExpandAllCompanies = (companiesToToggle: Company[]) => {
    const allIds = companiesToToggle.map(c => c.id);
    const areAllExpanded = allIds.every(id => expandedCompanyIds.includes(id));
    if (areAllExpanded) {
      setExpandedCompanyIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setExpandedCompanyIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  // State: Create User Wizard
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    companyId: "",
    name: "",
    email: "",
    role: "Administrador",
    pin: "222222",
    permissions: ["all"]
  });

  // State: Invoice Generator Wizard (SaaS Platform License / Membership)
  const [invoiceForm, setInvoiceForm] = useState({
    companyId: "",
    paymentMethod: "Transferencia",
    ncfType: "B01", // Crédito Fiscal standard for corporate expense billing
    notes: "Factura de cobro de membresía mensual de licencia de software POS"
  });
  
  const [invoiceCart, setInvoiceCart] = useState<{ id: string; name: string; qty: number; price: number }[]>([]);
  const [customItem, setCustomItem] = useState({ name: "Soporte Técnico Extra", price: 1500, qty: 1 });
  const [generatedInvoice, setGeneratedInvoice] = useState<Sale | null>(null);

  // Custom modal banner notice (replacing native browser alerts)
  const [adminNoticeMsg, setAdminNoticeMsg] = useState<string>("");
  const [showAdminNoticeModal, setShowAdminNoticeModal] = useState<boolean>(false);

  // Helper: Create Company
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name.trim()) {
      setAdminNoticeMsg("Por favor ingrese el nombre de la empresa.");
      setShowAdminNoticeModal(true);
      return;
    }


    const companyId = "comp_" + Math.random().toString(36).slice(2, 9);
    
    const newCompany: Company = {
      id: companyId,
      name: companyForm.name,
      rnc: companyForm.rnc || undefined,
      plan: companyForm.plan,
      logo: companyForm.logo,
      color: companyForm.color,
      activeModules: companyForm.activeModules,
      maxBranches: companyForm.maxBranches,
      maxUsers: companyForm.maxUsers,
      maxDevices: companyForm.maxDevices,
      settings: {
        allowOutOfStock: true,
        requireCustomer: false,
        defaultTaxRate: companyForm.defaultTaxRate / 100,
        receiptMessage: companyForm.receiptMessage,
        currency: companyForm.currency
      }
    };

    const updatedCompanies = [...companies, newCompany];
    onUpdateCompanies(updatedCompanies);

    // Default Multi-Tenant Data Auto-Seeding
    let createdBranchId = "";
    let createdWhId = "";

    if (companyForm.createDefaultData) {
      // 1. Create default branch
      createdBranchId = "br_" + Math.random().toString(36).slice(2, 9);
      const newBranch: Branch = {
        id: createdBranchId,
        companyId: companyId,
        name: `Sucursal Principal ${companyForm.name}`,
        address: "Av. Central No. 100, Zona Metropolitana"
      };
      onUpdateBranches([...branches, newBranch]);

      // 2. Create default warehouse
      createdWhId = "wh_" + Math.random().toString(36).slice(2, 9);
      const newWh: WarehouseType = {
        id: createdWhId,
        branchId: createdBranchId,
        name: `Almacén Central ${companyForm.name}`
      };
      onUpdateWarehouses([...warehouses, newWh]);

      // 3. Create default owner user
      const ownerId = "usr_" + Math.random().toString(36).slice(2, 9);
      const newOwner: User = {
        id: ownerId,
        companyId: companyId,
        name: companyForm.ownerName || "Propietario",
        email: companyForm.ownerEmail || `propietario@${companyForm.name.toLowerCase().replace(/\s+/g, "")}.com`,
        role: "Propietario",
        pin: companyForm.ownerPin || "123456",
        permissions: ["all"],
        restrictedBranches: []
      };
      onUpdateUsers([...users, newOwner]);

      // 4. Create default mock product for quick billing
      const prodId = "prod_" + Math.random().toString(36).slice(2, 9);
      const defaultProduct: Product = {
        id: prodId,
        companyId: companyId,
        name: "Producto General Estándar",
        sku: "GEN-001",
        barcode: "746000123456",
        category: "Generales",
        price: 150,
        cost: 90,
        unit: "Unidades",
        stock: {
          [createdWhId]: 500
        },
        minStock: 10,
        maxStock: 1000,
        isWeighable: false,
        isSerialized: false
      };
      onUpdateProducts([...products, defaultProduct]);
    }

    onAddAudit(
      "Crear Comercio",
      `Se registró la empresa inquilina "${companyForm.name}" con Plan ${companyForm.plan} y módulos: ${companyForm.activeModules.join(", ")}`
    );

    setAdminNoticeMsg(`¡Empresa "${companyForm.name}" creada con éxito!\nAcceso de Propietario:\nEmail: ${companyForm.ownerEmail}\nPIN: ${companyForm.ownerPin}`);
    setShowAdminNoticeModal(true);
    setShowCompanyModal(false);
    
    // Reset Form
    setCompanyForm({
      name: "",
      rnc: "",
      plan: PlanType.PROFESIONAL,
      color: "#4f46e5",
      logo: "Building2",
      maxBranches: 3,
      maxUsers: 10,
      maxDevices: 5,
      currency: "DOP",
      defaultTaxRate: 18,
      receiptMessage: "¡Gracias por su compra en nuestra franquicia!",
      activeModules: ["pos", "inventario", "reportes"],
      createDefaultData: true,
      ownerName: "Administrador General",
      ownerEmail: "propietario@comercio.com",
      ownerPin: "123456"
    });
  };

  // Helper: Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.companyId || !userForm.name.trim() || !userForm.email.trim() || !userForm.pin) {
      setAdminNoticeMsg("Por favor complete todos los datos obligatorios del usuario.");
      setShowAdminNoticeModal(true);
      return;
    }

    const userId = "usr_" + Math.random().toString(36).slice(2, 9);
    const newUser: User = {
      id: userId,
      companyId: userForm.companyId,
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      pin: userForm.pin,
      permissions: userForm.permissions,
      restrictedBranches: []
    };

    onUpdateUsers([...users, newUser]);

    const compName = companies.find(c => c.id === userForm.companyId)?.name || "Desconocido";
    onAddAudit(
      "Crear Usuario Tenant",
      `Usuario ${userForm.name} asignado a la empresa ${compName} con rol ${userForm.role}`
    );

    setAdminNoticeMsg(`Colaborador "${userForm.name}" registrado con PIN ${userForm.pin} para la empresa ${compName}.`);
    setShowAdminNoticeModal(true);
    setShowUserModal(false);

    // Reset Form
    setUserForm({
      companyId: "",
      name: "",
      email: "",
      role: "Administrador",
      pin: "222222",
      permissions: ["all"]
    });
  };

  // Helper: Add custom item to Superadmin Invoice Cart
  const handleAddCustomToCart = () => {
    if (!customItem.name.trim() || customItem.price <= 0 || customItem.qty <= 0) return;

    const newItem = {
      id: "saas_custom_" + Math.random().toString(36).slice(2, 9),
      name: customItem.name,
      price: customItem.price,
      qty: customItem.qty
    };

    setInvoiceCart([...invoiceCart, newItem]);
    setCustomItem({ name: "Soporte Técnico Extra", price: 1500, qty: 1 });
  };

  // Helper: Generate Sale Invoice for SaaS Membership License Fee
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.companyId) {
      setAdminNoticeMsg("Seleccione la empresa inquilina para facturar.");
      setShowAdminNoticeModal(true);
      return;
    }

    if (invoiceCart.length === 0) {
      setAdminNoticeMsg("Agregue al menos un cargo de membresía o licencia al carrito.");
      setShowAdminNoticeModal(true);
      return;
    }

    const companySelected = companies.find(c => c.id === invoiceForm.companyId);
    if (!companySelected) return;

    // SaaS Master Billing ITBIS Tax Rate (Dominican Republic standard is 18% for services)
    const taxRate = 0.18;
    
    // Calculate subtotal, taxes, total
    let subtotalSum = 0;
    let totalTax = 0;

    const itemsFormatted = invoiceCart.map(cartItem => {
      const itemSubtotal = cartItem.price * cartItem.qty;
      const itemTax = itemSubtotal * taxRate;
      subtotalSum += itemSubtotal;
      totalTax += itemTax;

      return {
        productId: cartItem.id,
        productName: cartItem.name,
        price: cartItem.price,
        cost: cartItem.price * 0.2, // SaaS software operational host cost is around 20%
        qty: cartItem.qty,
        discount: 0,
        tax: taxRate * 100
      };
    });

    const totalCalculated = subtotalSum + totalTax;

    // Build platform-level corporate NCF for the tenant company
    const ncfTypeSelected = invoiceForm.ncfType || (companySelected.rnc ? "B01" : "B02");
    const sequence = Math.floor(100000 + Math.random() * 900000);
    const generatedNCF = `${ncfTypeSelected}0000${sequence}`;

    // Get or default a branch and user from the tenant company to ensure full database schema compliance
    const compBranch = branches.find(b => b.companyId === invoiceForm.companyId) || { id: "saas_platform_br" };
    const compUser = users.find(u => u.companyId === invoiceForm.companyId) || { id: "saas_platform_usr" };

    const newSale: Sale = {
      id: "sale_saas_" + Math.random().toString(36).slice(2, 9),
      uuid: "uid_saas_" + Math.random().toString(36).slice(2, 9),
      companyId: invoiceForm.companyId,
      branchId: compBranch.id,
      userId: compUser.id,
      date: new Date().toISOString(),
      items: itemsFormatted,
      total: Number(totalCalculated.toFixed(2)),
      discount: 0,
      tax: Number(totalTax.toFixed(2)),
      paymentMethod: invoiceForm.paymentMethod,
      paymentDetails: {
        cashPaid: totalCalculated,
        change: 0
      },
      status: "completed",
      ncf: generatedNCF,
      ncfType: ncfTypeSelected,
      customerId: undefined,
      notes: invoiceForm.notes,
      synced: true
    };

    onAddSale(newSale);
    setGeneratedInvoice(newSale);

    onAddAudit(
      "Factura Cobro Membresía",
      `Se generó factura de plataforma SaaS ${newSale.id} (${ncfTypeSelected}) para ${companySelected.name} por membresía de licencia. Total: RD$ ${newSale.total}`
    );

    setAdminNoticeMsg(`Factura de membresía generada con éxito para ${companySelected.name}.\nNCF: ${generatedNCF}\nTotal: RD$ ${newSale.total}`);
    setShowAdminNoticeModal(true);

    
    // Clear invoice generator cart & reset
    setInvoiceCart([]);
  };

  const handleToggleModuleInSuperadmin = (companyId: string, moduleKey: string) => {
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        const has = c.activeModules.includes(moduleKey);
        const next = has 
          ? c.activeModules.filter(m => m !== moduleKey) 
          : [...c.activeModules, moduleKey];

        onAddAudit(
          "Licencia Módulo SuperAdmin",
          `Módulo "${moduleKey}" ${has ? "desactivado" : "activado"} para ${c.name}`
        );

        return { ...c, activeModules: next };
      }
      return c;
    });
    onUpdateCompanies(updatedCompanies);
  };

  const handleToggleAllModulesInSuperadmin = (companyId: string, enableAll: boolean) => {
    const updatedCompanies = companies.map((c) => {
      if (c.id === companyId) {
        const next = enableAll ? ALL_SYSTEM_MODULES.map(m => m.key) : ["pos"];
        onAddAudit(
          "Licencia Módulos SuperAdmin",
          `${enableAll ? "Activados todos los módulos (" + ALL_SYSTEM_MODULES.length + ")" : "Desactivados módulos opcionales"} para ${c.name}`
        );

        return { ...c, activeModules: next };
      }
      return c;
    });
    onUpdateCompanies(updatedCompanies);
  };

  // Filter helpers
  const selectedCompObj = companies.find(c => c.id === invoiceForm.companyId);
  const compBranches = branches.filter(b => b.companyId === invoiceForm.companyId);
  const compUsers = users.filter(u => u.companyId === invoiceForm.companyId);
  const compProducts = products.filter(p => p.companyId === invoiceForm.companyId);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-900 text-slate-100" id="superadmin-advanced-core">
      
      {/* Superadmin Display Banner */}
      <div className="bg-slate-950 border-b border-slate-800 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600 rounded-2xl text-white shadow-lg animate-pulse">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="bg-red-500/15 text-red-400 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-red-500/25 tracking-widest block w-fit mb-1">
              Consola Master del Sistema
            </span>
            <h2 className="text-base font-black tracking-tight text-white uppercase flex items-center gap-2">
              SaaS Multi-Inquilinos & Administrador Global
            </h2>
          </div>
        </div>

        {/* Console Mode Selector Navigation */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 text-xs font-bold">
          <button
            onClick={() => { setActiveTab("empresas"); setGeneratedInvoice(null); }}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "empresas" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
            Empresas & Licencias
          </button>
          <button
            onClick={() => { setActiveTab("usuarios"); setGeneratedInvoice(null); }}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "usuarios" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1.5" />
            Usuarios Multi-Tenant
          </button>
          <button
            onClick={() => { setActiveTab("facturas"); setGeneratedInvoice(null); }}
            className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === "facturas" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 inline mr-1.5" />
            Generador de Facturas
          </button>
        </div>
      </div>

      {/* Main Viewport Content container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" id="superadmin-interactive-screen">
        
        {/* TAB 1: EMPRESAS & LICENCIAS */}
        {activeTab === "empresas" && (() => {
          const filteredComps = companies.filter((c) => {
            const q = companySearchQuery.toLowerCase().trim();
            const matchesQuery = !q || (
              c.name.toLowerCase().includes(q) ||
              c.id.toLowerCase().includes(q) ||
              (c.rnc && c.rnc.toLowerCase().includes(q)) ||
              c.plan.toLowerCase().includes(q)
            );
            const matchesPlan = companyPlanFilter === "all" || c.plan === companyPlanFilter;
            return matchesQuery && matchesPlan;
          });

          const areAllFilteredExpanded = filteredComps.length > 0 && filteredComps.every(c => expandedCompanyIds.includes(c.id));

          return (
            <div className="space-y-5 animate-fade-in">
              {/* Header section & primary action */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-white tracking-wider flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-red-500" />
                    Gestión de Empresas Inquilinas & Licencias
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Busque, configure cuotas de suscripción y active/desactive módulos individualmente por empresa.
                  </p>
                </div>
                <button
                  onClick={() => setShowCompanyModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Empresa Inquilina (SaaS)
                </button>
              </div>

              {/* Search, Plan Filters & Expand/Collapse Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery(e.target.value)}
                      placeholder="Buscar por nombre de empresa, RNC, ID único o plan..."
                      className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-indigo-500 transition-all font-medium"
                    />
                    {companySearchQuery && (
                      <button
                        onClick={() => setCompanySearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Expand / Collapse Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleExpandAllCompanies(filteredComps)}
                      className="text-xs bg-slate-900 hover:bg-slate-850 text-indigo-300 border border-slate-800 px-3 py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      {areAllFilteredExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 text-indigo-400" />
                          Colapsar Todas ({filteredComps.length})
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                          Desplegar Todas ({filteredComps.length})
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Plan filter tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-900 pt-2.5">
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Filtrar Plan:
                    </span>
                    <button
                      onClick={() => setCompanyPlanFilter("all")}
                      className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        companyPlanFilter === "all"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-900 text-slate-400 hover:text-white border border-slate-850"
                      }`}
                    >
                      Todos ({companies.length})
                    </button>
                    {Object.values(PlanType).map((plan) => {
                      const count = companies.filter(c => c.plan === plan).length;
                      return (
                        <button
                          key={plan}
                          onClick={() => setCompanyPlanFilter(plan)}
                          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                            companyPlanFilter === plan
                              ? "bg-indigo-600 text-white shadow"
                              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-850"
                          }`}
                        >
                          {plan} ({count})
                        </button>
                      );
                    })}
                  </div>

                  <span className="text-[11px] font-bold text-slate-400">
                    Mostrando <strong className="text-white">{filteredComps.length}</strong> de {companies.length} empresas
                  </span>
                </div>
              </div>

              {/* Empty search state */}
              {filteredComps.length === 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
                  <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="font-bold text-slate-300 text-sm">No se encontraron empresas</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No existe ninguna empresa que coincida con la búsqueda "{companySearchQuery}" {companyPlanFilter !== "all" ? `en el plan ${companyPlanFilter}` : ""}.
                  </p>
                  <button
                    onClick={() => { setCompanySearchQuery(""); setCompanyPlanFilter("all"); }}
                    className="bg-slate-900 hover:bg-slate-850 text-indigo-400 border border-slate-800 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition-all"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              )}

              {/* List of Collapsible Companies */}
              <div className="space-y-3">
                {filteredComps.map((comp) => {
                  const isExpanded = expandedCompanyIds.includes(comp.id);
                  const cBranches = branches.filter(b => b.companyId === comp.id);
                  const cUsers = users.filter(u => u.companyId === comp.id);

                  return (
                    <div 
                      key={comp.id} 
                      className={`bg-slate-950 border rounded-2xl transition-all shadow-xl overflow-hidden ${
                        isExpanded ? "border-indigo-600/60 ring-1 ring-indigo-500/20" : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {/* Compact Collapsed Row Header */}
                      <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div 
                            className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-md" 
                            style={{ backgroundColor: comp.color || "#4f46e5" }}
                          >
                            {comp.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm text-white truncate">
                                {comp.name}
                              </h4>
                              {comp.rnc && (
                                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-md font-semibold">
                                  RNC: {comp.rnc}
                                </span>
                              )}
                              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider border ${
                                comp.plan === PlanType.EMPRESARIAL 
                                  ? "bg-indigo-900/40 text-indigo-300 border-indigo-700/50" 
                                  : comp.plan === PlanType.PROFESIONAL
                                  ? "bg-sky-900/40 text-sky-300 border-sky-700/50"
                                  : "bg-amber-900/40 text-amber-300 border-amber-700/50"
                              }`}>
                                Plan {comp.plan}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                              <span>ID: <strong className="text-slate-400 font-mono">{comp.id}</strong></span>
                              <span>•</span>
                              <span>Sucursales: <strong className="text-slate-300">{cBranches.length}/{comp.maxBranches}</strong></span>
                              <span>•</span>
                              <span>Usuarios: <strong className="text-slate-300">{cUsers.length}/{comp.maxUsers}</strong></span>
                              <span>•</span>
                              <span className="text-indigo-400 font-semibold">
                                {comp.activeModules.length}/{ALL_SYSTEM_MODULES.length} Módulos Activos
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Quick Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setInvoiceForm(prev => ({ ...prev, companyId: comp.id }));
                              setActiveTab("facturas");
                            }}
                            className="text-xs bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:text-white px-3 py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1.5"
                          >
                            <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                            Factura SaaS
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpandCompany(comp.id)}
                            className={`text-xs px-4 py-2 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-2 border ${
                              isExpanded 
                                ? "bg-indigo-600 text-white border-indigo-500 shadow-lg" 
                                : "bg-slate-900 hover:bg-slate-850 text-indigo-300 border-slate-800"
                            }`}
                          >
                            <span>{isExpanded ? "Ocultar Módulos" : "Gestionar Licencias & Módulos"}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section Drawer */}
                      {isExpanded && (
                        <div className="border-t border-slate-850 p-5 bg-slate-900/40 space-y-5 animate-fade-in">
                          {/* Quotas & Config Cards */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Sucursales Permitidas</span>
                              <span className="text-sm font-extrabold text-white mt-0.5 block">{comp.maxBranches} Sucursales</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Dispositivos / POS</span>
                              <span className="text-sm font-extrabold text-white mt-0.5 block">{comp.maxDevices} Terminales</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Límite Usuarios</span>
                              <span className="text-sm font-extrabold text-white mt-0.5 block">{comp.maxUsers} Cuentas</span>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                              <span className="text-[9px] uppercase font-bold text-slate-500 block">Divisa & Impuestos</span>
                              <span className="text-sm font-extrabold text-white mt-0.5 block">{comp.settings.currency} ({comp.settings.defaultTaxRate}%)</span>
                            </div>
                          </div>

                          {/* Module Checklist Controls */}
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                              <span className="text-xs font-extrabold uppercase text-indigo-400 tracking-wider flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4" />
                                Módulos Habilitados para {comp.name} ({comp.activeModules.length}/{ALL_SYSTEM_MODULES.length})
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllModulesInSuperadmin(comp.id, true)}
                                  className="text-[10px] bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all"
                                >
                                  Activar Todos ({ALL_SYSTEM_MODULES.length})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllModulesInSuperadmin(comp.id, false)}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all"
                                >
                                  Solo POS Core
                                </button>
                              </div>
                            </div>

                            {/* Grid of 21 system modules */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                              {ALL_SYSTEM_MODULES.map((mod) => {
                                const active = comp.activeModules.includes(mod.key);
                                return (
                                  <button
                                    key={mod.key}
                                    type="button"
                                    onClick={() => handleToggleModuleInSuperadmin(comp.id, mod.key)}
                                    className={`flex items-start justify-between text-left p-2.5 rounded-xl border text-[11px] transition-all cursor-pointer font-medium ${
                                      active 
                                        ? "bg-indigo-950/50 text-indigo-100 border-indigo-700/70 shadow-sm" 
                                        : "bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-850"
                                    }`}
                                  >
                                    <div className="truncate pr-1">
                                      <span className="block font-bold text-xs truncate text-white">{mod.label}</span>
                                      <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">{mod.desc}</span>
                                    </div>
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border shrink-0 mt-0.5 ${
                                      active ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-750"
                                    }`}>
                                      {active && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Footer details */}
                          <div className="flex justify-between items-center text-[11px] text-slate-400 border-t border-slate-800 pt-3">
                            <span className="font-mono">Mensaje Ticket: "{comp.settings.receiptMessage}"</span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Multitenant Listo
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* TAB 2: USUARIOS MULTI-TENANT */}
        {activeTab === "usuarios" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider">Cuentas y Usuarios Multi-Tenant</h3>
                <p className="text-xs text-slate-500 mt-1">Cree, verifique y asigne colaboradores, cajeros o gerentes para cualquiera de las empresas inquilinas del sistema.</p>
              </div>
              <button
                onClick={() => setShowUserModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Registrar Usuario en Empresa
              </button>
            </div>

            {/* Users listing with company badge */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Colaborador / Operador</th>
                      <th className="p-4">Correo Electrónico</th>
                      <th className="p-4">Empresa Inquilina</th>
                      <th className="p-4">Rol Asignado</th>
                      <th className="p-4 text-center">PIN Acceso</th>
                      <th className="p-4 text-right">Permisos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 font-sans">
                    {users.map((u) => {
                      const compObj = companies.find(c => c.id === u.companyId);
                      return (
                        <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-4 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-xs">
                              {u.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white block leading-tight">{u.name}</span>
                              <span className="text-[10px] text-slate-500 font-semibold font-mono">ID: {u.id}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-300">{u.email}</td>
                          <td className="p-4 font-bold text-white uppercase">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-850 text-[10.5px]">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: compObj?.color || "#fff" }}></span>
                              {compObj?.name || "Superusuario Global"}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.role === "Propietario"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : u.role === "Administrador"
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono font-bold tracking-widest text-emerald-400 text-sm">{u.pin}</td>
                          <td className="p-4 text-right">
                            {u.permissions?.includes("all") ? (
                              <span className="text-indigo-400 font-bold text-[11px]">Acceso Total (all)</span>
                            ) : (
                              <span className="text-slate-500">{u.permissions?.length || 0} permisos</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GENERADOR DE FACTURAS GLOBALES */}
        {activeTab === "facturas" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            
            {/* Invoice Configuration Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">Módulo Administrativo</span>
                  </div>
                  <h3 className="font-bold text-base text-white tracking-tight uppercase flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-red-500" />
                    Facturación de Membresía & Licencias SaaS
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Emita facturas oficiales de licenciamiento y soporte desde el Proveedor SaaS hacia la empresa inquilina. Genera comprobantes fiscales corporativos válidos para deducción fiscal de gastos (B01 Crédito Fiscal).
                  </p>
                </div>

                <form onSubmit={handleGenerateInvoice} className="space-y-4">
                  
                  {/* Step 1: Select Company */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">1. Seleccionar Empresa Cliente (Inquilino) *</label>
                    <select
                      value={invoiceForm.companyId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setInvoiceForm({
                          companyId: cid,
                          paymentMethod: "Transferencia",
                          ncfType: "B01", // Default to B01 for corporate SaaS bill
                          notes: "Factura de cobro de membresía de software POS de este mes"
                        });
                        setInvoiceCart([]);
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="">-- Seleccione un Inquilino Comercial --</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Plan: {c.plan} • RNC: {c.rnc || "N/A"})</option>
                      ))}
                    </select>
                  </div>

                  {invoiceForm.companyId && selectedCompObj && (
                    <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl text-xs space-y-2 animate-fade-in">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">Detalles del Perfil & Plan Activo</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-300">
                        <p>🏢 <span className="text-slate-500 font-semibold">Comercio:</span> <strong className="text-white">{selectedCompObj.name}</strong></p>
                        <p>🆔 <span className="text-slate-500 font-semibold">Plan Actual:</span> <span className="font-extrabold text-indigo-400 uppercase">{selectedCompObj.plan}</span></p>
                        <p>🇩🇴 <span className="text-slate-500 font-semibold">RNC Registrado:</span> <strong className="text-white font-mono">{selectedCompObj.rnc || "No Registrado"}</strong></p>
                        <p>📊 <span className="text-slate-500 font-semibold">Módulos de Pago:</span> <strong className="text-emerald-400">{selectedCompObj.activeModules.length} Activos</strong></p>
                      </div>

                      {/* Intelligent auto-fill actions */}
                      <div className="border-t border-slate-800/80 pt-3 mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Find corresponding plan catalog item
                            const planKey = selectedCompObj.plan.toLowerCase();
                            const matchedItem = MEMBERSHIP_PLANS_CATALOG.find(i => 
                              planKey.includes("básico") || planKey.includes("basic") ? i.id === "saas_basic" :
                              planKey.includes("profesional") || planKey.includes("professional") || planKey.includes("prof") ? i.id === "saas_prof" :
                              i.id === "saas_ent"
                            ) || MEMBERSHIP_PLANS_CATALOG[1];

                            // Add to cart
                            const existing = invoiceCart.find(item => item.id === matchedItem.id);
                            if (existing) {
                              setInvoiceCart(invoiceCart.map(item => item.id === matchedItem.id ? { ...item, qty: item.qty + 1 } : item));
                            } else {
                              setInvoiceCart([...invoiceCart, { id: matchedItem.id, name: matchedItem.name, qty: 1, price: matchedItem.price }]);
                            }
                          }}
                          className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-[10.5px] font-black tracking-wide transition-all cursor-pointer"
                        >
                          ⚡ Cargar Licencia del Plan {selectedCompObj.plan}
                        </button>
                      </div>
                    </div>
                  )}

                  {invoiceForm.companyId && (
                    <div className="border-t border-slate-850 pt-4 space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          2. Catálogo de Licencias, Módulos & Soporte SaaS
                        </label>
                        <span className="text-[10px] text-emerald-400">ITBIS 18% incluido de ley</span>
                      </div>

                      {/* Grid of Standard SaaS Billing Items */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {MEMBERSHIP_PLANS_CATALOG.map(item => {
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                const existing = invoiceCart.find(c => c.id === item.id);
                                if (existing) {
                                  setInvoiceCart(invoiceCart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
                                } else {
                                  setInvoiceCart([...invoiceCart, { id: item.id, name: item.name, qty: 1, price: item.price }]);
                                }
                              }}
                              className="bg-slate-900 border border-slate-850 hover:border-slate-700 p-2.5 rounded-xl flex flex-col justify-between text-left transition-all cursor-pointer group"
                            >
                              <div className="w-full">
                                <div className="flex justify-between items-start">
                                  <span className="font-extrabold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors truncate">{item.name}</span>
                                  <span className="font-mono font-black text-emerald-400 text-xs text-right ml-1">RD${item.price}</span>
                                </div>
                                <p className="text-[9.5px] text-slate-500 leading-normal mt-0.5 truncate">{item.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Manual mock item generator for custom consultancy/support */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-900 p-3 rounded-2xl border border-slate-850">
                        <div className="sm:col-span-6 space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Concepto de Consultoría / Customización</label>
                          <input
                            type="text"
                            value={customItem.name}
                            onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-semibold"
                            placeholder="Desarrollo de integraciones / Soporte Extra"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Precio (RD$)</label>
                          <input
                            type="number"
                            value={customItem.price}
                            onChange={(e) => setCustomItem({ ...customItem, price: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] uppercase font-bold text-slate-400 block">Cant</label>
                          <input
                            type="number"
                            value={customItem.qty}
                            onChange={(e) => setCustomItem({ ...customItem, qty: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAddCustomToCart}
                          className="sm:col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-lg flex items-center justify-center cursor-pointer h-[30px]"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Display current Invoice Cart */}
                      {invoiceCart.length > 0 && (
                        <div className="bg-slate-900 rounded-2xl border border-slate-850 p-4 space-y-3">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Cargos Agregados al Borrador de Factura</span>
                          <div className="divide-y divide-slate-800 max-h-44 overflow-y-auto">
                            {invoiceCart.map((item, index) => (
                              <div key={index} className="py-2 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-bold text-white block">{item.name}</span>
                                  <span className="text-[10px] text-slate-400">{item.qty} Unidad(es) x RD$ {item.price.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-emerald-400">RD$ {(item.price * item.qty).toLocaleString()}</span>
                                  <button
                                    type="button"
                                    onClick={() => setInvoiceCart(invoiceCart.filter((_, i) => i !== index))}
                                    className="text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {invoiceForm.companyId && (
                    <div className="border-t border-slate-850 pt-4 space-y-4 animate-fade-in">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        3. Configurar Pago, NCF y Notas de Cobro
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Forma de Pago SaaS</span>
                          <select
                            value={invoiceForm.paymentMethod}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-semibold"
                          >
                            <option value="Transferencia">Transferencia Bancaria</option>
                            <option value="Tarjeta">Tarjeta de Crédito</option>
                            <option value="Efectivo">Efectivo / Caja</option>
                            <option value="Cheque">Cheque Corporativo</option>
                          </select>
                        </div>

                        <div className="space-y-1 col-span-2">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Tipo de Comprobante Fiscal (DGII Dominicana)</span>
                          <select
                            value={invoiceForm.ncfType}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, ncfType: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-semibold"
                          >
                            <option value="B01">B01 - Crédito Fiscal (SaaS B2B corporativo)</option>
                            <option value="B02">B02 - Consumidor Final (Persona Física)</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Notas de Cobro</span>
                        <input
                          type="text"
                          value={invoiceForm.notes}
                          onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-medium"
                          placeholder="Especifique comentarios adicionales..."
                        />
                      </div>
                    </div>
                  )}

                  {invoiceForm.companyId && (
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer mt-4 uppercase tracking-wider"
                    >
                      <Receipt className="w-4 h-4" />
                      Generar Factura de Cobro para {selectedCompObj?.name}
                    </button>
                  )}
                </form>
              </div>
            </div>

            {/* Display Generated Invoice Panel */}
            <div className="lg:col-span-5">
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl h-full flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm uppercase text-slate-300 tracking-wider mb-4 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Vista Previa Factura de Membresía SaaS
                  </h3>

                  {generatedInvoice ? (
                    <div className="bg-white text-slate-900 rounded-2xl p-5 font-mono text-xs space-y-4 border-2 border-dashed border-slate-300 shadow-inner animate-fade-in" id="printable-ticket-superadmin">
                      <div className="text-center border-b border-dashed border-slate-300 pb-3">
                        <h4 className="font-black text-sm uppercase">FACTURAPOS SOFTWARE PLATFORMS, SRL</h4>
                        <p className="text-[9px] font-bold text-slate-600">RNC: 1-01-99887-2 • Tel: 809-555-0199</p>
                        <p className="text-[9px] text-slate-500">Av. Winston Churchill #109, Santo Domingo, RD</p>
                        <div className="bg-slate-100 p-1 rounded font-bold text-slate-800 text-center text-[10px] my-2">
                          COMPROBANTE PARA REGISTRO DE GASTOS
                        </div>
                        <p className="text-[9px] text-slate-500 font-semibold">{new Date(generatedInvoice.date).toLocaleString()}</p>
                      </div>

                      <div className="space-y-1 text-[10px] border-b border-dashed border-slate-300 pb-2">
                        <p><span className="font-bold">Factura SaaS ID:</span> {generatedInvoice.id}</p>
                        {generatedInvoice.ncf && (
                          <div className="bg-indigo-50 border border-indigo-150 p-1.5 rounded font-black text-indigo-900 text-center text-sm my-1 tracking-wider">
                            NCF: {generatedInvoice.ncf}
                          </div>
                        )}
                        <p><span className="font-bold font-sans">CLIENTE ADQUIRIENTE:</span></p>
                        <p className="font-black text-slate-800 uppercase ml-2">{selectedCompObj?.name}</p>
                        <p className="ml-2 font-semibold">RNC: {selectedCompObj?.rnc || "N/A"}</p>
                        <p className="ml-2 font-semibold">Licencia: Plan {selectedCompObj?.plan}</p>
                        <p><span className="font-bold">Método Pago:</span> {generatedInvoice.paymentMethod}</p>
                      </div>

                      <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3 text-[10px]">
                        <div className="grid grid-cols-12 font-bold text-slate-500 uppercase text-[9px] mb-1">
                          <span className="col-span-7">Concepto de Cobro</span>
                          <span className="col-span-2 text-center">Cant</span>
                          <span className="col-span-3 text-right">Total</span>
                        </div>
                        {generatedInvoice.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-12 text-slate-800 font-semibold">
                            <span className="col-span-7 truncate font-bold text-slate-900">{item.productName}</span>
                            <span className="col-span-2 text-center">{item.qty}</span>
                            <span className="col-span-3 text-right font-bold">RD${(item.price * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1 text-right text-[11px] font-semibold">
                        <p><span className="text-slate-500 font-sans">Subtotal Neto:</span> RD$ {(generatedInvoice.total - generatedInvoice.tax).toLocaleString()}</p>
                        <p><span className="text-slate-500 font-sans">ITBIS Gravado (18%):</span> RD$ {generatedInvoice.tax.toLocaleString()}</p>
                        <div className="text-xs font-black border-t border-slate-200 pt-1 flex justify-between mt-2 text-indigo-900 bg-indigo-50 p-1.5 rounded">
                          <span>TOTAL A COBRAR:</span>
                          <span>RD$ {generatedInvoice.total.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-center pt-3 text-[9px] text-slate-400 border-t border-dashed border-slate-300 space-y-1">
                        <p className="font-bold text-slate-700">*** COMPROBANTE DE COMPRA DE SOFTWARE SaaS ***</p>
                        <p>Factura procesada y firmada digitalmente por el sistema FacturaPOS Cloud. Los servicios se renuevan de manera automática el próximo mes.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-center p-6 space-y-2">
                      <Receipt className="w-10 h-10 text-slate-600 animate-pulse" />
                      <p className="text-xs font-semibold">No se ha generado ninguna factura en esta sesión</p>
                      <p className="text-[10px] text-slate-600">Rellene el panel de la izquierda, agregue cargos de membresía de software, y haga clic en "Generar Factura de Cobro" para procesar el cobro.</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900 rounded-2xl border border-slate-850 p-3 mt-4 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="leading-relaxed">
                      El sistema SaaS inyecta estas transacciones con sincronización instantánea y cálculo correcto del ITBIS/NCF.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR EMPRESA INQUILINA */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <form onSubmit={handleCreateCompany} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  SaaS Wizard: Registrar Nueva Franquicia / Comercio
                </h3>
                <p className="text-xs text-slate-500">Defina el perfil del cliente, asigne cuotas máximas de plan, y configure el propietario inicial.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              
              {/* Profile Config */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-indigo-600 border-b border-slate-100 pb-1">1. Datos Generales de la Empresa</h4>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">Nombre del Comercio *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                    placeholder="Ej. Súper Almacenes Don Felipe"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">Registro Tributario (RNC / NIF)</label>
                  <input
                    type="text"
                    value={companyForm.rnc}
                    onChange={(e) => setCompanyForm({ ...companyForm, rnc: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none"
                    placeholder="Ej. 131234567"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Plan de Suscripción</label>
                    <select
                      value={companyForm.plan}
                      onChange={(e) => setCompanyForm({ ...companyForm, plan: e.target.value as PlanType })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value={PlanType.BASICO}>Plan Básico</option>
                      <option value={PlanType.PROFESIONAL}>Plan Profesional</option>
                      <option value={PlanType.EMPRESARIAL}>Plan Empresarial</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">Divisa Local</label>
                    <select
                      value={companyForm.currency}
                      onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="DOP">DOP ($ - Peso Dom.)</option>
                      <option value="USD">USD ($ - Dólar EE.UU.)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Sucursales</span>
                    <input
                      type="number"
                      value={companyForm.maxBranches}
                      onChange={(e) => setCompanyForm({ ...companyForm, maxBranches: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Dispositivos</span>
                    <input
                      type="number"
                      value={companyForm.maxDevices}
                      onChange={(e) => setCompanyForm({ ...companyForm, maxDevices: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Usuarios</span>
                    <input
                      type="number"
                      value={companyForm.maxUsers}
                      onChange={(e) => setCompanyForm({ ...companyForm, maxUsers: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Impuesto ITBIS/VAT %</span>
                    <input
                      type="number"
                      value={companyForm.defaultTaxRate}
                      onChange={(e) => setCompanyForm({ ...companyForm, defaultTaxRate: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Color de Marca</span>
                    <select
                      value={companyForm.color}
                      onChange={(e) => setCompanyForm({ ...companyForm, color: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800"
                    >
                      <option value="#4f46e5">Indigo Violeta</option>
                      <option value="#0ea5e9">Ocean Blue</option>
                      <option value="#10b981">Emerald Green</option>
                      <option value="#f59e0b">Amber Gold</option>
                      <option value="#ef4444">Fire Red</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Seeding & Owner Config */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase text-indigo-600 border-b border-slate-100 pb-1">2. Auto-Seeding & Propietario</h4>
                
                <label className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 hover:bg-slate-100 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={companyForm.createDefaultData}
                    onChange={(e) => setCompanyForm({ ...companyForm, createDefaultData: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">Inicializar Datos Automáticamente</span>
                    <span className="text-[10px] text-slate-500">Crea sucursal, almacén central, propietario activo y un producto estándar listo para usar.</span>
                  </div>
                </label>

                {companyForm.createDefaultData && (
                  <div className="space-y-3 p-3 bg-slate-50 border border-slate-250 rounded-2xl animate-fade-in">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Perfil Propietario Inicial</span>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 block">Nombre del Propietario *</label>
                      <input
                        type="text"
                        required={companyForm.createDefaultData}
                        value={companyForm.ownerName}
                        onChange={(e) => setCompanyForm({ ...companyForm, ownerName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-850"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 block">Correo Electrónico *</label>
                      <input
                        type="email"
                        required={companyForm.createDefaultData}
                        value={companyForm.ownerEmail}
                        onChange={(e) => setCompanyForm({ ...companyForm, ownerEmail: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-850"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-600 block">PIN Numérico de Acceso Rápido (6 dígitos) *</label>
                      <input
                        type="text"
                        maxLength={6}
                        required={companyForm.createDefaultData}
                        value={companyForm.ownerPin}
                        onChange={(e) => setCompanyForm({ ...companyForm, ownerPin: e.target.value.replace(/\D/g, "") })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold font-mono text-slate-850 text-center tracking-[0.3em]"
                        placeholder="123456"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Module selection list */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  3. Módulos de Licencia Activos por Defecto ({companyForm.activeModules.length}/{ALL_SYSTEM_MODULES.length})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCompanyForm({ ...companyForm, activeModules: ALL_SYSTEM_MODULES.map(m => m.key) })}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200 cursor-pointer transition-all"
                  >
                    Marcar Todos ({ALL_SYSTEM_MODULES.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyForm({ ...companyForm, activeModules: ["pos"] })}
                    className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-300 cursor-pointer transition-all"
                  >
                    Solo POS Core
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1.5 max-h-48 overflow-y-auto pr-1">
                {ALL_SYSTEM_MODULES.map((mod) => {
                  const has = companyForm.activeModules.includes(mod.key);
                  return (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={() => {
                        const next = has 
                          ? companyForm.activeModules.filter(m => m !== mod.key) 
                          : [...companyForm.activeModules, mod.key];
                        setCompanyForm({ ...companyForm, activeModules: next });
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer flex justify-between items-center ${
                        has 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="truncate pr-1">{mod.label.replace(" (BOM)", "")}</span>
                      {has && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-lg cursor-pointer"
              >
                Provisionar Comercio Tenant
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REGISTRAR USUARIO COMPAÑÍA */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-slate-800">
          <form onSubmit={handleCreateUser} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  SaaS Wizard: Registrar Colaborador Tenant
                </h3>
                <p className="text-xs text-slate-500">Registre un usuario y vincúlelo a cualquier comercio del sistema.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Vincular a Empresa *</label>
                <select
                  required
                  value={userForm.companyId}
                  onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Seleccionar Empresa --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  placeholder="Ej. Juan de Dios"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  placeholder="colaborador@comercio.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">Rol Comercial *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Cajero">Cajero</option>
                    <option value="Vendedor">Vendedor</option>
                    <option value="Contador">Contador</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 block">PIN Rápido (6 dígitos) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={userForm.pin}
                    onChange={(e) => setUserForm({ ...userForm, pin: e.target.value.replace(/\D/g, "") })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-center tracking-[0.2em]"
                    placeholder="222222"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Guardar Colaborador
              </button>
            </div>
          </form>
        </div>
      )}
      {/* NOTICE OVERLAY MODAL */}
      {showAdminNoticeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-white text-center">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-white text-base">SuperAdmin Platform</h3>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{adminNoticeMsg}</p>
            <button
              type="button"
              onClick={() => setShowAdminNoticeModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

