import React, { useState } from "react";
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle2, Server, HelpCircle } from "lucide-react";
import { SyncQueueItem } from "../types";

interface OfflineIndicatorProps {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  syncQueue: SyncQueueItem[];
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
  syncResults: { id: string; status: string; error?: string }[] | null;
  clearResults: () => void;
}

export default function OfflineIndicator({
  isOnline,
  setIsOnline,
  syncQueue,
  triggerSync,
  isSyncing,
  syncResults,
  clearResults
}: OfflineIndicatorProps) {
  const [showQueueDetails, setShowQueueDetails] = useState(false);

  const getStatusColor = () => {
    if (isSyncing) return "text-amber-500 bg-amber-50";
    if (!isOnline) return "text-rose-500 bg-rose-50 border-rose-100";
    if (syncQueue.length > 0) return "text-amber-500 bg-amber-50 border-amber-100";
    return "text-emerald-500 bg-emerald-50 border-emerald-100";
  };

  const getStatusText = () => {
    if (isSyncing) return "Sincronizando...";
    if (!isOnline) return "Modo Offline Activo";
    if (syncQueue.length > 0) return `${syncQueue.length} Sincronizaciones Pendientes`;
    return "Conectado a la Nube (Sincronizado)";
  };

  return (
    <div className="relative" id="offline-indicator-wrapper">
      <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${getStatusColor()}`}>
        {/* Toggle connection status */}
        <button
          onClick={() => {
            const nextState = !isOnline;
            setIsOnline(nextState);
            if (nextState && syncQueue.length > 0) {
              triggerSync();
            }
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all shadow-xs ${
            isOnline 
              ? "bg-emerald-600 text-white hover:bg-emerald-700" 
              : "bg-rose-600 text-white hover:bg-rose-700"
          }`}
          title="Presione para alternar conexión a Internet"
          id="btn-connection-toggle"
        >
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
            </>
          )}
        </button>

        <span className="hidden sm:inline-block max-w-56 truncate">{getStatusText()}</span>

        {/* Sync trigger button */}
        {isOnline && syncQueue.length > 0 && (
          <button
            onClick={() => triggerSync()}
            disabled={isSyncing}
            className={`p-1 rounded-full text-amber-700 hover:bg-amber-100 transition-all ${isSyncing ? "animate-spin" : ""}`}
            title="Sincronizar ahora"
            id="btn-manual-sync"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Queue count button */}
        {syncQueue.length > 0 && (
          <button
            onClick={() => setShowQueueDetails(!showQueueDetails)}
            className="px-1.5 py-0.5 bg-amber-500 text-white rounded-md text-[10px] font-bold hover:bg-amber-600 cursor-pointer"
            id="btn-view-queue"
          >
            Cola ({syncQueue.length})
          </button>
        )}
      </div>

      {/* Queue Drawer / Panel */}
      {showQueueDetails && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-4 text-slate-800" id="queue-details-drawer">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-1.5 text-slate-900">
              <Server className="w-4 h-4 text-sky-500" />
              Cola de Sincronización Local
            </h4>
            <button 
              onClick={() => setShowQueueDetails(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
              id="btn-close-queue"
            >
              Cerrar
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto mb-3 pr-1">
            {syncQueue.map((item) => (
              <div key={item.id} className="text-xs p-2 rounded-lg bg-slate-50 border border-slate-100 flex justify-between items-center gap-1">
                <div>
                  <div className="font-medium text-slate-700 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    {item.type === "sale" && "Venta POS"}
                    {item.type === "customer" && "Nuevo Cliente"}
                    {item.type === "stock_adjust" && "Ajuste Stock"}
                    {item.type === "cash_session" && "Cierre/Apertura Caja"}
                    {item.type === "audit" && "Auditoría"}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">UUID: {item.id.slice(0, 8)}...</div>
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 flex items-start gap-1 bg-slate-50 p-2 rounded-md">
            <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            Las operaciones se guardan de forma segura en almacenamiento local cifrado. Al volver a activar "Online", se sincronizarán de forma transparente con el servidor en la nube.
          </p>

          {isOnline && (
            <button
              onClick={() => {
                triggerSync();
                setShowQueueDetails(false);
              }}
              disabled={isSyncing}
              className="mt-3 w-full py-1.5 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              id="btn-drawer-sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              Sincronizar Cola Ahora
            </button>
          )}
        </div>
      )}

      {/* Sync Results Toast Notification */}
      {syncResults && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white border border-slate-100 shadow-2xl rounded-xl z-50 p-4 animate-in fade-in slide-in-from-bottom-5 duration-300" id="sync-results-toast">
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Sincronización Completada
            </h5>
            <button 
              onClick={clearResults}
              className="text-slate-400 hover:text-slate-600 text-xs"
              id="btn-clear-sync-results"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <p>Se han procesado las operaciones de la cola local:</p>
            <div className="bg-slate-50 p-2 rounded-md font-mono text-[10px] text-slate-500 max-h-24 overflow-y-auto">
              {syncResults.map((res, idx) => (
                <div key={idx} className="flex justify-between items-center py-0.5">
                  <span>Op {res.id.slice(0, 6)}...</span>
                  {res.status === "synchronized" ? (
                    <span className="text-emerald-600 font-bold">✓ Sincronizado</span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-0.5" title={res.error}>
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Conflicto
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
