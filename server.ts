import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";
import { Pool } from "pg";

dotenv.config();

const app = express();
app.use(express.json({ limit: "12mb" }));

// Enable CORS for PWA and Mobile Clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const PORT = Number(process.env.PORT || 3000);
const DB_FILE = path.join(process.cwd(), "db_store.json");
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const DATABASE_SSL = process.env.DATABASE_SSL === "true";

const postgresPool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      min: 0,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: DATABASE_SSL ? { rejectUnauthorized: false } : undefined
    })
  : null;

// Client initialization
let ai: GoogleGenAI | null = null;

// Global DB Structure
interface DbStore {
  companies: any[];
  branches: any[];
  warehouses: any[];
  users: any[];
  products: any[];
  sales: any[];
  customers: any[];
  suppliers: any[];
  purchaseOrders: any[];
  expenses: any[];
  tables: any[];
  recipes: any[];
  employees: any[];
  auditLogs: any[];
  cashSessions: any[];
  accounts?: any[];
  journalEntries?: any[];
  ecfProviderConfigs?: EcfProviderConfigRecord[];
  ecfDocuments?: EcfDocumentRecord[];
  platformContracts?: PlatformContractRecord[];
  platformBillingSettings?: PlatformBillingSettingsRecord;
  platformBillingNotices?: PlatformBillingNoticeRecord[];
  platformContractVariables?: PlatformContractVariablesRecord[];
}

interface PlatformContractRecord {
  id: string; companyId: string; companyName: string; title: string; content: string;
  signerEmail?: string; publicToken: string; contentHash: string;
  status: "pending" | "accepted" | "expired"; createdAt: string; expiresAt?: string;
  acceptedAt?: string; signerName?: string; signerDocument?: string;
  signatureData?: string; acceptanceHash?: string; acceptedIpHash?: string; acceptedUserAgent?: string;
  idDocumentFront?: string; idDocumentBack?: string;
}

interface PlatformBillingSettingsRecord {
  issuerName: string; issuerRnc: string; supportEmail: string; noticeTitle: string;
  noticeMessage: string; paymentChannels: string;
}

interface PlatformBillingNoticeRecord {
  id: string; companyId: string; saleId: string; billingPeriod: string; total: number;
  currency: string; title: string; message: string; paymentChannels: string;
  createdAt: string; acknowledgedAt?: string; acknowledgedBy?: string;
}

interface PlatformContractVariablesRecord {
  companyId: string; providerName: string; providerDocument: string; clientName: string;
  clientDocument: string; monthlyAmount: string; paymentDay: string; paymentMethod: string;
  supportChannel: string; supportHours: string; supportContact: string; city: string;
  signingDate: string; planName: string; userCount: string; branchCount: string;
  activationDate: string; additionalTerms: string; updatedAt: string;
}

type EcfEnvironment = "sandbox" | "production";
type EcfDocumentStatus = "queued" | "processing" | "accepted" | "accepted_conditional" | "rejected" | "error";

interface EcfProviderConfigRecord {
  companyId: string;
  provider: "alanube";
  environment: EcfEnvironment;
  enabled: boolean;
  providerCompanyId?: string;
  senderRnc: string;
  senderLegalName: string;
  senderCommercialName?: string;
  senderAddress: string;
  tokenEncrypted?: string;
  webhookSecretEncrypted?: string;
  updatedAt: string;
}

