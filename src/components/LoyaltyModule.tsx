import React, { useState } from "react";
import { Award, Gift, Search, PlusCircle, CheckCircle, Smartphone, Coins, UserCheck, CalendarClock } from "lucide-react";
import { Customer } from "../types";

interface LoyaltyModuleProps {
  activeCompany: any;
  customers: Customer[];
  onAddCustomer: (c: Customer) => void;
  onAddAudit: (action: string, details: string) => void;
  isOnline: boolean;
}

export default function LoyaltyModule({
  activeCompany,
  customers,
  onAddCustomer,
  onAddAudit,
  isOnline
}: LoyaltyModuleProps) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Create customer inputs
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const companyCustomers = customers.filter((c) => c.companyId === activeCompany.id);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !phoneInput.trim()) {
      alert("El nombre y teléfono son campos obligatorios.");
      return;
    }

    const newCustomer: Customer = {
      id: "cust_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: nameInput,
      phone: phoneInput,
      email: emailInput,
      points: 100, // Welcome gift points!
      tier: "Bronce",
      creditLimit: activeCompany.id === "comp_supermercado" ? 5000 : 0,
      currentDebt: 0,
      synced: isOnline
    };

    onAddCustomer(newCustomer);
    
    onAddAudit(
      "Registrar Cliente",
      `Nuevo cliente de fidelización registrado: ${nameInput}. Puntos de bienvenida aplicados: 100`
    );

    setNameInput("");
    setPhoneInput("");
    setEmailInput("");
    setShowAddForm(false);
    setSelectedCustomer(newCustomer);
    alert("Cliente registrado con éxito!");
  };

  const filteredCustomers = companyCustomers.filter((c) => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800" id="loyalty-module-root">
      
      {/* LEFT: CUSTOMERS DIRECTORY */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4" id="loyalty-list-section">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-600 animate-pulse" />
              Módulo de Fidelización y Club de Clientes
            </h2>
            <p className="text-xs text-slate-500 mt-1">Gestione tarjetas digitales, niveles de membresías (Bronce, Plata, Oro) y redención de recompensas.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
              id="btn-loyalty-add-form"
            >
              <PlusCircle className="w-4 h-4" />
              Afiliar Cliente
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar afiliado por nombre o celular..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 shadow-xs"
            id="input-loyalty-search"
          />
        </div>

        {/* DIRECTORY LIST */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Afiliado</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Membresía</th>
                  <th className="p-3 text-center">Puntos Acumulados</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr 
                    key={c.id} 
                    className={`hover:bg-slate-50/50 transition-colors ${selectedCustomer?.id === c.id ? "bg-sky-50/25 font-medium" : ""}`}
                  >
                    <td className="p-3 font-semibold text-slate-950">{c.name}</td>
                    <td className="p-3 font-mono font-bold text-slate-500">{c.phone}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.tier === "Oro" 
                          ? "bg-amber-100 text-amber-700" 
                          : c.tier === "Plata" 
                          ? "bg-slate-100 text-slate-700" 
                          : "bg-orange-50 text-orange-700"
                      }`}>
                        Membresía {c.tier}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold font-mono text-xs text-sky-600">
                      {c.points} pts
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Tarjeta QR / Perfil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: ADD CUSTOMER FORM OR SELECTED CUSTOMER PROFILE CARD */}
      <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto p-5 shrink-0" id="loyalty-profile-panel">
        {showAddForm ? (
          /* ADD FORM */
          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Nuevo Afiliado al Club</h3>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-xs text-slate-400">Cancelar</button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Nombre Completo o Empresa</label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                placeholder="Ej: Marcos Pérez"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Número de Celular</label>
              <input
                type="text"
                required
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                placeholder="Ej: 809-555-0100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Correo Electrónico (Opcional)</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                placeholder="marcos@correo.com"
              />
            </div>

            <div className="bg-sky-50 border border-sky-100 p-3 rounded-xl text-[11px] text-sky-800 leading-relaxed">
              ⭐ <strong>Bono de Afiliación:</strong> Al registrar un nuevo cliente se le aplican 100 puntos de bienvenida automáticamente, canjeables en compras.
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              id="btn-submit-loyalty-customer"
            >
              Registrar y Aplicar Puntos
            </button>
          </form>
        ) : selectedCustomer ? (
          /* CUSTOMER QR CARD DETAILS */
          <div className="space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Perfil del Afiliado</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-xs text-slate-400">Cerrar</button>
            </div>

            {/* Loyalty Digital Pass Mockup (Beautiful Card) */}
            <div className="bg-gradient-to-tr from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-5 shadow-xl relative overflow-hidden border border-slate-850">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">{activeCompany.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">Club de Puntos Digital</div>
                </div>
                <Award className="w-8 h-8 text-amber-400 shrink-0" />
              </div>

              <div className="space-y-1 mb-8">
                <div className="font-bold text-sm tracking-wide">{selectedCustomer.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">ID: {selectedCustomer.id.slice(0, 10).toUpperCase()}</div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800 pt-3.5">
                <div>
                  <div className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Membresía</div>
                  <div className="text-xs font-bold mt-0.5 text-amber-400">{selectedCustomer.tier}</div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Puntos Disponibles</div>
                  <div className="text-sm font-bold font-mono text-sky-400">{selectedCustomer.points} pts</div>
                </div>
              </div>
            </div>

            {/* QR Scanner Mock */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
              <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider font-semibold">Escáner de Tarjeta Digital</span>
              {/* Fake QR code using CSS blocks */}
              <div className="bg-white p-3 border border-slate-200 rounded-xl shadow-xs">
                <div className="grid grid-cols-5 gap-1.5 w-24 h-24">
                  {[...Array(25)].map((_, idx) => {
                    const isDark = (idx * 17) % 3 === 0 || idx < 4 || idx > 21;
                    return (
                      <div key={idx} className={`w-full h-full rounded-xs ${isDark ? "bg-slate-900" : "bg-white"}`}></div>
                    );
                  })}
                </div>
              </div>
              <div className="text-[10.5px] text-slate-400 font-mono tracking-wider">{selectedCustomer.phone}</div>
              <p className="text-[10px] text-slate-400 max-w-64 leading-relaxed">Presente este código QR en el lector del Punto de Venta para acumular un punto por cada $100 gastados.</p>
            </div>

            {/* Loyalty rules */}
            <div className="space-y-2 bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Coins className="w-4 h-4 text-sky-600" />
                Reglas de Puntos del Comercio
              </span>
              <ul className="list-disc pl-4 space-y-1 mt-1 text-[10.5px]">
                <li>Cada compra acumula 1% en puntos transferibles.</li>
                <li>Los clientes <strong>Bronce</strong> acumulan puntos estándar.</li>
                <li>Clientes <strong>Plata</strong> (más de 200 pts) tienen 5% descuento adicional.</li>
                <li>Clientes <strong>Oro</strong> (más de 500 pts) acceden a un bono anual y redención directa de efectivo.</li>
              </ul>
            </div>
          </div>
        ) : (
          /* INITIAL DEFAULT VIEW */
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-4">
            <Smartphone className="w-12 h-12 text-slate-200 mb-2" />
            <p className="text-xs font-semibold">Seleccione un Cliente del Directorio</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-60">Seleccione un cliente para revisar su membresía, historial de puntos y mostrar su tarjeta QR digital.</p>
          </div>
        )}
      </div>
    </div>
  );
}
