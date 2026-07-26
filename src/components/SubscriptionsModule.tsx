import React, { useState } from "react";
import { 
  Award, ShieldCheck, CreditCard, Plus, X, 
  Play, Pause, RefreshCw, CheckCircle2, AlertTriangle, 
  DollarSign, Users, Calendar
} from "lucide-react";
import { Company, Customer, Sale, User } from "../types";

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: "mensual" | "anual";
  features: string[];
}

interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  planId: string;
  planName: string;
  amount: number;
  nextBillingDate: string;
  status: "active" | "suspended" | "expired";
  autoRenew: boolean;
}

interface SubscriptionsModuleProps {
  activeCompany: Company;
  currentUser: User;
  customers: Customer[];
  onAddSale: (sale: Sale) => void;
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
}

export default function SubscriptionsModule({
  activeCompany,
  currentUser,
  customers,
  onAddSale,
  onAddAudit
}: SubscriptionsModuleProps) {
  // Predefined Subscription Plans
  const plans: Plan[] = [
    { id: "plan_basic", name: "Membresía Standard", price: 1500, billingPeriod: "mensual", features: ["Acceso a instalaciones", "10% descuento POS", "Soporte básico"] },
    { id: "plan_premium", name: "Membresía Premium Club", price: 3000, billingPeriod: "mensual", features: ["Acceso completo VIP", "15% descuento POS", "Casillero propio", "1 bebida incluida"] },
    { id: "plan_vip", name: "Pase Elite Anual", price: 25000, billingPeriod: "anual", features: ["Acceso ilimitado 24/7", "20% descuento POS", "Entrenador personalizado", "Invitados gratis"] }
  ];

  // Load existing member subscriptions
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => {
    const saved = localStorage.getItem(`pos_subscriptions_${activeCompany.id}`);
    return saved ? JSON.parse(saved) : [
      { 
        id: "sub_1", 
        customerId: "cust_super_cl1", 
        customerName: "Constructora Dominicana SRL", 
        planId: "plan_premium", 
        planName: "Membresía Premium Club", 
        amount: 3000, 
        nextBillingDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], 
        status: "active", 
        autoRenew: true 
      },
      { 
        id: "sub_2", 
        customerId: "cust_super_cl2", 
        customerName: "Anabel Martínez", 
        planId: "plan_basic", 
        planName: "Membresía Standard", 
        amount: 1500, 
        nextBillingDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], 
        status: "expired", 
        autoRenew: false 
      }
    ];
  });

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("plan_basic");
  const [autoRenewInput, setAutoRenewInput] = useState(true);

  // Filter customers for active company
  const companyCustomers = customers.filter(c => c.companyId === activeCompany.id);

  // Add / Assign Subscription
  const handleAssignSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = companyCustomers.find(c => c.id === selectedCustomerId);
    const plan = plans.find(p => p.id === selectedPlanId);

    if (!cust || !plan) {
      alert("Por favor seleccione un cliente y un plan.");
      return;
    }

    // Check if duplicate subscription
    const alreadySubbed = subscriptions.some(s => s.customerId === cust.id && s.status === "active");
    if (alreadySubbed) {
      alert("Este cliente ya posee una membresía activa actualmente.");
      return;
    }

    const nextBilling = new Date();
    if (plan.billingPeriod === "mensual") nextBilling.setMonth(nextBilling.getMonth() + 1);
    else nextBilling.setFullYear(nextBilling.getFullYear() + 1);

    const newSub: Subscription = {
      id: "sub_" + Math.random().toString(36).slice(2, 9),
      customerId: cust.id,
      customerName: cust.name,
      planId: plan.id,
      planName: plan.name,
      amount: plan.price,
      nextBillingDate: nextBilling.toISOString().split("T")[0],
      status: "active",
      autoRenew: autoRenewInput
    };

    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    localStorage.setItem(`pos_subscriptions_${activeCompany.id}`, JSON.stringify(updated));

    onAddAudit(
      "Asignar Membresía",
      `Suscripción asignada a ${cust.name} para el plan "${plan.name}" por $${plan.price}.`
    );

    setSelectedCustomerId("");
    setShowAssignModal(false);
    alert(`Membresía "${plan.name}" asignada correctamente a ${cust.name}.`);
  };

  // Toggle Pause/Play status
  const handleToggleStatus = (subId: string) => {
    const updated = subscriptions.map((sub) => {
      if (sub.id === subId) {
        const nextStatus = sub.status === "active" ? "suspended" : "active";
        onAddAudit(
          nextStatus === "active" ? "Reactivar Suscripción" : "Suspender Suscripción",
          `Membresía de ${sub.customerName} marcada como ${nextStatus}.`
        );
        return { ...sub, status: nextStatus };
      }
      return sub;
    });

    setSubscriptions(updated as Subscription[]);
    localStorage.setItem(`pos_subscriptions_${activeCompany.id}`, JSON.stringify(updated));
  };

  // Renew Subscription (creates a POS invoice instantly!)
  const handleRenewSubscription = (sub: Subscription) => {
    const plan = plans.find(p => p.id === sub.planId) || plans[0];
    
    // 1. Create sale record
    const mockSale: Sale = {
      id: "sale_sub_" + Math.random().toString(36).slice(2, 9),
      uuid: "sale_sub_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      branchId: "br_super_main",
      userId: currentUser.id,
      date: new Date().toISOString(),
      items: [{
        productId: plan.id,
        productName: `Cobro Membresía: ${plan.name}`,
        price: plan.price,
        cost: 0,
        qty: 1,
        discount: 0,
        tax: activeCompany.settings.defaultTaxRate
      }],
      total: plan.price * (1 + activeCompany.settings.defaultTaxRate),
      discount: 0,
      tax: plan.price * activeCompany.settings.defaultTaxRate,
      paymentMethod: "Membresía Recurrente",
      status: "completed",
      synced: true,
      customerId: sub.customerId,
      notes: `Cobro recurrente mensual de membresía de ${sub.customerName}`
    };

    onAddSale(mockSale);

    // 2. Extend next billing date
    const nextDate = new Date();
    if (plan.billingPeriod === "mensual") nextDate.setMonth(nextDate.getMonth() + 1);
    else nextDate.setFullYear(nextDate.getFullYear() + 1);

    const updated = subscriptions.map((s) => {
      if (s.id === sub.id) {
        return {
          ...s,
          status: "active" as const,
          nextBillingDate: nextDate.toISOString().split("T")[0]
        };
      }
      return s;
    });

    setSubscriptions(updated);
    localStorage.setItem(`pos_subscriptions_${activeCompany.id}`, JSON.stringify(updated));

    onAddAudit(
      "Renovación Suscripción",
      `Membresía de ${sub.customerName} renovada. Factura POS cobrada por $${mockSale.total.toFixed(2)}.`
    );

    alert(`Membresía de ${sub.customerName} renovada con éxito. Factura POS emitida.`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50" id="subscriptions-root">
      
      {/* Subheader */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Suscripciones y Membresías</h2>
            <p className="text-[10px] text-slate-400 font-medium">Gestione pases periódicos, controle ciclos de facturación mensuales automáticos y fidelice ingresos recurrentes.</p>
          </div>
        </div>

        <button
          onClick={() => setShowAssignModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Inscribir Miembro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Plan templates info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs space-y-4 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900">{p.name}</h4>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{p.billingPeriod}</span>
                </div>
                <span className="text-indigo-600 font-black text-xs">
                  ${p.price.toLocaleString()} DOP
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {p.features.map((f, i) => (
                  <span key={i} className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Active subscriptions grid list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-xs uppercase text-slate-900 tracking-wider">Membresías y Clientes Vinculados ({subscriptions.length})</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Socio / Cliente</th>
                  <th className="p-3">Plan Activo</th>
                  <th className="p-3">Tarifa Periódica</th>
                  <th className="p-3">Próximo Cobro</th>
                  <th className="p-3 text-center">Estado</th>
                  <th className="p-3 text-center">Auto-Renovación</th>
                  <th className="p-3 text-right">Acciones de Suscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-bold">{sub.customerName}</td>
                    <td className="p-3">
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-bold text-[10px] px-2 py-0.5 rounded">
                        {sub.planName}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">${sub.amount}</td>
                    <td className="p-3 font-mono text-slate-500 flex items-center gap-1.5 pt-4">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {sub.nextBillingDate}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`font-bold text-[10px] px-2.5 py-0.5 rounded-full ${
                        sub.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : sub.status === 'suspended'
                          ? 'bg-amber-50 text-amber-600 border border-amber-105'
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {sub.status === 'active' ? 'Activa' : sub.status === 'suspended' ? 'Suspendida' : 'Vencida'}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-500">
                      {sub.autoRenew ? "Habilitado (Automatic)" : "Manual"}
                    </td>
                    <td className="p-3 text-right flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(sub.id)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          sub.status === 'active'
                            ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {sub.status === 'active' ? 'Pausar' : 'Reactivar'}
                      </button>
                      <button
                        onClick={() => handleRenewSubscription(sub)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Facturar Cobro
                      </button>
                    </td>
                  </tr>
                ))}
                {subscriptions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400 italic">No hay membresías emitidas en este comercio.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: ASIGNAR MEMBRESÍA */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleAssignSubscription} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Award className="w-5 h-5 text-indigo-600" />
              Inscribir Nuevo Miembro
            </h3>
            <p className="text-[11px] text-slate-400">
              Vincule un cliente de su base de datos a un plan periódico de suscripciones. El sistema calculará el ciclo de facturación recurrente de forma automática.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Seleccione Cliente *</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
              >
                <option value="">Seleccione Cliente...</option>
                {companyCustomers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Seleccione Plan de Membresía *</label>
              <select
                required
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (${p.price} DOP)</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoRenewInput"
                checked={autoRenewInput}
                onChange={(e) => setAutoRenewInput(e.target.checked)}
                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
              />
              <label htmlFor="autoRenewInput" className="text-xs font-bold text-slate-700 cursor-pointer">
                Habilitar Cobro Automático (Auto-Renew)
              </label>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Asignar Membresía
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
