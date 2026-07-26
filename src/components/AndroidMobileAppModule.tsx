import React, { useState, useEffect } from "react";
import JSZip from "jszip";
import { 
  Smartphone, ShoppingCart, Package, BarChart3, Users, 
  Wallet, Truck, Utensils, ClipboardList, ShieldAlert, 
  Search, Plus, Check, RefreshCw, Layers, ArrowRight,
  Code, Terminal, Download, Zap, CheckCircle2, AlertTriangle,
  Coins, CreditCard, Play, Copy, Lock, Eye, Building2, User,
  FileCode, Cpu, QrCode, BookOpen, CalendarClock, Landmark,
  Award, Globe, Settings, MapPin, Bot, Send
} from "lucide-react";
import { Company, User as AppUser, Branch, Product, Sale, Customer, Expense } from "../types";

interface AndroidMobileAppModuleProps {
  activeCompany: Company;
  currentUser: AppUser;
  activeBranch: Branch;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  onAddSale: (saleData: any) => void;
  onAddExpense: (expenseData: any) => void;
  onUpdateProductStock: (productId: string, newStock: number) => void;
  onAddAudit: (action: string, details: string) => void;
}

export default function AndroidMobileAppModule({
  activeCompany,
  currentUser,
  activeBranch,
  products,
  customers,
  sales,
  expenses,
  onAddSale,
  onAddExpense,
  onUpdateProductStock,
  onAddAudit
}: AndroidMobileAppModuleProps) {
  // Mobile Layout View Mode
  const [frameMode, setFrameMode] = useState<"phone" | "fullscreen">("phone");
  const [activeMobileTab, setActiveMobileTab] = useState<string>("dashboard");

  // Mobile POS State
  const [mobileCart, setMobileCart] = useState<{ product: Product; qty: number }[]>([]);
  const [mobileSearch, setMobileSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [mobilePaymentMethod, setMobilePaymentMethod] = useState("Efectivo");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Mobile Inventory adjustment state
  const [inventorySearch, setInventorySearch] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState("");

  // Mobile Expense State
  const [expenseConcept, setExpenseConcept] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Insumos");

  // Mobile Customer State
  const [customerSearch, setCustomerSearch] = useState("");

  // Mobile Restaurant State
  const [selectedTable, setSelectedTable] = useState("Mesa 1");
  const [tableOrders, setTableOrders] = useState<Record<string, { name: string; qty: number }[]>>({
    "Mesa 1": [{ name: "Café Espresso", qty: 2 }, { name: "Sandwich de Jamón", qty: 1 }],
    "Mesa 2": [{ name: "Jugo Natural", qty: 3 }],
  });

  // Mobile Fiscal e-CF State
  const [ecfLogs, setEcfLogs] = useState<string[]>([]);
  const [isGeneratingEcf, setIsGeneratingEcf] = useState(false);

  // Mobile Payroll State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // API Tester States
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Filter products for active company
  const companyProducts = products.filter((p) => p.companyId === activeCompany.id);
  const categories = ["Todos", ...Array.from(new Set(companyProducts.map((p) => p.category)))];

  const filteredProducts = companyProducts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(mobileSearch.toLowerCase()) ||
      p.barcode.includes(mobileSearch) ||
      p.sku.toLowerCase().includes(mobileSearch.toLowerCase());
    const matchesCat = selectedCategory === "Todos" || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // POS Cart Handlers
  const addToMobileCart = (product: Product) => {
    setMobileCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setMobileCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setMobileCart((prev) =>
        prev.map((i) => (i.product.id === productId ? { ...i, qty: newQty } : i))
      );
    }
  };

  const cartTotal = mobileCart.reduce((sum, i) => sum + i.product.price * i.qty, 0);

  const handleCompleteMobileSale = () => {
    if (mobileCart.length === 0) return;

    const saleData = {
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      userId: currentUser.id,
      date: new Date().toISOString(),
      items: mobileCart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        price: i.product.price,
        cost: i.product.cost,
        qty: i.qty,
        discount: 0,
        tax: 0.18
      })),
      total: cartTotal,
      discount: 0,
      tax: cartTotal * 0.18,
      paymentMethod: mobilePaymentMethod,
      notes: "Venta realizada desde App Móvil Kotlin Android"
    };

    onAddSale(saleData);
    onAddAudit("Venta Móvil Kotlin", `Cobro de $${cartTotal.toFixed(2)} vía Android App`);

    setMobileCart([]);
    setShowCheckoutModal(false);
    alert(`¡Venta procesada con éxito en la App Kotlin!\nMonto: $${cartTotal.toFixed(2)}\nMétodo: ${mobilePaymentMethod}`);
  };

  const handleSaveExpense = () => {
    if (!expenseConcept || !expenseAmount) {
      alert("Ingrese concepto y monto del gasto.");
      return;
    }
    const numAmount = parseFloat(expenseAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onAddExpense({
      companyId: activeCompany.id,
      branchId: activeBranch.id,
      date: new Date().toISOString(),
      description: expenseConcept,
      category: expenseCategory,
      amount: numAmount,
      paymentMethod: "Efectivo",
      registeredBy: currentUser.name
    });

    onAddAudit("Gasto Móvil", `Registro de gasto: ${expenseConcept} por $${numAmount} desde Android`);

    setExpenseConcept("");
    setExpenseAmount("");
    alert("Gasto registrado correctamente en el servidor.");
  };

  // e-CF Generation Simulation
  const handleGenerateEcfMobile = () => {
    setIsGeneratingEcf(true);
    setEcfLogs(["Iniciando firma electrónica en Kotlin...", "Generando payload XML DGII..."]);
    
    setTimeout(() => {
      const trackId = `TRK-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      setEcfLogs((prev) => [
        ...prev,
        "XML firmado con certificado X.509.",
        `Aceptado por la DGII. TrackID: ${trackId}`,
        "e-CF Emitido y registrado correctamente."
      ]);
      setIsGeneratingEcf(false);
      onAddAudit("Emisión e-CF Móvil", `Comprobante electrónico e-CF emitido desde Android (${trackId})`);
    }, 1200);
  };

  // API Tester
  const handleTestApi = async (endpoint: string) => {
    try {
      const res = await fetch(`${endpoint}?companyId=${activeCompany.id}`);
      const data = await res.json();
      setApiResponse(data);
    } catch (e: any) {
      setApiResponse({ error: "Error al conectar con la API", details: e.message });
    }
  };

  // Kotlin Code Snippet Copy
  const copyAndroidCodeSnippet = () => {
    const code = `// Kotlin Android Native Code - ApiService & Retrofit
package com.pos.mobile.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Body
import retrofit2.http.Query

data class Product(val id: String, val name: String, val price: Double, val stock: Map<String, Double>?)
data class ActiveModulesResponse(val activeModules: List<String>, val companyName: String)

interface PosApiService {
    @GET("api/flutter/modules")
    suspend fun getActiveModules(@Query("companyId") companyId: String): ActiveModulesResponse

    @GET("api/flutter/products")
    suspend fun getProducts(@Query("companyId") companyId: String): Map<String, List<Product>>

    @POST("api/flutter/sales")
    suspend fun submitSale(@Body salePayload: Map<String, Any>): Map<String, Any>
}

object RetrofitClient {
    private const val BASE_URL = "${window.location.origin}/"
    val instance: PosApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PosApiService::class.java)
    }
}`;
    navigator.clipboard.writeText(code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  // Native Kotlin Jetpack Compose Zip Generator
  const handleDownloadKotlinProject = async () => {
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const hostUrl = window.location.origin;
      const activeModsList = activeCompany.activeModules.map((m) => `"${m}"`).join(", ");
      const safeCompanyName = activeCompany.name.replace(/"/g, "");

      // 1. root build.gradle.kts
      zip.file("build.gradle.kts", `plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
}`);

      // 2. settings.gradle.kts
      zip.file("settings.gradle.kts", `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOSITORIES)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "KotlinPosApp"
