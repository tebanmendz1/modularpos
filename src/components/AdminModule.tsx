import React, { useState } from "react";
import { 
  Users, Key, Shield, MapPin, Building, Warehouse, 
  Search, Plus, Check, Edit2, Trash2, Eye, HelpCircle, 
  Globe, Clock, DollarSign, Database, ListFilter
} from "lucide-react";
import { Company, User, Branch, Warehouse as WarehouseType, AuditLog } from "../types";

interface AdminModuleProps {
  activeCompany: Company;
  users: User[];
  onUpdateUsers: (usersList: User[]) => void;
  branches: Branch[];
  onUpdateBranches: (branchList: Branch[]) => void;
  warehouses: WarehouseType[];
  onUpdateWarehouses: (warehouseList: WarehouseType[]) => void;
  auditLogs: AuditLog[];
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
}

// Default system permission definitions
const GRANULAR_PERMISSIONS = [
  { key: "prod_ver", label: "Ver productos", category: "Inventario" },
  { key: "prod_crear", label: "Crear productos", category: "Inventario" },
  { key: "prod_precios", label: "Modificar precios", category: "Precios" },
  { key: "pos_descuentos", label: "Aplicar descuentos", category: "Venta POS" },
  { key: "pos_eliminar_linea", label: "Eliminar líneas de venta", category: "Venta POS" },
  { key: "pos_anular_venta", label: "Anular ventas", category: "Venta POS" },
  { key: "pos_abrir_caja", label: "Abrir caja", category: "Caja" },
  { key: "pos_cerrar_caja", label: "Cerrar caja", category: "Caja" },
  { key: "reportes_ver_costos", label: "Ver costos", category: "Finanzas" },
  { key: "reportes_ver_ganancias", label: "Consultar ganancias", category: "Finanzas" },
  { key: "inv_ajustar", label: "Ajustar inventario", category: "Inventario" },
  { key: "reportes_exportar", label: "Exportar reportes", category: "Reportes" },
  { key: "admin_usuarios", label: "Administrar usuarios", category: "Administración" },
  { key: "offline_trabajar", label: "Trabajar sin conexión", category: "Operación" },
  { key: "aprobar_sensibles", label: "Aprobar operaciones sensibles", category: "Administración" }
];

// Initial preloaded system roles with default permissions
const INITIAL_ROLE_TEMPLATES: Record<string, string[]> = {
  "Propietario": ["all"],
  "Administrador": [
    "prod_ver", "prod_crear", "prod_precios", "pos_descuentos", "pos_eliminar_linea", 
    "pos_anular_venta", "pos_abrir_caja", "pos_cerrar_caja", "reportes_ver_costos", 
    "reportes_ver_ganancias", "inv_ajustar", "reportes_exportar", "admin_usuarios", 
    "offline_trabajar", "aprobar_sensibles"
  ],
  "Supervisor": [
    "prod_ver", "prod_precios", "pos_descuentos", "pos_eliminar_linea", "pos_anular_venta", 
    "pos_abrir_caja", "pos_cerrar_caja", "inv_ajustar", "offline_trabajar", "aprobar_sensibles"
  ],
  "Cajero": ["prod_ver", "pos_descuentos", "pos_abrir_caja", "pos_cerrar_caja", "offline_trabajar"],
  "Vendedor": ["prod_ver", "pos_descuentos", "offline_trabajar"],
  "Encargado de inventario": ["prod_ver", "prod_crear", "inv_ajustar", "offline_trabajar"],
  "Contador": ["prod_ver", "reportes_ver_costos", "reportes_ver_ganancias", "reportes_exportar"],
  "Analista": ["prod_ver", "reportes_exportar"],
  "Usuario de consulta": ["prod_ver"]
};

