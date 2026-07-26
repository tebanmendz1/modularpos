import React, { useState } from "react";
import { ClipboardList, Plus, Search, Calendar, FileText, ShoppingCart, CheckCircle, Printer, Eye, Award } from "lucide-react";
import { Product, Customer, Company, Branch, SaleItem } from "../types";

// Quote interface defined specifically for this workspace module
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
  status: "draft" | "approved" | "expired";
}

interface QuotesModuleProps {
  activeCompany: Company;
  activeBranch: Branch;
  products: Product[];
  customers: Customer[];
  quotes: Quote[];
  onUpdateQuotes: (newQuotes: Quote[]) => void;
  onNavigateToPOS: () => void;
  onAddAudit: (action: string, details: string) => void;
}

export default function QuotesModule({
  activeCompany,
  activeBranch,
  products,
  customers,
  quotes,
  onUpdateQuotes,
  onNavigateToPOS,
  onAddAudit
}: QuotesModuleProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customCustomerName, setCustomCustomerName] = useState("");
  const [quoteItems, setQuoteItems] = useState<{ productId: string; qty: number; discount: number }[]>([]);
  const [notes, setNotes] = useState("");
  const [validDays, setValidDays] = useState("15");

  // Temporary item adder
  const [tempProductId, setTempProductId] = useState("");
  const [tempQty, setTempQty] = useState("1");
  const [tempDiscount, setTempDiscount] = useState("0");

  const companyProducts = products.filter((p) => p.companyId === activeCompany.id);
  const companyCustomers = customers.filter((c) => c.companyId === activeCompany.id);
  const companyQuotes = quotes.filter((q) => q.companyId === activeCompany.id);

  const filteredQuotes = companyQuotes.filter((q) => {
    const text = searchQuery.toLowerCase();
    return (
      q.id.toLowerCase().includes(text) ||
      q.customerName.toLowerCase().includes(text) ||
      (q.notes && q.notes.toLowerCase().includes(text))
    );
  });

  const handleAddTempItem = () => {
    if (!tempProductId) {
      alert("Seleccione un producto.");
      return;
    }
    const qtyNum = parseFloat(tempQty);
    const discNum = parseFloat(tempDiscount);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      alert("Cantidad inválida.");
      return;
    }
    if (isNaN(discNum) || discNum < 0 || discNum > 100) {
      alert("Descuento inválido (0 - 100%).");
      return;
    }

    const existingIdx = quoteItems.findIndex((i) => i.productId === tempProductId);
    if (existingIdx > -1) {
      const copy = [...quoteItems];
      copy[existingIdx].qty += qtyNum;
      setQuoteItems(copy);
    } else {
      setQuoteItems([...quoteItems, { productId: tempProductId, qty: qtyNum, discount: discNum }]);
    }

    // Reset item input
    setTempProductId("");
    setTempQty("1");
    setTempDiscount("0");
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  // Calculations for current form state
  const calculateFormTotals = () => {
    let subtotal = 0;
    let tax = 0;
    let discount = 0;

    quoteItems.forEach((item) => {
      const prod = companyProducts.find((p) => p.id === item.productId);
      if (!prod) return;

      const basePrice = prod.price;
      const rowQty = item.qty;
      const rowDiscountPct = item.discount;
      
      const rowGross = basePrice * rowQty;
      const rowDiscountAmount = rowGross * (rowDiscountPct / 100);
      const rowNet = rowGross - rowDiscountAmount;
      
      const rowTax = rowNet * activeCompany.settings.defaultTaxRate;

      subtotal += rowNet;
      tax += rowTax;
      discount += rowDiscountAmount;
    });

    return {
      subtotal,
      discount,
      tax,
      total: subtotal + tax
    };
  };

  const formTotals = calculateFormTotals();

  // Create & Save Quote
  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteItems.length === 0) {
      alert("Por favor agregue al menos un producto a la cotización.");
      return;
    }

    let customerName = "Consumidor Final";
    if (selectedCustomerId) {
      const cust = companyCustomers.find((c) => c.id === selectedCustomerId);
      if (cust) customerName = cust.name;
    } else if (customCustomerName.trim()) {
      customerName = customCustomerName.trim();
    }

    const validityDaysNum = parseInt(validDays) || 15;
    const dateObj = new Date();
    const validUntilDateObj = new Date();
    validUntilDateObj.setDate(dateObj.getDate() + validityDaysNum);

    // Form items to SaleItems
    const finalItems: SaleItem[] = quoteItems.map((item) => {
      const prod = companyProducts.find((p) => p.id === item.productId)!;
      return {
        productId: item.productId,
        productName: prod.name,
        price: prod.price,
        cost: prod.cost,
        qty: item.qty,
        discount: item.discount,
        tax: activeCompany.settings.defaultTaxRate
      };
    });

    const newQuote: Quote = {
      id: "cot_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      customerId: selectedCustomerId || undefined,
      customerName,
      date: dateObj.toISOString(),
      validUntil: validUntilDateObj.toISOString().split("T")[0],
      items: finalItems,
      subtotal: formTotals.subtotal,
      discount: formTotals.discount,
      tax: formTotals.tax,
      total: formTotals.total,
      notes: notes.trim() || undefined,
      status: "draft"
    };

    const updated = [newQuote, ...quotes];
    onUpdateQuotes(updated);

    onAddAudit(
      "Cotización Generada",
      `Se generó cotización #${newQuote.id} para ${customerName} por un total de ${activeCompany.settings.currency} ${newQuote.total.toFixed(2)}`
    );

    // Reset
    setShowCreateModal(false);
    setSelectedCustomerId("");
    setCustomCustomerName("");
    setQuoteItems([]);
    setNotes("");
    setValidDays("15");
  };

  // LOAD QUOTE INTO POS SHOPPING CART
  const handleConvertToSale = (q: Quote) => {
    if (!confirm(`¿Desea cargar esta cotización en el carrito de venta del POS? Se transferirán todos los ítems y el cliente seleccionado.`)) {
      return;
    }

    // 1. Convert quote items to POS pending cart structures
    const cartLoadItems = q.items.map((item) => ({
      product: products.find((p) => p.id === item.productId),
      qty: item.qty,
      discount: item.discount,
      variant: undefined
    })).filter((i) => i.product !== undefined);

    // Write to browser local storage for POS Module to load on initialization
    localStorage.setItem("pos_pending_load_cart", JSON.stringify(cartLoadItems));
    
    if (q.customerId) {
      localStorage.setItem("pos_pending_load_customer", q.customerId);
    } else {
      localStorage.removeItem("pos_pending_load_customer");
    }

    onAddAudit(
      "Carga Cotización POS",
      `Cotización #${q.id} cargada al Punto de Venta para facturación.`
    );

    // Navigate to POS tab
    onNavigateToPOS();

    alert("¡Cotización cargada con éxito! Proceda a facturar o registrar el pago en el Punto de Venta.");
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 p-6" id="quotes-viewport">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Cotizaciones & Presupuestos
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gestione presupuestos informales, imprima comprobantes de cotización y expórtelos en un clic al Punto de Venta.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer"
          id="btn-new-quote"
        >
          <Plus className="w-4 h-4" />
          Nueva Cotización
        </button>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shrink-0 flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cotización por código, nombre del cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TABLE VIEW OF QUOTES */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Fecha Emisión</th>
                <th className="p-3">Vence</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Ítems</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No se encontraron cotizaciones registradas.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-[11px] text-slate-500">#{q.id}</td>
                    <td className="p-3 text-slate-500">{new Date(q.date).toLocaleDateString()}</td>
                    <td className="p-3 text-red-500 font-semibold">{q.validUntil}</td>
                    <td className="p-3 font-bold text-slate-800">{q.customerName}</td>
                    <td className="p-3 text-slate-600 font-medium">{q.items.length} productos</td>
                    <td className="p-3 text-right font-bold text-slate-900 font-mono">
                      {activeCompany.settings.currency} {q.total.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedQuote(q)}
                          className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Ver cotización"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleConvertToSale(q)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                          title="Cargar en Punto de Venta"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Facturar POS
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE QUOTE */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-2xl w-full p-6 text-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                Nueva Cotización
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleCreateQuote} className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* Select Customer */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cliente Club (Opcional)</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) setCustomCustomerName("");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden cursor-pointer font-medium"
                  >
                    <option value="">-- Consumidor Final / Eventual --</option>
                    {companyCustomers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Eventual (Opcional)</label>
                  <input
                    type="text"
                    disabled={!!selectedCustomerId}
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    placeholder="Ej. Juan de los Palotes..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Add Quote Item Block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 shrink-0 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Agregar Producto</span>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Producto</label>
                    <select
                      value={tempProductId}
                      onChange={(e) => setTempProductId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden cursor-pointer font-medium"
                    >
                      <option value="">-- Seleccione producto --</option>
                      {companyProducts.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} (Precio: {p.price.toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Cantidad</label>
                    <input
                      type="number"
                      step="any"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center font-mono focus:outline-hidden"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">Descuento (%)</label>
                    <input
                      type="number"
                      value={tempDiscount}
                      onChange={(e) => setTempDiscount(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-center font-mono focus:outline-hidden"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddTempItem}
                      className="w-full py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 rounded-2xl bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5 text-center">Cant</th>
                      <th className="p-2.5 text-right">Precio</th>
                      <th className="p-2.5 text-center">Desc (%)</th>
                      <th className="p-2.5 text-right">Neto</th>
                      <th className="p-2.5 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {quoteItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No ha agregado ningún producto a esta cotización.
                        </td>
                      </tr>
                    ) : (
                      quoteItems.map((item, index) => {
                        const prod = companyProducts.find((p) => p.id === item.productId);
                        if (!prod) return null;
                        const gross = prod.price * item.qty;
                        const net = gross * (1 - item.discount / 100);
                        return (
                          <tr key={index}>
                            <td className="p-2.5 font-bold text-slate-700">{prod.name}</td>
                            <td className="p-2.5 text-center font-mono font-semibold">{item.qty}</td>
                            <td className="p-2.5 text-right font-mono text-slate-500">
                              {activeCompany.settings.currency} {prod.price.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center font-mono text-amber-600 font-bold">{item.discount}%</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {activeCompany.settings.currency} {net.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
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

              {/* Form Footer Totals & Action */}
              <div className="shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold border-b border-slate-200/60 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Subtotal</span>
                    <span className="font-mono text-slate-800">
                      {activeCompany.settings.currency} {formTotals.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Descuento</span>
                    <span className="font-mono text-red-500">
                      {activeCompany.settings.currency} {formTotals.discount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Impuestos ({activeCompany.settings.defaultTaxRate * 100}%)</span>
                    <span className="font-mono text-slate-800">
                      {activeCompany.settings.currency} {formTotals.tax.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-600 block uppercase">Total Cotización</span>
                    <span className="font-mono text-lg text-indigo-700 font-black">
                      {activeCompany.settings.currency} {formTotals.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Notas o condiciones del presupuesto..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <select
                      value={validDays}
                      onChange={(e) => setValidDays(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-hidden cursor-pointer"
                    >
                      <option value="5">Validez: 5 Días</option>
                      <option value="15">Validez: 15 Días</option>
                      <option value="30">Validez: 30 Días</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer mt-2"
                >
                  Confirmar y Generar Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED VIEW MODAL / TICKET PREVIEW */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0 pb-3 border-b border-slate-100">
              <span className="font-black text-xs uppercase text-slate-400">Ticket de Cotización</span>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Print Layout */}
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50 rounded-2xl font-mono text-[11px] leading-relaxed text-slate-800 space-y-4">
              <div className="text-center">
                <h4 className="font-bold text-sm uppercase text-slate-900">{activeCompany.name}</h4>
                <p className="text-[9.5px] text-slate-500">{activeBranch.address}</p>
                <div className="border-t border-dashed border-slate-300 my-2"></div>
                <h5 className="font-bold text-[10.5px]">COTIZACIÓN PREVIA</h5>
                <p className="text-[9px] text-slate-400">NO VÁLIDA COMO COMPROBANTE FISCAL</p>
                <p className="text-slate-500 font-bold mt-1">Nº {selectedQuote.id}</p>
              </div>

              <div className="space-y-1 text-slate-600">
                <p>Fecha: {new Date(selectedQuote.date).toLocaleString()}</p>
                <p className="text-red-600 font-bold">Válido hasta: {selectedQuote.validUntil}</p>
                <p className="font-bold text-slate-800">Cliente: {selectedQuote.customerName}</p>
              </div>

              <div className="border-t border-dashed border-slate-300 my-2"></div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex justify-between text-slate-400 text-[9.5px] uppercase font-bold">
                  <span>DESCRIPCIÓN</span>
                  <span>TOTAL</span>
                </div>
                {selectedQuote.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{item.productName}</span>
                      <span>{activeCompany.settings.currency} {((item.price * (1 - item.discount / 100)) * item.qty).toFixed(2)}</span>
                    </div>
                    <div className="text-slate-500 text-[10px]">
                      {item.qty} x {activeCompany.settings.currency} {item.price.toFixed(2)}
                      {item.discount > 0 && ` (Desc. ${item.discount}%)`}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 my-2"></div>

              <div className="space-y-1 font-bold">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{activeCompany.settings.currency} {selectedQuote.subtotal.toFixed(2)}</span>
                </div>
                {selectedQuote.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento:</span>
                    <span>-{activeCompany.settings.currency} {selectedQuote.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Impuestos:</span>
                  <span>{activeCompany.settings.currency} {selectedQuote.tax.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-300 my-1"></div>
                <div className="flex justify-between text-indigo-700 text-xs">
                  <span>TOTAL:</span>
                  <span>{activeCompany.settings.currency} {selectedQuote.total.toFixed(2)}</span>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-500 italic">
                  Nota: {selectedQuote.notes}
                </div>
              )}

              <div className="text-center text-[9px] text-slate-400 mt-4 leading-normal">
                Precios sujetos a variación después de la fecha de vencimiento.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mt-4 shrink-0">
              <button
                onClick={() => {
                  alert("Enviando impresión al dispositivo local...");
                }}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={() => {
                  handleConvertToSale(selectedQuote);
                  setSelectedQuote(null);
                }}
                className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <ShoppingCart className="w-4 h-4" />
                Cargar en POS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
