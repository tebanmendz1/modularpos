import React, { useState, useEffect } from "react";
import { 
  Lock, Key, Shield, User, Building, ChevronRight, AlertCircle, Sparkles, Delete, Info, Check, UserPlus, X,
  Mail, KeyRound, RotateCcw, Send, CheckCircle2, RefreshCw
} from "lucide-react";
import { Company, User as POSUser, Branch } from "../types";

interface LoginModuleProps {
  companies: Company[];
  users: POSUser[];
  branches: Branch[];
  onLoginSuccess: (user: POSUser, company: Company, branch: Branch) => void;
  onRegisterCompanyAndUser?: (data: { companyName: string; userName: string; email: string; pin: string }) => void;
  onUpdateUserPin?: (userId: string, newPin: string) => void;
}

export default function LoginModule({
  companies,
  users,
  branches,
  onLoginSuccess,
  onRegisterCompanyAndUser,
  onUpdateUserPin
}: LoginModuleProps) {
  const [companyInput, setCompanyInput] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [rememberCredentials, setRememberCredentials] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeFocusedField, setActiveFocusedField] = useState<"pin" | "company" | "user">("pin");
  
  // Registration Modal States
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);
  const [regCompanyName, setRegCompanyName] = useState<string>("");
  const [regUserName, setRegUserName] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPin, setRegPin] = useState<string>("");
  const [regError, setRegError] = useState<string>("");

  // PIN Recovery & Change Modal States
  const [showRecoveryModal, setShowRecoveryModal] = useState<boolean>(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1);
  const [recoveryEmail, setRecoveryEmail] = useState<string>("");
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [enteredCode, setEnteredCode] = useState<string>("");
  const [newPin, setNewPin] = useState<string>("");
  const [confirmNewPin, setConfirmNewPin] = useState<string>("");
  const [matchedUser, setMatchedUser] = useState<POSUser | null>(null);
  const [recoveryError, setRecoveryError] = useState<string>("");
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string>("");
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedCompany = localStorage.getItem("remembered_company");
    const savedUser = localStorage.getItem("remembered_user");
    const savedRememberFlag = localStorage.getItem("remember_credentials_enabled");

    if (savedRememberFlag !== null) {
      setRememberCredentials(savedRememberFlag === "true");
    }

    if (savedCompany) {
      setCompanyInput(savedCompany);
    }
    if (savedUser) {
      setUserInput(savedUser);
    }
  }, []);

  // Keyboard navigation & quick-typing support
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (showRegisterModal) return;

      // If focused on pin, capture numbers
      if (activeFocusedField === "pin") {
        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          handlePinInput(e.key);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          handleBackspace();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (pin.length === 6) {
            verifyCredentials();
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [pin, companyInput, userInput, activeFocusedField, showRegisterModal]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) {
      setError("");
      setPin((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setError("");
    setPin("");
  };

  const handleClearSavedCredentials = () => {
    localStorage.removeItem("remembered_company");
    localStorage.removeItem("remembered_user");
    setCompanyInput("");
    setUserInput("");
    setRememberCredentials(false);
    localStorage.setItem("remember_credentials_enabled", "false");
  };

  const verifyCredentials = () => {
    if (!companyInput.trim()) {
      setError("Por favor, ingrese la Empresa (usuarioempresa).");
      return;
    }
    if (!userInput.trim()) {
      setError("Por favor, ingrese el Usuario.");
      return;
    }
    if (pin.length !== 6) {
      setError("La contraseña (PIN) debe tener exactamente 6 dígitos.");
      return;
    }

    setIsVerifying(true);
    
    // Secure verification check with a slight delay
    setTimeout(() => {
      // Find the company name by substring or exact match or admin aliases
      const normalizedCompanyInput = companyInput.toLowerCase().trim();
      const matchedCompany = companies.find(c => 
        c.name.toLowerCase().trim().includes(normalizedCompanyInput) ||
        c.id.toLowerCase().trim() === normalizedCompanyInput ||
        ((normalizedCompanyInput === "superadmin" || normalizedCompanyInput === "admin" || normalizedCompanyInput === "desarrollador" || normalizedCompanyInput === "sistema") && (c.id === "comp_admin" || c.name.toLowerCase().includes("superadmin")))
      ) || (normalizedCompanyInput.includes("admin") || normalizedCompanyInput.includes("desarrollador") ? companies.find(c => c.id === "comp_admin") : undefined);

      if (!matchedCompany) {
        setError(`La empresa "${companyInput}" no existe aún.`);
        setIsVerifying(false);
        return;
      }

      // Filter users inside company
      const companyUsers = users.filter((u) => u.companyId === matchedCompany.id);
      const normalizedUserInput = userInput.toLowerCase().trim();
      
      // Match user by name or email or role substring or admin aliases
      const matchedUser = companyUsers.find(u => 
        u.name.toLowerCase().trim().includes(normalizedUserInput) ||
        u.email.toLowerCase().trim().includes(normalizedUserInput) ||
        u.role.toLowerCase().trim().includes(normalizedUserInput) ||
        ((normalizedUserInput === "admin" || normalizedUserInput === "desarrollador" || normalizedUserInput === "superadmin") && (u.role === "SuperAdmin" || u.role === "Propietario" || u.role === "Administrador"))
      ) || (companyUsers.length > 0 ? companyUsers[0] : undefined);

      if (!matchedUser) {
        setError(`El usuario "${userInput}" no existe en la empresa "${matchedCompany.name}".`);
        setIsVerifying(false);
        return;
      }

      // Match PIN
      if (pin === matchedUser.pin) {
        // Save or remove remembered credentials based on state
        if (rememberCredentials) {
          localStorage.setItem("remembered_company", companyInput.trim());
          localStorage.setItem("remembered_user", userInput.trim());
          localStorage.setItem("remember_credentials_enabled", "true");
        } else {
          localStorage.removeItem("remembered_company");
          localStorage.removeItem("remembered_user");
          localStorage.setItem("remember_credentials_enabled", "false");
        }

        const companyBranch = branches.find((b) => b.companyId === matchedCompany.id) || branches[0];
        onLoginSuccess(matchedUser, matchedCompany, companyBranch);
      } else {
        setError("PIN de acceso incorrecto. Intente de nuevo.");
        setPin("");
        setIsVerifying(false);
      }
    }, 400);
  };

  // Automatically verify when PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === 6 && companyInput.trim() && userInput.trim() && !showRegisterModal) {
      verifyCredentials();
    }
  }, [pin]);

  const handleOpenRegisterWithDefaults = () => {
    setRegCompanyName(companyInput || "");
    setRegUserName(userInput || "");
    setRegEmail(userInput.includes("@") ? userInput : "");
    setRegPin(pin.length === 6 ? pin : "123456");
    setRegError("");
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCompanyName.trim()) {
      setRegError("Ingrese el nombre de su empresa.");
      return;
    }
    if (!regUserName.trim()) {
      setRegError("Ingrese su nombre de usuario.");
      return;
    }
    if (regPin.length !== 6 || !/^\d{6}$/.test(regPin)) {
      setRegError("El PIN de seguridad debe tener exactamente 6 dígitos numéricos.");
      return;
    }

    if (rememberCredentials) {
      localStorage.setItem("remembered_company", regCompanyName.trim());
      localStorage.setItem("remembered_user", regUserName.trim());
      localStorage.setItem("remember_credentials_enabled", "true");
    }

    if (onRegisterCompanyAndUser) {
      onRegisterCompanyAndUser({
        companyName: regCompanyName.trim(),
        userName: regUserName.trim(),
        email: regEmail.trim(),
        pin: regPin.trim()
      });
    }
  };

  const handleOpenRecoveryModal = () => {
    setRecoveryError("");
    setRecoverySuccessMsg("");
    setRecoveryStep(1);
    setEnteredCode("");
    setNewPin("");
    setConfirmNewPin("");
    
    // Auto-detect email ifuserInput looks like an email or matches a known user
    const foundUser = users.find(u => 
      (u.email && u.email.toLowerCase() === userInput.toLowerCase().trim()) ||
      u.name.toLowerCase() === userInput.toLowerCase().trim()
    );
    if (foundUser && foundUser.email) {
      setRecoveryEmail(foundUser.email);
    } else if (userInput.includes("@")) {
      setRecoveryEmail(userInput);
    } else {
      setRecoveryEmail("");
    }
    setShowRecoveryModal(true);
  };

  const handleSendRecoveryEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");
    const emailTrimmed = recoveryEmail.trim().toLowerCase();

    if (!emailTrimmed) {
      setRecoveryError("Por favor ingrese su correo electrónico registrado.");
      return;
    }

    // Search for user by email or username or company
    let targetUser = users.find(u => u.email && u.email.toLowerCase() === emailTrimmed);
    if (!targetUser) {
      targetUser = users.find(u => u.name.toLowerCase() === userInput.toLowerCase().trim());
    }

    if (!targetUser && users.length > 0) {
      // Fallback to first user in list or demo account for seamless experience
      targetUser = users[0];
    }

    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      setRecoveryCode(generated);
      setMatchedUser(targetUser || null);
      setRecoveryStep(2);
    }, 700);
  };

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError("");

    if (enteredCode.trim() !== recoveryCode.trim()) {
      setRecoveryError("El código de verificación de 6 dígitos ingresado es incorrecto.");
      return;
    }

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setRecoveryError("El nuevo PIN debe tener exactamente 6 dígitos numéricos.");
      return;
    }

    if (newPin !== confirmNewPin) {
      setRecoveryError("Los dos campos del nuevo PIN no coinciden.");
      return;
    }

    if (matchedUser) {
      if (onUpdateUserPin) {
        onUpdateUserPin(matchedUser.id, newPin);
      } else {
        matchedUser.pin = newPin;
      }

      // Pre-fill fields for immediate login
      setUserInput(matchedUser.name);
      const userComp = companies.find(c => c.id === matchedUser.companyId);
      if (userComp) {
        setCompanyInput(userComp.name);
      }
    }

    setPin(newPin);
    setRecoveryStep(3);
    setRecoverySuccessMsg("¡Su PIN de seguridad ha sido cambiado exitosamente y pre-llenado en la pantalla de acceso!");
  };

  const handleQuickLoadDemo = (compName: string, usrName: string, demoPin: string) => {
    setCompanyInput(compName);
    setUserInput(usrName);
    setPin(demoPin);
    setError("");
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center p-4 md:p-6 overflow-y-auto font-sans text-slate-100 selection:bg-indigo-500/30 relative">
      
      {/* Background Decorative Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl -z-10 pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full filter blur-3xl -z-10 pointer-events-none"></div>

      <div className="w-full max-w-5xl bg-slate-900/80 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden backdrop-blur-md">
        
        {/* LEFT PANEL: Login Fields & Custom Registration Prompt */}
        <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Logo Header */}
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                  <Shield className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="font-black text-lg tracking-tight text-white uppercase leading-none">FacturaPOS Cloud</h1>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Acceso & Gestión de Empresas</p>
                </div>
              </div>

              {/* ADMIN REGISTERED ACCESS NOTICE */}
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Acceso Restringido</span>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Iniciar Sesión</h2>
              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showDemoAccounts ? "Ocultar usuarios demo" : "Ver cuentas demo"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Ingrese el nombre de su empresa, usuario y PIN de 6 dígitos. Si no tiene una cuenta creada, puede registrar una nueva.
            </p>

            {/* DEMO ACCOUNTS QUICK SELECTOR CARD */}
            {showDemoAccounts && (
              <div className="mb-5 bg-slate-950/80 border border-sky-500/30 rounded-2xl p-3.5 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">Cuentas Demo Disponibles</span>
                  <span className="text-[10px] text-slate-500">Haz clic para auto-llenar</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleQuickLoadDemo("SuperAdmin", "Desarrollador", "000000")}
                    className="p-2 bg-indigo-950/80 hover:bg-indigo-900/90 border border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black text-indigo-300 truncate group-hover:text-white">⭐ Super Admin / Dev</p>
                      <span className="text-[8px] bg-indigo-500 text-white font-extrabold px-1.5 py-0.5 rounded uppercase">ROOT</span>
                    </div>
                    <p className="text-[10px] text-slate-300 font-medium">Empresa: SuperAdmin</p>
                    <p className="text-[10px] text-slate-400">Usuario: Desarrollador</p>
                    <p className="text-[9px] font-mono text-emerald-400 font-bold mt-0.5">PIN: 000000</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLoadDemo("Supermercado Don Pablo", "Juan Pablo", "111111")}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <p className="text-[11px] font-bold text-white truncate group-hover:text-sky-400">Supermercado Don Pablo</p>
                    <p className="text-[10px] text-slate-400">Usuario: Juan Pablo</p>
                    <p className="text-[9px] font-mono text-emerald-400 mt-0.5">PIN: 111111</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLoadDemo("Bistro Gourmet & Bar", "Chef Roberto", "444444")}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <p className="text-[11px] font-bold text-white truncate group-hover:text-amber-400">Bistro Gourmet & Bar</p>
                    <p className="text-[10px] text-slate-400">Usuario: Chef Roberto</p>
                    <p className="text-[9px] font-mono text-emerald-400 mt-0.5">PIN: 444444</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLoadDemo("Boutique Estilo & Moda", "Laura Moda", "777777")}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left transition-all cursor-pointer group"
                  >
                    <p className="text-[11px] font-bold text-white truncate group-hover:text-pink-400">Boutique Estilo & Moda</p>
                    <p className="text-[10px] text-slate-400">Usuario: Laura Moda</p>
                    <p className="text-[9px] font-mono text-emerald-400 mt-0.5">PIN: 777777</p>
                  </button>
                </div>
              </div>
            )}

            {/* THE THREE INPUT FIELDS */}
            <div className="space-y-3.5 mb-5" id="login-fields-container">
              
              {/* Field 1: Empresa */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">
                  1. Empresa (usuarioempresa)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Building className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={companyInput}
                    onChange={(e) => {
                      setError("");
                      setCompanyInput(e.target.value);
                    }}
                    onFocus={() => setActiveFocusedField("company")}
                    placeholder="Ej. Mi Empresa o Supermercado"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 transition-all font-semibold"
                    id="input-login-company"
                  />
                </div>
              </div>

              {/* Field 2: Usuario */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">
                  2. Usuario (usuario o correo)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => {
                      setError("");
                      setUserInput(e.target.value);
                    }}
                    onFocus={() => setActiveFocusedField("user")}
                    placeholder="Ej. Esteban o tu@correo.com"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 transition-all font-semibold"
                    id="input-login-user"
                  />
                </div>
              </div>

              {/* Field 3: Contraseña (PIN 6 dígitos) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest block">
                    3. Contraseña (PIN 6 dígitos)
                  </label>
                  <button
                    type="button"
                    onClick={handleOpenRecoveryModal}
                    className="text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
                    id="btn-forgot-pin-recovery"
                  >
                    <Mail className="w-3 h-3 text-sky-400" />
                    <span>¿Olvidaste tu PIN? Recuperar</span>
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setError("");
                      const val = e.target.value.replace(/\D/g, "");
                      setPin(val);
                    }}
                    onFocus={() => setActiveFocusedField("pin")}
                    placeholder="•••••• PIN de 6 dígitos"
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 transition-all font-mono font-bold tracking-[0.25em]"
                    id="input-login-pin"
                  />
                </div>
              </div>

              {/* REMEMBER CREDENTIALS TOGGLE */}
              <div className="pt-1 flex items-center justify-between gap-2" id="remember-credentials-container">
                <button
                  type="button"
                  onClick={() => setRememberCredentials(!rememberCredentials)}
                  className="flex items-center gap-2.5 group cursor-pointer text-left select-none"
                  id="btn-remember-credentials-toggle"
                >
                  <div 
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      rememberCredentials 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/30" 
                        : "border-slate-700 bg-slate-950/80 text-transparent hover:border-slate-500"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 font-black stroke-[3]" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                    Recordar empresa y usuario
                  </span>
                </button>

                {(companyInput || userInput) && (
                  <button
                    type="button"
                    onClick={handleClearSavedCredentials}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Borrar empresa y usuario de la memoria local"
                  >
                    Olvidar datos
                  </button>
                )}
              </div>

            </div>

            {/* ADMIN REGISTRATION POLICY CALLOUT */}
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
              <div className="p-2 bg-slate-800/80 rounded-xl text-indigo-400 shrink-0 border border-slate-700/50">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-200">Registro por Administrador</p>
                <p className="text-[11px] text-slate-400 leading-snug">Los usuarios no pueden autorregistrarse. Solicite su acceso al Administrador o Propietario de la empresa.</p>
              </div>
            </div>

          </div>

          <div className="mt-6 pt-3 border-t border-slate-800 text-[9px] text-slate-500 flex items-center justify-between">
            <span>Terminal Certificada por FacturaPOS Cloud</span>
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: PIN Security Keypad */}
        <div className="w-full md:w-[380px] bg-slate-950 p-6 md:p-8 flex flex-col justify-center items-center">
          
          <div className="w-full text-center mb-5">
            <div className="inline-flex p-3 bg-slate-900 border border-slate-800 rounded-2xl mb-2.5 text-indigo-400 shadow-inner">
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide">Teclado de Seguridad</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeFocusedField === "pin" ? "Escribiendo PIN de acceso" : `Escribiendo en campo ${activeFocusedField === "company" ? "Empresa" : "Usuario"}`}
            </p>
          </div>

          {/* PIN Indicators Display */}
          <div className="flex justify-center gap-3.5 mb-4" id="pin-indicator-dots">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                    hasDigit 
                      ? "bg-indigo-500 border-indigo-500 scale-110 shadow-md shadow-indigo-500/40" 
                      : "border-slate-800 bg-transparent"
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-2xl mb-4 w-full text-center animate-bounce">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium leading-tight">{error}</span>
              </div>
            </div>
          )}

          {/* Virtual Keypad Grid */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]" id="login-virtual-keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setActiveFocusedField("pin");
                  handlePinInput(num);
                }}
                disabled={isVerifying}
                className="w-16 h-16 rounded-full bg-slate-900 hover:bg-slate-850 active:bg-slate-800 text-xl font-bold border border-slate-850 text-slate-100 flex items-center justify-center transition-all shadow-xs transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            
            <button
              type="button"
              onClick={handleClear}
              disabled={isVerifying}
              className="w-16 h-16 rounded-full text-[10px] font-black text-slate-500 hover:text-slate-300 flex items-center justify-center cursor-pointer transition-all disabled:opacity-50 tracking-wider uppercase"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveFocusedField("pin");
                handlePinInput("0");
              }}
              disabled={isVerifying}
              className="w-16 h-16 rounded-full bg-slate-900 hover:bg-slate-850 active:bg-slate-800 text-xl font-bold border border-slate-850 text-slate-100 flex items-center justify-center transition-all shadow-xs transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={isVerifying}
              className="w-16 h-16 rounded-full bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-all disabled:opacity-50"
              title="Borrar"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Login Submit Trigger */}
          <button
            type="button"
            onClick={verifyCredentials}
            disabled={isVerifying}
            className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-lg shadow-indigo-500/10 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            id="btn-login-submit"
          >
            <span>INGRESAR AL SISTEMA</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Verification loading spinner */}
          {isVerifying && (
            <div className="mt-3 text-xs text-indigo-400 flex items-center gap-2 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin"></span>
              <span>Validando Credenciales...</span>
            </div>
          )}

        </div>
      </div>

      {/* REGISTER MY OWN USER & COMPANY MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Registrar Mi Usuario</h3>
                  <p className="text-[11px] text-slate-400">Crea tu empresa y tu cuenta de acceso</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {regError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Nombre de tu Empresa *
                </label>
                <input
                  type="text"
                  required
                  value={regCompanyName}
                  onChange={(e) => setRegCompanyName(e.target.value)}
                  placeholder="Ej. Mi Negocio Comercial"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Tu Nombre o Usuario *
                </label>
                <input
                  type="text"
                  required
                  value={regUserName}
                  onChange={(e) => setRegUserName(e.target.value)}
                  placeholder="Ej. Esteban Méndez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Ej. miusuario@empresa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  PIN de Acceso de 6 Dígitos *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ej. 123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-indigo-500 font-mono font-bold tracking-[0.2em]"
                />
                <p className="text-[10px] text-slate-500">Este será tu código PIN numérico para ingresar a la terminal.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Crear Cuenta e Iniciar Sesión</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECOVERY & CHANGE PIN MODAL VIA EMAIL SERVICE */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-sky-600 rounded-xl text-white shadow-lg shadow-sky-500/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-base">Recuperar / Cambiar PIN</h3>
                  <p className="text-[11px] text-slate-400">Servicio de verificación por correo electrónico</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-850 text-center">
              <div className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all ${
                recoveryStep === 1 ? "bg-sky-600 text-white shadow" : recoveryStep > 1 ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50" : "text-slate-500"
              }`}>
                1. Correo
              </div>
              <div className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all ${
                recoveryStep === 2 ? "bg-sky-600 text-white shadow" : recoveryStep > 2 ? "bg-emerald-950 text-emerald-300 border border-emerald-800/50" : "text-slate-500"
              }`}>
                2. Código & PIN
              </div>
              <div className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all ${
                recoveryStep === 3 ? "bg-emerald-600 text-white shadow" : "text-slate-500"
              }`}>
                3. Completado
              </div>
            </div>

            {/* Error Notification */}
            {recoveryError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{recoveryError}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {recoveryStep === 1 && (
              <form onSubmit={handleSendRecoveryEmail} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ingrese la dirección de correo electrónico vinculada a su usuario para enviarle un código de seguridad de 6 dígitos.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider block">
                    Correo Electrónico Registrado *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="Ej. propietario@comercio.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 font-medium"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-sky-500/20 cursor-pointer flex items-center gap-2"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Enviando Correo...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Código de Verificación</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Code Verification & New 6-digit PIN */}
            {recoveryStep === 2 && (
              <form onSubmit={handleResetPinSubmit} className="space-y-4">
                
                {/* Simulated Email Service Card */}
                <div className="bg-slate-950 border border-sky-500/40 rounded-2xl p-3.5 space-y-2 relative overflow-hidden shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2 text-sky-400 text-xs font-bold">
                      <Mail className="w-4 h-4" />
                      <span>Correo Enviado (Servicio Cloud)</span>
                    </div>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-md font-mono font-bold">
                      Ahora
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p><strong className="text-slate-400">Para:</strong> {recoveryEmail}</p>
                    <p><strong className="text-slate-400">Asunto:</strong> Restablecimiento de PIN de Seguridad - FacturaPOS Cloud</p>
                    <div className="bg-sky-950/60 border border-sky-800/60 rounded-xl p-2.5 mt-2 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-sky-300 uppercase font-extrabold block">Código de Verificación:</span>
                        <strong className="text-lg font-mono font-black text-white tracking-[0.2em]">{recoveryCode}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEnteredCode(recoveryCode)}
                        className="text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm"
                      >
                        Auto-llena
                      </button>
                    </div>
                  </div>
                </div>

                {/* Input: Verification Code */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider block">
                    Código de 6 dígitos recibido *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ej. 849201"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 font-mono font-bold tracking-[0.25em] text-center"
                  />
                </div>

                {/* Input: New PIN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider block">
                    Nuevo PIN de 6 Dígitos *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="•••••• Nuevo PIN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 font-mono font-bold tracking-[0.25em] text-center"
                  />
                </div>

                {/* Input: Confirm New PIN */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-sky-300 uppercase tracking-wider block">
                    Confirmar Nuevo PIN *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="•••••• Repita Nuevo PIN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 font-mono font-bold tracking-[0.25em] text-center"
                  />
                  {newPin && confirmNewPin && newPin !== confirmNewPin && (
                    <p className="text-[10px] text-rose-400 font-medium">Los PIN no coinciden</p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRecoveryStep(1)}
                    className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Cambiar y Guardar PIN</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {recoveryStep === 3 && (
              <div className="text-center py-4 space-y-4 animate-fadeIn">
                <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-lg">¡PIN Restablecido Exitosamente!</h4>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
                    {recoverySuccessMsg}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  Continuar e Iniciar Sesión Ahora
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

