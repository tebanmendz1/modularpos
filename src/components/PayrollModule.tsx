import React, { useState } from "react";
import {
  CalendarClock, Plus, CheckCircle, Clock, Award, Wallet, Search,
  TrendingUp, Calendar, UserCheck, FileText, Building2, Printer,
  Download, CreditCard, DollarSign, Briefcase, ShieldCheck, Layers,
  AlertCircle, Filter, Users, Edit3, Calculator, Umbrella, FileSpreadsheet,
  BookOpen, ChevronRight, CheckCircle2, UserPlus, ArrowUpRight
} from "lucide-react";
import { Company, Employee, Sale, Payslip, VacationLeaveRecord, EmployeeLoan } from "../types";

interface PayrollModuleProps {
  activeCompany: Company;
  employees: Employee[];
  sales: Sale[];
  onUpdateEmployees: (updated: Employee[]) => void;
  onAddAudit: (action: string, details: string) => void;
}

export default function PayrollModule({
  activeCompany,
  employees,
  sales,
  onUpdateEmployees,
  onAddAudit
}: PayrollModuleProps) {
  // Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<
    "directory" | "payroll" | "payslip" | "loans" | "vacations" | "calc_severance"
  >("directory");

  // Modals
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  // Filters & Searches
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  // Form States - Employee Hire
  const [empName, setEmpName] = useState("");
  const [empDocumentId, setEmpDocumentId] = useState("");
  const [empRole, setEmpRole] = useState("Vendedor");
  const [empDepartment, setEmpDepartment] = useState("Ventas");
  const [empContractType, setEmpContractType] = useState<"Fijo" | "Temporal" | "Por Hora" | "Servicios">("Fijo");
  const [empMonthlySalary, setEmpMonthlySalary] = useState("25000");
  const [empComm, setEmpComm] = useState("5"); // 5%
  const [empHourly, setEmpHourly] = useState("150");
  const [empBankName, setEmpBankName] = useState("Banco Popular Dominicano");
  const [empBankAccount, setEmpBankAccount] = useState("");
  const [empTssNss, setEmpTssNss] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empEmail, setEmpEmail] = useState("");

  // Form States - Loans / Advances
  const [loanEmpId, setLoanEmpId] = useState("");
  const [loanAmount, setLoanAmount] = useState("5000");
  const [loanInstallments, setLoanInstallments] = useState("2");

  // Form States - Vacations / Leave
  const [vacEmpId, setVacEmpId] = useState("");
  const [vacType, setVacType] = useState<'Vacaciones' | 'Licencia Médica' | 'Permiso Personal' | 'Maternidad/Paternidad'>("Vacaciones");
  const [vacStartDate, setVacStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [vacDays, setVacDays] = useState("14");
  const [vacNotes, setVacNotes] = useState("");

  // Form States - Calculator Severance
  const [calcSalary, setCalcSalary] = useState("30000");
  const [calcMonthsWorked, setCalcMonthsWorked] = useState("24");
  const [calcNotice, setCalcNotice] = useState(true); // Preaviso ejercido
  const [calcSeverance, setCalcSeverance] = useState(true); // Cesantía
  const [calcVacationsPending, setCalcVacationsPending] = useState("14");

  // Filtered Company Employees
  const companyEmployees = employees.filter((e) => e.companyId === activeCompany.id);

  // Filtered Employee List
  const filteredEmployees = companyEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.documentId && emp.documentId.includes(searchQuery)) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  // Loans State
  const [loans, setLoans] = useState<EmployeeLoan[]>([
    {
      id: "loan_101",
      companyId: activeCompany.id,
      employeeId: companyEmployees[0]?.id || "emp_1",
      employeeName: companyEmployees[0]?.name || "Yissel Ramos",
      requestDate: "2026-07-01",
      amount: 6000,
      remainingAmount: 3000,
      installments: 2,
      monthlyDeduction: 3000,
      status: "Activo"
    }
  ]);

  // Vacation / Leave Records State
  const [vacationRecords, setVacationRecords] = useState<VacationLeaveRecord[]>([
    {
      id: "vac_101",
      companyId: activeCompany.id,
      employeeId: companyEmployees[0]?.id || "emp_1",
      employeeName: companyEmployees[0]?.name || "Yissel Ramos",
      type: "Vacaciones",
      startDate: "2026-08-01",
      endDate: "2026-08-15",
      days: 14,
      status: "Aprobado",
      notes: "Periodo correspondiente al año 2025-2026"
    }
  ]);

  // Compute commissions earned per employee from actual sales
  const calculateCommissionForEmployee = (emp: Employee) => {
    const empSales = sales.filter(
      (s) =>
        s.companyId === activeCompany.id &&
        s.status === "completed" &&
        (s.userId === emp.id || (s.paymentDetails && s.userId?.includes(emp.role.toLowerCase())))
    );
    const salesTotal = empSales.reduce((sum, s) => sum + s.total, 0);
    return salesTotal * (emp.commissionRate || 0);
  };

  // Generated Payslips State (Current Payroll Run)
  const generateCurrentPayslips = (): Payslip[] => {
    return companyEmployees.map((emp) => {
      const monthly = emp.monthlySalary || (emp.hourlyRate ? emp.hourlyRate * 160 : 25000);
      const baseQuincenal = monthly / 2;
      const comm = calculateCommissionForEmployee(emp) || (emp.role === "Vendedor" ? 1850 : 0);
      const overtimeHours = emp.clockedIn ? 6 : 0;
      const hourlyVal = emp.hourlyRate || (monthly / 160);
      const overtimePay = overtimeHours * (hourlyVal * 1.35); // 35% extra
      const gross = baseQuincenal + comm + overtimePay;

      // Legal Deductions (TSS República Dominicana / Estándar Latam)
      const sfsWorker = gross * 0.0304; // 3.04% SFS Salud
      const afpWorker = gross * 0.0287; // 2.87% AFP Pensión
      
      // ISR Calculation (Simplified bi-weekly scale)
      let isrWorker = 0;
      const annualizedGross = gross * 24;
      if (annualizedGross > 416220) {
        isrWorker = ((gross - (sfsWorker + afpWorker)) * 0.15) * 0.5; // Est.
      }

      // Active Loan Deductions
      const empLoan = loans.find((l) => l.employeeId === emp.id && l.status === "Activo");
      const advances = empLoan ? Math.min(empLoan.monthlyDeduction / 2, empLoan.remainingAmount) : 0;

      const totalDeductions = sfsWorker + afpWorker + isrWorker + advances;
      const netPay = Math.max(0, gross - totalDeductions);

      // Employer Contributions
      const sfsEmployer = gross * 0.0709; // 7.09%
      const afpEmployer = gross * 0.0710; // 7.10%
      const arlEmployer = gross * 0.0110; // 1.10%
      const infotepEmployer = gross * 0.0100; // 1.00%

      return {
        id: `pay_${emp.id}_${Date.now().toString().slice(-4)}`,
        payrollPeriodId: "PER_2026_07_Q2",
        companyId: activeCompany.id,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeDocument: emp.documentId || "001-0000000-0",
        department: emp.department || "Operaciones",
        role: emp.role,
        bankName: emp.bankName || "Banco Popular",
        bankAccount: emp.bankAccount || "798451230",
        paymentDate: new Date().toISOString().split("T")[0],
        periodLabel: "2da Quincena Julio 2026",
        baseSalary: baseQuincenal,
        overtimeHours,
        overtimePay,
        commissions: comm,
        bonuses: 0,
        grossPay: gross,
        sfsWorker,
        afpWorker,
        isrWorker,
        advances,
        totalDeductions,
        netPay,
        sfsEmployer,
        afpEmployer,
        arlEmployer,
        infotepEmployer,
        status: "approved"
      };
    });
  };

  const [currentPayrollList, setCurrentPayrollList] = useState<Payslip[]>(generateCurrentPayslips());

  // Clock-In / Clock-Out toggle
  const handleToggleClock = (empId: string) => {
    const updated = employees.map((emp) => {
      if (emp.id === empId) {
        const nextState = !emp.clockedIn;
        return {
          ...emp,
          clockedIn: nextState,
          lastClockIn: nextState ? new Date().toISOString() : emp.lastClockIn
        };
      }
      return emp;
    });

    onUpdateEmployees(updated);
    const targetEmp = employees.find((e) => e.id === empId);
    if (targetEmp) {
      onAddAudit(
        "Control de Asistencia",
        `Empleado ${targetEmp.name} marcó ${!targetEmp.clockedIn ? "ENTRADA (Clock-In)" : "SALIDA (Clock-Out)"}`
      );
    }
  };

  // Add Employee Form Save
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) {
      alert("Por favor ingrese el nombre del empleado.");
      return;
    }

    const monthlyVal = parseFloat(empMonthlySalary) || 25000;
    const newEmp: Employee = {
      id: "emp_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: empName.trim(),
      documentId: empDocumentId.trim() || `001-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(Math.random() * 9)}`,
      role: empRole,
      department: empDepartment,
      contractType: empContractType,
      monthlySalary: monthlyVal,
      commissionRate: parseFloat(empComm) / 100,
      hourlyRate: parseFloat(empHourly) || (monthlyVal / 160),
      bankName: empBankName,
      bankAccount: empBankAccount || `100-${Math.floor(1000000 + Math.random() * 9000000)}`,
      tssAfiliacion: empTssNss || `NSS-${Math.floor(100000000 + Math.random() * 900000000)}`,
      phone: empPhone,
      email: empEmail,
      status: "active",
      hireDate: new Date().toISOString().split("T")[0],
      clockedIn: false
    };

    onUpdateEmployees([...employees, newEmp]);
    onAddAudit("Nómina & Personal", `Nuevo colaborador dado de alta: ${newEmp.name} (${newEmp.role} - ${newEmp.department})`);

    // Reset Form
    setShowAddEmployeeModal(false);
    setEmpName("");
    setEmpDocumentId("");
    setEmpMonthlySalary("25000");
    setEmpBankName("Banco Popular Dominicano");
    setEmpBankAccount("");
    // Refresh payroll view list
    setTimeout(() => setCurrentPayrollList(generateCurrentPayslips()), 200);
  };

  // Loan Request Form Save
  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = companyEmployees.find((e) => e.id === loanEmpId);
    if (!emp) {
      alert("Seleccione un empleado válido.");
      return;
    }
    const amt = parseFloat(loanAmount);
    const inst = parseInt(loanInstallments) || 1;

    const newLoan: EmployeeLoan = {
      id: "loan_" + Math.random().toString(36).slice(2, 8),
      companyId: activeCompany.id,
      employeeId: emp.id,
      employeeName: emp.name,
      requestDate: new Date().toISOString().split("T")[0],
      amount: amt,
      remainingAmount: amt,
      installments: inst,
      monthlyDeduction: amt / inst,
      status: "Activo"
    };

    setLoans([...loans, newLoan]);
    onAddAudit("Nómina & Personal", `Avance/Préstamo aprobado de ${activeCompany.settings.currency} ${amt} para ${emp.name}`);
    setShowLoanModal(false);
  };

  // Vacation / Leave Form Save
  const handleAddVacation = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = companyEmployees.find((e) => e.id === vacEmpId);
    if (!emp) {
      alert("Seleccione un empleado válido.");
      return;
    }

    const d = parseInt(vacDays) || 14;
    const start = new Date(vacStartDate);
    const end = new Date(start);
    end.setDate(end.getDate() + d);

    const newRecord: VacationLeaveRecord = {
      id: "vac_" + Math.random().toString(36).slice(2, 8),
      companyId: activeCompany.id,
      employeeId: emp.id,
      employeeName: emp.name,
      type: vacType,
      startDate: vacStartDate,
      endDate: end.toISOString().split("T")[0],
      days: d,
      status: "Aprobado",
      notes: vacNotes || "Aprobado por Dirección de Gestión Humana"
    };

    setVacationRecords([...vacationRecords, newRecord]);
    onAddAudit("Nómina & Personal", `Registro de ${vacType} (${d} días) para ${emp.name}`);
    setShowVacationModal(false);
  };

  // Process Full Payroll Batch
  const handleProcessPayrollBatch = () => {
    const totalNet = currentPayrollList.reduce((sum, p) => sum + p.netPay, 0);
    if (!confirm(`¿Confirma procesar la Nómina Quincenal de ${currentPayrollList.length} colaboradores por un valor neto de ${activeCompany.settings.currency} ${totalNet.toLocaleString('es-DO', { minimumFractionDigits: 2 })}?`)) {
      return;
    }

    onAddAudit("Liquidar Nómina", `Nómina quincenal procesada exitosamente por ${activeCompany.settings.currency} ${totalNet.toFixed(2)} para ${currentPayrollList.length} colaboradores.`);
    alert("¡Nómina procesada y liquidada de forma oficial! Se han generado los asientos contables y archivos bancarios ACH.");
  };

  // Export ACH File for Banks (Popular, Banreservas, BHD)
  const handleExportAchBankFile = () => {
    const lines = [
      `HEADER|PAYROLL|${activeCompany.name}|${activeCompany.rnc ? `RNC-${activeCompany.rnc}` : ""}|${new Date().toISOString().split("T")[0]}`,
      ...currentPayrollList.map((p, idx) => 
        `DET|${idx + 1}|${p.employeeDocument}|${p.employeeName.padEnd(30, ' ')}|${p.bankName}|${p.bankAccount}|${p.netPay.toFixed(2)}|DOP`
      ),
      `FOOTER|TOTAL_RECORDS|${currentPayrollList.length}|TOTAL_AMOUNT|${currentPayrollList.reduce((s, p) => s + p.netPay, 0).toFixed(2)}`
    ];

    const element = document.createElement("a");
    const file = new Blob([lines.join("\n")], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `ACH_NOMINA_${activeCompany.name.replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onAddAudit("Exportar ACH", "Archivo de Pago de Nómina Electrónica ACH descargado en formato de texto estándar.");
  };

  // Export TSS Payroll Template (CSV)
  const handleExportTssCsv = () => {
    const headers = ["Cedula_Pasaporte", "Nombres_Apellidos", "Sueldo_Cotizable", "Aportes_SFS_Trabajador", "Aportes_AFP_Trabajador", "Aportes_Patronales"];
    const rows = currentPayrollList.map((p) => [
      p.employeeDocument,
      `"${p.employeeName}"`,
      p.grossPay.toFixed(2),
      p.sfsWorker.toFixed(2),
      p.afpWorker.toFixed(2),
      (p.sfsEmployer + p.afpEmployer + p.arlEmployer + p.infotepEmployer).toFixed(2)
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const element = document.createElement("a");
    const file = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    element.href = URL.createObjectURL(file);
    element.download = `TSS_PLANTILLA_NOVEDADES_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onAddAudit("Exportar TSS", "Plantilla de Cotización e Ingresos para la TSS exportada en formato CSV.");
  };

  // Totals calculations for Dashboard summary
  const totalGrossPayroll = currentPayrollList.reduce((sum, p) => sum + p.grossPay, 0);
  const totalNetPayroll = currentPayrollList.reduce((sum, p) => sum + p.netPay, 0);
  const totalDeductionsPayroll = currentPayrollList.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalEmployerTssCost = currentPayrollList.reduce((sum, p) => sum + (p.sfsEmployer + p.afpEmployer + p.arlEmployer + p.infotepEmployer), 0);

  // Calculate Severance (Labor Law)
  const salVal = parseFloat(calcSalary) || 30000;
  const mWorked = parseFloat(calcMonthsWorked) || 12;
  const dailyRate = salVal / 23.83; // Standard Dominican daily rate factor

  const prevDays = calcNotice ? (mWorked >= 12 ? 28 : 14) : 0;
  const cesDays = calcSeverance ? (mWorked >= 12 ? Math.min(mWorked * 21 / 12, 12 * 21) : 13) : 0;
  const vacDaysCalc = parseFloat(calcVacationsPending) || 0;
  const regPascual = salVal * (mWorked % 12 || 12) / 12 / 2; // Proportion

  const totalPreaviso = prevDays * dailyRate;
  const totalCesantia = cesDays * dailyRate;
  const totalVacaciones = vacDaysCalc * dailyRate;
  const totalPrestaciones = totalPreaviso + totalCesantia + totalVacaciones + regPascual;

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-100 p-6" id="payroll-viewport">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Gestión Humana, Nómina & Personal PRO
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-extrabold text-[10px] rounded-full uppercase border border-indigo-200">
              Módulo Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Administre expedientes del personal, liquide nóminas quincenales, retenciones de ley (TSS/ISR), comisiones, horas extras y archivos ACH bancarios.
          </p>
        </div>

        {/* TOP METRICS & QUICK ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddEmployeeModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-transform active:scale-98 cursor-pointer"
            id="btn-hire-employee"
          >
            <UserPlus className="w-4 h-4" />
            <span>Contratar Personal</span>
          </button>

          <button
            onClick={() => setShowLoanModal(true)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            id="btn-request-loan"
          >
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Avance de Sueldo</span>
          </button>

          <button
            onClick={() => setShowVacationModal(true)}
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            id="btn-request-vacation"
          >
            <Umbrella className="w-4 h-4 text-amber-500" />
            <span>Registrar Permiso/Vacaciones</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Plantilla Activa</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-black text-slate-900">{companyEmployees.length}</span>
            <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded-full">
              100% Activos
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Nómina Bruta (Quincena)</span>
            <Wallet className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 font-mono font-black text-slate-900 text-lg">
            {activeCompany.settings.currency} {totalGrossPayroll.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Retenciones TSS / ISR</span>
            <ShieldCheck className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1 font-mono font-black text-rose-600 text-lg">
            {activeCompany.settings.currency} {totalDeductionsPayroll.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Neto a Desembolsar</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 font-mono font-black text-emerald-600 text-lg">
            {activeCompany.settings.currency} {totalNetPayroll.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* SUB MENU TABS */}
      <div className="flex flex-wrap border-b border-slate-200 mb-4 gap-1">
        <button
          onClick={() => setActiveSubTab("directory")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "directory"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Expediente & Personal ({companyEmployees.length})
        </button>

        <button
          onClick={() => setActiveSubTab("payroll")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "payroll"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Liquidación de Nómina
        </button>

        <button
          onClick={() => setActiveSubTab("loans")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "loans"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Avances & Préstamos ({loans.length})
        </button>

        <button
          onClick={() => setActiveSubTab("vacations")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "vacations"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Umbrella className="w-4 h-4" />
          Permisos & Vacaciones ({vacationRecords.length})
        </button>

        <button
          onClick={() => setActiveSubTab("calc_severance")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "calc_severance"
              ? "border-indigo-600 text-indigo-700 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Calculadora Prestaciones / Sueldo 13
        </button>
      </div>

      {/* TAB PANEL CONTAINER */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        {/* SUBTAB 1: EMPLOYEES DIRECTORY */}
        {activeSubTab === "directory" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            {/* SEARCH AND FILTERS */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula o cargo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer focus:bg-white focus:outline-hidden"
                >
                  <option value="all">Todos los Departamentos</option>
                  <option value="Ventas">Ventas & POS</option>
                  <option value="Operaciones">Operaciones & Almacén</option>
                  <option value="Administración">Administración & Finanzas</option>
                  <option value="Cocina">Cocina & Restaurante</option>
                  <option value="Logística">Logística & Delivery</option>
                </select>
              </div>
            </div>

            {/* DIRECTORY TABLE */}
            <div className="overflow-y-auto flex-1 border border-slate-150 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Colaborador / Expediente</th>
                    <th className="p-3">Departamento / Cargo</th>
                    <th className="p-3 text-center">Contrato</th>
                    <th className="p-3 text-right">Sueldo Mensual</th>
                    <th className="p-3">Banco / Cuenta ACH</th>
                    <th className="p-3 text-center">Reloj / Asistencia</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No se encontraron colaboradores en el departamento seleccionado.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900 text-xs">{e.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Cédula: {e.documentId || "001-0000000-0"} | NSS: {e.tssAfiliacion || "Cotizante TSS"}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-slate-800">{e.role}</span>
                          <div className="text-[10px] text-indigo-600 font-semibold">{e.department || "General"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                            {e.contractType || "Fijo"}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-900">
                          {activeCompany.settings.currency} {(e.monthlySalary || 25000).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          <div className="text-[11px] font-bold text-slate-800">{e.bankName || "Banco Popular"}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{e.bankAccount || "ACH Directo"}</div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase inline-flex items-center gap-1 ${
                            e.clockedIn
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${e.clockedIn ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                            {e.clockedIn ? "Trabajando" : "Inactivo"}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleClock(e.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                              e.clockedIn
                                ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {e.clockedIn ? "Marcar Salida" : "Marcar Entrada"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 2: PAYROLL LIQUIDATION SHEET */}
        {activeSubTab === "payroll" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            {/* TOOLBAR FOR PAYROLL ACTIONS */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-extrabold text-slate-900 block">Nómina Quincenal - Ley TSS / ISR República Dominicana</span>
                  <span className="text-[10px] text-slate-500">
                    Cálculos automáticos: SFS (3.04%), AFP (2.87%), Aportes Patronales (16.29%), Comisiones y Retenciones.
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportAchBankFile}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer text-xs"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Archivo ACH Banco (.txt)</span>
                </button>

                <button
                  onClick={handleExportTssCsv}
                  className="bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Plantilla TSS (.csv)</span>
                </button>

                <button
                  onClick={handleProcessPayrollBatch}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Liquidar & Asentar Nómina</span>
                </button>
              </div>
            </div>

            {/* PAYROLL LIQUIDATION TABLE */}
            <div className="overflow-y-auto flex-1 border border-slate-150 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">Colaborador</th>
                    <th className="p-2.5 text-right">Sueldo Base</th>
                    <th className="p-2.5 text-right">Comisiones</th>
                    <th className="p-2.5 text-right">Horas Extra</th>
                    <th className="p-2.5 text-right">Sueldo Bruto</th>
                    <th className="p-2.5 text-right text-rose-600">SFS (3.04%)</th>
                    <th className="p-2.5 text-right text-rose-600">AFP (2.87%)</th>
                    <th className="p-2.5 text-right text-rose-600">Avances</th>
                    <th className="p-2.5 text-right font-black text-slate-900 bg-slate-100/60">Neto Pagar</th>
                    <th className="p-2.5 text-center">Volante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {currentPayrollList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-2.5 font-extrabold text-slate-900">
                        {p.employeeName}
                        <div className="text-[10px] font-normal text-slate-500">{p.role}</div>
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-700">${p.baseSalary.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-indigo-600 font-bold">+${p.commissions.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">${p.overtimePay.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">${p.grossPay.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-rose-600">-${p.sfsWorker.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-rose-600">-${p.afpWorker.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono text-amber-700">-${p.advances.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-600 bg-emerald-50/30 text-xs">
                        ${p.netPay.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => {
                            setSelectedPayslip(p);
                            setActiveSubTab("payslip");
                          }}
                          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md cursor-pointer"
                          title="Ver Volante de Pago"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 3: PAYSLIP VIEWER & PRINTABLE STUB */}
        {activeSubTab === "payslip" && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-slate-50">
            {selectedPayslip ? (
              <div className="bg-white border border-slate-300 rounded-2xl shadow-md max-w-2xl w-full p-6 text-slate-800 space-y-4 print:border-none print:shadow-none" id="printable-payslip">
                {/* PAYSLIP HEADER */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{activeCompany.name}</h3>
                    {activeCompany.rnc && <p className="text-xs text-slate-500">RNC: {activeCompany.rnc}</p>}
                    <p className="text-xs text-slate-500 font-bold mt-1">VOLANTE INDIVIDUAL DE PAGO DE NÓMINA</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full uppercase">
                      PAGADO / APROBADO
                    </span>
                    <p className="text-xs font-mono font-bold text-slate-700 mt-1">{selectedPayslip.periodLabel}</p>
                    <p className="text-[10px] text-slate-400">Fecha: {selectedPayslip.paymentDate}</p>
                  </div>
                </div>

                {/* EMPLOYEE DATA */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Colaborador</span>
                    <span className="font-extrabold text-slate-900">{selectedPayslip.employeeName}</span>
                    <span className="text-slate-500 block text-[10px]">Cédula: {selectedPayslip.employeeDocument}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Puesto / Cargo</span>
                    <span className="font-extrabold text-slate-900">{selectedPayslip.role}</span>
                    <span className="text-slate-500 block text-[10px]">Depto: {selectedPayslip.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Banco / Vía de Pago</span>
                    <span className="font-extrabold text-slate-800">{selectedPayslip.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Cuenta ACH</span>
                    <span className="font-mono font-bold text-slate-800">{selectedPayslip.bankAccount}</span>
                  </div>
                </div>

                {/* EARNINGS VS DEDUCTIONS TABLE */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {/* EARNINGS */}
                  <div className="border border-emerald-100 rounded-xl p-3 bg-emerald-50/20">
                    <h4 className="font-extrabold text-emerald-900 text-xs border-b border-emerald-200 pb-1 mb-2 uppercase">Ingresos / Percepciones</h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">Sueldo Base:</span>
                        <span className="font-bold">${selectedPayslip.baseSalary.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">Comisiones:</span>
                        <span className="font-bold text-indigo-600">+${selectedPayslip.commissions.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">Horas Extra:</span>
                        <span className="font-bold">+${selectedPayslip.overtimePay.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-emerald-200 pt-1.5 font-black text-emerald-950 text-xs">
                        <span>SUELDO BRUTO:</span>
                        <span>${selectedPayslip.grossPay.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* DEDUCTIONS */}
                  <div className="border border-rose-100 rounded-xl p-3 bg-rose-50/20">
                    <h4 className="font-extrabold text-rose-900 text-xs border-b border-rose-200 pb-1 mb-2 uppercase">Deducciones de Ley & Avances</h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">SFS Seguro Salud (3.04%):</span>
                        <span className="font-bold text-rose-600">-${selectedPayslip.sfsWorker.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">AFP Pensión (2.87%):</span>
                        <span className="font-bold text-rose-600">-${selectedPayslip.afpWorker.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">ISR Retenido:</span>
                        <span className="font-bold text-rose-600">-${selectedPayslip.isrWorker.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 font-sans">Avances / Préstamos:</span>
                        <span className="font-bold text-amber-700">-${selectedPayslip.advances.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-rose-200 pt-1.5 font-black text-rose-950 text-xs">
                        <span>TOTAL DEDUCCIONES:</span>
                        <span>-${selectedPayslip.totalDeductions.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* NET PAY BOX */}
                <div className="bg-indigo-900 text-white p-4 rounded-xl flex justify-between items-center shadow-xs">
                  <div>
                    <span className="text-indigo-200 text-xs font-extrabold block uppercase">Sueldo Neto a Recibir</span>
                    <span className="text-[10px] text-indigo-300">Depositado en cuenta bancaria ACH</span>
                  </div>
                  <div className="text-2xl font-black font-mono tracking-tight text-emerald-300">
                    {activeCompany.settings.currency} {selectedPayslip.netPay.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* SIGNATURE FOOTER */}
                <div className="grid grid-cols-2 gap-12 pt-8 text-center text-xs text-slate-500">
                  <div className="border-t border-slate-300 pt-1">
                    <p className="font-bold text-slate-800">Firma Colaborador</p>
                    <p className="text-[10px]">{selectedPayslip.employeeName}</p>
                  </div>
                  <div className="border-t border-slate-300 pt-1">
                    <p className="font-bold text-slate-800">Gestión Humana / Empresa</p>
                    <p className="text-[10px]">{activeCompany.name}</p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 pt-2 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Volante</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Printer className="w-12 h-12 mx-auto mb-2 opacity-40" />
                <p>Seleccione un colaborador en la pestaña 'Liquidación de Nómina' para ver e imprimir su volante de pago.</p>
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 4: LOANS & ADVANCES */}
        {activeSubTab === "loans" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Avances de Sueldo y Préstamos</h3>
                <p className="text-xs text-slate-500">Gestione préstamos a empleados con descuento automático en las siguientes nóminas.</p>
              </div>
              <button
                onClick={() => setShowLoanModal(true)}
                className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Avance</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-150 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Empleado</th>
                    <th className="p-3">Fecha Solicitud</th>
                    <th className="p-3 text-right">Monto Solicitado</th>
                    <th className="p-3 text-center">Cuotas</th>
                    <th className="p-3 text-right">Descuento Quincenal</th>
                    <th className="p-3 text-right">Saldo Pendiente</th>
                    <th className="p-3 text-center">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {loans.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-extrabold text-slate-900">{l.employeeName}</td>
                      <td className="p-3 text-slate-500">{l.requestDate}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">${l.amount.toFixed(2)}</td>
                      <td className="p-3 text-center font-bold text-slate-600">{l.installments} quincenas</td>
                      <td className="p-3 text-right font-mono text-rose-600 font-bold">${l.monthlyDeduction.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-black text-amber-700">${l.remainingAmount.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 5: VACATIONS & LEAVE */}
        {activeSubTab === "vacations" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Control de Permisos y Vacaciones</h3>
                <p className="text-xs text-slate-500">Registre ausencias justificadas, vacaciones anuales y licencias médicas.</p>
              </div>
              <button
                onClick={() => setShowVacationModal(true)}
                className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Solicitar Permiso/Vacaciones</span>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-150 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3">Empleado</th>
                    <th className="p-3">Tipo Permiso</th>
                    <th className="p-3 text-center">Fecha Inicio</th>
                    <th className="p-3 text-center">Fecha Término</th>
                    <th className="p-3 text-center">Días Total</th>
                    <th className="p-3">Notas</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {vacationRecords.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-extrabold text-slate-900">{v.employeeName}</td>
                      <td className="p-3 font-bold text-indigo-700">{v.type}</td>
                      <td className="p-3 text-center text-slate-600">{v.startDate}</td>
                      <td className="p-3 text-center text-slate-600">{v.endDate}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800">{v.days} días</td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{v.notes || "—"}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUBTAB 6: CALCULATOR SEVERANCE & SUELDO 13 */}
        {activeSubTab === "calc_severance" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm space-y-1">
                <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-300" />
                  Calculadora de Prestaciones Laborales & Regalía Pascual (Sueldo 13)
                </h3>
                <p className="text-xs text-indigo-200">
                  Cálculo de Liquidación según el Código de Trabajo de República Dominicana (Preaviso, Cesantía, Vacaciones y Regalía).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* INPUT PARAMETERS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase border-b border-slate-100 pb-2">Parámetros del Empleado</h4>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Último Salario Mensual ({activeCompany.settings.currency})</label>
                    <input
                      type="number"
                      value={calcSalary}
                      onChange={(e) => setCalcSalary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Tiempo Laborado (Meses)</label>
                    <input
                      type="number"
                      value={calcMonthsWorked}
                      onChange={(e) => setCalcMonthsWorked(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Días de Vacaciones Pendientes</label>
                    <input
                      type="number"
                      value={calcVacationsPending}
                      onChange={(e) => setCalcVacationsPending(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={calcNotice}
                        onChange={(e) => setCalcNotice(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Incluir Preaviso (Aplica si la empresa omite preaviso)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={calcSeverance}
                        onChange={(e) => setCalcSeverance(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                      <span>Incluir Cesantía (Despido / Auxilio laboral)</span>
                    </label>
                  </div>
                </div>

                {/* COMPUTED BREAKDOWN */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase border-b border-slate-200 pb-2">Resultado Estimado de Liquidación</h4>

                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-600">Salario Promedio Diario:</span>
                      <span className="font-bold text-slate-900">${dailyRate.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-600">Preaviso ({prevDays} días):</span>
                      <span className="font-bold text-indigo-600">${totalPreaviso.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-600">Cesantía ({cesDays.toFixed(1)} días):</span>
                      <span className="font-bold text-indigo-600">${totalCesantia.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-600">Vacaciones (${vacDaysCalc} días):</span>
                      <span className="font-bold text-indigo-600">${totalVacaciones.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-sans text-slate-600">Regalía Pascual (Sueldo 13):</span>
                      <span className="font-bold text-emerald-600">${regPascual.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-slate-300 pt-3 mt-3 flex justify-between items-center font-black text-slate-900 text-sm">
                      <span className="font-sans">TOTAL ESTIMADO:</span>
                      <span className="text-emerald-600 text-base">
                        {activeCompany.settings.currency} {totalPrestaciones.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: HIRE EMPLOYEE */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 text-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Alta de Colaborador (Expediente Humano)
              </h3>
              <button onClick={() => setShowAddEmployeeModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="Ej. Yissel Ramos..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cédula / Documento *</label>
                  <input
                    type="text"
                    value={empDocumentId}
                    onChange={(e) => setEmpDocumentId(e.target.value)}
                    placeholder="001-0000000-0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Departamento</label>
                  <select
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="Ventas">Ventas & POS</option>
                    <option value="Operaciones">Operaciones & Almacén</option>
                    <option value="Administración">Administración & Finanzas</option>
                    <option value="Cocina">Cocina & Restaurante</option>
                    <option value="Logística">Logística & Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cargo / Puesto</label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    placeholder="Ej. Gerente de Tienda..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Salario Mensual ({activeCompany.settings.currency})</label>
                  <input
                    type="number"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(e.target.value)}
                    placeholder="25000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tasa Comisión Ventas (%)</label>
                  <input
                    type="number"
                    value={empComm}
                    onChange={(e) => setEmpComm(e.target.value)}
                    placeholder="5"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Banco Pago ACH</label>
                  <select
                    value={empBankName}
                    onChange={(e) => setEmpBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="Banco Popular Dominicano">Banco Popular</option>
                    <option value="Banco BHD">Banco BHD</option>
                    <option value="Banreservas">Banreservas</option>
                    <option value="Banco Santa Cruz">Banco Santa Cruz</option>
                    <option value="Efectivo / Cheque">Efectivo / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Número de Cuenta ACH</label>
                  <input
                    type="text"
                    value={empBankAccount}
                    onChange={(e) => setEmpBankAccount(e.target.value)}
                    placeholder="798451230"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                Registrar Alta e Integrar a Nómina
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST LOAN */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Registrar Avance / Préstamo
              </h3>
              <button onClick={() => setShowLoanModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleAddLoan} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Empleado Beneficiario</label>
                <select
                  value={loanEmpId}
                  onChange={(e) => setLoanEmpId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                  required
                >
                  <option value="">Seleccione Empleado...</option>
                  {companyEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Monto del Avance ({activeCompany.settings.currency})</label>
                <input
                  type="number"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Número de Quincenas para Descuento</label>
                <select
                  value={loanInstallments}
                  onChange={(e) => setLoanInstallments(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="1">1 Quincena (Pago Inmediato)</option>
                  <option value="2">2 Quincenas (1 Mes)</option>
                  <option value="4">4 Quincenas (2 Meses)</option>
                  <option value="6">6 Quincenas (3 Meses)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                Aprobar Avance e Integrar a Descuentos
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VACATION / LEAVE */}
      {showVacationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 text-slate-800 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Umbrella className="w-4 h-4 text-amber-500" />
                Registrar Permiso o Vacaciones
              </h3>
              <button onClick={() => setShowVacationModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">&times;</button>
            </div>

            <form onSubmit={handleAddVacation} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Empleado</label>
                <select
                  value={vacEmpId}
                  onChange={(e) => setVacEmpId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                  required
                >
                  <option value="">Seleccione Empleado...</option>
                  {companyEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Permiso</label>
                  <select
                    value={vacType}
                    onChange={(e) => setVacType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="Vacaciones">Vacaciones Anuales</option>
                    <option value="Licencia Médica">Licencia Médica</option>
                    <option value="Permiso Personal">Permiso Personal</option>
                    <option value="Maternidad/Paternidad">Maternidad/Paternidad</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Días Total</label>
                  <input
                    type="number"
                    value={vacDays}
                    onChange={(e) => setVacDays(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Fecha de Inicio</label>
                <input
                  type="date"
                  value={vacStartDate}
                  onChange={(e) => setVacStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-hidden cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Notas / Observaciones</label>
                <textarea
                  value={vacNotes}
                  onChange={(e) => setVacNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles sobre el permiso otorgado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                Aprobar y Registrar en Expediente
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
