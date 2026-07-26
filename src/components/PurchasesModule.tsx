import React, { useState } from "react";
import { Truck, Plus, CheckCircle, FileText, ShoppingBag, FolderPlus, UserPlus, RefreshCw, BarChart2 } from "lucide-react";
import { Supplier, PurchaseOrder, Product, Company, Branch, Warehouse } from "../types";

interface PurchasesModuleProps {
  activeCompany: Company;
  activeBranch: Branch;
  products: Product[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  onUpdateSuppliers: (newSuppliers: Supplier[]) => void;
  onUpdatePurchaseOrders: (newOrders: PurchaseOrder[]) => void;
  onUpdateProducts: (updatedProducts: Product[]) => void;
  onAddAudit: (action: string, details: string) => void;
}

export default function PurchasesModule({
  activeCompany,
  activeBranch,
  products,
  warehouses,
  suppliers,
  purchaseOrders,
  onUpdateSuppliers,
  onUpdatePurchaseOrders,
  onUpdateProducts,
  onAddAudit
}: PurchasesModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "suppliers">("orders");
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddOrderModal, setShowAddOrderModal] = useState(false);

  // Supplier Form
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supEmail, setSupEmail] = useState("");

  // Purchase Order Form
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [orderItems, setOrderItems] = useState<{ productId: string; qty: number; cost: number }[]>([]);
  const [poStatus, setPoStatus] = useState<"draft" | "ordered">("draft");

  // Temporary selected product to add to the active PO
  const [tempProductId, setTempProductId] = useState("");
  const [tempQty, setTempQty] = useState("10");
  const [tempCost, setTempCost] = useState("");

  // Filter lists by active company
  const companySuppliers = suppliers.filter((s) => s.companyId === activeCompany.id);
  const companyOrders = purchaseOrders.filter((o) => o.companyId === activeCompany.id);
  const companyProducts = products.filter((p) => p.companyId === activeCompany.id);

  // Warehouse active for current branch to deposit received stocks
  const activeWarehouse = warehouses.find((w) => w.branchId === activeBranch.id);

  // Handle supplier save
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      alert("Por favor ingrese el nombre del proveedor.");
      return;
    }

    const newSupplier: Supplier = {
      id: "sup_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: supName.trim(),
      contact: supContact.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim()
    };

    const updated = [...suppliers, newSupplier];
    onUpdateSuppliers(updated);
    onAddAudit("Registro Proveedor", `Proveedor registrado: ${newSupplier.name}`);

    // Reset
    setShowAddSupplierModal(false);
    setSupName("");
    setSupContact("");
    setSupPhone("");
    setSupEmail("");
  };

  // Helper to pre-populate cost when selecting product in PO form
  const handleTempProductSelect = (pId: string) => {
    setTempProductId(pId);
    const prod = companyProducts.find((p) => p.id === pId);
    if (prod) {
      setTempCost(prod.cost.toString());
    }
  };

  // Add item to draft PO items list
  const handleAddOrderItem = () => {
    if (!tempProductId) {
      alert("Seleccione un producto.");
      return;
    }
    const qtyNum = parseInt(tempQty);
    const costNum = parseFloat(tempCost);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Cantidad debe ser mayor a cero.");
      return;
    }
    if (isNaN(costNum) || costNum < 0) {
      alert("Costo no puede ser negativo.");
      return;
    }

    const existingIdx = orderItems.findIndex((i) => i.productId === tempProductId);
    if (existingIdx > -1) {
      const copy = [...orderItems];
      copy[existingIdx].qty += qtyNum;
      setOrderItems(copy);
    } else {
      setOrderItems([...orderItems, { productId: tempProductId, qty: qtyNum, cost: costNum }]);
    }

    // Reset fields
    setTempProductId("");
    setTempQty("10");
    setTempCost("");
  };

  // Remove item from draft PO items list
  const handleRemoveOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Save Purchase Order
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert("Por favor seleccione un proveedor.");
      return;
    }
    if (orderItems.length === 0) {
      alert("Debe agregar al menos un producto a la orden.");
      return;
    }

    const supplier = companySuppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;

    const totalAmount = orderItems.reduce((sum, item) => sum + item.qty * item.cost, 0);

    const newPO: PurchaseOrder = {
      id: "po_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      supplierId: selectedSupplierId,
      supplierName: supplier.name,
      date: new Date().toISOString(),
      items: orderItems,
      total: totalAmount,
      status: poStatus
    };

    const updated = [newPO, ...purchaseOrders];
    onUpdatePurchaseOrders(updated);

    onAddAudit(
      "Orden de Compra",
      `Orden de compra generada para ${supplier.name} por un total de ${activeCompany.settings.currency} ${totalAmount.toFixed(2)} (Estado: ${poStatus})`
    );

    // Reset Form
    setShowAddOrderModal(false);
    setSelectedSupplierId("");
    setOrderItems([]);
    setPoStatus("draft");
  };

  // Receive stock from Purchase Order
  const handleReceiveOrder = (poId: string) => {
    const po = purchaseOrders.find((o) => o.id === poId);
    if (!po) return;

    if (!activeWarehouse) {
      alert("No se encontró un almacén activo para esta sucursal. Configure un almacén antes de recibir mercancía.");
      return;
    }

    if (!confirm(`¿Desea ingresar el stock de esta orden de compra en el almacén '${activeWarehouse.name}'? Esto actualizará las existencias de inmediato.`)) {
      return;
    }

    // 1. Update order status to received
    const updatedOrders = purchaseOrders.map((o) => {
      if (o.id === poId) {
        return {
          ...o,
          status: "received" as const,
          receivedDate: new Date().toISOString()
        };
      }
      return o;
    });
    onUpdatePurchaseOrders(updatedOrders);

    // 2. Adjust stock levels of active warehouse
    const updatedProducts = products.map((prod) => {
      const matchPOItem = po.items.find((i) => i.productId === prod.id);
      if (matchPOItem) {
        const nextStock = { ...prod.stock };
        // Add purchased qty to warehouse stock
        nextStock[activeWarehouse.id] = (nextStock[activeWarehouse.id] || 0) + matchPOItem.qty;
        
        // Also update standard cost based on PO price
        return {
          ...prod,
          stock: nextStock,
          cost: matchPOItem.cost // Updates unit cost to latest PO cost
        };
      }
      return prod;
    });

    onUpdateProducts(updatedProducts);

    onAddAudit(
      "Recepción de Compra",
      `Mercancía recibida de Orden ${po.id}. Se cargaron productos al almacén '${activeWarehouse.name}' y se actualizaron costos de compra.`
    );

    alert("¡Inventario cargado exitosamente! Las existencias y los costos de los productos han sido actualizados en tiempo real.");
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 p-6" id="purchases-viewport">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            Compras & Gestión de Proveedores
          </h2>
          <p className="text-xs text-slate-500 mt-1">Cree órdenes de compra y cargue existencias a sus almacenes automáticamente al recibirlas.</p>
        </div>
        <div className="flex gap-2">
          {activeSubTab === "orders" ? (
            <button
              onClick={() => setShowAddOrderModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
              id="btn-new-purchase-order"
            >
              <FolderPlus className="w-4 h-4" />
              Nueva Orden de Compra
            </button>
          ) : (
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
              id="btn-new-supplier"
            >
              <UserPlus className="w-4 h-4" />
              Registrar Proveedor
            </button>
          )}
        </div>
      </div>

      {/* SUB MENU TABS */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab("orders")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "orders"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          Órdenes de Compra ({companyOrders.length})
        </button>
        <button
          onClick={() => setActiveSubTab("suppliers")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "suppliers"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Truck className="w-4 h-4" />
          Catálogo de Proveedores ({companySuppliers.length})
        </button>
      </div>

      {/* MAIN VIEWPORT SPLIT */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        {activeSubTab === "orders" ? (
          /* ORDERS SUB PANEL */
          <div className="overflow-y-auto flex-1 p-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="p-3">Código</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Ítems</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {companyOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No hay órdenes de compra emitidas para esta empresa.
                    </td>
                  </tr>
                ) : (
                  companyOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono text-[11px] text-slate-500">#{o.id}</td>
                      <td className="p-3 text-slate-500">{new Date(o.date).toLocaleDateString()}</td>
                      <td className="p-3 font-bold text-slate-800">{o.supplierName}</td>
                      <td className="p-3 text-slate-600 font-semibold">{o.items.length} productos</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          o.status === "received"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : o.status === "ordered"
                            ? "bg-sky-50 text-sky-600 border border-sky-200 animate-pulse"
                            : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                          {o.status === "received" ? "Recibida" : o.status === "ordered" ? "Pedida" : "Borrador"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900 font-mono">
                        {activeCompany.settings.currency} {o.total.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        {o.status !== "received" ? (
                          <button
                            onClick={() => handleReceiveOrder(o.id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                          >
                            Recibir Mercancía
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            Cargada en {activeWarehouse?.name || "Almacén"}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* SUPPLIERS SUB PANEL */
          <div className="overflow-y-auto flex-1 p-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="p-3">Proveedor</th>
                  <th className="p-3">Persona de Contacto</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Correo Electrónico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {companySuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No hay proveedores registrados. Haga clic en 'Registrar Proveedor' para agregar uno.
                    </td>
                  </tr>
                ) : (
                  companySuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-slate-800">{s.name}</td>
                      <td className="p-3 text-slate-600 font-semibold">{s.contact}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{s.phone}</td>
                      <td className="p-3 text-slate-500 font-medium">{s.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD SUPPLIER */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                Registrar Proveedor
              </h3>
              <button onClick={() => setShowAddSupplierModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Ej. Distribuidora Central..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contacto Oficial</label>
                <input
                  type="text"
                  value={supContact}
                  onChange={(e) => setSupContact(e.target.value)}
                  placeholder="Nombre de agente de ventas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="809-555-1234..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    placeholder="ventas@proveedor.com..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                Guardar Proveedor
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PURCHASE ORDER */}
      {showAddOrderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full p-6 text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Nueva Orden de Compra
              </h3>
              <button onClick={() => setShowAddOrderModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleSavePurchaseOrder} className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Select Supplier */}
              <div className="shrink-0">
                <label className="text-xs font-bold text-slate-700 block mb-1">Seleccionar Proveedor</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-hidden cursor-pointer"
                  required
                >
                  <option value="">-- Seleccione un Proveedor --</option>
                  {companySuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.contact})</option>
                  ))}
                </select>
              </div>

              {/* Add line item aggregator */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 shrink-0 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agregar Producto a la Orden</span>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Producto</label>
                    <select
                      value={tempProductId}
                      onChange={(e) => handleTempProductSelect(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden cursor-pointer font-medium"
                    >
                      <option value="">-- Seleccione producto --</option>
                      {companyProducts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Cantidad</label>
                    <input
                      type="number"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center font-mono focus:outline-hidden"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Costo Unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      value={tempCost}
                      onChange={(e) => setTempCost(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono focus:outline-hidden"
                      placeholder="Costo..."
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddOrderItem}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                      title="Agregar producto"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* PO Line Items List */}
              <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5 text-center">Cantidad</th>
                      <th className="p-2.5 text-right">Costo Unitario</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {orderItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No ha agregado ningún producto a esta orden.
                        </td>
                      </tr>
                    ) : (
                      orderItems.map((item, index) => {
                        const prod = companyProducts.find((p) => p.id === item.productId);
                        return (
                          <tr key={index}>
                            <td className="p-2.5 font-bold text-slate-700">{prod?.name || "Desconocido"}</td>
                            <td className="p-2.5 text-center font-mono font-semibold">{item.qty}</td>
                            <td className="p-2.5 text-right font-mono text-slate-500">
                              {activeCompany.settings.currency} {item.cost.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {activeCompany.settings.currency} {(item.qty * item.cost).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveOrderItem(index)}
                                className="text-red-500 hover:text-red-700 font-bold"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status and Action Panel */}
              <div className="shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
                <div className="flex justify-between items-center text-xs font-black">
                  <span className="text-slate-500 uppercase tracking-wider">TOTAL ESTIMADO</span>
                  <span className="text-lg font-mono text-indigo-700">
                    {activeCompany.settings.currency} {orderItems.reduce((sum, i) => sum + i.qty * i.cost, 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-4 items-center border-t border-slate-200/60 pt-3">
                  <div className="flex-1 flex gap-2">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                      <input
                        type="radio"
                        name="po_status"
                        checked={poStatus === "draft"}
                        onChange={() => setPoStatus("draft")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Borrador (Solo guardar)</span>
                    </label>
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-2 ml-4">
                      <input
                        type="radio"
                        name="po_status"
                        checked={poStatus === "ordered"}
                        onChange={() => setPoStatus("ordered")}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Solicitado / Pedido</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    Confirmar y Registrar Orden
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