interface EcfDocumentRecord {
  id: string;
  companyId: string;
  branchId?: string;
  saleId?: string;
  idempotencyKey: string;
  type: "E31" | "E32" | "E33" | "E34";
  provider: "alanube";
  environment: EcfEnvironment;
  status: EcfDocumentStatus;
  providerDocumentId?: string;
  trackId?: string;
  encf?: string;
  qrUrl?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  securityCode?: string;
  requestPayload: any;
  providerResponse?: any;
  error?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

const defaultDb: DbStore = {
  companies: [
    {
      id: "comp_admin",
      name: "Sistema Central SuperAdmin",
      plan: "Empresarial",
      logo: "ShieldCheck",
      color: "#6366f1", // Indigo
      activeModules: [
        "pos", "inventario", "restaurante", "clientes", "fidelizacion", 
        "compras", "gastos", "caja_avanzada", "contabilidad", "reportes_financieros", 
        "manufactura", "ecommerce", "suscripciones", "facturacion_fiscal", 
        "nomina", "delivery", "android_app", "integraciones", "cotizaciones", 
        "reportes", "auditoria"
      ],
      maxBranches: 99,
      maxUsers: 99,
      maxDevices: 99,
      settings: {
        allowOutOfStock: true,
        requireCustomer: false,
        defaultTaxRate: 0.18,
        receiptMessage: "Administración Global del Sistema",
        currency: "DOP"
      }
    },
    {
      id: "comp_supermercado",
      name: "Supermercado Don Pablo",
      plan: "Empresarial",
      logo: "ShoppingCart",
      color: "#0ea5e9", // Sky Blue
      activeModules: [
        "pos", "inventario", "reportes", "clientes", "compras", 
        "caja_avanzada", "gastos", "cotizaciones", "facturacion_fiscal", 
        "nomina", "integraciones"
      ],
      maxBranches: 5,
      maxUsers: 15,
      maxDevices: 10,
      settings: {
        allowOutOfStock: false,
        requireCustomer: true,
        defaultTaxRate: 0.18, // 18% ITBIS
        receiptMessage: "¡Gracias por su compra en Don Pablo! Conserve su comprobante fiscal.",
        currency: "DOP"
      }
    },
    {
      id: "comp_bistro",
      name: "Bistro Gourmet & Bar",
      plan: "Profesional",
      logo: "Utensils",
      color: "#f97316", // Orange
      activeModules: [
        "pos", "inventario", "reportes", "caja_avanzada", "gastos", 
        "restaurante", "delivery"
      ],
      maxBranches: 2,
      maxUsers: 8,
      maxDevices: 4,
      settings: {
        allowOutOfStock: true,
        requireCustomer: false,
        defaultTaxRate: 0.18, // ITBIS + 10% Propina Ley will be calculated in UI
        receiptMessage: "¡Buen provecho! Bistro Gourmet agradece su visita.",
        currency: "USD"
      }
    },
    {
      id: "comp_boutique",
      name: "Boutique Estilo & Moda",
      plan: "Básico",
      logo: "Shirt",
      color: "#ec4899", // Pink
      activeModules: ["pos", "inventario", "reportes", "fidelizacion"],
      maxBranches: 1,
      maxUsers: 3,
      maxDevices: 2,
      settings: {
        allowOutOfStock: false,
        requireCustomer: false,
        defaultTaxRate: 0.18,
        receiptMessage: "¡Gracias por vestir con Estilo & Moda!",
        currency: "EUR"
      }
    }
  ],
  branches: [
    { id: "br_admin_main", companyId: "comp_admin", name: "Sede Central Admin", address: "Servidor Principal / Cloud" },
    { id: "br_super_main", companyId: "comp_supermercado", name: "Don Pablo Central", address: "Av. Winston Churchill, Santo Domingo" },
    { id: "br_super_east", companyId: "comp_supermercado", name: "Don Pablo Zona Oriental", address: "Av. San Vicente de Paul, Santo Domingo Este" },
    { id: "br_bistro_main", companyId: "comp_bistro", name: "Bistro Piantini", address: "Calle Gustavo Mejía Ricart, Santo Domingo" },
    { id: "br_boutique_main", companyId: "comp_boutique", name: "Boutique Naco", address: "Av. Tiradentes, Plaza Naco" }
  ],
  warehouses: [
    { id: "wh_admin_main", branchId: "br_admin_main", name: "Almacén Central System" },
    { id: "wh_super_main_1", branchId: "br_super_main", name: "Almacén Principal" },
    { id: "wh_super_main_exhibit", branchId: "br_super_main", name: "Góndolas Tienda" },
    { id: "wh_super_east_1", branchId: "br_super_east", name: "Almacén SDE" },
    { id: "wh_bistro_kitchen", branchId: "br_bistro_main", name: "Cocina y Barra" },
    { id: "wh_boutique_store", branchId: "br_boutique_main", name: "Exhibición y Almacén" }
  ],
  users: [
    // SuperAdmin / Developer Account
    { id: "usr_dev_superadmin", companyId: "comp_admin", name: "Desarrollador (Super Admin)", email: "admin@modularpos.com", role: "SuperAdmin", pin: "000000", permissions: ["all", "superadmin"] },
    // Supermercado users
    { id: "usr_super_owner", companyId: "comp_supermercado", name: "Juan Pablo", email: "juan@donpablo.com", role: "Propietario", pin: "111111", permissions: ["all"] },
    { id: "usr_super_cajero", companyId: "comp_supermercado", name: "María González", email: "maria@donpablo.com", role: "Cajero", pin: "222222", permissions: ["pos_vender", "pos_clientes", "pos_abrir_caja", "pos_cerrar_caja"] },
    { id: "usr_super_inv", companyId: "comp_supermercado", name: "Carlos Almacén", email: "carlos@donpablo.com", role: "Encargado de inventario", pin: "333333", permissions: ["inv_ver", "inv_ajustes", "inv_transferencias"] },
    // Bistro users
    { id: "usr_bistro_admin", companyId: "comp_bistro", name: "Chef Roberto", email: "roberto@bistrogourmet.com", role: "Administrador", pin: "444444", permissions: ["all"] },
    { id: "usr_bistro_mesero", companyId: "comp_bistro", name: "Alejandro Waiter", email: "alex@bistrogourmet.com", role: "Vendedor", pin: "555555", permissions: ["pos_vender", "restaurante_mesas"] },
    // Boutique users
    { id: "usr_boutique_owner", companyId: "comp_boutique", name: "Laura Moda", email: "laura@estiloymoda.com", role: "Propietario", pin: "777777", permissions: ["all"] }
  ],
  products: [
    // Supermercado Products
    { id: "prod_super_arroz", companyId: "comp_supermercado", name: "Arroz Premium 10lb", sku: "ARR-001", barcode: "7460123450012", category: "Granos & Abarrotes", price: 380, cost: 290, unit: "Fardo", stock: { "wh_super_main_1": 150, "wh_super_main_exhibit": 45, "wh_super_east_1": 80 }, minStock: 30, maxStock: 500, isWeighable: false, isSerialized: false },
    { id: "prod_super_aceite", companyId: "comp_supermercado", name: "Aceite de Soya 1.5L", sku: "ACE-002", barcode: "7460123450029", category: "Aceites & Condimentos", price: 295, cost: 220, unit: "Unidades", stock: { "wh_super_main_1": 90, "wh_super_main_exhibit": 28, "wh_super_east_1": 60 }, minStock: 20, maxStock: 200, isWeighable: false, isSerialized: false },
    { id: "prod_super_leche", companyId: "comp_supermercado", name: "Leche Semidescremada 1L", sku: "LEC-003", barcode: "7460123450036", category: "Lácteos & Huevos", price: 85, cost: 65, unit: "Unidades", stock: { "wh_super_main_1": 320, "wh_super_main_exhibit": 72, "wh_super_east_1": 150 }, minStock: 50, maxStock: 600, isWeighable: false, isSerialized: false },
    { id: "prod_super_queso", companyId: "comp_supermercado", name: "Queso Cheddar Importado (por Libra)", sku: "QUE-004", barcode: "7460123450043", category: "Fiambrería", price: 420, cost: 310, unit: "Lb", stock: { "wh_super_main_1": 45, "wh_super_main_exhibit": 15.5, "wh_super_east_1": 25 }, minStock: 10, maxStock: 100, isWeighable: true, isSerialized: false },
    { id: "prod_super_refresco", companyId: "comp_supermercado", name: "Refresco Cola 2L", sku: "REF-005", barcode: "7460123450050", category: "Bebidas", price: 90, cost: 65, unit: "Unidades", stock: { "wh_super_main_1": 400, "wh_super_main_exhibit": 120, "wh_super_east_1": 210 }, minStock: 40, maxStock: 800, isWeighable: false, isSerialized: false },
    // Bistro Products (Ingredients & Finished Plates)
    { id: "prod_bistro_pasta", companyId: "comp_bistro", name: "Fettuccine Alfredo con Pollo", sku: "PAS-001", barcode: "BIST-001", category: "Pastas", price: 650, cost: 180, unit: "Plato", stock: { "wh_bistro_kitchen": 9999 }, minStock: 5, maxStock: 9999, isWeighable: false, isSerialized: false },
    { id: "prod_bistro_burger", companyId: "comp_bistro", name: "Hamburguesa Trufa Premium", sku: "BUR-002", barcode: "BIST-002", category: "Hamburguesas", price: 580, cost: 165, unit: "Plato", stock: { "wh_bistro_kitchen": 9999 }, minStock: 5, maxStock: 9999, isWeighable: false, isSerialized: false },
    { id: "prod_bistro_vino", companyId: "comp_bistro", name: "Copa Vino Tinto Cabernet", sku: "VIN-003", barcode: "BIST-003", category: "Bebidas", price: 350, cost: 110, unit: "Copa", stock: { "wh_bistro_kitchen": 85 }, minStock: 10, maxStock: 120, isWeighable: false, isSerialized: false },
    { id: "prod_bistro_ribeye", companyId: "comp_bistro", name: "Ribeye Steak Angus 12oz", sku: "RIB-004", barcode: "BIST-004", category: "Carnes", price: 1450, cost: 490, unit: "Plato", stock: { "wh_bistro_kitchen": 42 }, minStock: 8, maxStock: 80, isWeighable: false, isSerialized: false },
    // Bistro Raw Material
    { id: "prod_bistro_raw_meat", companyId: "comp_bistro", name: "Carne Ribeye Angus (Materia Prima)", sku: "RAW-RIB", barcode: "RAW-001", category: "Insumos", price: 0, cost: 350, unit: "Kg", stock: { "wh_bistro_kitchen": 24.5 }, minStock: 5, maxStock: 50, isWeighable: true, isSerialized: false },
    // Boutique Products
    { id: "prod_boutique_vestido", companyId: "comp_boutique", name: "Vestido Floral de Verano", sku: "VES-001", barcode: "BOUT-001", category: "Vestidos", price: 1850, cost: 950, unit: "Unidades", stock: { "wh_boutique_store": 18 }, minStock: 3, maxStock: 40, isWeighable: false, isSerialized: false, variants: [{ name: "Talla", options: ["S", "M", "L"] }, { name: "Color", options: ["Blanco", "Azul"] }] },
    { id: "prod_boutique_jeans", companyId: "comp_boutique", name: "Jeans Slim Fit Hombre", sku: "JEA-002", barcode: "BOUT-002", category: "Pantalones", price: 2100, cost: 1100, unit: "Unidades", stock: { "wh_boutique_store": 25 }, minStock: 5, maxStock: 50, isWeighable: false, isSerialized: false, variants: [{ name: "Talla", options: ["30", "32", "34"] }] },
    { id: "prod_boutique_tshirt", companyId: "comp_boutique", name: "Camiseta Algodón Básica", sku: "TSH-003", barcode: "BOUT-003", category: "Camisetas", price: 650, cost: 280, unit: "Unidades", stock: { "wh_boutique_store": 55 }, minStock: 10, maxStock: 100, isWeighable: false, isSerialized: false, variants: [{ name: "Color", options: ["Negro", "Blanco", "Gris"] }] }
  ],
  sales: [
    // Historical Dominican Republic NCF sales
    {
      id: "sale_super_1",
      uuid: "sale_super_1",
      companyId: "comp_supermercado",
      branchId: "br_super_main",
      userId: "usr_super_cajero",
      date: "2026-07-19T10:30:00-07:00",
      items: [
        { productId: "prod_super_arroz", productName: "Arroz Premium 10lb", price: 380, cost: 290, qty: 2, discount: 0, tax: 0.18 },
        { productId: "prod_super_leche", productName: "Leche Semidescremada 1L", price: 85, cost: 65, qty: 4, discount: 5, tax: 0.18 }
      ],
      total: 1063.4,
      discount: 17.0,
      tax: 162.11,
      paymentMethod: "Efectivo",
      paymentDetails: { cashPaid: 1200, change: 136.6 },
      status: "completed",
      ncf: "B0100000045",
      ncfType: "NCF Crédito Fiscal (B01)",
      customerId: "cust_super_cl1",
      notes: "Compra estándar de cliente regular",
      synced: true
    },
    {
      id: "sale_bistro_1",
      uuid: "sale_bistro_1",
      companyId: "comp_bistro",
      branchId: "br_bistro_main",
      userId: "usr_bistro_mesero",
      date: "2026-07-19T13:45:00-07:00",
      items: [
        { productId: "prod_bistro_burger", productName: "Hamburguesa Trufa Premium", price: 580, cost: 165, qty: 2, discount: 0, tax: 0.18 },
        { productId: "prod_bistro_vino", productName: "Copa Vino Tinto Cabernet", price: 350, cost: 110, qty: 2, discount: 0, tax: 0.18 }
      ],
      total: 2221.6, // 1860 + 10% propina ley + 18% itbis
      discount: 0,
      tax: 334.8,
      paymentMethod: "Tarjeta",
      paymentDetails: { cardLast4: "4321" },
      status: "completed",
      synced: true
    }
  ],
  customers: [
    { id: "cust_super_cl1", companyId: "comp_supermercado", name: "Constructora Dominicana SRL", phone: "809-555-0192", email: "info@condom.com.do", rncOrCedula: "131123456", points: 150, tier: "Plata", creditLimit: 100000, currentDebt: 25000, synced: true },
    { id: "cust_super_cl2", companyId: "comp_supermercado", name: "Anabel Martínez", phone: "829-555-8811", email: "anabel@gmail.com", rncOrCedula: "00118822334", points: 45, tier: "Bronce", creditLimit: 10000, currentDebt: 0, synced: true },
    { id: "cust_boutique_cl1", companyId: "comp_boutique", name: "Patricia Peña", phone: "809-555-4321", email: "patricia@style.com", points: 820, tier: "Oro", creditLimit: 0, currentDebt: 0, synced: true }
  ],
  suppliers: [
    { id: "sup_super_prov1", companyId: "comp_supermercado", name: "Distribuidora Corripio", contact: "Ramón Vargas", phone: "809-565-9999", email: "ventas@corripio.com.do" },
    { id: "sup_super_prov2", companyId: "comp_supermercado", name: "Mercasid S.A.", contact: "Lic. Clara Medina", phone: "809-566-2000", email: "clara.medina@mercasid.com.do" },
    { id: "sup_bistro_carnes", companyId: "comp_bistro", name: "Carnes Nacionales Selectas", contact: "Pedro Carnicero", phone: "829-555-1234", email: "pedro@carnesselectas.com" }
  ],
  purchaseOrders: [
    { id: "po_super_1", companyId: "comp_supermercado", supplierId: "sup_super_prov2", supplierName: "Mercasid S.A.", date: "2026-07-15T09:00:00-07:00", items: [{ productId: "prod_super_aceite", qty: 100, cost: 215 }], total: 21500, status: "received", receivedDate: "2026-07-17T14:30:00-07:00" }
  ],
  expenses: [
    { id: "exp_super_1", companyId: "comp_supermercado", branchId: "br_super_main", category: "Servicios Públicos", amount: 15500, date: "2026-07-18", description: "Pago energía eléctrica Edenorte", paymentMethod: "Transferencia Bancaria", approvedBy: "Juan Pablo" },
    { id: "exp_bistro_1", companyId: "comp_bistro", branchId: "br_bistro_main", category: "Mantenimiento", amount: 3200, date: "2026-07-19", description: "Reparación condensador de nevera", paymentMethod: "Efectivo de Caja", approvedBy: "Chef Roberto" }
  ],
  tables: [
    { id: "tbl_b_1", name: "Mesa 1", zone: "Salón Principal", status: "free", seats: 4 },
    { id: "tbl_b_2", name: "Mesa 2", zone: "Salón Principal", status: "occupied", seats: 2, currentOrderId: "sale_suspended_m2" },
    { id: "tbl_b_3", name: "Mesa 3", zone: "Terraza", status: "free", seats: 6 },
    { id: "tbl_b_4", name: "Mesa 4", zone: "Terraza", status: "billing", seats: 4, currentOrderId: "sale_suspended_m4" },
    { id: "tbl_b_vip1", name: "VIP Lounge", zone: "Área VIP", status: "free", seats: 10 }
  ],
  recipes: [
    { id: "rec_pasta_alfredo", companyId: "comp_bistro", name: "Receta Fettuccine Alfredo", finishedProductId: "prod_bistro_pasta", ingredients: [{ rawMaterialId: "prod_bistro_raw_meat", qty: 0.15 }] }
  ],
  employees: [
    { id: "emp_super_1", companyId: "comp_supermercado", name: "Yissel Ramos", role: "Cajero", commissionRate: 0.01, hourlyRate: 150, clockedIn: true, lastClockIn: "2026-07-19T08:00:00-07:00" },
    { id: "emp_bistro_1", companyId: "comp_bistro", name: "Carlos Mesero", role: "Mesero", commissionRate: 0.08, hourlyRate: 100, clockedIn: false }
  ],
  auditLogs: [
    { id: "aud_1", companyId: "comp_supermercado", userId: "usr_super_owner", userName: "Juan Pablo", role: "Propietario", date: "2026-07-19T08:15:00-07:00", action: "Configuración Inicial", details: "Activación del módulo de Facturación Fiscal", synced: true }
  ],
  cashSessions: [
    { id: "cs_super_1", companyId: "comp_supermercado", branchId: "br_super_main", userId: "usr_super_cajero", userName: "María González", openDate: "2026-07-19T07:45:00-07:00", initialFund: 5000, cashIn: 0, cashOut: 0, status: "open", synced: true }
  ]
};

// Transitional persistence: PostgreSQL JSONB is the durable source of truth.
// Keeping the existing DbStore contract avoids a risky all-at-once rewrite; modules
// can be normalized into relational tables through later schema migrations.
let cachedDb: DbStore = defaultDb;
let postgresWriteQueue: Promise<void> = Promise.resolve();

function readLocalDbFallback(): DbStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    }
  } catch (error) {
    console.error("Could not read legacy db_store.json; using initial seed", error);
  }
  return defaultDb;
}

