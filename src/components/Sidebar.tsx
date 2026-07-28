import React, { useState } from "react";
import { 
  Building2, UserCheck, ShieldAlert, Cpu, 
  ShoppingCart, Package, BarChart3, Users, Award, 
  Wallet, Truck, Utensils, ClipboardList, Settings, 
  ChevronRight, ChevronLeft, Bot, LogOut, Key, MapPin, 
  Layers, Database, CalendarClock, DollarSign, Shirt,
  Landmark, TrendingUp, Globe, Lock, Smartphone, BookOpen, Hammer
} from "lucide-react";
import { Company, User, Branch, isTabAllowedForUser, getAllowedTabsForUser } from "../types";




interface SidebarProps {
  companies: Company[];
  activeCompany: Company;
  setActiveCompany: (c: Company) => void;
  currentUser: User;
  setCurrentUser: (u: User) => void;
  activeBranch: Branch;
  setActiveBranch: (b: Branch) => void;
  users: User[];
  branches: Branch[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSuperAdminMode: boolean;
  setIsSuperAdminMode: (mode: boolean) => void;
}

export default function Sidebar({
  companies,
  activeCompany,
  setActiveCompany,
  currentUser,
  setCurrentUser,
  activeBranch,
  setActiveBranch,
  users,
  branches,
  activeTab,
  setActiveTab,
  isSuperAdminMode,
  setIsSuperAdminMode
}: SidebarProps) {
  const [pinInput, setPinInput] = useState("");
  const [showPinPrompt, setShowPinPrompt] = useState<User | null>(null);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  const handleUserSwitch = (targetUser: User) => {
    if (targetUser.id === currentUser.id) return;
    // Show PIN validation prompt
    setShowPinPrompt(targetUser);
    setPinInput("");
    setPinError("");
  };

  const validatePin = () => {
    if (!showPinPrompt) return;
    if (pinInput === showPinPrompt.pin) {
      setCurrentUser(showPinPrompt);
      
      // Reset active tab if permissions are restricted for the new role
      if (!isTabAllowedForUser(activeTab, showPinPrompt, activeCompany)) {
        const allowedTabs = getAllowedTabsForUser(showPinPrompt, activeCompany);
        setActiveTab(allowedTabs[0] || "pos");
      }
      
      setShowPinPrompt(null);
    } else {
      setPinError("PIN de seguridad incorrecto. Intente nuevamente.");
    }
  };

  const getCompanyUsers = () => {
    return users.filter((u) => u.companyId === activeCompany.id);
  };

  const getCompanyBranches = () => {
    return branches.filter((b) => b.companyId === activeCompany.id);
  };

  // List of all business operator menu items with their module requirements
  const menuItems = [
    { id: "pos", name: "Venta POS", icon: ShoppingCart, module: "pos" },
    { id: "ferreteria", name: "Despacho Ferretería", icon: Hammer, module: "ferreteria" },
    { id: "inventario", name: "Inventario", icon: Package, module: "inventario" },

    { id: "restaurante", name: "Mesa / Salón", icon: Utensils, module: "restaurante" },
    { id: "clientes", name: "Clientes & Crédito", icon: Users, module: "clientes" },
    { id: "fidelizacion", name: "Fidelización", icon: Award, module: "fidelizacion" },
    { id: "compras", name: "Compras & Prov", icon: Truck, module: "compras" },
    { id: "gastos", name: "Gastos", icon: Wallet, module: "gastos" },
    { id: "caja_avanzada", name: "Caja & Tesorería", icon: Landmark, module: "caja_avanzada" },
    { id: "contabilidad", name: "Contabilidad General", icon: BookOpen, module: "contabilidad" },
    { id: "reportes_financieros", name: "Finanzas Avanzadas", icon: TrendingUp, module: "reportes_financieros" },
    { id: "manufactura", name: "Producción & BOM", icon: Cpu, module: "manufactura" },
    { id: "ecommerce", name: "Comercio Electrónico", icon: Globe, module: "ecommerce" },
    { id: "suscripciones", name: "Membresías", icon: Award, module: "suscripciones" },
    { id: "ncf", name: "Comprobantes Fiscales", icon: ShieldAlert, module: "facturacion_fiscal" },
    { id: "nomina", name: "Nómina & Personal", icon: CalendarClock, module: "nomina" },
    { id: "delivery", name: "Delivery & Envíos", icon: MapPin, module: "delivery" },
    { id: "android_app", name: "App Móvil Android", icon: Smartphone, module: "android_app" },
    { id: "integraciones", name: "Integraciones", icon: Layers, module: "integraciones" },
    { id: "cotizaciones", name: "Cotizaciones", icon: ClipboardList, module: "cotizaciones" },
    { id: "reportes", name: "Reportes Básicos", icon: BarChart3, module: "reportes" },
    { id: "config", name: "Administración & Log", icon: Settings, module: "pos" },
    { id: "superadmin", name: "SuperAdmin / Multi-Empresas", icon: ShieldAlert, module: "superadmin" },
    { id: "global_audit", name: "Consola Auditoría Global", icon: Database, module: "superadmin" }
  ];

  const filteredMenuItems = menuItems.filter((item) => isTabAllowedForUser(item.id, currentUser, activeCompany));


  return (
    <div className={`transition-all duration-300 ${isCollapsed ? "w-20" : "w-72"} bg-white text-slate-700 flex flex-col h-full border-r border-slate-200 shrink-0`} id="sidebar-container">
      {/* Platform Branding */}
      <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${isCollapsed ? "flex-col gap-3" : "gap-2.5"}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs shrink-0">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-extrabold text-sm text-slate-900 leading-tight tracking-tight">FacturaPOS Cloud</h1>
              <p className="text-[10px] text-slate-400 font-medium">Sistema Empresarial v1.2</p>
            </div>
          )}
        </div>
        <button
          onClick={toggleCollapse}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          title={isCollapsed ? "Expandir Menú" : "Colapsar Menú"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* BUSINESS OPERATOR MENU */}
      <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tenant / Company Switcher (Locked once logged in) */}
          {isCollapsed ? (
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-white text-[10px] font-black shrink-0 cursor-help"
                style={{ backgroundColor: activeCompany.color }}
                title={`${activeCompany.name} | ${activeBranch?.name}`}
              >
                {activeCompany.name.slice(0, 2).toUpperCase()}
              </div>
              <div 
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold cursor-help"
                title={`Usuario: ${currentUser.name} (${currentUser.role})`}
              >
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
              <div className="bg-slate-100/70 rounded-xl p-3 border border-slate-200/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider">Sesión Activa</span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Lock className="w-3 h-3 text-indigo-600 animate-pulse" />
                    <span className="text-[8px] font-bold tracking-wider uppercase">Bloqueado</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Empresa</span>
                  <div className="text-xs font-bold text-slate-800 bg-white border border-slate-200/60 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-2xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeCompany.color }}></div>
                    <span className="truncate">{activeCompany.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Sucursal</span>
                    <div className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200/60 rounded-lg px-2.5 py-1.5 truncate shadow-2xs">
                      {activeBranch?.name.replace("Don Pablo ", "").replace("Bistro ", "")}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Usuario POS</span>
                    <div className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200/60 rounded-lg px-2.5 py-1.5 truncate shadow-2xs" title={currentUser.name}>
                      {currentUser.name.split(" ")[0]} ({currentUser.role.slice(0,4)})
                    </div>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 font-semibold leading-tight text-center mt-1">
                  Para cambiar estos parámetros, cierre sesión en el botón inferior.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Menus based on active modules */}
          <div className={`flex-1 overflow-y-auto ${isCollapsed ? "p-2 space-y-2 flex flex-col items-center" : "p-3 space-y-1"}`}>
            {!isCollapsed && (
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-2 px-2.5">
                Módulos Habilitados
              </p>
            )}
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center ${isCollapsed ? "justify-center w-10 h-10 rounded-xl" : "w-full justify-between px-3 py-2 rounded-r-xl"} text-xs font-bold transition-all cursor-pointer group ${
                    activeTab === item.id 
                      ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-extrabold" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                  id={`btn-nav-operator-${item.id}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${activeTab === item.id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500"}`} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronRight className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${activeTab === item.id ? "opacity-100 text-indigo-600" : "text-slate-400"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Company Subscription Plan Tag */}
          <div className={`border-t border-slate-200 bg-slate-50 flex flex-col ${isCollapsed ? "p-3 items-center gap-2" : "p-4 gap-3"}`}>
            {!isCollapsed && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Plan Suscripción</div>
                  <div className="text-xs text-slate-800 font-bold flex items-center gap-1 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      activeCompany.plan === "Empresarial" ? "bg-indigo-500" : activeCompany.plan === "Profesional" ? "bg-sky-500" : "bg-amber-500"
                    }`}></span>
                    Plan {activeCompany.plan}
                  </div>
                </div>
                <div className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-mono font-bold">
                  {activeCompany.settings.currency}
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              onClick={() => setShowLogoutConfirmModal(true)}
              className={`flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer ${
                isCollapsed ? "w-10 h-10 rounded-xl" : "w-full gap-2 px-3 py-2 rounded-xl text-xs font-bold"
              }`}
              title={isCollapsed ? "Cerrar Sesión" : undefined}
              id="btn-sidebar-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="logout-confirm-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">¿Cerrar Sesión?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Saldrás de la terminal activa para el usuario <strong>{currentUser.name}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  setCurrentUser(null as any);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                id="btn-confirm-logout"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Switch PIN Prompt Modal */}
      {showPinPrompt && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="pin-prompt-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Validar Acceso</h3>
                <p className="text-xs text-slate-500">Ingrese PIN de 6 dígitos para {showPinPrompt.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg mb-4 leading-relaxed border border-slate-100">
              Esta operación requiere autenticación de PIN local de 6 dígitos.
              <br />
              <span className="font-semibold text-slate-700">Pista Demo PIN: {showPinPrompt.pin}</span>
            </p>

            <input
              type="password"
              placeholder="••••••"
              maxLength={6}
              value={pinInput}
              onChange={(e) => {
                setPinError("");
                setPinInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") validatePin();
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-bold tracking-[0.5em] py-3 focus:outline-hidden focus:border-sky-500 focus:bg-white mb-2"
              autoFocus
              id="input-pin-validation"
            />

            {pinError && (
              <p className="text-xs text-rose-600 font-semibold mb-4 text-center">{pinError}</p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowPinPrompt(null)}
                className="flex-1 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                id="btn-pin-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={validatePin}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                id="btn-pin-confirm"
              >
                Ingresar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