include(":app")
`);

      // 3. app/build.gradle.kts
      zip.file("app/build.gradle.kts", `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "com.pos.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.pos.mobile"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Retrofit & Gson
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
`);

      // 4. AndroidManifest.xml
      zip.file("app/src/main/AndroidManifest.xml", `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="POS Móvil - ${safeCompanyName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@android:style/Theme.Material.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`);

      // 5. MainActivity.kt
      zip.file("app/src/main/java/com/pos/mobile/MainActivity.kt", `package com.pos.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.pos.mobile.ui.PosAppNavigation

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    PosAppNavigation(
                        baseUrl = "${hostUrl}",
                        companyId = "${activeCompany.id}"
                    )
                }
            }
        }
    }
}
`);

      // 6. Data models & API Service
      zip.file("app/src/main/java/com/pos/mobile/data/ModelsAndApi.kt", `package com.pos.mobile.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Body
import retrofit2.http.Query

data class ProductModel(
    val id: String,
    val name: String,
    val price: Double,
    val cost: Double,
    val category: String,
    val barcode: String?
)

data class ActiveModulesResponse(
    val companyName: String,
    val activeModules: List<String>
)

interface PosApiService {
    @GET("api/flutter/modules")
    suspend fun getActiveModules(@Query("companyId") companyId: String): ActiveModulesResponse

    @GET("api/flutter/products")
    suspend fun getProducts(@Query("companyId") companyId: String): Map<String, List<ProductModel>>

    @POST("api/flutter/sales")
    suspend fun submitSale(@Body salePayload: Map<String, Any>): Map<String, Any>

    @POST("api/flutter/expenses")
    suspend fun submitExpense(@Body expensePayload: Map<String, Any>): Map<String, Any>
}

object ApiClient {
    fun create(baseUrl: String): PosApiService {
        val safeUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return Retrofit.Builder()
            .baseUrl(safeUrl)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PosApiService::class.java)
    }
}
`);

      // 7. Compose Navigation & Module Screens
      zip.file("app/src/main/java/com/pos/mobile/ui/PosAppNavigation.kt", `package com.pos.mobile.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.pos.mobile.data.ApiClient
import com.pos.mobile.data.ActiveModulesResponse

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PosAppNavigation(baseUrl: String, companyId: String) {
    var activeTab by remember { mutableStateOf("dashboard") }
    var moduleResponse by remember { mutableStateOf<ActiveModulesResponse?>(null) }
    var isLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        try {
            val api = ApiClient.create(baseUrl)
            moduleResponse = api.getActiveModules(companyId)
        } catch (e: Exception) {
            // Fallback default modules
        } finally {
            isLoading = false
        }
    }

    val activeModules = moduleResponse?.activeModules ?: listOf(${activeModsList})

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(moduleResponse?.companyName ?: "${safeCompanyName}") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        bottomBar = {
            ScrollableTabRow(
                selectedTabIndex = getTabIndex(activeTab, activeModules),
                edgePadding = 8.dp
            ) {
                Tab(
                    selected = activeTab == "dashboard",
                    onClick = { activeTab = "dashboard" },
                    text = { Text("Inicio") },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) }
                )
                if (activeModules.contains("pos")) {
                    Tab(
                        selected = activeTab == "pos",
                        onClick = { activeTab = "pos" },
                        text = { Text("POS") },
                        icon = { Icon(Icons.Default.ShoppingCart, contentDescription = null) }
                    )
                }
                if (activeModules.contains("inventario")) {
                    Tab(
                        selected = activeTab == "inventario",
                        onClick = { activeTab = "inventario" },
                        text = { Text("Stock") },
                        icon = { Icon(Icons.Default.Build, contentDescription = null) }
                    )
                }
                if (activeModules.contains("clientes")) {
                    Tab(
                        selected = activeTab == "clientes",
                        onClick = { activeTab = "clientes" },
                        text = { Text("Clientes") },
                        icon = { Icon(Icons.Default.Person, contentDescription = null) }
                    )
                }
                if (activeModules.contains("gastos")) {
                    Tab(
                        selected = activeTab == "gastos",
                        onClick = { activeTab = "gastos" },
                        text = { Text("Gastos") },
                        icon = { Icon(Icons.Default.AccountBox, contentDescription = null) }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues).fillMaxSize()) {
            if (isLoading) {
                CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
            } else {
                when (activeTab) {
                    "dashboard" -> DashboardScreen(companyName = moduleResponse?.companyName ?: "${safeCompanyName}", activeModules = activeModules)
                    "pos" -> PosModuleScreen()
                    "inventario" -> InventoryModuleScreen()
                    "clientes" -> CustomersModuleScreen()
                    "gastos" -> ExpensesModuleScreen()
                    else -> DashboardScreen(companyName = moduleResponse?.companyName ?: "${safeCompanyName}", activeModules = activeModules)
                }
            }
        }
    }
}

private fun getTabIndex(tab: String, modules: List<String>): Int {
    var index = 0
    if (tab == "dashboard") return index
    index++
    if (modules.contains("pos")) { if (tab == "pos") return index; index++ }
    if (modules.contains("inventario")) { if (tab == "inventario") return index; index++ }
    if (modules.contains("clientes")) { if (tab == "clientes") return index; index++ }
    if (modules.contains("gastos")) { if (tab == "gastos") return index; index++ }
    return 0
}

@Composable
fun DashboardScreen(companyName: String, activeModules: List<String>) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(text = "Empresa: " + companyName, style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(8.dp))
        Text(text = "Módulos Activos Habilitados (" + activeModules.size + "):", style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(8.dp))
        activeModules.forEach { mod ->
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                Text(text = "✓ " + mod, modifier = Modifier.padding(12.dp))
            }
        }
    }
}

@Composable fun PosModuleScreen() { Column(modifier = Modifier.padding(16.dp)) { Text("Venta POS Móvil Touch", style = MaterialTheme.typography.titleLarge) } }
@Composable fun InventoryModuleScreen() { Column(modifier = Modifier.padding(16.dp)) { Text("Inventario y Stock en Tiempo Real", style = MaterialTheme.typography.titleLarge) } }
@Composable fun CustomersModuleScreen() { Column(modifier = Modifier.padding(16.dp)) { Text("Directorio de Clientes & Crédito", style = MaterialTheme.typography.titleLarge) } }
@Composable fun ExpensesModuleScreen() { Column(modifier = Modifier.padding(16.dp)) { Text("Registro Express de Gastos", style = MaterialTheme.typography.titleLarge) } }
`);

      // Generate Zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `app_movil_kotlin_${activeCompany.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onAddAudit("Descarga Código Kotlin", `Proyecto Android Studio Nativo en Kotlin generado para ${activeCompany.name}`);
    } catch (e: any) {
      alert(`Error al generar zip: ${e.message}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // Define dynamic tabs based on active Company Modules
  const availableTabs = [
    { id: "dashboard", label: "Inicio", icon: BarChart3, alwaysShow: true },
    { id: "pos", label: "POS", icon: ShoppingCart, moduleKey: "pos" },
    { id: "inventario", label: "Stock", icon: Package, moduleKey: "inventario" },
    { id: "clientes", label: "Clientes", icon: Users, moduleKey: "clientes" },
    { id: "gastos", label: "Gastos", icon: Wallet, moduleKey: "gastos" },
    { id: "caja_avanzada", label: "Caja", icon: Landmark, moduleKey: "caja_avanzada" },
    { id: "contabilidad", label: "Contab", icon: BookOpen, moduleKey: "contabilidad" },
    { id: "restaurante", label: "Salón", icon: Utensils, moduleKey: "restaurante" },
    { id: "facturacion_fiscal", label: "e-CF", icon: ShieldAlert, moduleKey: "facturacion_fiscal" },
    { id: "nomina", label: "Nómina", icon: CalendarClock, moduleKey: "nomina" },
    { id: "reportes", label: "Métricas", icon: BarChart3, moduleKey: "reportes" },
    { id: "api", label: "API Kotlin", icon: Code, alwaysShow: true }
  ];

  // Active tabs filtered by company modules
  const activeTabsList = availableTabs.filter((t) => {
    if (t.alwaysShow) return true;
    return activeCompany.activeModules.includes(t.moduleKey!);
  });

  return (
    <div className="space-y-6" id="android-kotlin-mobile-app-module">
      
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl text-indigo-300 shrink-0">
              <Smartphone className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-xl md:text-2xl tracking-tight text-white">
                  App Móvil Nativa en Kotlin (Android)
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Android Native API v2.0
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-1">
                Versión compacta sincronizada con los módulos activos del negocio ({activeCompany.name}) mediante arquitectura Kotlin Android REST.
              </p>
            </div>
          </div>

          {/* View Mode Switches */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700/60 shrink-0">
            <button
              onClick={() => setFrameMode("phone")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                frameMode === "phone" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Vista Teléfono Kotlin</span>
            </button>
            <button
              onClick={() => setFrameMode("fullscreen")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                frameMode === "fullscreen" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Modo Táctil Extendido</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kotlin Project Generator Panel */}
      <div className="bg-white border-2 border-indigo-500/30 rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-800 rounded-2xl shrink-0">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-lg">Proyecto Android Studio Nativo en Kotlin (Jetpack Compose)</h2>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Kotlin 2.0 + Material3
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Genera el proyecto completo para Android Studio con Jetpack Compose y lectura dinámica de módulos activos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleDownloadKotlinProject}
              disabled={isDownloadingZip}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingZip ? "Generando Código Kotlin..." : "Descargar Proyecto Kotlin Android (.zip)"}</span>
            </button>
          </div>
        </div>

        {/* 3 Steps to run Kotlin App */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-extrabold">
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]">1</div>
              <span>Descomprimir Zip Kotlin</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Descargas la estructura lista para Android Studio con Gradle (`build.gradle.kts`), `MainActivity.kt`, `ModelsAndApi.kt` y pantallas Jetpack Compose.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-extrabold">
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]">2</div>
              <span>Abrir en Android Studio</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Abre la carpeta en Android Studio, haz Sync con Gradle y ejecuta el emulador o dispositivo físico con el botón <strong>Run 'app'</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700 font-extrabold">
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-[10px]">3</div>
              <span>Lectura Dinámica de Módulos</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              La App Kotlin lee los módulos activos del negocio (ID: <strong>{activeCompany.id}</strong>) habilitando automáticamente las pestañas correspondientes.
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Android Device Frame */}
        <div className={`w-full ${frameMode === "phone" ? "lg:w-[420px]" : "lg:w-full"} shrink-0 transition-all duration-300 mx-auto`}>
          <div className={`${frameMode === "phone" ? "bg-slate-900 border-[8px] border-slate-800 rounded-[40px] shadow-2xl p-3" : "bg-white border border-slate-200 rounded-3xl p-4 shadow-md"}`}>
            
            {/* Phone Speaker Notch */}
            {frameMode === "phone" && (
              <div className="w-32 h-4 bg-slate-800 mx-auto rounded-b-xl mb-2 flex items-center justify-center gap-1.5">
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
                <div className="w-2 h-2 bg-slate-700 rounded-full" />
              </div>
            )}

            {/* Android Screen Header Bar */}
            <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between text-xs mb-3 border border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-indigo-300">
                  {activeCompany.name} (Kotlin App)
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>KOTLIN 2.0</span>
              </div>
            </div>

            {/* Dynamic Navigation Top Tabs based on Active Modules */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl mb-3 overflow-x-auto text-xs no-scrollbar">
              {activeTabsList.map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeMobileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveMobileTab(tab.id)}
                    className={`flex-1 min-w-[65px] py-2 px-2 rounded-xl font-bold text-[10px] transition-all flex flex-col items-center gap-1 cursor-pointer shrink-0 ${
                      isActive ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* SCREEN BODY CONTENT */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 min-h-[460px] flex flex-col justify-between">
              
              {/* TAB: DASHBOARD */}
              {activeMobileTab === "dashboard" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-md space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">Kotlin Terminal Móvil</span>
                    <h2 className="font-black text-lg">{currentUser.name}</h2>
                    <div className="flex justify-between items-center text-[11px] text-indigo-100 pt-1 border-t border-indigo-500/40">
                      <span>Rol: {currentUser.role}</span>
                      <span>Sucursal: {activeBranch.name}</span>
                    </div>
                  </div>

                  {/* Active Business Modules Compact Grid */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Módulos Activos Habilitados ({activeCompany.activeModules.length})
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {activeCompany.activeModules.map((modKey) => {
                        const tabConfig = availableTabs.find((t) => t.moduleKey === modKey);
                        if (!tabConfig) return null;
                        const IconComp = tabConfig.icon;
                        return (
                          <div
                            key={modKey}
                            onClick={() => setActiveMobileTab(modKey)}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 cursor-pointer hover:border-indigo-500 transition-all"
                          >
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-slate-800 text-[11px]">{tabConfig.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fast Mobile Business Summary */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-700 block">Resumen en Tiempo Real</span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Ventas Totales</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          ${sales.filter((s) => s.companyId === activeCompany.id).reduce((sum, s) => sum + s.total, 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[10px]">Gastos Registrados</span>
                        <span className="font-extrabold text-rose-600 text-sm">
                          ${expenses.filter((e) => e.companyId === activeCompany.id).reduce((sum, e) => sum + e.amount, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: POS */}
              {activeMobileTab === "pos" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Escanear o buscar producto..."
                      value={mobileSearch}
                      onChange={(e) => setMobileSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 cursor-pointer transition-all ${
                          selectedCategory === cat ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {filteredProducts.slice(0, 10).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => addToMobileCart(p)}
                        className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-[11px] leading-snug">{p.name}</p>
                          <p className="text-[10px] text-slate-400">Cod: {p.barcode || p.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-indigo-600 block">${p.price.toFixed(2)}</span>
                          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Tocar +</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>Carrito ({mobileCart.reduce((s, i) => s + i.qty, 0)} items)</span>
                      <span className="text-indigo-600 font-extrabold text-sm">${cartTotal.toFixed(2)}</span>
                    </div>

                    {mobileCart.length > 0 && (
                      <div className="max-h-20 overflow-y-auto space-y-1 text-[11px] border-t border-slate-100 pt-1.5">
                        {mobileCart.map((item) => (
                          <div key={item.product.id} className="flex items-center justify-between">
                            <span className="truncate max-w-[140px] text-slate-700">{item.product.name}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => updateCartItemQty(item.product.id, item.qty - 1)} className="w-4 h-4 bg-slate-100 text-slate-600 rounded font-bold flex items-center justify-center">-</button>
                              <span className="font-bold text-xs">{item.qty}</span>
                              <button onClick={() => updateCartItemQty(item.product.id, item.qty + 1)} className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded font-bold flex items-center justify-center">+</button>
                              <span className="font-bold text-slate-900 ml-1">${(item.product.price * item.qty).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      disabled={mobileCart.length === 0}
                      onClick={() => setShowCheckoutModal(true)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Cobrar Móvil (${cartTotal.toFixed(2)})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB: INVENTARIO */}
              {activeMobileTab === "inventario" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre o código..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                    {companyProducts
                      .filter((p) => p.name.toLowerCase().includes(inventorySearch.toLowerCase()) || p.barcode.includes(inventorySearch))
                      .slice(0, 10)
                      .map((p) => {
                        const mainStock = p.stock ? (typeof p.stock === "number" ? p.stock : (Object.values(p.stock)[0] || 0)) : 0;
                        const isEditing = editingProductId === p.id;

                        return (
                          <div key={p.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{p.name}</span>
                                <span className="text-[10px] text-slate-400">Cod: {p.barcode || p.sku}</span>
                              </div>
                              <span className="font-extrabold text-indigo-600">${p.price.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[11px]">
                              <span>Stock Actual: <strong>{mainStock} uds</strong></span>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editStockValue}
                                    onChange={(e) => setEditStockValue(e.target.value)}
                                    className="w-14 px-1.5 py-0.5 border border-indigo-400 rounded bg-white text-xs font-bold"
                                  />
                                  <button
                                    onClick={() => {
                                      const num = parseFloat(editStockValue);
                                      if (!isNaN(num)) {
                                        onUpdateProductStock(p.id, num);
                                        onAddAudit("Ajuste Móvil Kotlin", `Ajuste stock ${p.name} a ${num} unidades`);
                                      }
                                      setEditingProductId(null);
                                    }}
                                    className="bg-emerald-600 text-white px-2 py-0.5 rounded font-bold text-[10px]"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingProductId(p.id);
                                    setEditStockValue(String(mainStock));
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100"
                                >
                                  Ajustar Stock
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB: CLIENTES */}
              {activeMobileTab === "clientes" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-amber-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                    <span className="font-extrabold text-xs">Directorio Móvil de Clientes</span>
                    <p className="text-[10px] text-amber-200">Consulta de crédito y estado de cuenta</p>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 text-xs">
                    {customers.filter((c) => c.companyId === activeCompany.id).map((c) => (
                      <div key={c.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-extrabold text-slate-800 text-[11px]">{c.name}</p>
                            <p className="text-[10px] text-slate-400">RNC/Cédula: {c.rncOrCedula || "N/A"}</p>
                          </div>
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded">
                            Límite: ${c.creditLimit || 50000}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">Teléfono: {c.phone || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: GASTOS */}
              {activeMobileTab === "gastos" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2.5">
                    <span className="font-bold text-slate-800 text-xs block">Registrar Gasto Rápido Móvil</span>
                    <div className="space-y-2 text-xs">
                      <input
                        type="text"
                        placeholder="Concepto del gasto (ej: Gasolina delivery)..."
                        value={expenseConcept}
                        onChange={(e) => setExpenseConcept(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                      />
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Monto ($)..."
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                        />
                        <select
                          value={expenseCategory}
                          onChange={(e) => setExpenseCategory(e.target.value)}
                          className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                        >
                          <option value="Insumos">Insumos</option>
                          <option value="Transporte">Transporte</option>
                          <option value="Servicios">Servicios</option>
                          <option value="Caja Chica">Caja Chica</option>
                        </select>
                      </div>
                      <button
                        onClick={handleSaveExpense}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Guardar Gasto en Servidor</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Historial Reciente</span>
                    {expenses.filter((e) => e.companyId === activeCompany.id).slice(-4).reverse().map((e) => (
                      <div key={e.id} className="bg-white p-2 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 text-[11px]">{e.description}</p>
                          <p className="text-[9px] text-slate-400">Cat: {e.category}</p>
                        </div>
                        <span className="font-extrabold text-rose-600">${e.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: CAJA */}
              {activeMobileTab === "caja_avanzada" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                    <span className="font-extrabold text-xs">Apertura y Balance de Caja</span>
                    <p className="text-[10px] text-slate-300">Turno Activo: {currentUser.name}</p>
                  </div>

                  <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Efectivo en Caja:</span>
                      <strong className="text-emerald-600 font-mono">$15,450.00</strong>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Ventas en Tarjeta:</span>
                      <strong className="text-indigo-600 font-mono">$28,900.00</strong>
                    </div>
                    <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
                      <span>Total Recaudado:</span>
                      <strong className="text-slate-900 font-mono text-sm">$44,350.00</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: CONTABILIDAD */}
              {activeMobileTab === "contabilidad" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-indigo-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                    <span className="font-extrabold text-xs">Catálogo Contable Sincronizado</span>
                    <p className="text-[10px] text-indigo-200">Saldos contables en tiempo real</p>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-xs">
                    {[
                      { code: "1.1.01", name: "Caja General y Efectivo", type: "Activo", bal: 150000 },
                      { code: "1.1.02", name: "Banco Comercial", type: "Activo", bal: 345000.5 },
                      { code: "1.1.04", name: "Inventarios", type: "Activo", bal: 520000 },
                      { code: "2.1.01", name: "Cuentas por Pagar Proveedores", type: "Pasivo", bal: 110000 }
                    ].map((acc, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <p className="font-mono font-bold text-indigo-600 text-[10px]">{acc.code}</p>
                          <p className="font-extrabold text-slate-800 text-[11px]">{acc.name}</p>
                        </div>
                        <span className="font-mono font-extrabold text-slate-900 text-[11px]">${acc.bal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: RESTAURANTE */}
              {activeMobileTab === "restaurante" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-purple-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                    <span className="font-extrabold text-xs">Comandero de Mesas Móvil</span>
                    <p className="text-[10px] text-purple-200">Envío directo de comandas a cocina</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setSelectedTable(m)}
                        className={`p-3 rounded-xl border text-left font-bold transition-all ${
                          selectedTable === m ? "bg-purple-600 text-white border-purple-600 shadow-sm" : "bg-white text-slate-800 border-slate-200"
                        }`}
                      >
                        <span className="block text-[11px]">{m}</span>
                        <span className="text-[9px] font-normal opacity-80">
                          {tableOrders[m] ? `${tableOrders[m].length} pedidos` : "Disponible"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: FACTURACIÓN FISCAL E-CF */}
              {activeMobileTab === "facturacion_fiscal" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 space-y-1">
                    <span className="font-extrabold text-xs">Emisión Móvil e-CF (DGII)</span>
                    <p className="text-[10px] text-slate-400">Comprobantes Electrónicos Serie E31/E32</p>
                  </div>

                  <button
                    onClick={handleGenerateEcfMobile}
                    disabled={isGeneratingEcf}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>{isGeneratingEcf ? "Emitiendo e-CF..." : "Emitir Comprobante e-CF"}</span>
                  </button>

                  {ecfLogs.length > 0 && (
                    <div className="bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] space-y-1 max-h-32 overflow-y-auto">
                      {ecfLogs.map((log, idx) => (
                        <p key={idx} className="text-emerald-400">✓ {log}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: NÓMINA */}
              {activeMobileTab === "nomina" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-sky-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                    <span className="font-extrabold text-xs">Control de Asistencia de Personal</span>
                    <p className="text-[10px] text-sky-200">Empleado: {currentUser.name}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsCheckedIn(!isCheckedIn);
                      setCheckInTime(new Date().toLocaleTimeString());
                      onAddAudit("Fichaje Móvil", `${isCheckedIn ? "Entrada" : "Salida"} de ${currentUser.name}`);
                    }}
                    className={`w-full py-3 rounded-xl font-extrabold text-xs shadow-md transition-all text-white ${
                      isCheckedIn ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {isCheckedIn ? "Registrar Salida de Jornada" : "Registrar Entrada de Jornada"}
                  </button>

                  {checkInTime && (
                    <p className="text-[10px] text-slate-500 text-center font-mono">
                      Último registro: {checkInTime}
                    </p>
                  )}
                </div>
              )}

              {/* TAB: REPORTES */}
              {activeMobileTab === "reportes" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-sm space-y-1">
                    <span className="font-extrabold text-xs">Métricas Claves del Negocio</span>
                    <p className="text-[10px] text-slate-400">Consolidado general de operaciones</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Ventas Hoy</span>
                      <strong className="text-slate-900 text-sm font-black">
                        ${sales.filter((s) => s.companyId === activeCompany.id).reduce((sum, s) => sum + s.total, 0).toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 block">Transacciones</span>
                      <strong className="text-indigo-600 text-sm font-black">
                        {sales.filter((s) => s.companyId === activeCompany.id).length} ops
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: API KOTLIN */}
              {activeMobileTab === "api" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-300">Endpoint API Kotlin</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono">
                        HTTPS OK
                      </span>
                    </div>
                    <p className="text-[10px] font-mono bg-slate-950 p-2 rounded-xl text-slate-300 border border-slate-800 break-all select-all">
                      https://{window.location.host}/api/flutter/
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Probar API en Vivo:</span>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <button onClick={() => handleTestApi("/api/flutter/modules")} className="p-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl font-bold text-slate-700 text-left">
                        GET /modules
                      </button>
                      <button onClick={() => handleTestApi("/api/flutter/products")} className="p-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl font-bold text-slate-700 text-left">
                        GET /products
                      </button>
                      <button onClick={() => handleTestApi("/api/flutter/reports")} className="p-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl font-bold text-slate-700 text-left">
                        GET /reports
                      </button>
                      <button onClick={() => handleTestApi("/api/flutter/expenses")} className="p-2 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl font-bold text-slate-700 text-left">
                        GET /expenses
                      </button>
                    </div>
                  </div>

                  {apiResponse && (
                    <div className="bg-slate-950 text-slate-200 p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] max-h-32 overflow-y-auto">
                      <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Status Footer */}
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span>Kotlin Android OS</span>
                <span>UUID: {activeCompany.id}</span>
              </div>
            </div>

          </div>
        </div>

        {/* API REST TECHNICAL DOCUMENTATION PANEL */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Documentación de la API para App Android Native en Kotlin</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conectores Retrofit / Coroutines para sincronizar ventas, catálogo, clientes e inventario desde cualquier teléfono o terminal Android POS.
                </p>
              </div>
              <button
                onClick={copyAndroidCodeSnippet}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSnippet ? "¡Código Copiado!" : "Copiar Snippet Kotlin"}</span>
              </button>
            </div>

            {/* List of endpoints */}
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase">POST</span>
                    <span className="font-mono font-bold text-slate-900">/api/flutter/login</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Autentica operador con PIN de seguridad y valida empresa ({activeCompany.name}).
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">JSON Body</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase">GET</span>
                    <span className="font-mono font-bold text-slate-900">/api/flutter/modules?companyId={activeCompany.id}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Obtiene el listado dinámico de módulos activos habilitados para la empresa.
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">JSON Array</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase">GET</span>
                    <span className="font-mono font-bold text-slate-900">/api/flutter/products?companyId={activeCompany.id}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Descarga catálogo completo con precios, stock por almacén y códigos de barra para escáner móvil.
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">JSON Array</span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-md uppercase">POST</span>
                    <span className="font-mono font-bold text-slate-900">/api/flutter/sales</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">
                    Somete transacciones de cobro en tiempo real con emisión automática de NCF / e-CF fiscal.
                  </p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">Sync Auto</span>
              </div>
            </div>

            {/* Quick Connection Credentials Box */}
            <div className="bg-indigo-950 text-white p-4 rounded-2xl border border-indigo-900 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-indigo-300">Parámetros de Configuración del Negocio</span>
                <span className="text-[10px] text-slate-400">Ambiente de Producción</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Company ID</span>
                  <span className="font-bold text-amber-300 truncate block">{activeCompany.id}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Branch ID</span>
                  <span className="font-bold text-sky-300 truncate block">{activeBranch.id}</span>
                </div>
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 text-[10px] block">Moneda Activa</span>
                  <span className="font-bold text-emerald-400">{activeCompany.settings?.currency || "DOP"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHECKOUT MODAL IN MOBILE TERMINAL */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Cobro Móvil Kotlin</h3>
                <p className="text-xs text-slate-500">Móvil Terminal ({activeCompany.name})</p>
              </div>
              <span className="font-black text-lg text-indigo-600">${cartTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Método de Pago:</label>
              <div className="grid grid-cols-2 gap-2">
                {["Efectivo", "Tarjeta", "Pago Contra Entrega", "Crédito"].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMobilePaymentMethod(m)}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-xs cursor-pointer ${
                      mobilePaymentMethod === m ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteMobileSale}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                Completar Cobro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