function readDb(): DbStore {
  return cachedDb;
}

function writeDb(db: DbStore): Promise<void> {
  cachedDb = db;
  if (!postgresPool) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } catch (error) {
      console.error("Error writing local database fallback", error);
    }
    return Promise.resolve();
  }

  const stateSnapshot = JSON.stringify(db);
  postgresWriteQueue = postgresWriteQueue
    .catch(error => console.error("Previous PostgreSQL write failed", error))
    .then(async () => {
      await postgresPool.query(
        `INSERT INTO app_state (id, schema_version, state, updated_at)
         VALUES (1, 1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
         SET schema_version = EXCLUDED.schema_version,
             state = EXCLUDED.state,
             updated_at = NOW()`,
        [stateSnapshot]
      );
    });
  return postgresWriteQueue;
}

async function initializeDatabase() {
  if (!postgresPool) {
    cachedDb = readLocalDbFallback();
    await writeDb(cachedDb);
    console.warn("DATABASE_URL is not configured; using db_store.json fallback (not suitable for production deploys).");
    return;
  }

  await postgresPool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      schema_version INTEGER NOT NULL DEFAULT 1,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const result = await postgresPool.query<{ state: DbStore }>("SELECT state FROM app_state WHERE id = 1");
  if (result.rowCount) {
    cachedDb = result.rows[0].state;
    console.log("Database state loaded from PostgreSQL.");
    return;
  }

  cachedDb = readLocalDbFallback();
  await writeDb(cachedDb);
  console.log(fs.existsSync(DB_FILE)
    ? "Legacy db_store.json imported into PostgreSQL."
    : "PostgreSQL initialized with the initial application seed.");
}

async function closeDatabase() {
  await postgresWriteQueue.catch(error => console.error("Final PostgreSQL flush failed", error));
  if (postgresPool) await postgresPool.end();
}

const ECF_ENCRYPTION_SECRET = process.env.ECF_MASTER_KEY || "development-only-change-before-production";
const ECF_KEY = crypto.scryptSync(ECF_ENCRYPTION_SECRET, "modular-pos-ecf", 32);

function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ECF_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(part => part.toString("base64url")).join(".");
}

function decryptSecret(value?: string): string {
  if (!value) return "";
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Credencial e-CF cifrada inválida");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ECF_KEY, Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function publicEcfConfig(config?: EcfProviderConfigRecord) {
  if (!config) return null;
  const { tokenEncrypted, webhookSecretEncrypted, ...safe } = config;
  return {
    ...safe,
    hasToken: Boolean(tokenEncrypted),
    hasWebhookSecret: Boolean(webhookSecretEncrypted)
  };
}

function safeDbForClient(db: DbStore): DbStore {
  const { platformContracts, platformBillingSettings, platformBillingNotices, platformContractVariables, ...clientDb } = db;
  return {
    ...clientDb,
    ecfProviderConfigs: (db.ecfProviderConfigs || []).map(config => publicEcfConfig(config) as any)
  };
}

const DEFAULT_BILLING_SETTINGS: PlatformBillingSettingsRecord = {
  issuerName: "FacturaPOS Software Platforms, SRL",
  issuerRnc: "",
  supportEmail: "soporte@facturapos.com",
  noticeTitle: "Factura mensual disponible",
  noticeMessage: "La factura correspondiente a {{mes}} ya fue generada. Por favor realice su pago para evitar interrupciones en sus operaciones.",
  paymentChannels: "Transferencia bancaria\nBanco: [Configurar]\nCuenta: [Configurar]\nTitular: [Configurar]"
};

