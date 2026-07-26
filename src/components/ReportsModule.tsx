import React, { useState } from "react";
import { 
  BarChart3, Calendar, FileDown, TrendingUp, DollarSign, 
  ShoppingBag, ClipboardCheck, ArrowUpRight, ArrowDownRight, 
  Layers, CreditCard, RefreshCw, Filter, CheckCircle2, AlertTriangle
} from "lucide-react";
import { Sale, Product } from "../types";

interface ReportsModuleProps {
  activeCompany: any;
  sales: Sale[];
  products: Product[];
  onAddAudit: (action: string, details: string) => void;
}

export default function ReportsModule({
  activeCompany,
  sales,
  products,
  onAddAudit
}: ReportsModuleProps) {
  const [dateFilter, setDateFilter] = useState("Hoy");

  const companySales = sales.filter((s) => s.companyId === activeCompany.id && s.status === "completed");
  const companyProducts = products.filter((p) => p.companyId === activeCompany.id);

  // Math Metrics
  const totalSold = companySales.reduce((sum, s) => sum + s.total, 0);
  const totalTransactions = companySales.length;
  const averageTicket = totalTransactions > 0 ? totalSold / totalTransactions : 0;
  
  // Profit computation
  const totalCost = companySales.reduce((sum, s) => {
    return sum + s.items.reduce((itemSum, item) => itemSum + (item.cost * item.qty), 0);
  }, 0);
  const estimatedProfit = totalSold - totalCost;

  // 1. Data Grouping: Sales by category (for Bar Chart)
  const categorySales: Record<string, number> = {};
  companySales.forEach((s) => {
    s.items.forEach((item) => {
      // Find category in products if missing
      const prod = companyProducts.find((p) => p.id === item.productId);
      const cat = prod ? prod.category : "Otros";
      categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.qty);
    });
  });

  const categoryData = Object.entries(categorySales).map(([name, value]) => ({ name, value }));

  // 2. Data Grouping: Payment methods (for Pie Chart)
  const paymentMethodsSales: Record<string, number> = {};
  companySales.forEach((s) => {
    paymentMethodsSales[s.paymentMethod] = (paymentMethodsSales[s.paymentMethod] || 0) + s.total;
  });

  const paymentData = Object.entries(paymentMethodsSales).map(([name, value]) => ({ name, value }));

  // 3. Hourly Sales Curve (for Line Chart)
  // Let's bucket sales in 9:00, 12:00, 15:00, 18:00, 21:00
  const hourlyBuckets = { "09:00": 0, "12:00": 0, "15:00": 0, "18:00": 0, "21:00": 0 };
  companySales.forEach((s) => {
    try {
      const hour = new Date(s.date).getHours();
      if (hour < 11) hourlyBuckets["09:00"] += s.total;
      else if (hour < 14) hourlyBuckets["12:00"] += s.total;
      else if (hour < 17) hourlyBuckets["15:00"] += s.total;
      else if (hour < 20) hourlyBuckets["18:00"] += s.total;
      else hourlyBuckets["21:00"] += s.total;
    } catch (e) {
      hourlyBuckets["12:00"] += s.total; // fallback
    }
  });

  const hourlyData = Object.entries(hourlyBuckets).map(([hour, value]) => ({ hour, value }));

  // CSV Exporter
  const handleExportCSV = () => {
    if (companySales.length === 0) {
      alert("No hay transacciones registradas para exportar.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Factura,Fecha,Cliente,Metodo Pago,Impuesto (ITBIS),Total Facturado,Estado Sync\n";

    companySales.forEach((s) => {
      const formattedDate = new Date(s.date).toLocaleDateString();
      const row = `${s.id},${formattedDate},${s.customerId || "Consumidor Final"},${s.paymentMethod},${s.tax.toFixed(2)},${s.total.toFixed(2)},${s.synced ? 'Sincronizado' : 'Pendiente'}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Ventas_${activeCompany.name.replace(/ /g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddAudit(
      "Exportar Reporte",
      `Exportación de reporte de ventas en formato CSV para ${activeCompany.name}`
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 text-slate-800 space-y-6" id="reports-module-root">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            Panel de Reportes y Analíticas Básicas
          </h2>
          <p className="text-xs text-slate-500 mt-1">Monitoree la rentabilidad de su negocio, flujo de métodos de pago y rotación de productos en tiempo real.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold shadow-xs cursor-pointer text-slate-700"
            id="btn-export-csv"
          >
            <FileDown className="w-4 h-4 text-sky-500" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* METRICS CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        
        {/* Total Sold */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">Total Ventas</div>
            <div className="text-xl font-bold font-mono text-slate-950 mt-1">${totalSold.toFixed(2)}</div>
            <div className="text-[9.5px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Hoy vs ayer</span>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">Transacciones</div>
            <div className="text-xl font-bold font-mono text-slate-950 mt-1">{totalTransactions}</div>
            <div className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-0.5 mt-1">
              <span>Fondo fijo de turnos</span>
            </div>
          </div>
        </div>

        {/* Average Ticket */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">Ticket Promedio</div>
            <div className="text-xl font-bold font-mono text-slate-950 mt-1">${averageTicket.toFixed(2)}</div>
            <div className="text-[9.5px] text-slate-500 font-semibold flex items-center gap-0.5 mt-1">
              <span>Por venta efectuada</span>
            </div>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">Margen Ganancia</div>
            <div className="text-xl font-bold font-mono text-slate-950 mt-1">${estimatedProfit.toFixed(2)}</div>
            <div className="text-[9.5px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
              <span>Ganancia neta aprox.</span>
            </div>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-charts-row">
        
        {/* CHART 1: Sales by Hour (SVG line graph) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Ventas por Hora</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Distribución de compras en el turno</p>
          </div>
          
          <div className="h-44 mt-6 relative flex items-end">
            {/* Draw a responsive custom SVG Line Graph */}
            <svg className="w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="300" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="60" x2="300" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="0" y1="90" x2="300" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* Area graph */}
              <path 
                d={`M 10 110 
                    L 10 ${110 - Math.min(90, (hourlyData[0]?.value || 0) / 20)} 
                    L 75 ${110 - Math.min(90, (hourlyData[1]?.value || 0) / 20)} 
                    L 145 ${110 - Math.min(90, (hourlyData[2]?.value || 0) / 20)} 
                    L 215 ${110 - Math.min(90, (hourlyData[3]?.value || 0) / 20)} 
                    L 285 ${110 - Math.min(90, (hourlyData[4]?.value || 0) / 20)} 
                    L 285 110 Z`} 
                fill="url(#chartGradient)" 
              />

              {/* Line graph */}
              <path 
                d={`M 10 ${110 - Math.min(90, (hourlyData[0]?.value || 0) / 20)} 
                    L 75 ${110 - Math.min(90, (hourlyData[1]?.value || 0) / 20)} 
                    L 145 ${110 - Math.min(90, (hourlyData[2]?.value || 0) / 20)} 
                    L 215 ${110 - Math.min(90, (hourlyData[3]?.value || 0) / 20)} 
                    L 285 ${110 - Math.min(90, (hourlyData[4]?.value || 0) / 20)}`} 
                fill="none" 
                stroke="#0ea5e9" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />

              {/* Data dots */}
              {hourlyData.map((d, i) => {
                const x = i * 70 + 10;
                const y = 110 - Math.min(90, d.value / 20);
                return (
                  <circle key={i} cx={x} cy={y} r="3.5" fill="#0ea5e9" stroke="#white" strokeWidth="1.5" />
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-[9px] font-bold text-slate-400 font-mono mt-2 pt-2 border-t border-slate-50">
            <span>09:00</span>
            <span>12:00</span>
            <span>15:00</span>
            <span>18:00</span>
            <span>21:00</span>
          </div>
        </div>

        {/* CHART 2: Sales by Category (SVG vertical bar chart) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Categorías más Vendidas</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Volumen monetario facturado por sector</p>
          </div>

          <div className="space-y-3.5 mt-6 flex-1 flex flex-col justify-center">
            {categoryData.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-6">Sin ventas aún para graficar.</p>
            ) : (
              categoryData.slice(0, 4).map((cat, idx) => {
                const maxVal = Math.max(...categoryData.map(c => c.value)) || 1;
                const pct = (cat.value / maxVal) * 100;
                
                const colors = ["bg-sky-500", "bg-indigo-500", "bg-emerald-500", "bg-amber-500"];
                const barColor = colors[idx % colors.length];

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-700">
                      <span>{cat.name}</span>
                      <span className="font-mono font-bold">${cat.value.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CHART 3: Payment Methods (SVG Pie/Donut Chart representation) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Distribución Métodos Pago</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Uso proporcional de caja y tarjetas</p>
          </div>

          <div className="flex items-center gap-4 mt-6 flex-1">
            {/* Draw Donut chart via responsive SVG */}
            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.91" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                {paymentData.map((d, i) => {
                  const maxTotal = totalSold || 1;
                  const strokeDash = (d.value / maxTotal) * 100;
                  
                  // offset cumulative calculation
                  let offset = 0;
                  for (let j = 0; j < i; j++) {
                    offset += (paymentData[j].value / maxTotal) * 100;
                  }

                  const colors = ["#0ea5e9", "#6366f1", "#f59e0b", "#10b981"];
                  const color = colors[i % colors.length];

                  return (
                    <circle 
                      key={i}
                      cx="18" 
                      cy="18" 
                      r="15.91" 
                      fill="none" 
                      stroke={color} 
                      strokeWidth="4" 
                      strokeDasharray={`${strokeDash} ${100 - strokeDash}`}
                      strokeDashoffset={-offset}
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-bold text-slate-800 leading-none">{totalTransactions}</span>
                <span className="text-[8px] text-slate-400 mt-0.5 font-medium">facturas</span>
              </div>
            </div>

            {/* Legends */}
            <div className="flex-1 space-y-1.5 text-[10.5px]">
              {paymentData.map((d, i) => {
                const colors = ["bg-sky-500", "bg-indigo-500", "bg-amber-500", "bg-emerald-500"];
                const color = colors[i % colors.length];
                return (
                  <div key={i} className="flex items-center justify-between gap-1 text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full ${color}`}></span>
                      <span className="truncate">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">${d.value.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* DETAILED RECENT TRANSACTIONS LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs" id="reports-sales-list">
        <div>
          <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Historial de Ventas del Turno</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Registro auditado de comprobantes fiscales y simples generados</p>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="p-2.5">ID Factura</th>
                <th className="p-2.5">Fecha / Hora</th>
                <th className="p-2.5">Comprobante Fiscal (NCF)</th>
                <th className="p-2.5 text-center">Método Pago</th>
                <th className="p-2.5 text-right">Impuestos (ITBIS)</th>
                <th className="p-2.5 text-right font-bold">Total Facturado</th>
                <th className="p-2.5 text-center">Sincronización</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companySales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <span>No hay ventas registradas en este turno de caja.</span>
                  </td>
                </tr>
              ) : (
                companySales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/40">
                    <td className="p-2.5 font-semibold text-slate-800">{s.id.slice(0, 14)}</td>
                    <td className="p-2.5 text-slate-500">
                      {new Date(s.date).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-2.5">
                      {s.ncf ? (
                        <div className="text-sky-600 font-bold font-mono">
                          {s.ncf}
                          <span className="text-[9px] text-slate-400 block font-normal">{s.ncfType}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Ticket Simple</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-medium">{s.paymentMethod}</td>
                    <td className="p-2.5 text-right font-mono text-slate-500">${s.tax.toFixed(2)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">${s.total.toFixed(2)}</td>
                    <td className="p-2.5 text-center">
                      {s.synced ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold">
                          Sincronizado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px] font-bold flex items-center gap-0.5 justify-center">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
