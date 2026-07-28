import React, { useState } from "react";
import {
  Hammer, Search, Plus, Minus, Trash2, Send, Clock, CheckCircle2,
  XCircle, Printer, User, Eye, AlertCircle, ShoppingCart, UserPlus,
  Package, FileText, Check, ArrowRight, ShieldCheck, Tag
} from "lucide-react";
import { Product, Customer, Company, Branch, User as UserType, SaleItem, FerreteriaOrder } from "../types";

interface FerreteriaModuleProps {
  activeCompany: Company;
  currentUser: UserType;
  activeBranch: Branch;
  products: Product[];
  customers: Customer[];
  ferreteriaOrders: FerreteriaOrder[];
  onAddFerreteriaOrder: (order: FerreteriaOrder) => void;
  onUpdateFerreteriaOrders: (orders: FerreteriaOrder[]) => void;
  onAddCustomer: (cust: Customer) => void;
  onAddAudit: (action: string, details: string) => void;
  onNavigateToPOS: () => void;
}

export default function FerreteriaModule({
  activeCompany,
  currentUser,
  activeBranch,
  products,
  customers,
  ferreteriaOrders,
  onAddFerreteriaOrder,
  onUpdateFerreteriaOrders,
  onAddCustomer,
  onAddAudit,
  onNavigateToPOS
}: FerreteriaModuleProps) {
  // Sub-tabs: "despacho" (Mostrador de Ventas) | "cola" (Monitor de Órdenes Enviadas)
  const [activeTab, setActiveTab] = useState<"despacho" | "cola">("despacho");

  // Search and Category Filter for Products
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Cart & Pre-Invoice Order Form States
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [orderName, setOrderName] = useState(() => `Orden Mostrador #${Math.floor(100 + Math.random() * 900)}`);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Customer Modal State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustRnc, setNewCustRnc] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustLimit, setNewCustLimit] = useState("10000");

  // Notice & Preview Modal State
  const [noticeMsg, setNoticeMsg] = useState("");
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<FerreteriaOrder | null>(null);

  // Queue Status Filter ("all" | "pending" | "cobrada")
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "cobrada">("all");

  // Filter products by company
  const companyProducts = products.filter(p => p.companyId === activeCompany.id);
  const companyCustomers = customers.filter(c => c.companyId === activeCompany.id);
  const companyOrders = ferreteriaOrders.filter(o => o.companyId === activeCompany.id && o.branchId === activeBranch.id);

  // Unique product categories
  const categories = Array.from(new Set(companyProducts.map(p => p.category || "General")));

  const filteredProducts = companyProducts.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                          p.barcode.includes(productSearch);
    const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Cart Management Helpers
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
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
          tax: activeCompany.settings.defaultTaxRate
        }
      ]);
    }
  };

  const updateItemQty = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      setCart(updated.filter((_, i) => i !== index));
    } else {
      updated[index].qty = newQty;
      setCart(updated);
    }
  };

  const updateItemQtyDirect = (index: number, qtyVal: string) => {
    const val = parseFloat(qtyVal) || 0;
    const updated = [...cart];
    if (val <= 0) {
      setCart(updated.filter((_, i) => i !== index));
    } else {
      updated[index].qty = val;
      setCart(updated);
    }
  };

  const removeItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Cart Calculations
  const getSubtotal = () => cart.reduce((sum, item) => {
    const lineBase = item.price * item.qty;
    return sum + lineBase - (lineBase * item.discount / 100);
  }, 0);
  const getTaxTotal = () => cart.reduce((sum, item) => {
    const lineBase = item.price * item.qty;
    const discountedLine = lineBase - (lineBase * item.discount / 100);
    return sum + (discountedLine * item.tax);
  }, 0);
  const getGrandTotal = () => getSubtotal() + getTaxTotal();

  // Create & Dispatch Ferretería Order to Cashier Queue
  const handleDispatchToCashier = () => {
    if (cart.length === 0) {
      setNoticeMsg("Por favor agregue al menos un producto al pedido de despacho.");
      setShowNoticeModal(true);
      return;
    }

    if (!orderName.trim()) {
      setNoticeMsg("Por favor ingrese un nombre o referencia para identificar la pre-factura en caja.");
      setShowNoticeModal(true);
      return;
    }

    let customerNameStr = "Consumidor Final";
    let customerRncStr = "";
    if (selectedCustomerId) {
      const cust = companyCustomers.find(c => c.id === selectedCustomerId);
      if (cust) {
        customerNameStr = cust.name;
        customerRncStr = cust.rncOrCedula;
      }
    } else if (customCustomerName.trim()) {
      customerNameStr = customCustomerName.trim();
    }

    const subtotal = getSubtotal();
    const tax = getTaxTotal();
    const total = getGrandTotal();

    const newOrder: FerreteriaOrder = {
      id: "ferr_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      orderName: orderName.trim(),
      customerId: selectedCustomerId || undefined,
      customerName: customerNameStr,
      customerRnc: customerRncStr || undefined,
      items: cart,
      subtotal,
      tax,
      total,
      notes: orderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      status: "pendiente_cobro"
    };

    onAddFerreteriaOrder(newOrder);

    onAddAudit(
      "Despacho Ferretería",
      `Pre-Factura "${newOrder.orderName}" despachada a la cola de caja por ${currentUser.name}. Total: $${total.toFixed(2)}`
    );

    // Reset Form
    setCart([]);
    setOrderName(`Orden Mostrador #${Math.floor(100 + Math.random() * 900)}`);
    setSelectedCustomerId("");
    setCustomCustomerName("");
    setOrderNotes("");

    setNoticeMsg(`¡Orden "${newOrder.orderName}" enviada exitosamente a la cola del cajero!`);
    setShowNoticeModal(true);
  };

  // Add New Customer Quick Submit
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    const newCust: Customer = {
      id: "cust_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: newCustName.trim(),
      rncOrCedula: newCustRnc.trim(),
      phone: newCustPhone.trim(),
      email: "",
      creditLimit: parseFloat(newCustLimit) || 10000,
      currentDebt: 0,
      points: 0,
      tier: "Bronce",
      synced: true

    };


    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowAddCustomerModal(false);
    setNewCustName("");
    setNewCustRnc("");
    setNewCustPhone("");

    onAddAudit("Registro Cliente", `Cliente registrado desde Ferretería: ${newCust.name}`);
  };

  const handleCancelOrder = (order: FerreteriaOrder) => {
    if (!window.confirm(`¿Cancelar la orden "${order.orderName}" y retirarla de la cola de caja?`)) return;
    onUpdateFerreteriaOrders(
      ferreteriaOrders.map(item => item.id === order.id ? { ...item, status: "cancelada" } : item)
    );
    onAddAudit("Cancelar Despacho Ferretería", `Orden "${order.orderName}" cancelada por ${currentUser.name}.`);
  };

  // Thermal Dispatch Picking List Print Helper
  const handlePrintPickingList = (order: FerreteriaOrder) => {
    const printContent = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 8px;">
        <h3 style="font-weight: 900; margin: 0; font-size: 14px; text-transform: uppercase;">${activeCompany.name}</h3>
        <p style="margin: 2px 0; font-size: 11px; font-weight: bold;">NOTA DE DESPACHO / PICKING ALMACÉN</p>
        <p style="margin: 2px 0; font-size: 10px;">FECHA: ${new Date(order.createdAt).toLocaleString()}</p>
        <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: bold; background-color: #eee; padding: 4px;">REFERENCIA: ${order.orderName}</p>
      </div>

      <div style="font-size: 11px; margin-bottom: 8px;">
        <div><b>VENDEDOR:</b> ${order.sellerName}</div>
        <div><b>CLIENTE:</b> ${order.customerName} ${order.customerRnc ? `(RNC: ${order.customerRnc})` : ''}</div>
        <div><b>SUCURSAL:</b> ${activeBranch.name}</div>
        ${order.notes ? `<div><b>INSTRUCCIONES:</b> ${order.notes}</div>` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px;">
        <thead>
          <tr style="border-bottom: 1px solid #000; text-align: left;">
            <th style="padding: 4px 0;">CANT</th>
            <th style="padding: 4px 0;">PRODUCTO / UNIDAD</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map(it => {
            const prodMatch = products.find(p => p.id === it.productId);
            const unitName = prodMatch?.unit || "Unid";
            return `
              <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 6px 0; font-weight: bold; font-size: 13px;">${it.qty} ${unitName}</td>
                <td style="padding: 6px 0;">${it.productName}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="border-top: 1px solid #000; pt: 6px; text-align: center; font-size: 10px;">
        <p style="margin: 2px 0;">*** CONDUCE DE DESPACHO INTERNO ***</p>
        <p style="margin: 2px 0;">Firma Despachador: ___________________________</p>
      </div>
    `;

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
            <title>Nota Despacho #${order.id}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { font-family: system-ui, sans-serif; width: 76mm; margin: 0 auto; padding: 8px 4px; color: #000; }
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-100 overflow-hidden" id="ferreteria-module-root">
      {/* MODULE HEADER BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shadow-sm font-bold">
            <Hammer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Despacho Ferretería & Mostrador</h2>
              <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                Flujo Vendedor ➔ Cajero
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Agregue productos, asigne nombre a la pre-factura y envíela a la cola del POS para que el cajero la cobre.
            </p>
          </div>
        </div>

        {/* TAB SWITCHER & ACTIONS */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab("despacho")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "despacho"
                  ? "bg-white text-indigo-600 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Package className="w-4 h-4" />
              Mostrador de Despacho
            </button>

            <button
              onClick={() => setActiveTab("cola")}
              className={`px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2 relative ${
                activeTab === "cola"
                  ? "bg-white text-indigo-600 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Clock className="w-4 h-4" />
              Pre-Facturas Enviadas
              {companyOrders.filter(o => o.status === "pendiente_cobro").length > 0 && (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full animate-bounce">
                  {companyOrders.filter(o => o.status === "pendiente_cobro").length}
                </span>
              )}
            </button>
          </div>

          {(currentUser.role === "Cajero" || currentUser.role === "Administrador" || currentUser.role === "Propietario") && (
            <button
              onClick={onNavigateToPOS}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              Ir a Caja POS
            </button>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT BODY */}
      {activeTab === "despacho" ? (
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 p-4 gap-4">

          {/* LEFT: CATALOG SEARCH & PRODUCT GRID (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            {/* Search & Categories Header */}
            <div className="p-4 border-b border-slate-150 bg-slate-50/70 space-y-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar material por nombre, código SKU, código de barras..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                  autoFocus
                />
              </div>

              {/* Categories Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === "all" ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Todos los Materiales ({companyProducts.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg font-bold shrink-0 transition-colors cursor-pointer ${
                      selectedCategory === cat ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid / List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No se encontraron materiales en el catálogo con este filtro.</p>
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="p-3 bg-white border border-slate-200 hover:border-amber-500 hover:shadow-md rounded-xl transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">{p.sku || p.barcode}</span>
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                          {p.unit || "Unid"}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">
                        {p.name}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs font-mono font-black text-slate-900">
                        {activeCompany.settings.currency} {p.price.toFixed(2)}
                      </span>
                      <button className="p-1 bg-amber-500 group-hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-transform active:scale-95">
                        <Plus className="w-3.5 h-3.5" />
                        Agregar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: DESPACHO CART & PRE-INVOICE FORM (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">

            {/* Header: Order Name & Customer Selection */}
            <div className="p-4 bg-slate-900 text-white space-y-3 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">1. Identificador de Pre-Factura</span>
                <span className="text-[10px] text-slate-400">Vendedor: {currentUser.name}</span>
              </div>

              {/* Order Name Input */}
              <input
                type="text"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                placeholder="Nombre/Ref (Ej: Orden Juan Perez - Varillas)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-extrabold placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
              />

              {/* Customer Select / Add */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) setCustomCustomerName("");
                    }}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Consumidor Final / Mostrador --</option>
                    {companyCustomers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(true)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Registrar nuevo cliente rápido"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Cliente
                </button>
              </div>

              {!selectedCustomerId && (
                <input
                  type="text"
                  placeholder="O bien, ingrese nombre cliente eventual (Opcional)..."
                  value={customCustomerName}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 placeholder-slate-500 focus:outline-hidden"
                />
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>Materiales en Pedido ({cart.length})</span>
                <span>Subtotal</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">Carrito de Despacho Vacío</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Haga clic en los productos a la izquierda para agregarlos.</p>
                </div>
              ) : (
                cart.map((item, index) => {
                  const prodMatch = companyProducts.find(p => p.id === item.productId);
                  const unitLabel = prodMatch?.unit || "Unid";
                  return (
                    <div key={index} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-xs text-slate-900 truncate">{item.productName}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>${item.price.toFixed(2)} / {unitLabel}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateItemQty(index, -1)}
                          className="w-6 h-6 bg-white border border-slate-300 hover:bg-slate-100 rounded-md font-bold text-xs flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-slate-600" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          value={item.qty}
                          onChange={(e) => updateItemQtyDirect(index, e.target.value)}
                          className="w-12 text-center text-xs font-mono font-bold bg-white border border-slate-300 rounded-md py-0.5"
                        />
                        <button
                          onClick={() => updateItemQty(index, 1)}
                          className="w-6 h-6 bg-white border border-slate-300 hover:bg-slate-100 rounded-md font-bold text-xs flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-slate-600" />
                        </button>
                      </div>

                      <div className="text-right font-mono font-bold text-xs text-slate-900 w-16 shrink-0">
                        ${(item.price * item.qty).toFixed(2)}
                      </div>

                      <button
                        onClick={() => removeItem(index)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Notes & Summary Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
              <input
                type="text"
                placeholder="Instrucciones para el patio/almacén (Opcional)..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-hidden"
              />

              <div className="space-y-1 text-xs font-medium text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-900">${getSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ITBIS ({(activeCompany.settings.defaultTaxRate * 100).toFixed(0)}%):</span>
                  <span className="font-mono text-slate-900">${getTaxTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-sm text-slate-900">
                  <span>TOTAL ESTIMADO:</span>
                  <span className="font-mono text-indigo-700">${getGrandTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Action Button: Send to Cashier */}
              <button
                onClick={handleDispatchToCashier}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                  cart.length === 0
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer shadow-amber-500/20 active:scale-98"
                }`}
              >
                <Send className="w-4 h-4" />
                ENVIAR PRE-FACTURA A LA COLA DE CAJA
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* TAB: PRE-FACTURAS ENVIADAS EN COLA MONITOR */
        <div className="flex-1 p-6 flex flex-col overflow-hidden">

          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-slate-900 text-sm">Monitor de Pre-Facturas de Ferretería</h3>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-semibold">
              <button
                onClick={() => setQueueFilter("all")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${queueFilter === "all" ? "bg-white text-indigo-600 font-bold shadow-xs" : "text-slate-500"}`}
              >
                Todas ({companyOrders.length})
              </button>
              <button
                onClick={() => setQueueFilter("pending")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${queueFilter === "pending" ? "bg-white text-amber-600 font-bold shadow-xs" : "text-slate-500"}`}
              >
                Pendientes de Cobro ({companyOrders.filter(o => o.status === "pendiente_cobro").length})
              </button>
              <button
                onClick={() => setQueueFilter("cobrada")}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${queueFilter === "cobrada" ? "bg-white text-emerald-600 font-bold shadow-xs" : "text-slate-500"}`}
              >
                Cobradas en POS ({companyOrders.filter(o => o.status === "cobrada").length})
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Hora Despacho</th>
                    <th className="p-3">Referencia / Pre-Factura</th>
                    <th className="p-3">Vendedor</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Ítems</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">Estado en Caja</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {(() => {
                    const displayed = companyOrders.filter(o => {
                      if (queueFilter === "pending") return o.status === "pendiente_cobro";
                      if (queueFilter === "cobrada") return o.status === "cobrada";
                      return true;
                    });

                    if (displayed.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            No hay órdenes registradas en esta vista de la cola.
                          </td>
                        </tr>
                      );
                    }

                    return displayed.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-[11px] text-slate-500">#{o.id}</td>
                        <td className="p-3 text-slate-500">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-3 font-extrabold text-slate-900">{o.orderName}</td>
                        <td className="p-3 text-slate-600 font-medium">{o.sellerName}</td>
                        <td className="p-3 font-semibold text-slate-800">{o.customerName}</td>
                        <td className="p-3 text-slate-600 font-mono">{o.items.length} productos</td>
                        <td className="p-3 text-right font-bold text-slate-900 font-mono">
                          {activeCompany.settings.currency} {o.total.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          {o.status === "pendiente_cobro" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 animate-pulse" /> En Cola de Caja
                            </span>
                          ) : o.status === "cobrada" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Cobrada ({o.convertedSaleId ? '#' + o.convertedSaleId : 'POS'})
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              Cancelada
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPreviewOrder(o)}
                              className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Ver detalle de pre-factura"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handlePrintPickingList(o)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Imprimir nota de despacho para patio"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Nota Despacho
                            </button>
                            {o.status === "pendiente_cobro" && (
                              <button
                                onClick={() => handleCancelOrder(o)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Cancelar y retirar de la cola de caja"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" />
                Registrar Cliente Rápido
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="Ej: Constructora Perez SRL"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">RNC / Cédula</label>
                <input
                  type="text"
                  value={newCustRnc}
                  onChange={(e) => setNewCustRnc(e.target.value)}
                  placeholder="Ej: 101000325"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    placeholder="809-555-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Límite Crédito</label>
                  <input
                    type="number"
                    value={newCustLimit}
                    onChange={(e) => setNewCustLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer shadow-md"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {showNoticeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <Hammer className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-white text-base">Despacho Ferretería</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{noticeMsg}</p>
            <button
              onClick={() => setShowNoticeModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW PRE-INVOICE ORDER MODAL */}
      {previewOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-150 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Detalle Pre-Factura #{previewOrder.id}</h3>
                <p className="text-[10px] text-slate-500 font-bold">Referencia: {previewOrder.orderName}</p>
              </div>
              <button onClick={() => setPreviewOrder(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs text-slate-700">
              <div><b>Vendedor:</b> {previewOrder.sellerName}</div>
              <div><b>Cliente:</b> {previewOrder.customerName}</div>
              <div><b>Estado en POS:</b> {previewOrder.status}</div>
              {previewOrder.notes && <div><b>Notas:</b> {previewOrder.notes}</div>}
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
              {previewOrder.items.map((it, idx) => (
                <div key={idx} className="py-2 flex justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{it.productName}</div>
                    <div className="text-[10px] text-slate-500">{it.qty} unid x ${it.price.toFixed(2)}</div>
                  </div>
                  <div className="font-mono font-bold text-slate-900">${(it.qty * it.price).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
              <span>Total Estimado:</span>
              <span className="font-mono text-indigo-700">${previewOrder.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handlePrintPickingList(previewOrder)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Nota Despacho
              </button>
              <button
                onClick={() => setPreviewOrder(null)}
                className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
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