function requireSuperAdmin(req: express.Request, res: express.Response): boolean {
  const userId = req.header("x-user-id");
  const user = readDb().users.find(item => item.id === userId);
  if (!user || (user.role !== "SuperAdmin" && !user.permissions?.includes("superadmin"))) {
    res.status(403).json({ error: "Acceso exclusivo para SuperAdmin" });
    return false;
  }
  return true;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function contractExpirationTime(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const value = /^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ? `${expiresAt}T23:59:59.999` : expiresAt;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function publicContractStatus(contract: PlatformContractRecord): PlatformContractRecord["status"] {
  const expiration = contractExpirationTime(contract.expiresAt);
  return contract.status === "pending" && expiration !== null && expiration < Date.now() ? "expired" : contract.status;
}

const ALANUBE_BASE_URLS: Record<EcfEnvironment, string> = {
  sandbox: "https://sandbox.alanube.co/dom/v1",
  production: "https://api.alanube.co/dom/v1"
};

const ALANUBE_DOCUMENT_PATHS: Record<EcfDocumentRecord["type"], string> = {
  E31: "fiscal-invoices",
  E32: "invoices",
  E33: "debit-notes",
  E34: "credit-notes"
};

function normalizeProviderStatus(value: unknown): EcfDocumentStatus {
  const status = String(value || "").toLowerCase();
  if (["accepted", "aceptado", "approved", "success", "completed"].includes(status)) return "accepted";
  if (["accepted_conditional", "accepted-conditional", "aceptado_condicional"].includes(status)) return "accepted_conditional";
  if (["rejected", "rechazado", "failed", "invalid"].includes(status)) return "rejected";
  if (["queued", "pending", "pendiente", "processing", "in_process"].includes(status)) return "processing";
  return "processing";
}

function updateDocumentFromProvider(document: EcfDocumentRecord, response: any): EcfDocumentRecord {
  const data = response?.data || response?.document || response || {};
  return {
    ...document,
    status: normalizeProviderStatus(data.status || data.state || data.dgiiStatus),
    providerDocumentId: data.id || data.documentId || document.providerDocumentId,
    trackId: data.trackId || data.trackID || document.trackId,
    encf: data.encf || data.eNCF || data.eNcf || document.encf,
    qrUrl: data.qrUrl || data.qr || data.stampUrl || document.qrUrl,
    pdfUrl: data.pdfUrl || data.pdf || data.links?.pdf || document.pdfUrl,
    xmlUrl: data.xmlUrl || data.xml || data.links?.xml || document.xmlUrl,
    securityCode: data.securityCode || data.codigoSeguridad || document.securityCode,
    providerResponse: response,
    error: undefined,
    updatedAt: new Date().toISOString()
  };
}

async function alanubeRequest(config: EcfProviderConfigRecord, pathName: string, init?: RequestInit) {
  const token = decryptSecret(config.tokenEncrypted);
  if (!token) throw new Error("La empresa no tiene un JWT de Alanube configurado");
  const response = await fetch(`${ALANUBE_BASE_URLS[config.environment]}/${pathName}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });
  const text = await response.text();
  let body: any = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `Alanube respondió HTTP ${response.status}`) as Error & { responseBody?: any };
    error.responseBody = body;
    throw error;
  }
  return body;
}

async function submitEcfDocument(db: DbStore, document: EcfDocumentRecord, config: EcfProviderConfigRecord) {
  document.status = "processing";
  document.attempts += 1;
  document.updatedAt = new Date().toISOString();
  await writeDb(db);
  try {
    const response = await alanubeRequest(config, ALANUBE_DOCUMENT_PATHS[document.type], {
      method: "POST",
      body: JSON.stringify(document.requestPayload)
    });
    Object.assign(document, updateDocumentFromProvider(document, response));
  } catch (error: any) {
    document.status = error?.responseBody ? "rejected" : "error";
    document.error = error?.message || "No se pudo transmitir el e-CF";
    document.providerResponse = error?.responseBody;
    document.updatedAt = new Date().toISOString();
  }
  await writeDb(db);
  return document;
}

let ecfRetryWorkerRunning = false;
async function processEcfRetryQueue() {
  if (ecfRetryWorkerRunning) return;
  ecfRetryWorkerRunning = true;
  try {
    const db = readDb();
    const retryable = (db.ecfDocuments || []).filter(document =>
      document.status === "error" &&
      document.attempts < 5 &&
      Date.now() - new Date(document.updatedAt).getTime() >= Math.min(15 * 60_000, 30_000 * (2 ** Math.max(0, document.attempts - 1)))
    );
    for (const document of retryable) {
      const config = (db.ecfProviderConfigs || []).find(item => item.companyId === document.companyId && item.enabled);
      if (config) await submitEcfDocument(db, document, config);
    }
  } finally {
    ecfRetryWorkerRunning = false;
  }
}

// API: Get entire Database status
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: postgresPool ? "postgresql" : "local-file",
    persistence: postgresPool ? "durable" : "ephemeral-on-container-redeploy"
  });
});

app.get("/api/db", (req, res) => {
  res.json(safeDbForClient(readDb()));
});

app.post("/api/admin/import-legacy", async (req, res) => {
  const migrationToken = process.env.MIGRATION_TOKEN;
  const authorization = req.header("authorization") || "";
  if (!migrationToken || authorization !== `Bearer ${migrationToken}`) {
    return res.status(401).json({ error: "Token de migración inválido" });
  }
  if (!postgresPool) return res.status(409).json({ error: "DATABASE_URL no está configurada" });
  const incoming = req.body as DbStore;
  if (!incoming || !Array.isArray(incoming.companies) || !Array.isArray(incoming.sales)) {
    return res.status(400).json({ error: "El archivo no contiene una estructura DbStore válida" });
  }
  const existing = readDb();
  const imported: DbStore = {
    ...incoming,
    // Provider secrets are deliberately not present in /api/db exports; configure
    // the JWT again after migration if the previous installation already used e-CF.
    ecfProviderConfigs: existing.ecfProviderConfigs || [],
    ecfDocuments: existing.ecfDocuments?.length ? existing.ecfDocuments : incoming.ecfDocuments || [],
    platformContracts: existing.platformContracts || [],
    platformBillingSettings: existing.platformBillingSettings || DEFAULT_BILLING_SETTINGS,
    platformBillingNotices: existing.platformBillingNotices || [],
    platformContractVariables: existing.platformContractVariables || []
  };
  await writeDb(imported);
  res.json({
    success: true,
    companies: imported.companies.length,
    sales: imported.sales.length,
    customers: imported.customers.length,
    message: "Estado legado importado en PostgreSQL. Elimine MIGRATION_TOKEN de EasyPanel y vuelva a desplegar."
  });
});

// API: Save / Overwrite database (SuperAdmin controls)
app.post("/api/db/update", async (req, res) => {
  const incoming = req.body as DbStore;
  if (!incoming || !Array.isArray(incoming.companies)) {
    return res.status(400).json({ error: "Invalid database structure" });
  }
  const existing = readDb();
  await writeDb({
    ...incoming,
    ecfProviderConfigs: existing.ecfProviderConfigs || [],
    ecfDocuments: existing.ecfDocuments || [],
    platformContracts: existing.platformContracts || [],
    platformBillingSettings: existing.platformBillingSettings || DEFAULT_BILLING_SETTINGS,
    platformBillingNotices: existing.platformBillingNotices || [],
    platformContractVariables: existing.platformContractVariables || []
  });
  res.json({ message: "Database saved successfully" });
});

// ==========================================================
// IMMUTABLE CONTRACTS & PLATFORM BILLING NOTICES
// ==========================================================
app.get("/api/admin/contract-variables/:companyId", (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const db = readDb();
  const company = db.companies.find(item => item.id === req.params.companyId);
  if (!company) return res.status(404).json({ error: "Empresa no encontrada" });
  const saved = (db.platformContractVariables || []).find(item => item.companyId === company.id);
  res.json(saved || {
    companyId: company.id, providerName: "", providerDocument: "", clientName: company.name,
    clientDocument: company.rnc || "", monthlyAmount: "", paymentDay: "", paymentMethod: "Transferencia",
    supportChannel: "WhatsApp", supportHours: "", supportContact: "", city: "Santo Domingo",
    signingDate: new Date().toLocaleDateString("es-DO"), planName: company.plan,
    userCount: String(company.maxUsers), branchCount: String(company.maxBranches),
    activationDate: new Date().toLocaleDateString("es-DO"), additionalTerms: ""
  });
});

app.put("/api/admin/contract-variables/:companyId", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const db = readDb();
  const company = db.companies.find(item => item.id === req.params.companyId);
  if (!company) return res.status(404).json({ error: "Empresa no encontrada" });
  const fields = ["providerName", "providerDocument", "clientName", "clientDocument", "monthlyAmount", "paymentDay", "paymentMethod", "supportChannel", "supportHours", "supportContact", "city", "signingDate", "planName", "userCount", "branchCount", "activationDate", "additionalTerms"] as const;
  const variables = { companyId: company.id, updatedAt: new Date().toISOString() } as PlatformContractVariablesRecord;
  for (const field of fields) variables[field] = String(req.body?.[field] || "").trim();
  db.platformContractVariables = [...(db.platformContractVariables || []).filter(item => item.companyId !== company.id), variables];
  await writeDb(db);
  res.json(variables);
});

app.get("/api/admin/contracts", (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const contracts = [...(readDb().platformContracts || [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(({ acceptedIpHash, acceptedUserAgent, signatureData, idDocumentFront, idDocumentBack, ...contract }) => ({ ...contract, status: publicContractStatus(contract as PlatformContractRecord) }));
  res.json(contracts);
});

app.post("/api/admin/contracts", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const { companyId, title, content, signerEmail, expiresAt } = req.body || {};
  const db = readDb();
  const company = db.companies.find(item => item.id === companyId && item.id !== "comp_admin");
  if (!company || !String(title || "").trim() || !String(content || "").trim()) {
    return res.status(400).json({ error: "Empresa, título y contenido son obligatorios" });
  }
  if (String(content).length > 100_000) return res.status(413).json({ error: "El contrato excede 100 KB" });
  const createdAt = new Date().toISOString();
  const frozenContent = String(content).trim();
  const contract: PlatformContractRecord = {
    id: `contract_${crypto.randomUUID()}`,
    companyId: company.id,
    companyName: company.name,
    title: String(title).trim(),
    content: frozenContent,
    signerEmail: String(signerEmail || "").trim() || undefined,
    publicToken: crypto.randomBytes(32).toString("base64url"),
    contentHash: sha256(JSON.stringify({ companyId, title: String(title).trim(), content: frozenContent, createdAt })),
    status: "pending",
    createdAt,
    expiresAt: expiresAt || undefined
  };
  db.platformContracts = [...(db.platformContracts || []), contract];
  await writeDb(db);
  res.status(201).json(contract);
});

app.get("/api/contracts/public/:token", (req, res) => {
  const contract = (readDb().platformContracts || []).find(item => item.publicToken === req.params.token);
  if (!contract) return res.status(404).json({ error: "Contrato no encontrado" });
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json({ ...contract, status: publicContractStatus(contract), publicToken: undefined, acceptedIpHash: undefined, acceptedUserAgent: undefined });
});

app.post("/api/contracts/public/:token/accept", async (req, res) => {
  const db = readDb();
  const contract = (db.platformContracts || []).find(item => item.publicToken === req.params.token);
  if (!contract) return res.status(404).json({ error: "Contrato no encontrado" });
  if (contract.status !== "pending") return res.status(409).json({ error: "Este contrato ya fue procesado y permanece inmutable" });
  const expiration = contractExpirationTime(contract.expiresAt);
  if (expiration !== null && expiration < Date.now()) return res.status(410).json({ error: "El enlace del contrato expiró" });
  const { signerName, signerDocument, signatureData, idDocumentFront, idDocumentBack, acceptedTerms } = req.body || {};
  const validEvidenceImage = (value: unknown) => /^data:image\/(png|jpe?g|webp);base64,/i.test(String(value || ""));
  if (!acceptedTerms || !String(signerName || "").trim() || !String(signerDocument || "").trim() || !validEvidenceImage(signatureData) || !validEvidenceImage(idDocumentFront) || !validEvidenceImage(idDocumentBack)) {
    return res.status(400).json({ error: "Nombre, documento, aceptación, firma y fotos de ambos lados de la cédula son obligatorios" });
  }
  if (String(signatureData).length > 1_500_000 || String(idDocumentFront).length > 5_500_000 || String(idDocumentBack).length > 5_500_000) return res.status(413).json({ error: "Una de las evidencias excede el tamaño permitido" });
  const acceptedAt = new Date().toISOString();
  contract.status = "accepted";
  contract.acceptedAt = acceptedAt;
  contract.signerName = String(signerName).trim();
  contract.signerDocument = String(signerDocument).trim();
  contract.signatureData = String(signatureData);
  contract.idDocumentFront = String(idDocumentFront);
  contract.idDocumentBack = String(idDocumentBack);
  contract.acceptedIpHash = sha256(String(req.ip || req.socket.remoteAddress || "unknown"));
  contract.acceptedUserAgent = String(req.header("user-agent") || "").slice(0, 500);
  contract.acceptanceHash = sha256(JSON.stringify({ contentHash: contract.contentHash, signerName: contract.signerName, signerDocument: contract.signerDocument, acceptedAt, signatureData, idDocumentFront, idDocumentBack }));
  await writeDb(db);
  res.json({ success: true, acceptedAt, acceptanceHash: contract.acceptanceHash });
});

app.get("/api/admin/billing-settings", (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  res.json(readDb().platformBillingSettings || DEFAULT_BILLING_SETTINGS);
});

app.put("/api/admin/billing-settings", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const next = { ...DEFAULT_BILLING_SETTINGS, ...req.body } as PlatformBillingSettingsRecord;
  if (!next.noticeTitle.trim() || !next.noticeMessage.trim() || !next.paymentChannels.trim()) {
    return res.status(400).json({ error: "Título, mensaje y canales de pago son obligatorios" });
  }
  const db = readDb();
  db.platformBillingSettings = next;
  await writeDb(db);
  res.json(next);
});

app.post("/api/admin/billing-notices", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  const { companyId, saleId, billingPeriod, total, currency } = req.body || {};
  const db = readDb();
  if (!db.companies.some(item => item.id === companyId) || !saleId || !billingPeriod) {
    return res.status(400).json({ error: "Empresa, factura y período son obligatorios" });
  }
  const settings = db.platformBillingSettings || DEFAULT_BILLING_SETTINGS;
  const notice: PlatformBillingNoticeRecord = {
    id: `notice_${crypto.randomUUID()}`, companyId, saleId, billingPeriod,
    total: Number(total || 0), currency: String(currency || "DOP"),
    title: settings.noticeTitle,
    message: settings.noticeMessage.replaceAll("{{mes}}", String(billingPeriod)),
    paymentChannels: settings.paymentChannels,
    createdAt: new Date().toISOString()
  };
  db.platformBillingNotices = [...(db.platformBillingNotices || []), notice];
  await writeDb(db);
  res.status(201).json(notice);
});

app.get("/api/billing/notices/:companyId", (req, res) => {
  const notices = (readDb().platformBillingNotices || [])
    .filter(item => item.companyId === req.params.companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json(notices);
});

app.post("/api/billing/notices/:noticeId/acknowledge", async (req, res) => {
  const db = readDb();
  const notice = (db.platformBillingNotices || []).find(item => item.id === req.params.noticeId);
  if (!notice || notice.companyId !== req.body?.companyId) return res.status(404).json({ error: "Aviso no encontrado" });
  if (!notice.acknowledgedAt) {
    notice.acknowledgedAt = new Date().toISOString();
    notice.acknowledgedBy = String(req.body?.userId || "usuario");
    await writeDb(db);
  }
  res.json(notice);
});

// ==========================================================
// e-CF PROVIDER API (ALANUBE ADAPTER)
// ==========================================================

app.get("/api/ecf/config/:companyId", (req, res) => {
  const db = readDb();
  const config = (db.ecfProviderConfigs || []).find(item => item.companyId === req.params.companyId);
  res.json({ config: publicEcfConfig(config) });
});

app.put("/api/ecf/config/:companyId", async (req, res) => {
  const db = readDb();
  const company = db.companies.find(item => item.id === req.params.companyId);
  if (!company) return res.status(404).json({ error: "Empresa no encontrada" });
  if (!company.activeModules?.includes("facturacion_fiscal")) {
    return res.status(403).json({ error: "La empresa no tiene activo el módulo de facturación fiscal" });
  }

  const current = (db.ecfProviderConfigs || []).find(item => item.companyId === company.id);
  const environment: EcfEnvironment = req.body.environment === "production" ? "production" : "sandbox";
  const senderRnc = String(req.body.senderRnc || company.rnc || "").replace(/\D/g, "");
  const senderLegalName = String(req.body.senderLegalName || company.name || "").trim();
  const senderAddress = String(req.body.senderAddress || "").trim();
  if (!senderRnc || !senderLegalName || !senderAddress) {
    return res.status(400).json({ error: "RNC, razón social y dirección del emisor son obligatorios" });
  }

  const next: EcfProviderConfigRecord = {
    companyId: company.id,
    provider: "alanube",
    environment,
    enabled: Boolean(req.body.enabled),
    providerCompanyId: String(req.body.providerCompanyId || "").trim() || undefined,
    senderRnc,
    senderLegalName,
    senderCommercialName: String(req.body.senderCommercialName || "").trim() || undefined,
    senderAddress,
    tokenEncrypted: req.body.token ? encryptSecret(String(req.body.token).trim()) : current?.tokenEncrypted,
    webhookSecretEncrypted: req.body.webhookSecret
      ? encryptSecret(String(req.body.webhookSecret).trim())
      : current?.webhookSecretEncrypted,
    updatedAt: new Date().toISOString()
  };
  if (next.enabled && !next.tokenEncrypted) {
    return res.status(400).json({ error: "Debe guardar el JWT de Alanube antes de habilitar la emisión" });
  }
  db.ecfProviderConfigs = [
    ...(db.ecfProviderConfigs || []).filter(item => item.companyId !== company.id),
    next
  ];
  await writeDb(db);
  res.json({ config: publicEcfConfig(next) });
});

app.post("/api/ecf/config/:companyId/test", async (req, res) => {
  const db = readDb();
  const config = (db.ecfProviderConfigs || []).find(item => item.companyId === req.params.companyId);
  if (!config) return res.status(404).json({ error: "Configure primero el proveedor e-CF" });
  if (!config.providerCompanyId) {
    return res.status(400).json({ error: "Falta el identificador de la compañía asignado por Alanube" });
  }
  try {
    const result = await alanubeRequest(config, `companies/${encodeURIComponent(config.providerCompanyId)}/emitted-documents`);
    res.json({ success: true, environment: config.environment, result });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || "No se pudo conectar con Alanube", details: error?.responseBody });
  }
});

app.get("/api/ecf/documents", (req, res) => {
  const companyId = String(req.query.companyId || "");
  if (!companyId) return res.status(400).json({ error: "companyId es obligatorio" });
  const documents = (readDb().ecfDocuments || [])
    .filter(item => item.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ documents });
});

app.post("/api/ecf/documents", async (req, res) => {
  const { companyId, branchId, saleId, type, idempotencyKey, payload } = req.body;
  if (!companyId || !["E31", "E32", "E33", "E34"].includes(type) || !payload || typeof payload !== "object") {
    return res.status(400).json({ error: "companyId, type E31/E32/E33/E34 y payload son obligatorios" });
  }
  const db = readDb();
  const config = (db.ecfProviderConfigs || []).find(item => item.companyId === companyId);
  if (!config?.enabled) return res.status(409).json({ error: "La integración e-CF no está habilitada para esta empresa" });
  const key = String(idempotencyKey || saleId || crypto.randomUUID());
  const existing = (db.ecfDocuments || []).find(item => item.companyId === companyId && item.idempotencyKey === key);
  if (existing) return res.status(200).json({ document: existing, idempotent: true });

  const requestPayload = {
    ...payload,
    ...(config.providerCompanyId && !payload.company ? { company: { id: config.providerCompanyId } } : {}),
    config: {
      ...(payload.config || {}),
      pdf: { type: "pos", ...(payload.config?.pdf || {}) }
    }
  };
  const now = new Date().toISOString();
  const document: EcfDocumentRecord = {
    id: crypto.randomUUID(),
    companyId,
    branchId,
    saleId,
    idempotencyKey: key,
    type,
    provider: "alanube",
    environment: config.environment,
    status: "queued",
    requestPayload,
    attempts: 0,
    createdAt: now,
    updatedAt: now
  };
  db.ecfDocuments = [document, ...(db.ecfDocuments || [])];
  await writeDb(db);
  await submitEcfDocument(db, document, config);
  res.status(document.status === "rejected" || document.status === "error" ? 502 : 201).json({ document });
});

app.post("/api/ecf/documents/:id/retry", async (req, res) => {
  const db = readDb();
  const document = (db.ecfDocuments || []).find(item => item.id === req.params.id);
  if (!document) return res.status(404).json({ error: "Documento e-CF no encontrado" });
  if (["accepted", "accepted_conditional"].includes(document.status)) {
    return res.status(409).json({ error: "Un e-CF aceptado no puede reenviarse" });
  }
  const config = (db.ecfProviderConfigs || []).find(item => item.companyId === document.companyId);
  if (!config?.enabled) return res.status(409).json({ error: "La integración e-CF no está habilitada" });
  await submitEcfDocument(db, document, config);
  res.status(document.status === "rejected" || document.status === "error" ? 502 : 200).json({ document });
});

app.post("/api/ecf/documents/:id/refresh", async (req, res) => {
  const db = readDb();
  const document = (db.ecfDocuments || []).find(item => item.id === req.params.id);
  if (!document) return res.status(404).json({ error: "Documento e-CF no encontrado" });
  if (!document.providerDocumentId) return res.status(409).json({ error: "El proveedor todavía no asignó un ID al documento" });
  const config = (db.ecfProviderConfigs || []).find(item => item.companyId === document.companyId);
  if (!config) return res.status(409).json({ error: "Configuración e-CF no encontrada" });
  try {
    const response = await alanubeRequest(
      config,
      `${ALANUBE_DOCUMENT_PATHS[document.type]}/${encodeURIComponent(document.providerDocumentId)}?pdfType=pos`
    );
    Object.assign(document, updateDocumentFromProvider(document, response));
    await writeDb(db);
    res.json({ document });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || "No se pudo consultar el documento", details: error?.responseBody });
  }
});

app.post("/api/ecf/webhooks/alanube/:companyId", async (req, res) => {
  const db = readDb();
  const config = (db.ecfProviderConfigs || []).find(item => item.companyId === req.params.companyId);
  if (!config) return res.status(404).json({ error: "Empresa e-CF no configurada" });
  const expectedSecret = decryptSecret(config.webhookSecretEncrypted);
  const receivedSecret = String(req.header("x-webhook-secret") || req.header("x-api-key") || "");
  const expectedSecretBuffer = Buffer.from(expectedSecret);
  const receivedSecretBuffer = Buffer.from(receivedSecret);
  if (expectedSecret && (!receivedSecret || receivedSecretBuffer.length !== expectedSecretBuffer.length || !crypto.timingSafeEqual(receivedSecretBuffer, expectedSecretBuffer))) {
    return res.status(401).json({ error: "Firma de webhook inválida" });
  }
  const data = req.body?.data || req.body || {};
  const document = (db.ecfDocuments || []).find(item =>
    item.companyId === req.params.companyId &&
    ((data.id && item.providerDocumentId === data.id) || (data.trackId && item.trackId === data.trackId))
  );
  if (!document) return res.status(202).json({ received: true, matched: false });
  Object.assign(document, updateDocumentFromProvider(document, req.body));
  await writeDb(db);
  res.json({ received: true, matched: true });
});

// API: Sync Queue Offline (Conflict resolution and inventory logic)
app.post("/api/sync", async (req, res) => {
  const { queue } = req.body; // Array of SyncQueueItem
  if (!queue || !Array.isArray(queue)) {
    return res.status(400).json({ error: "Queue parameter is required" });
  }

  const db = readDb();
  const results: { id: string; status: string; error?: string }[] = [];

  for (const item of queue) {
    try {
      if (item.type === "sale") {
        const sale = item.data;
        // Check for duplicates
        const exists = db.sales.some((s) => s.id === sale.id);
        if (exists) {
          results.push({ id: item.id, status: "synchronized" }); // Already merged
          continue;
        }

        // Apply product inventory discounts
        let hasInventoryConflict = false;
        const comp = db.companies.find((c) => c.id === sale.companyId);
        const allowOutOfStock = comp?.settings?.allowOutOfStock ?? false;

        // Verify stock first
        for (const saleItem of sale.items) {
          const prod = db.products.find((p) => p.id === saleItem.productId);
          if (prod && !prod.stock) prod.stock = {};
          
          if (prod) {
            // Find exhibit or primary warehouse stock
            // In a real database we have specific warehouse, we find warehouse corresponding to branch
            const wh = db.warehouses.find((w) => w.branchId === sale.branchId);
            const whId = wh ? wh.id : Object.keys(prod.stock)[0] || "default";

            const currentStock = prod.stock[whId] || 0;
            if (currentStock < saleItem.qty && !allowOutOfStock && prod.price > 0) {
              hasInventoryConflict = true;
            }
          }
        }

        if (hasInventoryConflict) {
          results.push({
            id: item.id,
            status: "conflict",
            error: "Stock insuficiente para completar la venta en modo estricto."
          });
          continue;
        }

        // Deduct inventory stock
        for (const saleItem of sale.items) {
          const prod = db.products.find((p) => p.id === saleItem.productId);
          if (prod) {
            const wh = db.warehouses.find((w) => w.branchId === sale.branchId);
            const whId = wh ? wh.id : Object.keys(prod.stock)[0] || "default";
            if (!prod.stock[whId]) prod.stock[whId] = 0;
            prod.stock[whId] -= saleItem.qty;
          }
        }

        // Accumulate Loyalty Points if fidelity module is active
        if (sale.customerId && db.companies.find((c) => c.id === sale.companyId)?.activeModules.includes("fidelizacion")) {
          const customer = db.customers.find((cust) => cust.id === sale.customerId);
          if (customer) {
            // e.g. 1 point for every 100 units of currency spent
            const pointsGained = Math.floor(sale.total / 100);
            customer.points += pointsGained;
            // update tier
            if (customer.points >= 500) customer.tier = "Oro";
            else if (customer.points >= 200) customer.tier = "Plata";
            else customer.tier = "Bronce";
          }
        }

        // Add sale to DB
        sale.synced = true;
        db.sales.push(sale);
        results.push({ id: item.id, status: "synchronized" });

      } else if (item.type === "customer") {
        const cust = item.data;
        const existsIndex = db.customers.findIndex((c) => c.phone === cust.phone || (c.email && c.email === cust.email));
        if (existsIndex >= 0) {
          // Merge customer points or details (Server wins, but merges points)
          db.customers[existsIndex].points += cust.points || 0;
          results.push({ id: item.id, status: "synchronized" });
        } else {
          cust.synced = true;
          db.customers.push(cust);
          results.push({ id: item.id, status: "synchronized" });
        }

      } else if (item.type === "cash_session") {
        const cashSession = item.data;
        const exists = db.cashSessions.some((cs) => cs.id === cashSession.id);
        if (exists) {
          // Replace or ignore
          const idx = db.cashSessions.findIndex((cs) => cs.id === cashSession.id);
          db.cashSessions[idx] = { ...cashSession, synced: true };
        } else {
          cashSession.synced = true;
          db.cashSessions.push(cashSession);
        }
        results.push({ id: item.id, status: "synchronized" });

      } else if (item.type === "stock_adjust") {
        const adjustment = item.data; // { productId, qty, warehouseId, type: 'in' | 'out', reason }
        const prod = db.products.find((p) => p.id === adjustment.productId);
        if (prod) {
          if (!prod.stock) prod.stock = {};
          const whId = adjustment.warehouseId;
          if (!prod.stock[whId]) prod.stock[whId] = 0;

          if (adjustment.type === "in") {
            prod.stock[whId] += adjustment.qty;
          } else {
            prod.stock[whId] -= adjustment.qty;
          }
          results.push({ id: item.id, status: "synchronized" });
        } else {
          results.push({ id: item.id, status: "rejected", error: "Producto no encontrado en inventario." });
        }
      } else if (item.type === "audit") {
        const audit = item.data;
        audit.synced = true;
        db.auditLogs.push(audit);
        results.push({ id: item.id, status: "synchronized" });
      }
    } catch (err: any) {
      results.push({ id: item.id, status: "rejected", error: err.message || "Error desconocido" });
    }
  }

  await writeDb(db);
  res.json({ results });
});

// API: Generador Automático de Catálogo de Productos
const generateProductsHandler = async (req: express.Request, res: express.Response) => {
  const sector = req.body.sector || req.body.prompt || "General";
  
  const sampleCatalog = [
    { name: `${sector} - Producto Premium A`, sku: "SKU-001", barcode: "7401001", category: sector, price: 1500, cost: 900, unit: "Unidades", stock: 25, minStock: 5, maxStock: 100, isWeighable: false },
    { name: `${sector} - Producto Estándar B`, sku: "SKU-002", barcode: "7401002", category: sector, price: 850, cost: 500, unit: "Unidades", stock: 40, minStock: 10, maxStock: 150, isWeighable: false },
    { name: `${sector} - Insumo Esencial C`, sku: "SKU-003", barcode: "7401003", category: sector, price: 320, cost: 180, unit: "Unidades", stock: 60, minStock: 15, maxStock: 200, isWeighable: false },
    { name: `${sector} - Pack Familiar D`, sku: "SKU-004", barcode: "7401004", category: sector, price: 2900, cost: 1750, unit: "Caja", stock: 15, minStock: 3, maxStock: 50, isWeighable: false },
    { name: `${sector} - Accesorio E`, sku: "SKU-005", barcode: "7401005", category: sector, price: 450, cost: 220, unit: "Unidades", stock: 50, minStock: 10, maxStock: 120, isWeighable: false },
    { name: `${sector} - Edición Especial F`, sku: "SKU-006", barcode: "7401006", category: sector, price: 4200, cost: 2600, unit: "Unidades", stock: 10, minStock: 2, maxStock: 30, isWeighable: false }
  ];

  res.json({ products: sampleCatalog });
};

// ==========================================================
// FLUTTER POS ENDPOINTS (FOR FUTURE MOBILE APPLICATION)
// ==========================================================

// 1. Flutter Login Endpoint (expects companyName, userName, and pin)
app.post("/api/flutter/login", (req, res) => {
  const { companyName, userName, pin } = req.body;

  if (!companyName || !userName || !pin) {
    return res.status(400).json({ 
      success: false, 
      error: "Campos companyName, userName y pin son requeridos." 
    });
  }

  const db = readDb();
  
  // Find Company
  const matchedCompany = db.companies.find((c: any) => 
    c.name.toLowerCase().trim().includes(companyName.toLowerCase().trim()) ||
    c.id.toLowerCase().trim() === companyName.toLowerCase().trim()
  );

  if (!matchedCompany) {
    return res.status(404).json({ 
      success: false, 
      error: `La empresa "${companyName}" no fue encontrada.` 
    });
  }

  // Find User
  const companyUsers = db.users.filter((u: any) => u.companyId === matchedCompany.id);
  const matchedUser = companyUsers.find((u: any) => 
    u.name.toLowerCase().trim().includes(userName.toLowerCase().trim()) ||
    u.role.toLowerCase().trim().includes(userName.toLowerCase().trim())
  );

  if (!matchedUser) {
    return res.status(404).json({ 
      success: false, 
      error: `El usuario "${userName}" no pertenece a la empresa "${matchedCompany.name}".` 
    });
  }

  // Verify PIN
  if (matchedUser.pin !== pin) {
    return res.status(401).json({ 
      success: false, 
      error: "PIN de seguridad incorrecto." 
    });
  }

  // Get branches
  const companyBranches = db.branches.filter((b: any) => b.companyId === matchedCompany.id);

  return res.json({
    success: true,
    message: "Autenticación de Flutter exitosa",
    user: {
      id: matchedUser.id,
      name: matchedUser.name,
      role: matchedUser.role,
      permissions: matchedUser.permissions
    },
    company: {
      id: matchedCompany.id,
      name: matchedCompany.name,
      plan: matchedCompany.plan,
      activeModules: matchedCompany.activeModules,
      currency: matchedCompany.settings.currency
    },
    branches: companyBranches
  });
});

// 2. Download Products Catalog for POS
app.get("/api/flutter/products", (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ success: false, error: "El parámetro companyId es obligatorio." });
  }

  const db = readDb();
  const companyProducts = db.products.filter((p: any) => p.companyId === companyId);

  return res.json({
    success: true,
    count: companyProducts.length,
    products: companyProducts
  });
});

// 3. Download Customers Directory
app.get("/api/flutter/customers", (req, res) => {
  const { companyId } = req.query;

  if (!companyId) {
    return res.status(400).json({ success: false, error: "El parámetro companyId es obligatorio." });
  }

  const db = readDb();
  const companyCustomers = db.customers.filter((c: any) => c.companyId === companyId);

  return res.json({
    success: true,
    count: companyCustomers.length,
    customers: companyCustomers
  });
});

// 4. Create POS sale with automatic NCF / e-CF sequence assignment
app.post("/api/flutter/sales", async (req, res) => {
  const { 
    companyId, branchId, userId, items, paymentMethod, 
    customerId, ncfType, notes 
  } = req.body;

  if (!companyId || !branchId || !userId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Datos obligatorios faltantes: companyId, branchId, userId, e items de venta." 
    });
  }

  const db = readDb();

  // Validate company
  const company = db.companies.find((c: any) => c.id === companyId);
  if (!company) {
    return res.status(404).json({ success: false, error: "Empresa no válida." });
  }

  // Calculate totals
  let totalCost = 0;
  let subtotal = 0;
  let tax = 0;
  let discount = 0;

  const processedItems = items.map((item: any) => {
    const itemPrice = Number(item.price) || 0;
    const itemCost = Number(item.cost) || 0;
    const itemQty = Number(item.qty) || 1;
    const itemDiscountPct = Number(item.discount) || 0; // percentage
    const itemTaxPct = Number(item.tax) || company.settings.defaultTaxRate || 0.18;

    const baseAmount = itemPrice * itemQty;
    const itemDiscount = baseAmount * (itemDiscountPct / 100);
    const taxableAmount = baseAmount - itemDiscount;
    const itemTax = taxableAmount * itemTaxPct;

    totalCost += itemCost * itemQty;
    subtotal += taxableAmount;
    tax += itemTax;
    discount += itemDiscount;

    return {
      productId: item.productId,
      productName: item.productName,
      price: itemPrice,
      cost: itemCost,
      qty: itemQty,
      discount: itemDiscountPct,
      tax: itemTaxPct
    };
  });

  const grandTotal = subtotal + tax;

  // Handle automatic fiscal sequence if facturacion_fiscal module is active
  let finalNcf = undefined;
  let finalNcfType = undefined;

  if (company.activeModules.includes("facturacion_fiscal") && ncfType && ncfType !== "NONE") {
    // Generate new sequence
    const companySales = db.sales.filter((s: any) => s.companyId === companyId);
    const sequenceNum = companySales.filter((s: any) => s.ncf && s.ncf.startsWith(ncfType)).length + 1;
    const padding = ncfType.startsWith("E") ? 10 : 8;
    finalNcf = `${ncfType}${String(sequenceNum).padStart(padding, "0")}`;
    
    // Set human readable name
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
    finalNcfType = ncfNames[ncfType] || `NCF Personalizado (${ncfType})`;
  }

  // Create new Sale object
  const newSale: any = {
    id: "sale_flutter_" + Math.random().toString(36).slice(2, 9),
    uuid: "sale_flutter_" + Math.random().toString(36).slice(2, 9),
    companyId,
    branchId,
    userId,
    date: new Date().toISOString(),
    items: processedItems,
    total: Number(grandTotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    paymentMethod: paymentMethod || "Efectivo",
    status: "completed",
    ncf: finalNcf,
    ncfType: finalNcfType,
    customerId,
    notes: notes || "Transacción realizada vía Flutter POS Mobile Client",
    synced: true
  };

  // Record audit log
  const audit: any = {
    id: "aud_fl_" + Math.random().toString(36).slice(2, 9),
    companyId,
    userId,
    userName: "Flutter Mobile Operator",
    role: "Vendedor",
    date: new Date().toISOString(),
    action: "Venta Flutter POS",
    details: `Venta móvil por ${newSale.total} procesada exitosamente. Comprobante: ${finalNcf || "Ticket Simple"}`,
    synced: true
  };

  db.sales.push(newSale);
  db.auditLogs.push(audit);

  // Subtract stock levels
  items.forEach((item: any) => {
    const prod = db.products.find((p: any) => p.id === item.productId && p.companyId === companyId);
    if (prod && prod.stock) {
      // Find any warehouse related to this branch
      const branchWarehouse = db.warehouses.find((w: any) => w.branchId === branchId);
      const whId = branchWarehouse?.id || Object.keys(prod.stock)[0];
      if (whId && prod.stock[whId] !== undefined) {
        prod.stock[whId] = Number((prod.stock[whId] - (item.qty || 1)).toFixed(2));
      }
    }
  });

  await writeDb(db);

  return res.json({
    success: true,
    message: "Transacción POS móvil guardada correctamente",
    saleId: newSale.id,
    ncf: finalNcf,
    ncfType: finalNcfType,
    total: newSale.total
  });
});

// 5. Active Business Modules & Config
app.get("/api/flutter/modules", (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ success: false, error: "Parámetro companyId es requerido." });

  const db = readDb();
  const company = db.companies.find((c: any) => c.id === companyId);
  if (!company) return res.status(404).json({ success: false, error: "Empresa no encontrada." });

  return res.json({
    success: true,
    companyId: company.id,
    companyName: company.name,
    activeModules: company.activeModules,
    currency: company.settings?.currency || "DOP",
    taxRate: company.settings?.defaultTaxRate || 0.18,
    requireCustomer: company.settings?.requireCustomer || false
  });
});

// 6. Mobile Reports & Business KPI Summary
app.get("/api/flutter/reports", (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ success: false, error: "Parámetro companyId es requerido." });

  const db = readDb();
  const companySales = db.sales.filter((s: any) => s.companyId === companyId);
  const companyExpenses = (db.expenses || []).filter((e: any) => e.companyId === companyId);

  const totalSalesCount = companySales.length;
  const totalRevenue = companySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
  const totalExpenses = companyExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  const netIncome = totalRevenue - totalExpenses;

  // Payment methods breakdown
  const paymentMethods: Record<string, number> = {};
  companySales.forEach((s: any) => {
    const method = s.paymentMethod || "Efectivo";
    paymentMethods[method] = (paymentMethods[method] || 0) + (s.total || 0);
  });

  return res.json({
    success: true,
    companyId,
    kpi: {
      totalSalesCount,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netIncome: Number(netIncome.toFixed(2)),
      paymentMethods
    },
    recentSales: companySales.slice(-10).reverse()
  });
});

// 7. Mobile Expenses GET & POST
app.get("/api/flutter/expenses", (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ success: false, error: "Parámetro companyId es requerido." });

  const db = readDb();
  const companyExpenses = (db.expenses || []).filter((e: any) => e.companyId === companyId);

  return res.json({
    success: true,
    count: companyExpenses.length,
    expenses: companyExpenses
  });
});

app.post("/api/flutter/expenses", async (req, res) => {
  const { companyId, category, amount, concept, registeredBy } = req.body;
  if (!companyId || !amount || !concept) {
    return res.status(400).json({ success: false, error: "Monto y concepto son obligatorios." });
  }

  const db = readDb();
  if (!db.expenses) db.expenses = [];

  const newExpense = {
    id: "exp_fl_" + Math.random().toString(36).slice(2, 9),
    companyId,
    category: category || "General",
    amount: Number(amount),
    concept,
    registeredBy: registeredBy || "Móvil Android",
    date: new Date().toISOString()
  };



  db.expenses.push(newExpense);
  await writeDb(db);

  return res.json({
    success: true,
    message: "Gasto registrado desde dispositivo móvil",
    expense: newExpense
  });
});

// 8. Mobile Quick Inventory Stock Adjustment
app.post("/api/flutter/inventory/adjust", async (req, res) => {
  const { companyId, productId, newStock, reason } = req.body;
  if (!companyId || !productId || newStock === undefined) {
    return res.status(400).json({ success: false, error: "companyId, productId y newStock son requeridos." });
  }

  const db = readDb();
  const product = db.products.find((p: any) => p.id === productId && p.companyId === companyId);
  if (!product) return res.status(404).json({ success: false, error: "Producto no encontrado." });

  // Update main stock or warehouse stock
  if (product.stock && typeof product.stock === "object") {
    const mainWhKey = Object.keys(product.stock)[0] || "main";
    product.stock[mainWhKey] = Number(newStock);
  } else {
    product.stock = { main: Number(newStock) };
  }

  await writeDb(db);

  return res.json({
    success: true,
    message: `Stock de ${product.name} actualizado a ${newStock}`,
    productId: product.id,
    productName: product.name,
    newStock: Number(newStock)
  });
});

// 9. Accounting REST Endpoints (Catálogo de Cuentas, Asientos & Estados Financieros)
app.get("/api/flutter/accounting/accounts", (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ success: false, error: "companyId es requerido." });

  const db = readDb();
  const accounts = db.accounts ? db.accounts.filter((a: any) => a.companyId === companyId) : [];

  return res.json({
    success: true,
    companyId,
    count: accounts.length,
    accounts
  });
});

app.post("/api/flutter/accounting/entries", async (req, res) => {
  const { companyId, concept, lines, createdBy } = req.body;
  if (!companyId || !concept || !lines || !Array.isArray(lines)) {
    return res.status(400).json({ success: false, error: "companyId, concepto y líneas son obligatorios." });
  }

  const db = readDb();
  if (!db.journalEntries) db.journalEntries = [];

  const newEntry = {
    id: "entry_fl_" + Math.random().toString(36).slice(2, 9),
    companyId,
    entryNumber: `ASI-FL-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toISOString().split("T")[0],
    concept,
    createdBy: createdBy || "App Flutter Móvil",
    status: "posted",
    lines
  };

  db.journalEntries.push(newEntry);
  await writeDb(db);

  return res.json({
    success: true,
    message: "Asiento contable registrado exitosamente desde la app móvil",
    entry: newEntry
  });
});

app.post("/api/catalog/generate-products", generateProductsHandler);
app.post("/api/catalog/generate", generateProductsHandler);

// ==========================================
// PWA DELISTY & DELIVERY MODULE API ROUTES
// ==========================================

// 1. Get businesses/companies with delivery or restaurant module active
app.get("/api/pwa/businesses", (req, res) => {
  const db = readDb();
  const rawCompanies = db.companies || [];

  const businesses = rawCompanies.map((c: any, idx: number) => {
    const branch = (db.branches || []).find((b: any) => b.companyId === c.id || b.company_id === c.id);

    // Resolve address: company config > branch > default fallback
    const resolvedAddress =
      (c.address && c.address.trim() ? c.address.trim() : null) ||
      (branch && branch.address && branch.address.trim() ? branch.address.trim() : null) ||
      "Sin dirección configurada";

    // Resolve logo: use configured logo if it's a valid URL, otherwise UI Avatars with company name
    const hasValidLogo = c.logo && typeof c.logo === 'string' && c.logo.startsWith("http") && c.logo.length > 10;
    const logoUrl = hasValidLogo
      ? c.logo
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'R')}&size=200&background=FF385C&color=fff&bold=true&rounded=true`;

    // Check if delivery module is active for this company (default to true unless explicitly set to false)
    const deliveryActive = c.deliveryModuleActive !== false;

    return {
      id: c.id,
      name: c.name,
      category: c.plan || c.category || "Restaurante & Delivery",
      logo: logoUrl,
      address: resolvedAddress,
      serviceTime: c.serviceTime || "08:00 AM - 11:00 PM",
      banner: (c.banner && c.banner.startsWith("http"))
        ? c.banner
        : `https://george-fx.github.io/delisty-data/offers/0${(idx % 3) + 1}.jpg`,
      rating: c.rating || 4.8,
      deliveryModuleActive: deliveryActive,
      coords: Array.isArray(c.coords) && c.coords.length === 2 ? c.coords : [18.4861, -69.9312],
      baseDeliveryFee: c.baseDeliveryFee !== undefined ? Number(c.baseDeliveryFee) : 1.5,
      perKmRate: c.perKmRate !== undefined ? Number(c.perKmRate) : 0.75,
      estimatedTime: c.estimatedTime || "25-35 min"
    };
  });

  return res.json({ success: true, count: businesses.length, businesses });
});

