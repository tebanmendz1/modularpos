export enum PlanType {
  BASICO = "Básico",
  PROFESIONAL = "Profesional",
  EMPRESARIAL = "Empresarial"
}

export interface Company {
  id: string;
  name: string;
  rnc?: string;
  plan: PlanType;
  logo: string; // Lucide icon name
  color: string; // Tailwind hex or class name
  activeModules: string[]; // List of module IDs
  maxBranches: number;
  maxUsers: number;
  maxDevices: number;
  settings: {
    allowOutOfStock: boolean;
    requireCustomer: boolean;
    defaultTaxRate: number; // e.g. 0.18 for ITBIS
    receiptMessage: string;
    currency: string;
  };
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string;
}

export interface Warehouse {
  id: string;
  branchId: string;
  name: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: string; // Propietario, Administrador, Supervisor, Cajero, etc.
  pin: string; // PIN for offline / quick actions
  permissions: string[]; // Granular permissions
  restrictedBranches?: string[]; // Empty means all
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  price: number;
  cost: number;
  unit: string; // Unidades, Lb, Kg, etc.
  stock: Record<string, number>; // warehouseId -> quantity
  minStock: number;
  maxStock: number;
  isWeighable: boolean;
  isSerialized: boolean;
  image?: string; // Base64 data URL or image path uploaded by user
  variants?: { name: string; options: string[] }[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  cost: number;
  qty: number;
  discount: number; // percentage
  tax: number; // percentage
  selectedVariant?: string;
}

export interface Sale {
  id: string; // local UUID
  uuid: string; // server UUID or synced ID
  companyId: string;
  branchId: string;
  userId: string;
  date: string;
  items: SaleItem[];
  subtotal?: number;
  total: number;
  discount: number; // absolute
  tax: number; // absolute
  tip?: number; // absolute
  paymentMethod: string; // Efectivo, Tarjeta, Crédito, Transferencia, Dividido
  paymentDetails?: {
    cashPaid?: number;
    change?: number;
    cardLast4?: string;
    split?: Record<string, number>;
  };
  status: 'completed' | 'suspended' | 'cancelled';
  ncf?: string;
  ncfType?: string;
  customerId?: string;
  customerName?: string;
  customerRnc?: string;
  notes?: string;
  synced: boolean;
  syncError?: string;
  ecfDocumentId?: string;
  ecfStatus?: EcfDocumentStatus;
}

export interface PlatformContract {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  content: string;
  signerEmail?: string;
  publicToken: string;
  contentHash: string;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  signerName?: string;
  signerDocument?: string;
  signatureData?: string;
  idDocumentFront?: string;
  idDocumentBack?: string;
  acceptanceHash?: string;
}

export interface PlatformContractVariables {
  companyId: string;
  providerName: string;
  providerDocument: string;
  clientName: string;
  clientDocument: string;
  monthlyAmount: string;
  paymentDay: string;
  paymentMethod: string;
  supportChannel: string;
  supportHours: string;
  supportContact: string;
  city: string;
  signingDate: string;
  planName: string;
  userCount: string;
  branchCount: string;
  activationDate: string;
  additionalTerms: string;
  updatedAt?: string;
}

export interface PlatformBillingSettings {
  issuerName: string;
  issuerRnc: string;
  supportEmail: string;
  noticeTitle: string;
  noticeMessage: string;
  paymentChannels: string;
}

export interface PlatformBillingNotice {
  id: string;
  companyId: string;
  saleId: string;
  billingPeriod: string;
  total: number;
  currency: string;
  title: string;
  message: string;
  paymentChannels: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export type EcfDocumentStatus = "queued" | "processing" | "accepted" | "accepted_conditional" | "rejected" | "error";

export interface EcfProviderConfig {
  companyId: string;
  provider: "alanube";
  environment: "sandbox" | "production";
  enabled: boolean;
  providerCompanyId?: string;
  senderRnc: string;
  senderLegalName: string;
  senderCommercialName?: string;
  senderAddress: string;
  hasToken: boolean;
  hasWebhookSecret: boolean;
  updatedAt: string;
}

export interface EcfDocument {
  id: string;
  companyId: string;
  branchId?: string;
  saleId?: string;
  idempotencyKey: string;
  type: "E31" | "E32" | "E33" | "E34";
  provider: "alanube";
  environment: "sandbox" | "production";
  status: EcfDocumentStatus;
  providerDocumentId?: string;
  trackId?: string;
  encf?: string;
  qrUrl?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  securityCode?: string;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  role: string;
  date: string;
  action: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  branchId?: string;
  synced: boolean;
}

export interface CashSession {
  id: string;
  companyId: string;
  branchId: string;
  userId: string;
  userName: string;
  openDate: string;
  closeDate?: string;
  initialFund: number;
  cashIn: number; // extra deposits
  cashOut: number; // payments / withdrawals
  closedFund?: number;
  expectedFund?: number;
  status: 'open' | 'closed';
  synced: boolean;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  email: string;
  rncOrCedula?: string;
  points: number;
  tier: 'Bronce' | 'Plata' | 'Oro';
  creditLimit: number;
  currentDebt: number;
  synced: boolean;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
}

export interface PurchaseOrderItem {
  productId: string;
  qty: number;
  cost: number;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  supplierId: string;
  supplierName: string;
  date: string;
  items: PurchaseOrderItem[];
  total: number;
  status: 'draft' | 'ordered' | 'received';
  receivedDate?: string;
}

export interface Expense {
  id: string;
  companyId: string;
  branchId: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod: string;
  approvedBy?: string;
}

export interface RestaurantTable {
  id: string;
  name: string;
  zone: string; // Salón, Terraza, VIP
  status: 'free' | 'occupied' | 'billing';
  seats: number;
  currentOrderId?: string; // suspended sale ID
  waiterId?: string;
}

export interface RecipeIngredient {
  rawMaterialId: string; // product ID (e.g. flour)
  qty: number; // e.g. 0.25 (kg)
}

export interface Recipe {
  id: string;
  companyId: string;
  name: string;
  finishedProductId: string;
  ingredients: RecipeIngredient[];
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  role: string;
  commissionRate: number; // percentage (e.g. 0.05 for 5%)
  hourlyRate: number;
  clockedIn: boolean;
  lastClockIn?: string;
  // Professional HR fields
  documentId?: string; // Cédula/RNC/DNI
  email?: string;
  phone?: string;
  department?: string; // Ventas, Operaciones, Administración, Logística, Cocina
  contractType?: 'Fijo' | 'Temporal' | 'Por Hora' | 'Servicios';
  monthlySalary?: number;
  bankName?: string;
  bankAccount?: string;
  tssAfiliacion?: string; // NSS
  status?: 'active' | 'vacation' | 'leave' | 'terminated';
  hireDate?: string;
}

export interface Payslip {
  id: string;
  payrollPeriodId: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  department: string;
  role: string;
  bankName: string;
  bankAccount: string;
  paymentDate: string;
  periodLabel: string; // e.g. "1ra Quincena Julio 2026"
  // Earnings
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  commissions: number;
  bonuses: number;
  grossPay: number;
  // Employee Deductions
  sfsWorker: number; // 3.04%
  afpWorker: number; // 2.87%
  isrWorker: number; // Retención ISR
  advances: number;  // Avances / Préstamos
  totalDeductions: number;
  netPay: number;
  // Employer Contributions
  sfsEmployer: number; // 7.09%
  afpEmployer: number; // 7.10%
  arlEmployer: number; // 1.10%
  infotepEmployer: number; // 1.00%
  status: 'draft' | 'approved' | 'paid';
}

export interface VacationLeaveRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  type: 'Vacaciones' | 'Licencia Médica' | 'Permiso Personal' | 'Maternidad/Paternidad';
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  notes?: string;
}

export interface EmployeeLoan {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  requestDate: string;
  amount: number;
  remainingAmount: number;
  installments: number;
  monthlyDeduction: number;
  status: 'Activo' | 'Pagado';
}

export interface SyncQueueItem {
  id: string;
  type: 'sale' | 'stock_adjust' | 'customer' | 'cash_session' | 'audit';
  companyId: string;
  data: any;
  timestamp: number;
}

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'Activo' | 'Pasivo' | 'Capital' | 'Ingreso' | 'Costo' | 'Gasto';
  balance: number;
  isSubaccount: boolean;
  parentCode?: string;
}

