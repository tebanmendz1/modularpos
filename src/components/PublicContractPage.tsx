import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileSignature, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { PlatformContract } from "../types";

export default function PublicContractPage({ token }: { token: string }) {
  const [contract, setContract] = useState<PlatformContract | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [signed, setSigned] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    fetch(`/api/contracts/public/${encodeURIComponent(token)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo abrir el contrato");
        setContract(data);
      })
      .catch(err => setError(err.message));
  }, [token]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const context = event.currentTarget.getContext("2d")!;
    const p = point(event); context.beginPath(); context.moveTo(p.x, p.y);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d")!;
    const p = point(event); context.lineWidth = 3; context.lineCap = "round"; context.strokeStyle = "#0f172a"; context.lineTo(p.x, p.y); context.stroke(); setSigned(true);
  };
  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); setSigned(false);
  };
  const submit = async () => {
    if (!name.trim() || !documentId.trim() || !accepted || !signed || !canvasRef.current) {
      setError("Complete sus datos, acepte los términos y dibuje su firma."); return;
    }
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/contracts/public/${encodeURIComponent(token)}/accept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signerName: name, signerDocument: documentId, acceptedTerms: accepted, signatureData: canvasRef.current.toDataURL("image/png") })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible registrar la aceptación");
      setContract(current => current ? { ...current, status: "accepted", acceptedAt: data.acceptedAt, acceptanceHash: data.acceptanceHash, signerName: name } : current);
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  if (error && !contract) return <main className="min-h-screen bg-slate-100 grid place-items-center p-6"><div className="bg-white rounded-2xl p-8 shadow-xl text-rose-700">{error}</div></main>;
  if (!contract) return <main className="min-h-screen grid place-items-center"><Loader2 className="animate-spin text-indigo-600" /></main>;
  const closed = contract.status !== "pending";

  return <main className="min-h-screen bg-slate-100 py-8 px-4 text-slate-900">
    <div className="max-w-4xl mx-auto space-y-5">
      <header className="bg-indigo-950 text-white rounded-2xl p-6 flex items-center gap-4 shadow-xl">
        <ShieldCheck className="w-10 h-10 text-indigo-300" />
        <div><p className="text-xs uppercase tracking-widest text-indigo-300">Documento electrónico verificable</p><h1 className="text-xl font-black">{contract.title}</h1><p className="text-sm text-indigo-200">Empresa: {contract.companyName}</p></div>
      </header>
      <article className="bg-white rounded-2xl shadow p-7">
        <div className="whitespace-pre-wrap leading-7 text-sm">{contract.content}</div>
        <div className="mt-8 pt-4 border-t text-[11px] text-slate-500 font-mono break-all">Huella SHA-256: {contract.contentHash}</div>
      </article>
      {closed ? <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex gap-3">
        <CheckCircle2 className="text-emerald-600 shrink-0" /><div className="flex-1"><h2 className="font-black text-emerald-900">Contrato aceptado e inmutable</h2><p className="text-sm text-emerald-800">Firmado por {contract.signerName} el {contract.acceptedAt ? new Date(contract.acceptedAt).toLocaleString("es-DO") : "—"}.</p>{contract.signatureData && <img src={contract.signatureData} alt="Firma registrada" className="mt-3 h-24 max-w-sm bg-white border rounded-lg object-contain"/>}<p className="text-[10px] font-mono break-all mt-2 text-emerald-700">Evidencia: {contract.acceptanceHash}</p></div>
      </section> : <section className="bg-white rounded-2xl shadow p-7 space-y-5">
        <div className="flex gap-3 items-center"><FileSignature className="text-indigo-600"/><div><h2 className="font-black">Aceptar y firmar</h2><p className="text-xs text-slate-500">La aceptación quedará registrada permanentemente.</p></div></div>
        <div className="grid sm:grid-cols-2 gap-4"><input className="border rounded-xl px-4 py-3 text-sm" placeholder="Nombre completo del firmante" value={name} onChange={e=>setName(e.target.value)}/><input className="border rounded-xl px-4 py-3 text-sm" placeholder="Cédula / Pasaporte" value={documentId} onChange={e=>setDocumentId(e.target.value)}/></div>
        <div><div className="flex justify-between mb-2"><span className="text-xs font-bold">Firma manuscrita</span><button onClick={clear} className="text-xs text-indigo-600 flex gap-1"><RotateCcw className="w-3 h-3"/>Limpiar</button></div><canvas ref={canvasRef} width={900} height={220} onPointerDown={start} onPointerMove={move} onPointerUp={()=>drawing.current=false} onPointerCancel={()=>drawing.current=false} className="w-full h-44 border-2 border-dashed rounded-xl touch-none bg-slate-50"/></div>
        <label className="flex gap-3 text-sm"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>He leído íntegramente este documento, tengo autoridad para aceptar en nombre de la empresa y manifiesto mi consentimiento.</span></label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={submit} disabled={saving} className="w-full bg-indigo-600 disabled:opacity-50 text-white rounded-xl py-3 font-black">{saving ? "Registrando aceptación…" : "ACEPTAR Y FIRMAR CONTRATO"}</button>
      </section>}
    </div>
  </main>;
}
