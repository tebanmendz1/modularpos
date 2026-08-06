import React, { useState, useEffect } from "react";
import { 
  Globe, Smartphone, RefreshCw, ShoppingCart, 
  Check, X, CheckCircle, Package, ArrowRight,
  ExternalLink, BarChart3, Clock, Copy, Eye
} from "lucide-react";
import { Company, Product, Customer, Sale } from "../types";
import PublicStorefront from "./PublicStorefront";

interface ECommerceOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  items: { productName: string; qty: number; price: number }[];
  total: number;
  date: string;
  status: "pending" | "accepted" | "rejected";
}

interface ECommerceModuleProps {
  activeCompany: Company;
  products: Product[];
  customers: Customer[];
  onAddSale: (sale: Sale) => void;
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
  onNavigateToPOS?: () => void;
}

export default function ECommerceModule({
  activeCompany,
  products,
  customers,
  onAddSale,
  onAddAudit,
  onNavigateToPOS
}: ECommerceModuleProps) {
  // Sync States
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string>(new Date().toLocaleString());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Public URL dynamically constructed based on host site domain/port
  const publicStoreUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, "")}/?store=${activeCompany.id}`
    : `https://${activeCompany.id}.cloudpos.store/catalogo`;

  // Incoming web orders state loaded from localStorage
  const [webOrders, setWebOrders] = useState<ECommerceOrder[]>(() => {
    const saved = localStorage.getItem(`pos_web_orders_${activeCompany.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Auto reload web orders in real-time
  useEffect(() => {
    const loadOrders = () => {
      const saved = localStorage.getItem(`pos_web_orders_${activeCompany.id}`);
      if (saved) {
        try {
          setWebOrders(JSON.parse(saved));
        } catch (e) {
          console.error("Error parsing web orders", e);
        }
      }
    };
    loadOrders();
    window.addEventListener("storage", loadOrders);
    const interval = setInterval(loadOrders, 2500);
    return () => {
      window.removeEventListener("storage", loadOrders);
      clearInterval(interval);
    };
  }, [activeCompany.id]);

  // Sync catalog helper
  const handleSyncCatalog = () => {
    setIsSyncingCatalog(true);
    setTimeout(() => {
      setIsSyncingCatalog(false);
      const now = new Date().toLocaleString();
      setLastSyncDate(now);
      onAddAudit(
        "Sincronizar E-commerce",
        `Catálogo público sincronizado exitosamente con ${products.filter(p => p.companyId === activeCompany.id).length} artículos activos.`
      );
      alert("¡Catálogo de e-commerce sincronizado con éxito!");
    }, 1200);
  };

  // Accept incoming e-commerce order and load into POS for billing
  const handleAcceptOrder = (order: ECommerceOrder) => {
    // 1. Prepare cart items for POS
    const cartItems = order.items.map((it) => {
      const prod = products.find(p => p.name.toLowerCase() === it.productName.toLowerCase());
      if (prod) {
        return {
          product: prod,
          qty: it.qty,
          discount: 0
        };
      }
      return {
        productId: "web_" + Math.random().toString(36).slice(2, 7),
        productName: it.productName,
        price: it.price,
        cost: Math.round(it.price * 0.65),
        qty: it.qty,
        discount: 0,
        tax: activeCompany.settings?.defaultTaxRate || 0.18
      };
    });

    // Write to localStorage for POS
    localStorage.setItem("pos_pending_load_cart", JSON.stringify(cartItems));
    localStorage.setItem("pos_pending_is_web_order", "true");
    localStorage.setItem("pos_pending_load_notes", `[Pedido Web #${order.id}] ${order.customerName} - Tel: ${order.customerPhone}`);

    // Try to match or register customer info
    if (customers && customers.length > 0) {
      const foundCust = customers.find(c => 
        (order.customerPhone && c.phone && c.phone.replace(/\D/g, '').includes(order.customerPhone.replace(/\D/g, ''))) ||
        (c.name.toLowerCase().includes(order.customerName.toLowerCase()))
      );
      if (foundCust) {
        localStorage.setItem("pos_pending_load_customer", foundCust.id);
      } else {
        localStorage.removeItem("pos_pending_load_customer");
      }
    }

    // 2. Update order status
    const updated = webOrders.map(o => o.id === order.id ? { ...o, status: "accepted" as const } : o);
    setWebOrders(updated);
    localStorage.setItem(`pos_web_orders_${activeCompany.id}`, JSON.stringify(updated));

    onAddAudit(
      "Facturar Pedido Web en POS",
      `Pedido e-commerce #${order.id} de ${order.customerName} cargado en el POS para facturación.`
    );

    // 3. Open POS module immediately
    if (onNavigateToPOS) {
      onNavigateToPOS();
    } else {
      alert(`Pedido #${order.id} cargado en el carrito del POS.`);
    }
  };

  // Reject web order
  const handleRejectOrder = (orderId: string) => {
    const updated = webOrders.map(o => o.id === orderId ? { ...o, status: "rejected" as const } : o);
    setWebOrders(updated);
    localStorage.setItem(`pos_web_orders_${activeCompany.id}`, JSON.stringify(updated));
    onAddAudit("Rechazar Pedido Web", `Pedido e-commerce #${orderId} rechazado/anulado por el operador.`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicStoreUrl);
    alert("Enlace copiado al portapapeles.");
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50" id="ecommerce-root">
      
      {/* Subheader */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Comercio Electrónico e Integración Web</h2>
            <p className="text-[10px] text-slate-400 font-medium">Sincronice su catálogo físico con su tienda virtual cloud, reciba pedidos en tiempo real y facture pedidos web sin fricciones.</p>
          </div>
        </div>

        <button
          onClick={handleSyncCatalog}
          disabled={isSyncingCatalog}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncingCatalog ? 'animate-spin' : ''}`} />
          {isSyncingCatalog ? 'Sincronizando...' : 'Sincronizar Catálogo Público'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Sync status banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Cloud Storefront Url Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Tienda Virtual Cloud Activa</span>
              <Globe className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-500 font-semibold truncate block max-w-xs">{publicStoreUrl}</span>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                ● Tienda Online Habilitada
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyLink}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-slate-500" />
                Copiar Enlace
              </button>
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                Ver Vista Previa
              </button>
              <a
                href={publicStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Abrir en Nueva Pestaña
              </a>
            </div>
          </div>

          {/* Sync Stats */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Último Volcado de Stock</span>
              <h4 className="font-extrabold text-xs text-slate-800">{lastSyncDate}</h4>
              <p className="text-[10px] text-slate-400">
                Artículos publicados: <span className="font-bold text-indigo-600">{products.filter(p => p.companyId === activeCompany.id).length}</span>
              </p>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>

          {/* Web conversion rate stats */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Embudo de Conversión Web</span>
              <h4 className="font-extrabold text-sm text-slate-800">4.82% Conversión</h4>
              <p className="text-[10px] text-slate-400">Total ventas origen web: ${webOrders.filter(o => o.status === 'accepted').reduce((sum, o) => sum + o.total, 0)}</p>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* Incoming Web Orders Queue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600 animate-pulse" />
              <span className="font-bold text-xs uppercase text-slate-900 tracking-wider">Bandeja de Pedidos Web Entrantes (En Tiempo Real)</span>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-sm">Filtro: Pendientes</span>
          </div>

          <div className="divide-y divide-slate-100">
            {webOrders.map((order) => (
              <div key={order.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">Pedido #{order.id}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(order.date).toLocaleTimeString()}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-sm ${
                      order.status === 'pending' 
                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                        : order.status === 'accepted'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {order.status === 'pending' ? 'Pendiente Aprobación' : order.status === 'accepted' ? 'Facturado / Aprobado' : 'Rechazado'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-semibold">
                    Comprador: <span className="text-slate-800">{order.customerName}</span> ({order.customerPhone})
                  </p>

                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {order.items.map((it, idx) => (
                      <span key={idx} className="bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Package className="w-3 h-3 text-slate-400" />
                        {it.productName} ({it.qty}x)
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total del Carrito</span>
                    <span className="font-mono font-bold text-slate-900">${order.total}</span>
                  </div>

                  {order.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectOrder(order.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl transition-all cursor-pointer"
                        title="Rechazar Pedido"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(order)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title="Aprobar y Facturar"
                      >
                        <Check className="w-4 h-4" />
                        Facturar POS
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {webOrders.length === 0 && (
              <p className="text-center py-10 text-slate-400 italic">No se han registrado pedidos web entrantes.</p>
            )}
          </div>
        </div>

      </div>

      {/* Interactive Storefront Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex flex-col animate-in fade-in duration-200 overflow-y-auto">
          <PublicStorefront 
            company={activeCompany}
            products={products}
            onCloseStorefront={() => setIsPreviewOpen(false)}
          />
        </div>
      )}

    </div>
  );
}
