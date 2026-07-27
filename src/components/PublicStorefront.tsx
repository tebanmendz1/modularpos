import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, Search, ShoppingCart, Plus, Minus, Trash2, 
  CheckCircle2, Store, ArrowLeft, X, Phone, User, MapPin, 
  Sparkles, ExternalLink, Globe
} from "lucide-react";
import { Company, Product } from "../types";

interface CartItem {
  product: Product;
  qty: number;
}

interface PublicStorefrontProps {
  company: Company;
  products: Product[];
  onCloseStorefront?: () => void;
  isStandalone?: boolean;
}

export default function PublicStorefront({
  company,
  products,
  onCloseStorefront,
  isStandalone = false
}: PublicStorefrontProps) {
  const companyProducts = products.filter(p => p.companyId === company.id);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Checkout form
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [orderSubmitted, setOrderSubmitted] = useState<any | null>(null);

  // Get unique categories
  const categories = ["Todos", ...Array.from(new Set(companyProducts.map(p => p.category || "General")))];

  // Filter products
  const filteredProducts = companyProducts.filter(p => {
    const matchesCategory = selectedCategory === "Todos" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate total items & price
  const cartItemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const taxRate = company.settings?.defaultTaxRate || 0.18;
  const cartTax = cartSubtotal * taxRate;
  const cartTotal = cartSubtotal + cartTax;

  // Add to cart
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  // Update item qty
  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Submit Web Order
  const [storefrontNoticeMsg, setStorefrontNoticeMsg] = useState<string>("");
  const [showStorefrontNoticeModal, setShowStorefrontNoticeModal] = useState<boolean>(false);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setStorefrontNoticeMsg("Por favor ingrese su nombre y teléfono para completar el pedido.");
      setShowStorefrontNoticeModal(true);
      return;
    }
    if (cart.length === 0) {
      setStorefrontNoticeMsg("Su carrito de compras está vacío.");
      setShowStorefrontNoticeModal(true);
      return;
    }


    const orderId = `web_${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder = {
      id: orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      addressNotes: addressNotes.trim(),
      items: cart.map(item => ({
        productName: item.product.name,
        qty: item.qty,
        price: item.product.price
      })),
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartTotal,
      date: new Date().toISOString(),
      status: "pending"
    };

    // Save order to localStorage for merchant
    const storageKey = `pos_web_orders_${company.id}`;
    const saved = localStorage.getItem(storageKey);
    const existingOrders = saved ? JSON.parse(saved) : [];
    const updatedOrders = [newOrder, ...existingOrders];
    localStorage.setItem(storageKey, JSON.stringify(updatedOrders));

    // Reset state & show order success modal
    setOrderSubmitted(newOrder);
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      
      {/* Top Banner for Online Store */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            {onCloseStorefront && (
              <button 
                onClick={onCloseStorefront}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer mr-1 flex items-center gap-1 text-xs font-bold"
                title="Cerrar vista de tienda"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al POS</span>
              </button>
            )}
            
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-md shrink-0">
              <Store className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">{company.name}</h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Tienda Virtual
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Catálogo en línea con entrega a domicilio y retiro en tienda</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
              />
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Mi Carrito</span>
              <span className="bg-white text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                {cartItemCount}
              </span>
            </button>

            {isStandalone && (
              <a 
                href={window.location.origin + window.location.pathname}
                className="text-xs text-slate-400 hover:text-white underline font-medium hidden lg:inline ml-2"
              >
                Acceso Administrador
              </a>
            )}
          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="px-4 pb-3 md:hidden">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar productos en la tienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 text-white text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-700 focus:outline-hidden focus:border-indigo-500 placeholder-slate-400"
            />
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Catálogo de Productos Disponibles
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              Haga sus pedidos en línea fácilmente
            </h2>
            <p className="text-sm text-indigo-200 max-w-xl">
              Seleccione los artículos de su preferencia, agregue al carrito y confirme su orden. Nuestro equipo la procesará de inmediato.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs border border-white/10 p-4 rounded-2xl text-xs">
            <Globe className="w-8 h-8 text-indigo-300 shrink-0" />
            <div>
              <div className="font-bold text-white">Atención y Pedidos</div>
              <div className="text-indigo-200">Sincronizado directamente con el POS</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full space-y-6">
        
        {/* Category Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((prod) => {
            // Calculate total stock
            const totalStock = Object.values(prod.stock || {}).reduce((a, b) => a + b, 0);
            const inCart = cart.find(c => c.product.id === prod.id);

            return (
              <div 
                key={prod.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="h-40 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center p-1 relative group overflow-hidden">
                    {prod.image ? (
                      <img src={prod.image} alt={prod.name} className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform" />
                    ) : (
                      <ShoppingBag className="w-12 h-12 text-indigo-200 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                      {prod.category || "General"}
                    </span>
                    {totalStock <= 0 && (
                      <span className="absolute top-2 right-2 bg-red-100 text-red-600 border border-red-200 text-[9px] font-bold px-2 py-0.5 rounded-md">
                        Agotado
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{prod.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Ref: {prod.sku || prod.barcode || "S/N"}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Precio Unitario</span>
                    <span className="font-extrabold text-base text-indigo-600">
                      RD$ {prod.price.toLocaleString("es-DO", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-xl p-1">
                      <button
                        onClick={() => handleUpdateQty(prod.id, -1)}
                        className="p-1 bg-white text-indigo-700 rounded-lg shadow-xs hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-indigo-900 px-1">{inCart.qty}</span>
                      <button
                        onClick={() => handleUpdateQty(prod.id, 1)}
                        className="p-1 bg-indigo-600 text-white rounded-lg shadow-xs hover:bg-indigo-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(prod)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-700">No se encontraron productos</h3>
            <p className="text-xs text-slate-400">Intente buscar con otro término o seleccione otra categoría.</p>
          </div>
        )}

      </main>

      {/* Cart Slide-Over Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">Su Carrito de Compras</h3>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs text-slate-800 truncate">{item.product.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      RD$ {item.product.price.toLocaleString("es-DO", { minimumFractionDigits: 2 })} / ud.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                      <button 
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold px-1.5">{item.qty}</span>
                      <button 
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button 
                      onClick={() => handleUpdateQty(item.product.id, -item.qty)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Eliminar del carrito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-16 space-y-3 text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">Su carrito está actualmente vacío.</p>
                </div>
              )}
            </div>

            {/* Checkout Form & Totals */}
            {cart.length > 0 && (
              <form onSubmit={handleCheckoutSubmit} className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
                
                {/* Customer Details */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Datos del Comprador para la Entrega
                  </span>
                  
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nombre Completo *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input 
                        type="text" 
                        required
                        placeholder="Ej. Maria Lopez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-white text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Teléfono / WhatsApp *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input 
                        type="tel" 
                        required
                        placeholder="Ej. 809-555-0199"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-white text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Dirección de Envío / Notas</label>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input 
                        type="text" 
                        placeholder="Ej. Calle Principal #12, Res. Mirador"
                        value={addressNotes}
                        onChange={(e) => setAddressNotes(e.target.value)}
                        className="w-full bg-white text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Totals */}
                <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>RD$ {cartSubtotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>ITBIS ({(taxRate * 100).toFixed(0)}%):</span>
                    <span>RD$ {cartTax.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-slate-900 border-t border-dashed border-slate-300 pt-1.5">
                    <span>Total a Pagar:</span>
                    <span className="text-indigo-600">RD$ {cartTotal.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Realizar Pedido Web</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Order Confirmation Success Modal */}
      {orderSubmitted && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full">
                ¡Pedido Recibido Con Éxito!
              </span>
              <h3 className="text-lg font-black text-slate-900">Orden #{orderSubmitted.id}</h3>
              <p className="text-xs text-slate-500">
                Gracias <span className="font-bold text-slate-800">{orderSubmitted.customerName}</span>. Su pedido ha sido enviado directamente al punto de venta de <span className="font-bold">{company.name}</span>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Total a Pagar:</span>
                <span className="font-bold text-slate-900">RD$ {orderSubmitted.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Teléfono:</span>
                <span className="text-slate-800">{orderSubmitted.customerPhone}</span>
              </div>
            </div>

            <button
              onClick={() => setOrderSubmitted(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
            >
              Entendido / Seguir Comprando
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} {company.name} — Tienda Online Oficial Sincronizada con Cloud POS</p>
      </footer>

      {/* NOTICE OVERLAY MODAL */}
      {showStorefrontNoticeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-fadeIn text-white text-center">
            <div className="w-12 h-12 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-white text-base">Tienda Online</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{storefrontNoticeMsg}</p>
            <button
              type="button"
              onClick={() => setShowStorefrontNoticeModal(false)}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-600/20 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