export default function AdminModule({
  activeCompany,
  users,
  onUpdateUsers,
  branches,
  onUpdateBranches,
  warehouses,
  onUpdateWarehouses,
  auditLogs,
  onAddAudit
}: AdminModuleProps) {
  const [activeSubTab, setActiveSubTab] = useState<"usuarios" | "sucursales" | "auditoria">("usuarios");

  // Filter lists by company
  const companyUsers = users.filter((u) => u.companyId === activeCompany.id);
  const companyBranches = branches.filter((b) => b.companyId === activeCompany.id);
  const companyWarehouses = warehouses.filter((w) => companyBranches.some((b) => b.id === w.branchId));
  const companyAudits = auditLogs.filter((log) => log.companyId === activeCompany.id);

  // Users State Management
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    pin: "",
    role: "Cajero",
    permissions: [] as string[],
    restrictedBranches: [] as string[]
  });

  // Custom Roles State
  const [customRoles, setCustomRoles] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem(`pos_custom_roles_${activeCompany.id}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [newRoleName, setNewRoleName] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);

  // Branches State
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: "",
    address: ""
  });

  // Warehouse State
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    branchId: ""
  });

  // Audit Log Filtering
  const [auditSearch, setAuditSearch] = useState("");
  const [selectedAuditUser, setSelectedAuditUser] = useState("Todos");

  // Toggle user permissions helper
  const handleTogglePermissionInForm = (key: string) => {
    setUserForm(prev => {
      const has = prev.permissions.includes(key);
      const updated = has 
        ? prev.permissions.filter(p => p !== key) 
        : [...prev.permissions, key];
      return { ...prev, permissions: updated };
    });
  };

  // Handle saving role
  const handleSaveCustomRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    
    const roleKey = newRoleName.trim();
    const updated = {
      ...customRoles,
      [roleKey]: rolePermissions
    };

    setCustomRoles(updated);
    localStorage.setItem(`pos_custom_roles_${activeCompany.id}`, JSON.stringify(updated));
    onAddAudit(
      "Crear Rol",
      `Nuevo rol personalizado "${roleKey}" creado con ${rolePermissions.length} permisos granulares.`
    );
    setNewRoleName("");
    setRolePermissions([]);
    setShowRoleModal(false);
    alert(`Rol "${roleKey}" creado con éxito.`);
  };

  // Pre-fill user permissions based on template selection
  const handleRoleChangeInForm = (roleVal: string) => {
    const defaultPerms = INITIAL_ROLE_TEMPLATES[roleVal] || customRoles[roleVal] || [];
    setUserForm(prev => ({
      ...prev,
      role: roleVal,
      permissions: defaultPerms
    }));
  };

  // Save User
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.pin) {
      alert("Por favor complete todos los campos requeridos.");
      return;
    }

    let updatedUsersList: User[];

    if (editingUser) {
      // Edit
      updatedUsersList = users.map((u) => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: userForm.name,
            email: userForm.email,
            pin: userForm.pin,
            role: userForm.role,
            permissions: userForm.permissions,
            restrictedBranches: userForm.restrictedBranches
          };
        }
        return u;
      });
      onAddAudit(
        "Modificar Usuario",
        `Datos de usuario ${userForm.name} actualizados. Rol: ${userForm.role}`
      );
    } else {
      // New
      const newUser: User = {
        id: "usr_" + Math.random().toString(36).slice(2, 9),
        companyId: activeCompany.id,
        name: userForm.name,
        email: userForm.email,
        pin: userForm.pin,
        role: userForm.role,
        permissions: userForm.permissions,
        restrictedBranches: userForm.restrictedBranches
      };
      updatedUsersList = [...users, newUser];
      onAddAudit(
        "Crear Usuario",
        `Nuevo usuario ${userForm.name} creado con rol: ${userForm.role}`
      );
    }

    onUpdateUsers(updatedUsersList);
    setShowUserModal(false);
    setEditingUser(null);
  };

  // Delete User
  const handleDeleteUser = (userId: string, userName: string) => {
    if (confirm(`¿Está seguro de que desea eliminar al usuario ${userName}?`)) {
      const filtered = users.filter((u) => u.id !== userId);
      onUpdateUsers(filtered);
      onAddAudit("Eliminar Usuario", `Usuario ${userName} eliminado del sistema.`);
    }
  };

  // Edit User Trigger
  const handleStartEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      pin: user.pin,
      role: user.role,
      permissions: user.permissions || [],
      restrictedBranches: user.restrictedBranches || []
    });
    setShowUserModal(true);
  };

  // Branch Save
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) return;

    const newBranch: Branch = {
      id: "br_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: branchForm.name,
      address: branchForm.address || "Dirección no especificada"
    };

    const updated = [...branches, newBranch];
    onUpdateBranches(updated);

    // Auto-create a default warehouse for this brand
    const autoWh: WarehouseType = {
      id: "wh_" + Math.random().toString(36).slice(2, 9),
      branchId: newBranch.id,
      name: "Almacén Central " + branchForm.name
    };
    onUpdateWarehouses([...warehouses, autoWh]);

    onAddAudit(
      "Crear Sucursal",
      `Sucursal "${branchForm.name}" creada con almacén inicial automático.`
    );

    setBranchForm({ name: "", address: "" });
    setShowBranchModal(false);
    alert(`Sucursal "${newBranch.name}" registrada exitosamente.`);
  };

  // Warehouse Save
  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseForm.name.trim() || !warehouseForm.branchId) {
      alert("Especifique un nombre y la sucursal correspondiente.");
      return;
    }

    const newWh: WarehouseType = {
      id: "wh_" + Math.random().toString(36).slice(2, 9),
      branchId: warehouseForm.branchId,
      name: warehouseForm.name
    };

    onUpdateWarehouses([...warehouses, newWh]);
    onAddAudit(
      "Crear Almacén",
      `Almacén "${warehouseForm.name}" creado para sucursal ID ${warehouseForm.branchId}`
    );

    setWarehouseForm({ name: "", branchId: "" });
    setShowWarehouseModal(false);
    alert(`Almacén "${newWh.name}" creado con éxito.`);
  };

  // Roles available for selection
  const allRolesList = [...Object.keys(INITIAL_ROLE_TEMPLATES), ...Object.keys(customRoles)];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50" id="admin-module-root">
      
      {/* Dynamic Sub-header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Administración de Licencia Interna</h2>
            <p className="text-[10px] text-slate-400 font-medium">Configure roles granulares, asigne sucursales independientes y verifique auditorías operacionales.</p>
          </div>
        </div>

        {/* Action Tabs Selector */}
        <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
          <button
            onClick={() => setActiveSubTab("usuarios")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeSubTab === "usuarios" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Usuarios y Permisos
          </button>
          <button
            onClick={() => setActiveSubTab("sucursales")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeSubTab === "sucursales" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sucursales & Almacenes
          </button>
          <button
            onClick={() => setActiveSubTab("auditoria")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
              activeSubTab === "auditoria" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Bitácora de Auditoría
          </button>
        </div>
      </div>

      {/* Main Tab Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" id="admin-viewport">

        {/* SUBTAB: USUARIOS Y PERMISOS */}
        {activeSubTab === "usuarios" && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Usuarios y Roles de {activeCompany.name}</h3>
                <p className="text-xs text-slate-500 mt-1">Limite el acceso de cajeros, administradores y supervisores asignándoles permisos individuales.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRolePermissions([]);
                    setShowRoleModal(true);
                  }}
                  className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-500" />
                  Crear Rol Personalizado
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUserForm({
                      name: "",
                      email: "",
                      pin: "",
                      role: "Cajero",
                      permissions: INITIAL_ROLE_TEMPLATES["Cajero"],
                      restrictedBranches: []
                    });
                    setShowUserModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Colaborador
                </button>
              </div>
            </div>

            {/* Users grid list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {companyUsers.map((user) => (
                <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-700 text-xs uppercase border border-slate-200">
                          {user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 leading-none">{user.name}</h4>
                          <span className="text-[10px] text-slate-400">{user.email}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-sm tracking-wider ${
                        user.role === "Propietario" 
                          ? "bg-red-50 text-red-600 border border-red-100" 
                          : user.role === "Administrador"
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {user.role}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-slate-150 pt-3">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">PIN de Acceso Rápido</span>
                        <span className="font-mono font-bold text-slate-700 tracking-wider bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{user.pin}</span>
                      </div>
                      
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400 font-medium">Sucursales Permitidas</span>
                        <span className="font-bold text-slate-800">
                          {(!user.restrictedBranches || user.restrictedBranches.length === 0) 
                            ? "Todas (Sin Restricciones)" 
                            : `${user.restrictedBranches.length} sucursal(es)`}
                        </span>
                      </div>

                      <div className="mt-3">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Permisos Activos ({user.permissions?.includes("all") ? "Máximo" : user.permissions?.length || 0})</span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pt-1">
                          {user.permissions?.includes("all") ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded-md">Control Total (All Access)</span>
                          ) : (
                            user.permissions?.map((pKey) => {
                              const match = GRANULAR_PERMISSIONS.find(gp => gp.key === pKey);
                              return (
                                <span key={pKey} className="bg-slate-50 text-slate-600 border border-slate-200 text-[9px] font-medium px-1.5 py-0.5 rounded">
                                  {match?.label || pKey}
                                </span>
                              );
                            })
                          )}
                          {(!user.permissions || user.permissions.length === 0) && (
                            <span className="text-[10px] italic text-slate-400">Sin permisos de acceso definidos.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5 mt-4">
                    <button
                      onClick={() => handleStartEditUser(user)}
                      className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                      title="Editar Usuario"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {user.role !== "Propietario" && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Eliminar Usuario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB: SUCURSALES Y ALMACENES */}
        {activeSubTab === "sucursales" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Branches Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-xs uppercase text-slate-900 tracking-wider">Sucursales del Comercio</span>
                </div>
                <button
                  onClick={() => setShowBranchModal(true)}
                  className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Sucursal
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
                {companyBranches.map((branch) => {
                  const bWhs = companyWarehouses.filter((w) => w.branchId === branch.id);
                  return (
                    <div key={branch.id} className="py-3 flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {branch.name}
                        </span>
                        <p className="text-[11px] text-slate-400 pl-5">{branch.address}</p>
                        <span className="text-[10px] text-indigo-600 pl-5 font-semibold block">
                          Almacenes asociados: {bWhs.map(w => w.name).join(", ") || "Ninguno"}
                        </span>
                      </div>
                      <span className="text-[9px] bg-slate-50 text-slate-400 font-bold px-2 py-0.5 rounded-sm font-mono">{branch.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warehouses Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-indigo-600" />
                  <span className="font-bold text-xs uppercase text-slate-900 tracking-wider">Almacenes y Depósitos (Inventarios Separados)</span>
                </div>
                <button
                  onClick={() => setShowWarehouseModal(true)}
                  className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Almacén
                </button>
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
                {companyWarehouses.map((wh) => {
                  const parentBranch = companyBranches.find(b => b.id === wh.branchId);
                  return (
                    <div key={wh.id} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-800">{wh.name}</span>
                        <p className="text-[10px] text-slate-400">
                          Pertenece a sucursal: <span className="text-slate-600 font-bold">{parentBranch?.name || "Sin sucursal"}</span>
                        </p>
                      </div>
                      <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold px-2 py-0.5 rounded-sm font-mono uppercase">Existencia Separada</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: AUDITORIA OPERACIONAL */}
        {activeSubTab === "auditoria" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-3xs space-y-4">
            
            {/* Filter controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-xs uppercase text-slate-900 tracking-wider">Pista de Auditoría Detallada (Log General)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Bitácora inmutable de cambios importantes en inventario, ventas, permisos y licenciamiento.</p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 focus:outline-hidden focus:bg-white"
                    placeholder="Buscar acción..."
                  />
                </div>
                <select
                  value={selectedAuditUser}
                  onChange={(e) => setSelectedAuditUser(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs rounded-xl px-2 py-1.5 focus:outline-hidden cursor-pointer font-medium text-slate-700"
                >
                  <option value="Todos">Todos los Operadores</option>
                  {Array.from(new Set(companyAudits.map((a) => a.userName))).map((uname) => (
                    <option key={uname} value={uname}>{uname}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audit log table layout */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-150 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Operador / Rol</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Acción Registrada</th>
                    <th className="p-3">Detalle</th>
                    <th className="p-3">Valores (Anterior & Nuevo)</th>
                    <th className="p-3 text-center font-mono">Dispositivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {companyAudits
                    .filter((log) => {
                      const matchesSearch = log.action.toLowerCase().includes(auditSearch.toLowerCase()) || log.details.toLowerCase().includes(auditSearch.toLowerCase());
                      const matchesUser = selectedAuditUser === "Todos" || log.userName === selectedAuditUser;
                      return matchesSearch && matchesUser;
                    })
                    .slice(0, 50)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block leading-tight">{log.userName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{log.role}</span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(log.date).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            log.action.includes("Error") || log.action.includes("Anul")
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : log.action.includes("Crear") || log.action.includes("Sinc")
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="p-3 text-[11px] font-mono text-slate-500 space-y-0.5">
                          {log.previousValue && (
                            <div className="flex gap-1">
                              <span className="text-red-500 font-bold">Prev:</span>
                              <span className="bg-red-50 px-1 rounded truncate max-w-[120px]">{log.previousValue}</span>
                            </div>
                          )}
                          {log.newValue && (
                            <div className="flex gap-1">
                              <span className="text-emerald-500 font-bold">New:</span>
                              <span className="bg-emerald-50 px-1 rounded truncate max-w-[120px]">{log.newValue}</span>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center text-[10px] text-slate-400 font-mono">
                          IP: 192.168.1.{Math.floor(Math.random() * 254) + 1}
                        </td>
                      </tr>
                    ))}
                  {companyAudits.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400 italic">No se encontraron eventos en la bitácora de auditoría.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR / EDITAR COLABORADOR */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveUser} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Users className="w-5 h-5 text-indigo-600" />
              {editingUser ? "Editar Datos de Colaborador" : "Registrar Nuevo Colaborador"}
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Defina las credenciales de ingreso rápido, asigne el rol básico y marque los permisos granulares requeridos para realizar transacciones.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold"
                  placeholder="Ej. Pedro Pérez"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold"
                  placeholder="pedro@gmail.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">PIN de Acceso Rápido (6 dígitos numéricos) *</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={userForm.pin}
                  onChange={(e) => setUserForm(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, "") }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-mono tracking-widest font-bold"
                  placeholder="123456"
                />
                {userForm.pin.length > 0 && userForm.pin.length < 6 && (
                  <span className="text-[10px] text-amber-600 font-medium block">
                    El PIN debe ser de exactamente 6 dígitos para coincidir con la pantalla de acceso.
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Rol Comercial *</label>
                <select
                  value={userForm.role}
                  onChange={(e) => handleRoleChangeInForm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold text-slate-800"
                >
                  {allRolesList.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* RESTRICT BRANCHES */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-700 block">Restricción de Sucursales</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Seleccione qué sucursales puede operar. Si no marca ninguna, tendrá acceso total.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {companyBranches.map((br) => {
                  const selected = userForm.restrictedBranches.includes(br.id);
                  return (
                    <button
                      key={br.id}
                      type="button"
                      onClick={() => {
                        const next = selected 
                          ? userForm.restrictedBranches.filter(id => id !== br.id) 
                          : [...userForm.restrictedBranches, br.id];
                        setUserForm(prev => ({ ...prev, restrictedBranches: next }));
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selected 
                          ? "bg-indigo-600 text-white border-indigo-600" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${selected ? "text-white" : "text-indigo-500"}`} />
                      <span>{br.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GRANULAR PERMISSIONS MATRIX CHECKBOXES */}
            <div className="space-y-2 border-t border-slate-150 pt-3">
              <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider text-indigo-600">Matriz de Permisos Granulares Activos</span>
              <p className="text-[10px] text-slate-400">Marque de forma granular los accesos para este usuario o herede de la plantilla de roles iniciales.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {GRANULAR_PERMISSIONS.map((perm) => {
                  const isChecked = userForm.permissions.includes("all") || userForm.permissions.includes(perm.key);
                  const isInheritedAll = userForm.permissions.includes("all");
                  return (
                    <label key={perm.key} className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 hover:bg-slate-100 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isInheritedAll}
                        onChange={() => handleTogglePermissionInForm(perm.key)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 mt-0.5"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block leading-tight">{perm.label}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-400">{perm.category}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                {editingUser ? "Guardar Cambios" : "Crear Colaborador"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREAR ROL PERSONALIZADO */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveCustomRole} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-xl w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-indigo-600" />
              Crear Rol Personalizado con Permisos Especiales
            </h3>
            <p className="text-[11px] text-slate-400">
              Especifique un nombre de rol único (ej. Supervisor Nocturno, Cajero de Contingencia) y configure su plantilla base de accesos granulares.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Nombre del Rol *</label>
              <input
                type="text"
                required
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold"
                placeholder="Ej. Supervisor de Fin de Semana"
              />
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider text-indigo-600">Configurar Permisos del Rol</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pt-2">
                {GRANULAR_PERMISSIONS.map((perm) => {
                  const active = rolePermissions.includes(perm.key);
                  return (
                    <button
                      key={perm.key}
                      type="button"
                      onClick={() => {
                        const next = active 
                          ? rolePermissions.filter(p => p !== perm.key) 
                          : [...rolePermissions, perm.key];
                        setRolePermissions(next);
                      }}
                      className={`text-left px-3 py-2 rounded-xl border text-[11px] font-semibold flex justify-between items-center transition-all cursor-pointer ${
                        active 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <span className="block font-bold">{perm.label}</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider">{perm.category}</span>
                      </div>
                      {active && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Crear Plantilla de Rol
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AGREGAR SUCURSAL */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveBranch} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Building className="w-5 h-5 text-indigo-600" />
              Registrar Nueva Sucursal
            </h3>
            <p className="text-[11px] text-slate-400">
              Cree puntos de venta independientes. El sistema creará de forma automática su almacén central correspondiente.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Nombre de Sucursal *</label>
              <input
                type="text"
                required
                value={branchForm.name}
                onChange={(e) => setBranchForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold"
                placeholder="Ej. Don Pablo Naco"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Dirección Física</label>
              <input
                type="text"
                value={branchForm.address}
                onChange={(e) => setBranchForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold"
                placeholder="Ej. Calle Manuel de Jesús Troncoso, Santo Domingo"
              />
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Crear Sucursal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: AGREGAR ALMACÉN */}
      {showWarehouseModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveWarehouse} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Warehouse className="w-5 h-5 text-indigo-600" />
              Crear Nuevo Almacén o Depósito
            </h3>
            <p className="text-[11px] text-slate-400">
              Cada almacén cuenta con sus propios niveles de stock separados. Útil para separar almacenes centrales de góndolas o barras.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Asociar a Sucursal *</label>
              <select
                required
                value={warehouseForm.branchId}
                onChange={(e) => setWarehouseForm(prev => ({ ...prev, branchId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold text-slate-800"
              >
                <option value="">Seleccione una Sucursal...</option>
                {companyBranches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Nombre del Almacén *</label>
              <input
                type="text"
                required
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold"
                placeholder="Ej. Almacén de Despacho"
              />
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowWarehouseModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Crear Almacén
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