export interface JournalEntryLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  branchId: string;
  entryNumber: string;
  date: string;
  concept: string;
  status: 'posted' | 'draft';
  createdBy: string;
  lines: JournalEntryLine[];
}

// Module keys and tab IDs mapping
export const MODULE_TAB_MAPPING: Record<string, string> = {
  pos: "pos",
  inventario: "inventario",
  restaurante: "restaurante",
  clientes: "clientes",
  fidelizacion: "fidelizacion",
  compras: "compras",
  gastos: "gastos",
  caja_avanzada: "caja_avanzada",
  contabilidad: "contabilidad",
  reportes_financieros: "reportes_financieros",
  manufactura: "manufactura",
  ecommerce: "ecommerce",
  suscripciones: "suscripciones",
  ncf: "facturacion_fiscal",
  nomina: "nomina",
  delivery: "delivery",
  android_app: "android_app",
  integraciones: "integraciones",
  cotizaciones: "cotizaciones",
  ferreteria: "ferreteria",
  reportes: "reportes",
  config: "pos",
  superadmin: "superadmin",
  global_audit: "superadmin"
};

// Standard role tab permission definitions
export const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  SuperAdmin: [
    "pos", "ferreteria", "inventario", "restaurante", "clientes", "fidelizacion", "compras", "gastos",
    "caja_avanzada", "contabilidad", "reportes_financieros", "manufactura", "ecommerce",
    "suscripciones", "ncf", "nomina", "delivery", "android_app", "integraciones",
    "cotizaciones", "reportes", "config", "superadmin", "global_audit"
  ],
  Propietario: [
    "pos", "ferreteria", "inventario", "restaurante", "clientes", "fidelizacion", "compras", "gastos",
    "caja_avanzada", "contabilidad", "reportes_financieros", "manufactura", "ecommerce",
    "suscripciones", "ncf", "nomina", "delivery", "android_app", "integraciones",
    "cotizaciones", "reportes", "config"
  ],
  Administrador: [
    "pos", "ferreteria", "inventario", "restaurante", "clientes", "fidelizacion", "compras", "gastos",
    "caja_avanzada", "contabilidad", "reportes_financieros", "manufactura", "ecommerce",
    "suscripciones", "ncf", "nomina", "delivery", "android_app", "integraciones",
    "cotizaciones", "reportes"
  ],
  Supervisor: [
    "pos", "ferreteria", "inventario", "restaurante", "clientes", "fidelizacion", "compras", "gastos",
    "caja_avanzada", "delivery", "cotizaciones", "reportes"
  ],
  Vendedor: [
    "pos", "ferreteria", "restaurante", "cotizaciones", "clientes", "fidelizacion"
  ],
  Cajero: [
    "pos", "caja_avanzada", "clientes"
  ],

  "Encargado de inventario": [
    "inventario", "compras", "manufactura", "reportes"
  ],
  Contador: [
    "contabilidad", "reportes_financieros", "gastos", "ncf", "compras", "reportes"
  ],
  Analista: [
    "reportes", "reportes_financieros"
  ],
  "Usuario de consulta": [
    "reportes"
  ]
};

