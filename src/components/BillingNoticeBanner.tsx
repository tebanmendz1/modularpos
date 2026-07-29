import React, { useEffect, useState } from "react";
import { BellRing, Check, CreditCard, X } from "lucide-react";
import { PlatformBillingNotice } from "../types";

export default function BillingNoticeBanner({ companyId, userId }: { companyId: string; userId: string }) {
  const [notices, setNotices] = useState<PlatformBillingNotice[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (companyId === "comp_admin") return;
    fetch(`/api/billing/notices/${encodeURIComponent(companyId)}`).then(r => r.ok ? r.json() : []).then(setNotices).catch(() => undefined);
  }, [companyId]);
  const pending = notices.filter(item => !item.acknowledgedAt);
  if (!pending.length) return null;
  const current = pending[0];
  const acknowledge = async () => {
    const response = await fetch(`/api/billing/notices/${current.id}/acknowledge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId, userId }) });
    if (response.ok) setNotices(list => list.map(item => item.id === current.id ? { ...item, acknowledgedAt: new Date().toISOString(), acknowledgedBy: userId } : item));
    setOpen(false);
  };
  return <>
    <button onClick={() => setOpen(true)} className="mx-4 mt-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm text-left">
      <BellRing className="w-5 h-5 text-amber-600 animate-pulse shrink-0"/><div className="flex-1"><p className="text-xs font-black">{current.title}</p><p className="text-[11px]">{current.message}</p></div><span className="bg-amber-600 text-white rounded-full min-w-6 h-6 grid place-items-center text-xs font-black">{pending.length}</span>
    </button>
    {open && <div className="fixed inset-0 z-[100] bg-slate-950/70 grid place-items-center p-4"><div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden">
      <div className="bg-amber-500 p-5 flex justify-between text-amber-950"><div className="flex gap-3"><CreditCard/><div><h2 className="font-black">{current.title}</h2><p className="text-xs">Factura {current.saleId}</p></div></div><button onClick={()=>setOpen(false)}><X/></button></div>
      <div className="p-6 space-y-4"><p className="text-sm leading-6">{current.message}</p><div className="bg-slate-100 rounded-xl p-4"><p className="text-xs font-bold uppercase text-slate-500">Total facturado</p><p className="text-2xl font-black">{current.currency} {current.total.toLocaleString("es-DO", { minimumFractionDigits: 2 })}</p><p className="text-xs mt-1">Período: {current.billingPeriod}</p></div><div><p className="text-xs font-black uppercase mb-2">Canales de pago</p><p className="whitespace-pre-wrap text-sm bg-indigo-50 border border-indigo-100 rounded-xl p-4">{current.paymentChannels}</p></div><button onClick={acknowledge} className="w-full bg-indigo-600 text-white rounded-xl py-3 font-black flex justify-center gap-2"><Check className="w-5 h-5"/>He leído este aviso</button></div>
    </div></div>}
  </>;
}
