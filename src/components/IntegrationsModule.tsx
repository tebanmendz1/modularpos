import React, { useState } from "react";
import { Layers, Plus, CheckCircle, RefreshCw, Smartphone, Key, Settings, AlertCircle, FileText, Send } from "lucide-react";
import { Company } from "../types";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: "active" | "inactive";
}

interface ApiLog {
  id: string;
  timestamp: string;
  method: "POST" | "GET" | "PUT";
  endpoint: string;
  status: number;
  payload: string;
}

interface IntegrationsModuleProps {
  activeCompany: Company;
  onAddAudit: (action: string, details: string) => void;
}

export default function IntegrationsModule({
  activeCompany,
  onAddAudit
}: IntegrationsModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<"whatsapp" | "webhooks" | "apikeys">("whatsapp");

  // Webhook list state
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: "wh_1", url: "https://api.empresa.com/v1/ventas-webhook", events: ["sale.completed", "sale.refunded"], status: "active" },
    { id: "wh_2", url: "https://my-erp-connector.com/sync", events: ["inventory.updated"], status: "active" }
  ]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  // Active API developer keys
  const [apiKey, setApiKey] = useState("pk_live_d09fb85c4b127402be41620077bc81a2b");
  const [showKey, setShowKey] = useState(false);

  // WhatsApp setup state
  const [waPhone, setWaPhone] = useState("809-555-0100");
  const [isWaEnabled, setIsWaEnabled] = useState(true);
  const [waTemplate, setWaTemplate] = useState("Hola {{cliente}}, gracias por su compra en {{empresa}}. Detalle de su factura: {{monto}}. Comprobante NCF: {{ncf}}.");

  // Developer Logs list
  const [logs, setLogs] = useState<ApiLog[]>([
    { id: "log_1", timestamp: new Date(Date.now() - 5 * 60000).toISOString(), method: "POST", endpoint: "/api/v1/sales", status: 201, payload: '{"total": 1250, "items_qty": 2}' },
    { id: "log_2", timestamp: new Date(Date.now() - 15 * 60000).toISOString(), method: "GET", endpoint: "/api/v1/products?sku=ARR-001", status: 200, payload: '{"id": "prod_1", "sku": "ARR-001"}' },
    { id: "log_3", timestamp: new Date(Date.now() - 32 * 60000).toISOString(), method: "POST", endpoint: "/api/v1/customers", status: 400, payload: '{"error": "RNC inválido"}' }
  ]);

  const handleCreateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhookUrl.trim() || !newWebhookUrl.startsWith("http")) {
      alert("Por favor ingrese una URL válida que empiece con http:// o https://");
      return;
    }

    const newWh: Webhook = {
      id: "wh_" + Math.random().toString(36).slice(2, 9),
      url: newWebhookUrl.trim(),
      events: ["sale.completed"],
      status: "active"
    };

    setWebhooks([...webhooks, newWh]);
    onAddAudit("Configuración Integraciones", `Nuevo webhook de API configurado: ${newWh.url}`);
    setNewWebhookUrl("");
    alert("¡Webhook añadido exitosamente!");
  };

  const handleRegenerateKey = () => {
    if (!confirm("¿Está seguro de regenerar su llave de API privada? Todas las aplicaciones de terceros conectadas actualmente dejarán de funcionar hasta que se actualicen.")) {
      return;
    }
    const newK = "pk_live_" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setApiKey(newK);
    onAddAudit("Configuración Integraciones", "Llave de API (Secret Key) privada regenerada con éxito.");
    alert("¡Nueva llave de API generada con éxito!");
  };

  const handleSaveWaSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAudit("Configuración Integraciones", `Configuración de WhatsApp actualizada. Estado: ${isWaEnabled ? "ACTIVO" : "INACTIVO"}`);
    alert("¡Ajustes de notificaciones de WhatsApp guardados exitosamente!");
  };

  const handleTestWebhook = (whId: string) => {
    alert("Enviando evento ping de prueba 'sale.completed' a la URL configurada...");
    const newL: ApiLog = {
      id: "log_" + Math.random().toString(36).slice(2, 9),
      timestamp: new Date().toISOString(),
      method: "POST",
      endpoint: "/webhook/test-ping",
      status: 200,
      payload: '{"event": "ping", "message": "Success notification test hook"}'
    };
    setLogs([newL, ...logs]);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 p-6" id="integrations-viewport">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Módulo de Integraciones & APIs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Conecte su sistema de facturación con herramientas externas como WhatsApp, configure Webhooks en tiempo real y obtenga sus llaves de API para programadores.
          </p>
        </div>
      </div>

      {/* SUB MENU TABS */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveSubTab("whatsapp")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "whatsapp"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          Alertas WhatsApp SMS
        </button>
        <button
          onClick={() => setActiveSubTab("webhooks")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "webhooks"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Webhooks en Tiempo Real ({webhooks.length})
        </button>
        <button
          onClick={() => setActiveSubTab("apikeys")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === "apikeys"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Key className="w-4 h-4" />
          Llaves API & Logs
        </button>
      </div>

      {/* TAB PANEL */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        {activeSubTab === "whatsapp" ? (
          /* WHATSAPP NOTIFICATIONS CONFIGURATION */
          <div className="p-8 max-w-2xl mx-auto space-y-6 text-slate-800 w-full">
            <div className="text-center space-y-2">
              <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6 animate-bounce" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">Mensajería Automática de WhatsApp</h3>
              <p className="text-xs text-slate-500">Envíe las facturas y comprobantes NCF a sus clientes automáticamente por chat de forma instantánea al procesar cada venta.</p>
            </div>

            <form onSubmit={handleSaveWaSettings} className="bg-slate-50 p-6 rounded-2xl border border-slate-150 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Activar Módulo de Notificaciones</span>
                  <span className="text-[10px] text-slate-500">Envío automático en segundo plano por API Twilio / WhatsApp Business</span>
                </div>
                <input
                  type="checkbox"
                  checked={isWaEnabled}
                  onChange={(e) => setIsWaEnabled(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Número de Negocio Emisor</label>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-hidden"
                    disabled={!isWaEnabled}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Proveedor de Enrutamiento</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold cursor-pointer"
                    disabled={!isWaEnabled}
                  >
                    <option value="whatsapp_cloud">WhatsApp Cloud API (Meta)</option>
                    <option value="twilio_sandbox">Twilio Sandbox Connector</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Plantilla del Mensaje de Facturación</label>
                <textarea
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-hidden font-sans"
                  disabled={!isWaEnabled}
                />
                <span className="text-[9.5px] text-slate-400 mt-1 block">Soporta marcadores automáticos: {"{{cliente}}"}, {"{{empresa}}"}, {"{{monto}}"}, {"{{ncf}}"}</span>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Ajustes WhatsApp
                </button>
              </div>
            </form>
          </div>
        ) : activeSubTab === "webhooks" ? (
          /* WEBHOOKS CONFIGURATION & TEST CONSOLE */
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: ADD WEBHOOK FORM */}
            <div className="w-1/3 border-r border-slate-100 p-6 space-y-4 shrink-0 overflow-y-auto">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Crear Punto de Enlace</h4>
              <form onSubmit={handleCreateWebhook} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">URL de Destino (Endpoint)</label>
                  <input
                    type="text"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://su-servidor.com/webhook..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Eventos Suscritos</label>
                  <div className="space-y-2 mt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <input type="checkbox" defaultChecked className="accent-indigo-600" />
                      <span>Venta completada (sale.completed)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <input type="checkbox" defaultChecked className="accent-indigo-600" />
                      <span>Modificación Stock (inventory.updated)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                      <input type="checkbox" className="accent-indigo-600" />
                      <span>Creación Cliente (customer.created)</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Añadir Endpoint Webhook
                </button>
              </form>
            </div>

            {/* RIGHT: LIST OF CONFIGURED WEBHOOKS */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Endpoints Registrados</h4>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {webhooks.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 text-xs">No hay endpoints webhooks registrados.</div>
                ) : (
                  webhooks.map((w) => (
                    <div key={w.id} className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="font-mono text-xs text-slate-900 font-bold break-all">{w.url}</div>
                        <div className="flex gap-1">
                          {w.events.map((ev) => (
                            <span key={ev} className="px-1.5 py-0.5 rounded-sm bg-indigo-50 border border-indigo-150 text-indigo-700 text-[9px] font-mono font-semibold">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTestWebhook(w.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Probar (Ping)
                        </button>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                          {w.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* DEVELOPER API KEYS AND REAL-TIME LOGS */
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT: API KEY GENERATOR */}
            <div className="w-1/2 border-r border-slate-100 p-6 space-y-4 shrink-0 overflow-y-auto">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Credenciales de Integración</h4>
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Llave Secreta en Vivo (Production Key)</span>
                  <button
                    onClick={handleRegenerateKey}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-extrabold cursor-pointer"
                  >
                    Regenerar Llave
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    readOnly
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold select-all focus:outline-hidden"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {showKey ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>Nunca comparta sus llaves de API en canales de mensajería públicos o código de navegador del frontend.</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">Documentación Corta de Conexión</h5>
                <pre className="bg-slate-900 text-slate-200 rounded-xl p-3 text-[10px] font-mono leading-relaxed overflow-x-auto">
{`# Ejemplo para crear venta vía Curl (ERP POST)
curl -X POST https://api.tu-erp.com.do/v1/sales \\
  -H "Authorization: Bearer ${apiKey.substring(0, 15)}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "branch_id": "br_main",
    "payment_method": "Efectivo",
    "items": [{"product_id": "prod_1", "qty": 1}]
  }'`}
                </pre>
              </div>
            </div>

            {/* RIGHT: REAL-TIME API RESPONSE LOGS */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Historial de Peticiones API (Logs)</h4>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {logs.map((log) => (
                  <div key={log.id} className="bg-slate-950 font-mono text-[10px] text-slate-300 rounded-xl p-3 space-y-1 border border-slate-800">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className={`font-black ${
                          log.method === "POST" ? "text-emerald-400" : "text-sky-400"
                        }`}>{log.method}</span>
                        <span className="text-slate-200 font-bold">{log.endpoint}</span>
                      </div>
                      <span className={`font-extrabold ${
                        log.status < 300 ? "text-emerald-400" : "text-red-400"
                      }`}>{log.status}</span>
                    </div>
                    <div className="text-[9.5px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()} — Payload: {log.payload}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