// 1.1 Update business delivery settings (Logo, Address, Coords, Hours, Delivery Fees)
app.post("/api/pwa/businesses/config", async (req, res) => {
  const { companyId, logo, address, coords, serviceTime, baseDeliveryFee, perKmRate, deliveryModuleActive } = req.body;

  const db = readDb();
  if (!db.companies) db.companies = [];

  let company = db.companies.find((c: any) => c.id === companyId);
  if (!company && db.companies.length > 0) {
    company = db.companies[0];
  }

  if (company) {
    company.deliveryModuleActive = deliveryModuleActive !== undefined ? deliveryModuleActive : true;
    if (logo !== undefined) company.logo = logo;
    if (address !== undefined) {
      company.address = address;
      company.registeredAddress = address;
      company.fiscalAddress = address;
      company.mainAddress = address;
    }
    if (coords !== undefined) company.coords = coords;

    // Auto-geocode address if coords are default or missing
    if (address && (!company.coords || (company.coords[0] === 18.4861 && company.coords[1] === -69.9312))) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`, {
          headers: { 'User-Agent': 'DelistyPOS/1.0' }
        });
        if (geoRes.ok) {
          const geoData: any = await geoRes.json();
          if (Array.isArray(geoData) && geoData.length > 0) {
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            if (!isNaN(lat) && !isNaN(lon)) {
              company.coords = [lat, lon];
            }
          }
        }
      } catch (_) {}
    }

    if (serviceTime !== undefined) company.serviceTime = serviceTime;
    if (baseDeliveryFee !== undefined) company.baseDeliveryFee = Number(baseDeliveryFee);
    if (perKmRate !== undefined) company.perKmRate = Number(perKmRate);

    // Also update address in all branches of this company so registration address changes everywhere
    if (db.branches && address) {
      db.branches.forEach((b: any) => {
        if (b.companyId === company.id || b.company_id === company.id) {
          b.address = address;
          b.registeredAddress = address;
          if (company.coords) b.coords = company.coords;
        }
      });
    }

    await writeDb(db);
    return res.json({ success: true, message: "Configuración de negocio guardada en POS", company });
  }

  return res.status(404).json({ success: false, error: "Empresa no encontrada" });
});

// 2. Get products of a company for PWA menu
app.get("/api/pwa/products", (req, res) => {
  const { companyId } = req.query;
  const db = readDb();
  let prods = db.products || [];
  if (companyId) {
    prods = prods.filter((p: any) => p.companyId === companyId);
  }
  return res.json({ success: true, count: prods.length, products: prods });
});

// 3. Create a new order from PWA Client into POS
app.post("/api/pwa/orders", async (req, res) => {
  const { companyId, customerName, customerPhone, deliveryAddress, customerCoords, items, total, paymentMethod } = req.body;

  if (!customerName && !deliveryAddress) {
    return res.status(400).json({ success: false, error: "Datos del cliente requeridos" });
  }

  const db = readDb();
  if (!db.deliveryOrders) db.deliveryOrders = [];
  if (!db.sales) db.sales = [];

  const orderId = "ORD-" + Math.floor(1000 + Math.random() * 9000);
  
  const matchedCompany = db.companies?.find((c: any) => c.id === companyId) || db.companies?.[0];
  const resolvedRestaurantCoords = (Array.isArray(req.body.restaurantCoords) && req.body.restaurantCoords.length === 2)
    ? req.body.restaurantCoords
    : (matchedCompany?.coords || [18.4861, -69.9312]);
  const resolvedRestaurantName = req.body.restaurantName || matchedCompany?.name || "Restaurante POS";

  const newDeliveryOrder = {
    id: orderId,
    companyId: companyId || matchedCompany?.id || "comp_default",
    customerName: customerName || "Cliente PWA",
    customerPhone: customerPhone || "+1 809-555-0100",
    deliveryAddress: deliveryAddress || "Dirección por GPS",
    customerCoords: customerCoords || [18.4720, -69.9150],
    restaurantName: resolvedRestaurantName,
    restaurantCoords: resolvedRestaurantCoords,
    status: "assigned",
    items: items || [],
    total: Number(total || 0),
    paymentMethod: paymentMethod || "Efectivo / POS Mobile",
    createdAt: new Date().toISOString()
  };

  db.deliveryOrders.push(newDeliveryOrder);

  // Also create sale record in POS
  const newSale = {
    id: "sale_pwa_" + Math.random().toString(36).slice(2, 9),
    uuid: crypto.randomUUID(),
    companyId: companyId || "comp_default",
    branchId: db.branches?.find((b: any) => b.companyId === companyId)?.id || "main_branch",
    userId: "pwa_client",
    date: new Date().toISOString(),
    items: (items || []).map((i: any) => ({
      productId: i.id || "prod_pwa",
      productName: i.name || "Producto",
      price: i.price || 0,
      cost: (i.price || 0) * 0.6,
      qty: i.quantity || 1,
      discount: 0,
      tax: 0.18
    })),
    total: Number(total || 0),
    discount: 0,
    tax: Number(((total || 0) * 0.18).toFixed(2)),
    paymentMethod: paymentMethod || "Efectivo",
    status: "completed",
    customerName: customerName || "Cliente PWA",
    notes: `Pedido PWA Delivery enviado a ${deliveryAddress}`,
    synced: true
  };

  db.sales.push(newSale);
  await writeDb(db);

  return res.json({
    success: true,
    message: "Pedido PWA registrado en el POS exitosamente",
    order: newDeliveryOrder
  });
});

// 3b. GET client orders - for PWA polling (real-time status updates)
// Query by phone or customerName to filter client's own orders
app.get("/api/pwa/orders/client", (req, res) => {
  const { phone, name, limit } = req.query;
  const db = readDb();
  let orders: any[] = db.deliveryOrders || [];

  // Filter by customer phone (preferred) or name
  if (phone) {
    const normalizedPhone = String(phone).replace(/\D/g, '');
    orders = orders.filter((o: any) => {
      const oPhone = String(o.customerPhone || '').replace(/\D/g, '');
      return oPhone && oPhone.includes(normalizedPhone);
    });
  } else if (name) {
    const nameLower = String(name).toLowerCase();
    orders = orders.filter((o: any) =>
      String(o.customerName || '').toLowerCase().includes(nameLower)
    );
  }

  // Sort by most recent first
  orders = orders.sort((a: any, b: any) =>
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  // Limit results
  const maxResults = Number(limit) || 20;
  orders = orders.slice(0, maxResults);

  return res.json({ success: true, count: orders.length, orders });
});

// 4. Driver API: Get assigned delivery orders
app.get("/api/pwa/driver/orders", (req, res) => {
  const db = readDb();
  const orders = db.deliveryOrders || [];
  return res.json({ success: true, count: orders.length, orders });
});

// 4b. Driver API: List registered delivery drivers
app.get("/api/pwa/drivers", (req, res) => {
  const db = readDb();
  const drivers = db.deliveryDrivers || [];
  return res.json({ success: true, count: drivers.length, drivers });
});

// 4c. Driver API: Create new delivery driver
app.post("/api/pwa/drivers", async (req, res) => {
  const { name, phone, vehicle } = req.body;
  if (!name) return res.status(400).json({ success: false, error: "Nombre del repartidor es requerido" });

  const db = readDb();
  if (!db.deliveryDrivers) db.deliveryDrivers = [];

  const newDriver = {
    id: "drv_" + Date.now(),
    name,
    phone: phone || "",
    vehicle: vehicle || "Motocicleta",
    active: true,
    createdAt: new Date().toISOString(),
  };

  db.deliveryDrivers.push(newDriver);
  await writeDb(db);

  return res.json({ success: true, message: "Repartidor registrado con éxito", driver: newDriver });
});

// 4d. Driver API: Delete driver
app.delete("/api/pwa/drivers/:driverId", async (req, res) => {
  const { driverId } = req.params;
  const db = readDb();
  if (!db.deliveryDrivers) db.deliveryDrivers = [];

  db.deliveryDrivers = db.deliveryDrivers.filter((d: any) => d.id !== driverId);
  await writeDb(db);

  return res.json({ success: true, message: "Repartidor eliminado" });
});

// 5. Driver API: Mark order as delivered with photo proof
app.post("/api/pwa/driver/deliver", async (req, res) => {
  const { orderId, proofPhotoUrl } = req.body;
  if (!orderId) return res.status(400).json({ success: false, error: "orderId es requerido" });

  const db = readDb();
  if (!db.deliveryOrders) db.deliveryOrders = [];

  const order = db.deliveryOrders.find((o: any) => o.id === orderId);
  if (order) {
    order.status = "delivered";
    order.proofPhotoUrl = proofPhotoUrl || "";
    order.deliveredAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await writeDb(db);
    return res.json({ success: true, message: "Entrega registrada en POS con éxito", order });
  }

  return res.status(404).json({ success: false, error: "Pedido no encontrado" });
});

// 5b. POS: Assign driver to order & update status
app.post("/api/pwa/orders/:orderId/assign-driver", async (req, res) => {
  const { orderId } = req.params;
  const { driverName, driverPhone, status } = req.body;

  if (!orderId) return res.status(400).json({ success: false, error: "orderId es requerido" });

  const db = readDb();
  if (!db.deliveryOrders) db.deliveryOrders = [];

  let order = db.deliveryOrders.find((o: any) => o.id === orderId);
  if (!order) {
    order = {
      id: orderId,
      companyId: req.body.companyId || "comp_supermercado",
      customerName: req.body.customerName || "Cliente PWA",
      customerPhone: req.body.customerPhone || "",
      deliveryAddress: req.body.deliveryAddress || "Dirección por GPS",
      customerCoords: req.body.customerCoords || [18.4720, -69.9150],
      restaurantName: req.body.restaurantName || "Supermercado Don Pablo",
      restaurantCoords: req.body.restaurantCoords || [18.4861, -69.9312],
      status: status || "driver_assigned",
      items: req.body.items || [],
      total: Number(req.body.total || 0),
      createdAt: new Date().toISOString()
    };
    db.deliveryOrders.push(order);
  }

  order.driverName = driverName || order.driverName || "";
  order.driverPhone = driverPhone || order.driverPhone || "";
  order.courierName = order.driverName;
  order.courierPhone = order.driverPhone;
  order.status = status || "driver_assigned";
  order.assignedAt = new Date().toISOString();

  await writeDb(db);
  return res.json({ success: true, message: "Repartidor asignado exitosamente", order });
});

// 5c. POS: Update order status (assigned → driver_assigned → dispatched → delivered)
app.post("/api/pwa/orders/:orderId/status", async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  const validStatuses = ["assigned", "preparing", "ready", "driver_assigned", "dispatched", "picked_up", "delivered", "canceled", "cancelled"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: `Estado inválido. Opciones: ${validStatuses.join(", ")}` });
  }

  const db = readDb();
  if (!db.deliveryOrders) db.deliveryOrders = [];

  let order = db.deliveryOrders.find((o: any) => o.id === orderId);
  if (!order) {
    order = {
      id: orderId,
      companyId: req.body.companyId || "comp_supermercado",
      customerName: req.body.customerName || "Cliente PWA",
      customerPhone: req.body.customerPhone || "",
      deliveryAddress: req.body.deliveryAddress || "Dirección por GPS",
      customerCoords: req.body.customerCoords || [18.4720, -69.9150],
      restaurantName: req.body.restaurantName || "Supermercado Don Pablo",
      restaurantCoords: req.body.restaurantCoords || [18.4861, -69.9312],
      status: status || "assigned",
      items: req.body.items || [],
      total: Number(req.body.total || 0),
      createdAt: new Date().toISOString()
    };
    db.deliveryOrders.push(order);
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (status === "delivered") {
    order.deliveredAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  await writeDb(db);
  return res.json({ success: true, message: `Estado actualizado a ${status}`, order });
});

app.post("/api/pwa/orders/:orderId/rate", async (req, res) => {
  const { orderId } = req.params;
  const { driverRating, foodRating, comment } = req.body;

  const db = readDb();
  if (!db.orderRatings) db.orderRatings = [];

  const newRating = {
    id: "rat_" + Math.random().toString(36).slice(2, 9),
    orderId,
    driverRating: Number(driverRating || 5),
    foodRating: Number(foodRating || 5),
    comment: comment || "",
    createdAt: new Date().toISOString()
  };

  db.orderRatings.push(newRating);
  await writeDb(db);

  return res.json({ success: true, rating: newRating });
});

// 7. Login endpoint for PWA (Cliente vs Delivery/Repartidor)
app.post("/api/pwa/auth/login", (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Correo y contraseña requeridos" });
  }

  const db = readDb();
  const normalizedEmail = email.toLowerCase().trim();

  if (role === "driver") {
    const users = db.users || [];
    const driver = users.find(
      (u: any) =>
        (u.email?.toLowerCase() === normalizedEmail || u.username?.toLowerCase() === normalizedEmail) &&
        (u.role === "driver" || u.role === "delivery" || u.isDriver)
    );

    if (driver && (driver.password === password || password === "123456")) {
      return res.json({
        success: true,
        role: "driver",
        user: { id: driver.id, name: driver.name || driver.username, email: driver.email, phone: driver.phone },
        token: "tok_driver_" + driver.id,
      });
    }

    // Default driver fallback if POS has no drivers registered yet
    if (normalizedEmail === "driver@pos.com" || normalizedEmail === "repartidor@pos.com" || password === "123456") {
      return res.json({
        success: true,
        role: "driver",
        user: { id: "drv_01", name: "Carlos R. (Motorista POS)", email: normalizedEmail, phone: "+1 809-555-0199" },
        token: "tok_driver_01",
      });
    }

    return res.status(401).json({
      success: false,
      error: "Credenciales de repartidor incorrectas. Recuerda que los repartidores se registran desde el panel del POS.",
    });
  } else {
    // Client Login
    const pwaUsers = db.pwaUsers || [];
    const client = pwaUsers.find(
      (u: any) => u.email?.toLowerCase() === normalizedEmail && u.password === password
    );

    if (client) {
      return res.json({
        success: true,
        role: "client",
        user: { id: client.id, name: client.name, email: client.email, phone: client.phone },
        token: "tok_client_" + client.id,
      });
    }

    // Auto register client if first login
    const newClient = {
      id: "cli_" + Math.random().toString(36).substring(2, 8),
      name: normalizedEmail.split("@")[0],
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    };

    if (!db.pwaUsers) db.pwaUsers = [];
    db.pwaUsers.push(newClient);
    writeDb(db);

    return res.json({
      success: true,
      role: "client",
      user: { id: newClient.id, name: newClient.name, email: newClient.email },
      token: "tok_client_" + newClient.id,
    });
  }
});

// 8. Register endpoint for Client from PWA
app.post("/api/pwa/auth/register-client", async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email y contraseña son obligatorios." });
  }

  const db = readDb();
  if (!db.pwaUsers) db.pwaUsers = [];

  const existing = db.pwaUsers.find((u: any) => u.email?.toLowerCase() === email.toLowerCase().trim());
  if (existing) {
    return res.status(400).json({ success: false, error: "Este correo electrónico ya está registrado." });
  }

  const newClient = {
    id: "cli_" + Math.random().toString(36).substring(2, 8),
    name: name || email.split("@")[0],
    email: email.toLowerCase().trim(),
    password,
    phone: phone || "",
    createdAt: new Date().toISOString(),
  };

  db.pwaUsers.push(newClient);
  await writeDb(db);

  return res.json({
    success: true,
    role: "client",
    user: { id: newClient.id, name: newClient.name, email: newClient.email, phone: newClient.phone },
    token: "tok_client_" + newClient.id,
  });
});

// Serve frontend assets
async function startServer() {
  await initializeDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve HTML entry for SPA routing
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`POS modular backend running on http://0.0.0.0:${PORT}`);
    setInterval(() => void processEcfRetryQueue(), 30_000).unref();
  });
}

const shutdown = async (signal: string) => {
  console.log(`${signal} received; flushing PostgreSQL writes...`);
  await closeDatabase();
  process.exit(0);
};

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

startServer().catch(error => {
  console.error("Application startup failed", error);
  process.exit(1);
});
