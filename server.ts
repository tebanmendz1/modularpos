import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db_store.json");

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

// Database state accessor functions
function readDb(): DbStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database store file, falling back to seed", error);
  }
  // Seeding default database
  writeDb(defaultDb);
  return defaultDb;
}

function writeDb(db: DbStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database store", error);
  }
}

// Ensure database is initialized
readDb();

// API: Get entire Database status
app.get("/api/db", (req, res) => {
  res.json(readDb());
});

// API: Save / Overwrite database (SuperAdmin controls)
app.post("/api/db/update", (req, res) => {
  const incoming = req.body as DbStore;
  if (!incoming || !Array.isArray(incoming.companies)) {
    return res.status(400).json({ error: "Invalid database structure" });
  }
  writeDb(incoming);
  res.json({ message: "Database saved successfully" });
});

// API: Sync Queue Offline (Conflict resolution and inventory logic)
app.post("/api/sync", (req, res) => {
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

  writeDb(db);
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
app.post("/api/flutter/sales", (req, res) => {
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

  writeDb(db);

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

app.post("/api/flutter/expenses", (req, res) => {
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
  writeDb(db);

  return res.json({
    success: true,
    message: "Gasto registrado desde dispositivo móvil",
    expense: newExpense
  });
});

// 8. Mobile Quick Inventory Stock Adjustment
app.post("/api/flutter/inventory/adjust", (req, res) => {
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

  writeDb(db);

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

app.post("/api/flutter/accounting/entries", (req, res) => {
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
  writeDb(db);

  return res.json({
    success: true,
    message: "Asiento contable registrado exitosamente desde la app móvil",
    entry: newEntry
  });
});

app.post("/api/catalog/generate-products", generateProductsHandler);
app.post("/api/catalog/generate", generateProductsHandler);

// Serve frontend assets
async function startServer() {
  // Vite development middleware for real-time asset loading
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
  });
}

startServer();