// Permission key to tab fallback map
export const PERMISSION_TO_TABS: Record<string, string[]> = {
  prod_ver: ["inventario", "pos"],
  prod_crear: ["inventario"],
  prod_precios: ["inventario", "pos"],
  pos_descuentos: ["pos"],
  pos_eliminar_linea: ["pos"],
  pos_anular_venta: ["pos"],
  pos_abrir_caja: ["pos", "caja_avanzada"],
  pos_cerrar_caja: ["pos", "caja_avanzada"],
  reportes_ver_costos: ["reportes", "reportes_financieros"],
  reportes_ver_ganancias: ["reportes", "reportes_financieros"],
  inv_ajustar: ["inventario"],
  reportes_exportar: ["reportes"],
  admin_usuarios: ["config"],
  offline_trabajar: ["pos"],
  aprobar_sensibles: ["pos"]
};

export function isTabAllowedForUser(tabId: string, user: User | null, company: Company | null): boolean {
  if (!user || !company) return false;

  // 1. Superadmin tab check
  if (tabId === "superadmin" || tabId === "global_audit") {
    return user.role === "SuperAdmin" || user.permissions?.includes("superadmin") || company.id === "comp_admin";
  }

  // 2. Check if the underlying module is enabled in activeCompany
  const requiredModule = MODULE_TAB_MAPPING[tabId];
  if (requiredModule && requiredModule !== "superadmin") {
    if (requiredModule !== "pos" && company.id !== "comp_admin" && !company.activeModules?.includes(requiredModule)) {
      return false;
    }
  }

  // 3. SuperAdmin, Propietario or Master All
  if (user.role === "SuperAdmin" || user.role === "Propietario" || user.permissions?.includes("all")) {
    return true;
  }

  // 4. Admin Users / Config tab requires explicit admin_usuarios permission or owner status
  if (tabId === "config") {
    return user.permissions?.includes("admin_usuarios") || false;
  }

  // 5. Granular permissions check (if user has defined permissions)
  if (user.permissions && user.permissions.length > 0) {
    for (const permKey of user.permissions) {
      const tabs = PERMISSION_TO_TABS[permKey];
      if (tabs && tabs.includes(tabId)) {
        return true;
      }
    }
  }

  // 6. Role whitelist check
  const allowedTabsByRole = ROLE_ALLOWED_TABS[user.role];
  if (allowedTabsByRole && allowedTabsByRole.includes(tabId)) {
    return true;
  }

  return false;
}

