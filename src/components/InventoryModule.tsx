import React, { useState } from "react";
import { 
  Plus, ArrowLeftRight, Wrench, AlertTriangle, 
  PackageOpen, Sparkles, TrendingUp, HelpCircle, 
  Trash2, RefreshCw, Layers, CheckCircle2, Search, ArrowUpRight, ArrowDownRight,
  Upload, Image as ImageIcon, X
} from "lucide-react";
import { Product, Warehouse, Branch } from "../types";

interface InventoryModuleProps {
  activeCompany: any;
  activeBranch: Branch;
  products: Product[];
  warehouses: Warehouse[];
  onUpdateProducts: (prods: Product[]) => void;
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
  isOnline: boolean;
  currentUser: any;
}

export default function InventoryModule({
  activeCompany,
  activeBranch,
  products,
  warehouses,
  onUpdateProducts,
  onAddAudit,
  isOnline,
  currentUser
}: InventoryModuleProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState<'in' | 'out'>('in');
  const [adjustmentReason, setAdjustmentReason] = useState<string>("Reabastecimiento");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  // Transfer stock state
  const [transferQty, setTransferQty] = useState<string>("");
  const [transferFromWh, setTransferFromWh] = useState<string>("");
  const [transferToWh, setTransferToWh] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");

  // Custom categories states
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem(`pos_categories_${activeCompany.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    const defaults = ["Abarrotes", "Bebidas", "Lácteos", "Carnes y Embutidos", "Frutas y Verduras", "Limpieza", "Ferretería", "Otros"];
    const productCats = products
      .filter((p) => p.companyId === activeCompany.id)
      .map((p) => p.category)
      .filter(Boolean);
    return Array.from(new Set([...defaults, ...productCats]));
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");

  // New Product Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdBarcode, setNewProdBarcode] = useState("");
  const [newProdCategory, setNewProdCategory] = useState(() => {
    return categories[0] || "Otros";
  });
  const [newProdUnit, setNewProdUnit] = useState("Unidades");
  const [newProdCost, setNewProdCost] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdMinStock, setNewProdMinStock] = useState("5");
  const [newProdWhStock, setNewProdWhStock] = useState<Record<string, string>>({});
  const [newProdImage, setNewProdImage] = useState<string>("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen no debe superar los 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateSelectedImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProduct) {
      if (file.size > 5 * 1024 * 1024) {
        alert("La imagen no debe superar los 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imgData = reader.result as string;
        const updatedProducts = products.map((p) => {
          if (p.id === selectedProduct.id) {
            return { ...p, image: imgData };
          }
          return p;
        });
        onUpdateProducts(updatedProducts);
        setSelectedProduct({ ...selectedProduct, image: imgData });
      };
      reader.readAsDataURL(file);
    }
  };

  // Sync categories on activeCompany change or initial render
  React.useEffect(() => {
    const saved = localStorage.getItem(`pos_categories_${activeCompany.id}`);
    let currentCats: string[] = [];
    if (saved) {
      try {
        currentCats = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    if (currentCats.length === 0) {
      currentCats = ["Abarrotes", "Bebidas", "Lácteos", "Carnes y Embutidos", "Frutas y Verduras", "Limpieza", "Ferretería", "Otros"];
    }
    const productCats = products
      .filter((p) => p.companyId === activeCompany.id)
      .map((p) => p.category)
      .filter(Boolean);
    const combined = Array.from(new Set([...currentCats, ...productCats]));
    setCategories(combined);
    if (combined.length > 0) {
      setNewProdCategory(combined[0]);
    }
  }, [activeCompany.id]);

  const saveCategories = (updatedCats: string[]) => {
    setCategories(updatedCats);
    localStorage.setItem(`pos_categories_${activeCompany.id}`, JSON.stringify(updatedCats));
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      alert("Ingrese un nombre de categoría válido.");
      return;
    }
    if (categories.includes(trimmed)) {
      alert("La categoría ya existe.");
      return;
    }
    const updated = [...categories, trimmed];
    saveCategories(updated);
    setNewCategoryName("");
    onAddAudit(
      "Crear Categoría",
      `Nueva categoría de inventario registrada: "${trimmed}"`
    );
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      alert("Ingrese un nombre de categoría válido.");
      return;
    }
    if (oldName === trimmedNew) {
      setEditingCategory(null);
      return;
    }
    if (categories.includes(trimmedNew) && trimmedNew !== oldName) {
      alert("La categoría ya existe.");
      return;
    }

    const updatedCats = categories.map((c) => (c === oldName ? trimmedNew : c));
    saveCategories(updatedCats);

    // Update all matching products
    const updatedProducts = products.map((p) => {
      if (p.companyId === activeCompany.id && p.category === oldName) {
        return { ...p, category: trimmedNew };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    // If newProdCategory is currently the old category, update it
    if (newProdCategory === oldName) {
      setNewProdCategory(trimmedNew);
    }

    setEditingCategory(null);
    onAddAudit(
      "Modificar Categoría",
      `Se modificó la categoría de inventario "${oldName}" a "${trimmedNew}".`
    );
  };

  const handleDeleteCategory = (catName: string) => {
    if (!confirm(`¿Está seguro de eliminar la categoría "${catName}"? Los productos de esta categoría se reasignarán a "Otros".`)) {
      return;
    }

    const updatedCats = categories.filter((c) => c !== catName);
    // Make sure "Otros" is in the categories list
    if (!updatedCats.includes("Otros")) {
      updatedCats.push("Otros");
    }
    saveCategories(updatedCats);

    // Reassign products to "Otros"
    const updatedProducts = products.map((p) => {
      if (p.companyId === activeCompany.id && p.category === catName) {
        return { ...p, category: "Otros" };
      }
      return p;
    });
    onUpdateProducts(updatedProducts);

    if (newProdCategory === catName) {
      setNewProdCategory("Otros");
    }

    onAddAudit(
      "Eliminar Categoría",
      `Se eliminó la categoría de inventario "${catName}". Productos reasignados a "Otros".`
    );
  };

  const companyProducts = products.filter((p) => p.companyId === activeCompany.id);
  const companyWarehouses = warehouses.filter((wh) => {
    // we show warehouses belonging to branches of this company
    const branchIds = [activeBranch.id]; // we can restrict to active branch or show all
    return wh.branchId === activeBranch.id;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser.role === "Cajero") {
      alert("Su rol no dispone de permisos para crear nuevos productos.");
      return;
    }

    if (!newProdName.trim()) {
      alert("Ingrese el nombre del producto.");
      return;
    }

    const priceNum = parseFloat(newProdPrice) || 0;
    const costNum = parseFloat(newProdCost) || 0;
    const minStockNum = parseFloat(newProdMinStock) || 0;

    const finalSku = newProdSku.trim() || "SKU-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalBarcode = newProdBarcode.trim() || String(Math.floor(100000000000 + Math.random() * 900000000000));

    const initialStock: Record<string, number> = {};
    companyWarehouses.forEach((wh) => {
      initialStock[wh.id] = parseFloat(newProdWhStock[wh.id] || "0") || 0;
    });

    const newProduct: Product = {
      id: "prod_local_" + Math.random().toString(36).substring(2, 9),
      companyId: activeCompany.id,
      name: newProdName,
      sku: finalSku,
      barcode: finalBarcode,
      category: newProdCategory,
      unit: newProdUnit,
      cost: costNum,
      price: priceNum,
      minStock: minStockNum,
      maxStock: minStockNum * 10,
      stock: initialStock,
      isWeighable: newProdUnit.toLowerCase() === "libras" || newProdUnit.toLowerCase() === "kilogramos",
      isSerialized: false,
      image: newProdImage || undefined
    };

    const updated = [newProduct, ...products];
    onUpdateProducts(updated);

    onAddAudit(
      "Crear Producto",
      `Nuevo producto registrado: "${newProduct.name}" (SKU: ${newProduct.sku}, Categoría: ${newProduct.category}). Precio: $${priceNum.toFixed(2)}. Existencia inicial cargada.`
    );

    // Reset fields
    setNewProdName("");
    setNewProdSku("");
    setNewProdBarcode("");
    setNewProdCategory(categories[0] || "Otros");
    setNewProdUnit("Unidades");
    setNewProdCost("");
    setNewProdPrice("");
    setNewProdMinStock("5");
    setNewProdWhStock({});
    setNewProdImage("");
    setShowAddModal(false);

    alert("¡Producto creado con éxito!");
  };

  const handleStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    // Check permission
    if (currentUser.role === "Cajero") {
      alert("Su rol de Cajero no cuenta con permisos para ajustar inventario.");
      return;
    }

    const qty = parseFloat(adjustmentQty) || 0;
    const whId = selectedWarehouse || companyWarehouses[0]?.id;

    if (qty <= 0 || !whId) {
      alert("Ingrese una cantidad válida y seleccione un almacén.");
      return;
    }

    // Clone products and update
    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const nextStock = { ...p.stock };
        if (!nextStock[whId]) nextStock[whId] = 0;
        
        const previousQty = nextStock[whId];
        if (adjustmentType === "in") {
          nextStock[whId] += qty;
        } else {
          nextStock[whId] = Math.max(0, nextStock[whId] - qty);
        }

        onAddAudit(
          "Ajuste de Inventario",
          `Ajuste manual (${adjustmentType === "in" ? "Entrada" : "Salida"}) para ${p.name}. Cantidad ajustada: ${qty} ${p.unit}. Motivo: ${adjustmentReason}. Almacén: ${whId}`,
          `Cantidad anterior: ${previousQty}`,
          `Cantidad nueva: ${nextStock[whId]}`
        );

        return { ...p, stock: nextStock };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);
    
    // update local modal product
    const updatedSelected = updatedProducts.find((p) => p.id === selectedProduct.id);
    if (updatedSelected) setSelectedProduct(updatedSelected);

    // reset inputs
    setAdjustmentQty("");
    alert("Inventario ajustado con éxito!");
  };

  const handleStockTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (currentUser.role === "Cajero") {
      alert("Su rol no dispone de permisos para realizar transferencias.");
      return;
    }

    const qty = parseFloat(transferQty) || 0;
    if (qty <= 0 || !transferFromWh || !transferToWh) {
      alert("Complete todos los campos del formulario de transferencia.");
      return;
    }

    if (transferFromWh === transferToWh) {
      alert("El almacén de origen y destino no pueden ser el mismo.");
      return;
    }

    const currentOriginStock = selectedProduct.stock[transferFromWh] || 0;
    if (currentOriginStock < qty) {
      alert(`Stock insuficiente en el almacén de origen. Disponible: ${currentOriginStock}`);
      return;
    }

    const updatedProducts = products.map((p) => {
      if (p.id === selectedProduct.id) {
        const nextStock = { ...p.stock };
        if (!nextStock[transferFromWh]) nextStock[transferFromWh] = 0;
        if (!nextStock[transferToWh]) nextStock[transferToWh] = 0;

        nextStock[transferFromWh] -= qty;
        nextStock[transferToWh] += qty;

        onAddAudit(
          "Transferencia de Almacén",
          `Transferencia de ${p.name} por ${qty} ${p.unit} desde Almacén ID ${transferFromWh} hacia Almacén ID ${transferToWh}`
        );

        return { ...p, stock: nextStock };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);
    const updatedSelected = updatedProducts.find((p) => p.id === selectedProduct.id);
    if (updatedSelected) setSelectedProduct(updatedSelected);

    setTransferQty("");
    alert("Transferencia de inventario ejecutada!");
  };

  const getProductTotalStock = (p: Product) => {
    return Object.values(p.stock || {}).reduce((a, b) => a + (b as number), 0);
  };

  const filteredProducts = companyProducts.filter((p) => {
    return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 text-slate-800" id="inventory-module-root">
      
      {/* LEFT: PRODUCTS TABLE AND ALERTS */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4" id="inventory-table-section">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg text-slate-950 flex items-center gap-2">
              <PackageOpen className="w-5 h-5 text-sky-600 animate-pulse" />
              Catálogo e Inventario de Productos
            </h2>
            <p className="text-xs text-slate-500 mt-1">Vea existencias físicas consolidadas o realice ajustes manuales en tiempo real.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-hidden focus:border-sky-500 shadow-xs"
                id="input-inventory-search"
              />
            </div>

            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
              id="btn-trigger-manage-categories"
            >
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Gestionar Categorías</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-transform active:scale-98 cursor-pointer shrink-0"
              id="btn-trigger-add-product"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Agregar Producto</span>
            </button>
          </div>
        </div>

        {/* LOW STOCK CRITICAL PANELS BAR */}
        {companyProducts.some(p => getProductTotalStock(p) <= p.minStock && p.price > 0) && (
          <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
              <div>
                <span>¡Atención de Compras! Existen productos por debajo del stock mínimo.</span>
                <p className="text-[10px] text-rose-600 font-normal mt-0.5">Esto podría ocasionar pérdidas en ventas del POS si opera de forma estricta.</p>
              </div>
            </div>
            <div className="flex gap-2 text-[10px] font-bold">
              <div className="bg-rose-500 text-white px-2.5 py-1 rounded">
                CRÍTICO ({companyProducts.filter(p => getProductTotalStock(p) <= p.minStock && p.price > 0).length})
              </div>
            </div>
          </div>
        )}

        {/* TABLE GRID */}
        <div className="flex-1 bg-white rounded-2xl shadow-xs border border-slate-200/75 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Categoría</th>
                  <th className="p-3 text-right">Costo Promedio</th>
                  <th className="p-3 text-right">Precio Venta</th>
                  <th className="p-3 text-center">Margen</th>
                  <th className="p-3 text-center">Existencia Consolidada</th>
                  <th className="p-3 text-center">Medida</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const totalStock = getProductTotalStock(p);
                  const isLow = totalStock <= p.minStock;
                  const margin = p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0;

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${selectedProduct?.id === p.id ? "bg-sky-50/30 font-medium" : ""}`}
                    >
                      <td className="p-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-500">{p.sku}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        {p.cost > 0 ? `$${p.cost.toFixed(2)}` : "—"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-950">
                        {p.price > 0 ? `$${p.price.toFixed(2)}` : "Materia Prima"}
                      </td>
                      <td className="p-3 text-center font-mono">
                        {p.price > 0 ? (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            {margin.toFixed(0)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-md font-bold font-mono text-xs ${
                          isLow && p.price > 0
                            ? "bg-rose-50 text-rose-600" 
                            : "bg-emerald-50 text-emerald-600"
                        }`}>
                          {totalStock}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-500">{p.unit}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedProduct(p);
                            setSelectedWarehouse(companyWarehouses[0]?.id || "");
                            setTransferFromWh(companyWarehouses[0]?.id || "");
                            setTransferToWh(companyWarehouses[1]?.id || "");
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Ajustar / Ver Almacén
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: SELECTED PRODUCT DETAILS & MANUAL FORMS */}
      {selectedProduct && (
        <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto p-5 shrink-0 space-y-5 animate-in slide-in-from-right duration-300" id="inventory-adjust-panel">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Ajustes & Auditorías</h3>
              <p className="text-[10.5px] text-slate-400 mt-0.5">Control de movimientos de stock</p>
            </div>
            <button
              onClick={() => setSelectedProduct(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cerrar
            </button>
          </div>

          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">Producto Seleccionado</span>
            <h4 className="font-bold text-sm text-slate-950 mt-1">{selectedProduct.name}</h4>
            <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {selectedProduct.sku} | Barcode: {selectedProduct.barcode}</div>
          </div>

          {/* PRODUCT IMAGE SECTION */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
            <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block font-semibold">Imagen del Producto</span>
            {selectedProduct.image ? (
              <div className="relative w-full h-36 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="max-h-full max-w-full object-contain" />
                <label className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-xs cursor-pointer flex items-center gap-1 shadow-md">
                  <Upload className="w-3 h-3" />
                  <span>Cambiar Imagen</span>
                  <input type="file" accept="image/*" onChange={handleUpdateSelectedImage} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="w-full border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50/20">
                <ImageIcon className="w-6 h-6 text-indigo-400 mb-1" />
                <span className="text-xs font-bold text-slate-700">Cargar Foto Directamente</span>
                <span className="text-[10px] text-slate-400">Se mostrará en POS y Catálogo Web</span>
                <input type="file" accept="image/*" onChange={handleUpdateSelectedImage} className="hidden" />
              </label>
            )}
          </div>

          {/* STOCK BY WAREHOUSE BREAKDOWN */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
            <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block mb-2 font-semibold">Existencia Desglosada por Almacén</span>
            <div className="space-y-1.5">
              {companyWarehouses.map((wh) => (
                <div key={wh.id} className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{wh.name}</span>
                  <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200/50 px-2 py-0.5 rounded">
                    {selectedProduct.stock[wh.id] || 0} {selectedProduct.unit}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>TOTAL CONSOLIDADO:</span>
                <span className="font-mono">
                  {getProductTotalStock(selectedProduct)} {selectedProduct.unit}
                </span>
              </div>
            </div>
          </div>

          {/* FORM 1: MANUAL ADJUSTMENT */}
          <form onSubmit={handleStockAdjustment} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3.5">
            <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block mb-1">Ajustar Existencia Manualmente</span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAdjustmentType("in")}
                className={`py-1.5 rounded-lg font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                  adjustmentType === "in" 
                    ? "bg-emerald-600 text-white border-emerald-600" 
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Entrada</span>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType("out")}
                className={`py-1.5 rounded-lg font-bold border flex items-center justify-center gap-1 cursor-pointer ${
                  adjustmentType === "out" 
                    ? "bg-rose-600 text-white border-rose-600" 
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Salida</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Cantidad</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono"
                  id="input-adjustment-qty"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Almacén Destino</label>
                <select
                  value={selectedWarehouse}
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                  id="select-adjustment-wh"
                >
                  {companyWarehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Concepto / Motivo</label>
              <select
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg text-xs px-2 py-1.5 cursor-pointer"
                id="select-adjustment-reason"
              >
                <option value="Reabastecimiento">Reabastecimiento de Compra</option>
                <option value="Merma">Merma o Desperdicio</option>
                <option value="Dañado">Producto Dañado o Vencido</option>
                <option value="Consumo Interno">Consumo Interno o Muestras</option>
                <option value="Conteo Físico">Ajuste de Auditoría Física</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-xs font-bold transition-all cursor-pointer"
              id="btn-submit-adjustment"
            >
              Aplicar Ajuste de Existencia
            </button>
          </form>

          {/* FORM 2: TRANSFER STOCK (IF MORE THAN 1 WAREHOUSE) */}
          {companyWarehouses.length > 1 && (
            <form onSubmit={handleStockTransfer} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block mb-1">Traspasar entre Almacenes</span>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Cantidad a Traspasar</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Origen</label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => setTransferFromWh(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1"
                  >
                    {companyWarehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Destino</label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-1.5 py-1"
                  >
                    {companyWarehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>{wh.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Ejecutar Traspaso Interno
              </button>
            </form>
          )}

        </div>
      )}

      {/* ADD NEW PRODUCT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800" id="add-product-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full border border-slate-150 flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-indigo-600" />
                Registrar Nuevo Producto
              </h3>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Form Container with scroll */}
            <form onSubmit={handleCreateProduct} className="space-y-4 flex-1 overflow-y-auto pr-1">
              
              {/* Product Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Arroz Selecto Campo 10 Lb"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                    id="new-prod-name"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Código SKU (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. ARR-CAM-10"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                    id="new-prod-sku"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Código de Barras (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 746123456789"
                    value={newProdBarcode}
                    onChange={(e) => setNewProdBarcode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                    id="new-prod-barcode"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Categoría</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer font-medium"
                    id="new-prod-category"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Unidad de Medida (Multi-Negocio)</label>
                  <select
                    value={newProdUnit}
                    onChange={(e) => setNewProdUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500 cursor-pointer font-semibold"
                    id="new-prod-unit"
                  >
                    <optgroup label="📦 Conteo y Empaque">
                      <option value="Unidades">Unidades (ud)</option>
                      <option value="Piezas">Piezas (pz)</option>
                      <option value="Cajas">Cajas (cj)</option>
                      <option value="Paquetes">Paquetes (pq)</option>
                      <option value="Docenas">Docenas (doc)</option>
                      <option value="Pares">Pares (par)</option>
                      <option value="Kits">Kits (kt)</option>
                      <option value="Sets">Sets (set)</option>
                      <option value="Bultos">Bultos (bt)</option>
                      <option value="Sacos">Sacos (sc)</option>
                      <option value="Fardos">Fardos (fd)</option>
                      <option value="Latas">Latas (lt)</option>
                      <option value="Botellas">Botellas (bot)</option>
                      <option value="Cajas Master">Cajas Master (cm)</option>
                    </optgroup>
                    
                    <optgroup label="⚖️ Peso y Masa">
                      <option value="Libras">Libras (lb - Pesable)</option>
                      <option value="Kilogramos">Kilogramos (kg - Pesable)</option>
                      <option value="Gramos">Gramos (g)</option>
                      <option value="Onzas">Onzas (oz)</option>
                      <option value="Quintales">Quintales (q)</option>
                      <option value="Toneladas">Toneladas (t)</option>
                    </optgroup>
                    
                    <optgroup label="🧪 Volumen y Líquidos">
                      <option value="Litros">Litros (L)</option>
                      <option value="Mililitros">Mililitros (ml)</option>
                      <option value="Galones">Galones (gal)</option>
                      <option value="Onzas Fluidas">Onzas Fluidas (fl oz)</option>
                      <option value="Barriles">Barriles (bbl)</option>
                    </optgroup>
                    
                    <optgroup label="📏 Longitud y Superficie">
                      <option value="Metros">Metros (m)</option>
                      <option value="Centímetros">Centímetros (cm)</option>
                      <option value="Pulgadas">Pulgadas (in)</option>
                      <option value="Pies">Pies (ft)</option>
                      <option value="Yardas">Yardas (yd)</option>
                      <option value="Metros Cuadrados">Metros Cuadrados (m²)</option>
                      <option value="Metros Cúbicos">Metros Cúbicos (m³)</option>
                    </optgroup>

                    <optgroup label="⏱️ Servicios y Tiempo">
                      <option value="Servicios">Servicios (srv)</option>
                      <option value="Horas">Horas (hrs)</option>
                      <option value="Días">Días (días)</option>
                      <option value="Meses">Meses (mes)</option>
                    </optgroup>
                  </select>
                </div>

              </div>

              {/* Product Image File Upload */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Imagen del Producto (Cargar archivo)</span>
                </label>

                {newProdImage ? (
                  <div className="relative w-full h-32 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center group">
                    <img src={newProdImage} alt="Vista previa" className="max-h-full max-w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setNewProdImage("")}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow-md transition-all cursor-pointer"
                      title="Quitar imagen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-white rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50/20">
                    <Upload className="w-6 h-6 text-indigo-500 mb-1" />
                    <span className="text-xs font-bold text-slate-700">Cargar imagen desde su equipo</span>
                    <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, WEBP (Directo sin URL)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                      id="new-prod-image-file"
                    />
                  </label>
                )}
              </div>

              {/* Pricing and Costs */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Costo Compra ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="0.00"
                    value={newProdCost}
                    onChange={(e) => setNewProdCost(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    id="new-prod-cost"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Precio Venta ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="0.00"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    id="new-prod-price"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Stock Mínimo *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProdMinStock}
                    onChange={(e) => setNewProdMinStock(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 font-semibold"
                    id="new-prod-minstock"
                  />
                </div>
              </div>

              {/* Initial Warehouses Quantities */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Existencia Inicial por Almacén</label>
                <div className="grid grid-cols-2 gap-2">
                  {companyWarehouses.map((wh) => (
                    <div key={wh.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate">{wh.name}</div>
                        <div className="text-[9px] text-slate-400 truncate">ID: {wh.id}</div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newProdWhStock[wh.id] || ""}
                        onChange={(e) => {
                          setNewProdWhStock({
                            ...newProdWhStock,
                            [wh.id]: e.target.value
                          });
                        }}
                        className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold cursor-pointer text-center font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 cursor-pointer text-center"
                >
                  Guardar Producto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CATEGORIES MANAGEMENT MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 text-slate-800 animate-in fade-in duration-150" id="categories-manage-modal">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-slate-150 flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl animate-pulse">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-950">Gestión de Categorías</h3>
                  <p className="text-[10px] text-slate-500">Cree, edite o elimine las categorías del catálogo</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Create Category Form */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 font-semibold">Nueva Categoría</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. Tecnología, Repuestos, etc."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-hidden focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm shadow-indigo-600/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Categorías Existentes ({categories.length})</label>
              
              {categories.map((cat) => (
                <div 
                  key={cat} 
                  className="flex items-center justify-between p-2 bg-white border border-slate-150 rounded-xl hover:border-slate-300 transition-all gap-2"
                >
                  {editingCategory === cat ? (
                    <div className="flex-1 flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden focus:bg-white focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameCategory(cat, editingCategoryValue)}
                        className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all cursor-pointer font-bold text-xs flex items-center justify-center"
                        title="Guardar"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="p-1 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-all cursor-pointer text-xs"
                        title="Cancelar"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-slate-800 pl-1">{cat}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setEditingCategoryValue(cat);
                          }}
                          className="p-1 bg-slate-50 text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-all cursor-pointer"
                          title="Modificar"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 bg-slate-50 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                          title="Eliminar"
                          disabled={cat === "Otros"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer text-center transition-all"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