export function getAllowedTabsForUser(user: User | null, company: Company | null): string[] {
  if (!user || !company) return ["pos"];
  const allTabs = [
    "pos", "ferreteria", "inventario", "restaurante", "clientes", "fidelizacion", "compras", "gastos",
    "caja_avanzada", "contabilidad", "reportes_financieros", "manufactura", "ecommerce",
    "suscripciones", "ncf", "nomina", "delivery", "android_app", "integraciones",
    "cotizaciones", "reportes", "config"
  ];

  if (user.role === "SuperAdmin" || user.permissions?.includes("superadmin") || company.id === "comp_admin") {
    allTabs.push("superadmin", "global_audit");
  }

  const filtered = allTabs.filter(t => isTabAllowedForUser(t, user, company));
  return filtered.length > 0 ? filtered : ["pos"];
}

export function isDemoCompany(companyId: string | undefined | null): boolean {
  return false;
}

export interface Quote {
  id: string;
  companyId: string;
  customerId?: string;
  customerName: string;
  date: string;
  validUntil: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  status: "draft" | "approved" | "expired" | "facturada";
  convertedSaleId?: string;
}

export interface FerreteriaOrder {
  id: string;
  companyId: string;
  branchId: string;
  sellerId: string;
  sellerName: string;
  orderName: string; // Ej: "Juan Perez - Varillas y Cemento"
  customerId?: string;
  customerName: string;
  customerRnc?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  status: "pendiente_cobro" | "cobrada" | "cancelada";
  convertedSaleId?: string;
}
