import React, { useState } from "react";
import { 
  Cpu, Plus, Package, Check, ClipboardList, 
  Settings, AlertTriangle, ArrowRight, Play, CheckCircle, Trash2
} from "lucide-react";
import { Company, Product, Warehouse } from "../types";

interface Ingredient {
  rawMaterialId: string;
  qty: number; // qty required for 1 unit of finished product
}

interface Recipe {
  id: string;
  companyId: string;
  name: string;
  finishedProductId: string;
  ingredients: Ingredient[];
}

interface ManufactureOrder {
  id: string;
  recipeId: string;
  recipeName: string;
  qty: number;
  date: string;
  status: "pending" | "completed";
  warehouseId: string;
}

interface ManufactureModuleProps {
  activeCompany: Company;
  products: Product[];
  warehouses: Warehouse[];
  onUpdateProducts: (productsList: Product[]) => void;
  onAddAudit: (action: string, details: string, prev?: string, newVal?: string) => void;
}

export default function ManufactureModule({
  activeCompany,
  products,
  warehouses,
  onUpdateProducts,
  onAddAudit
}: ManufactureModuleProps) {
  // Filter products for active company
  const companyProducts = products.filter(p => p.companyId === activeCompany.id);
  const rawMaterials = companyProducts.filter(p => p.category === "Insumos" || p.price === 0);
  const finishedProducts = companyProducts.filter(p => p.price > 0);

  // Active warehouses for selection
  const companyWarehouses = warehouses.filter(w => w.branchId === "br_super_main" || w.branchId === "br_bistro_main" || w.branchId === "br_boutique_main");

  // Local state for recipes
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem(`pos_recipes_${activeCompany.id}`);
    return saved ? JSON.parse(saved) : [
      { id: "rec_pasta_alfredo", companyId: activeCompany.id, name: "Receta Fettuccine Alfredo con Pollo", finishedProductId: "prod_bistro_pasta", ingredients: [{ rawMaterialId: "prod_bistro_raw_meat", qty: 0.25 }] }
    ];
  });

  // Local state for Manufacture Orders
  const [orders, setOrders] = useState<ManufactureOrder[]>(() => {
    const saved = localStorage.getItem(`pos_mfg_orders_${activeCompany.id}`);
    return saved ? JSON.parse(saved) : [
      { id: "mfg_1", recipeId: "rec_pasta_alfredo", recipeName: "Receta Fettuccine Alfredo con Pollo", qty: 20, date: new Date().toISOString(), status: "completed", warehouseId: "wh_bistro_kitchen" }
    ];
  });

  // Creation States
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [recipeName, setRecipeName] = useState("");
  const [recipeFinishedProduct, setRecipeFinishedProduct] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState<{ rawId: string; qty: string }[]>([
    { rawId: "", qty: "1" }
  ]);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderRecipeId, setOrderRecipeId] = useState("");
  const [orderQty, setOrderQty] = useState("10");
  const [orderWarehouseId, setOrderWarehouseId] = useState("");

  // Add ingredient line to recipe modal
  const handleAddIngredientLine = () => {
    setRecipeIngredients([...recipeIngredients, { rawId: "", qty: "1" }]);
  };

  // Remove line
  const handleRemoveIngredientLine = (idx: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== idx));
  };

  // Save recipe
  const handleSaveRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeName || !recipeFinishedProduct || recipeIngredients.some(ri => !ri.rawId || parseFloat(ri.qty) <= 0)) {
      alert("Por favor complete todos los datos requeridos.");
      return;
    }

    const newRec: Recipe = {
      id: "rec_" + Math.random().toString(36).slice(2, 9),
      companyId: activeCompany.id,
      name: recipeName.trim(),
      finishedProductId: recipeFinishedProduct,
      ingredients: recipeIngredients.map(ri => ({
        rawMaterialId: ri.rawId,
        qty: parseFloat(ri.qty)
      }))
    };

    const updated = [...recipes, newRec];
    setRecipes(updated);
    localStorage.setItem(`pos_recipes_${activeCompany.id}`, JSON.stringify(updated));

    onAddAudit(
      "Crear Receta",
      `Fórmula de producción "${newRec.name}" creada con ${newRec.ingredients.length} insumos de manufactura.`
    );

    setRecipeName("");
    setRecipeFinishedProduct("");
    setRecipeIngredients([{ rawId: "", qty: "1" }]);
    setShowRecipeModal(false);
    alert("Receta de producción guardada correctamente.");
  };

  // Dispatch manufacturing order (Consume raw, increment finished product)
  const handleProcessOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const recipe = recipes.find(r => r.id === orderRecipeId);
    const qty = parseInt(orderQty);
    const whId = orderWarehouseId || "default_wh";

    if (!recipe || isNaN(qty) || qty <= 0) {
      alert("Por favor rellene los datos correctamente.");
      return;
    }

    // Verify stock availability
    let hasStockDeficit = false;
    const deficits: string[] = [];

    recipe.ingredients.forEach(ing => {
      const p = products.find(prod => prod.id === ing.rawMaterialId);
      const stockAvailable = p?.stock?.[whId] || 0;
      const totalNeeded = ing.qty * qty;
      if (stockAvailable < totalNeeded) {
        hasStockDeficit = true;
        deficits.push(`${p?.name || ing.rawMaterialId} (Necesita ${totalNeeded}, Tiene ${stockAvailable})`);
      }
    });

    if (hasStockDeficit) {
      alert(`No hay stock suficiente de materias primas para fabricar esta cantidad:\n- ${deficits.join("\n- ")}`);
      return;
    }

    // Consume stock and increment finished product
    const updatedProductsList = products.map((prod) => {
      if (!prod.stock) prod.stock = {};
      const newStock = { ...prod.stock };

      // Deduct raw ingredients
      const ingMatch = recipe.ingredients.find(ing => ing.rawMaterialId === prod.id);
      if (ingMatch) {
        newStock[whId] = (newStock[whId] || 0) - (ingMatch.qty * qty);
        return { ...prod, stock: newStock };
      }

      // Add finished product
      if (prod.id === recipe.finishedProductId) {
        newStock[whId] = (newStock[whId] || 0) + qty;
        return { ...prod, stock: newStock };
      }

      return prod;
    });

    onUpdateProducts(updatedProductsList);

    // Save order
    const newOrder: ManufactureOrder = {
      id: "mfg_" + Math.random().toString(36).slice(2, 9),
      recipeId: recipe.id,
      recipeName: recipe.name,
      qty: qty,
      date: new Date().toISOString(),
      status: "completed",
      warehouseId: whId
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem(`pos_mfg_orders_${activeCompany.id}`, JSON.stringify(updatedOrders));

    onAddAudit(
      "Orden de Producción",
      `Manufactura ejecutada con éxito para ${qty} unidades de "${products.find(p => p.id === recipe.finishedProductId)?.name}".`
    );

    setOrderRecipeId("");
    setOrderQty("10");
    setShowOrderModal(false);
    alert(`Orden de fabricación procesada correctamente. Se han descontado los insumos y cargado ${qty} unidades al producto terminado.`);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50" id="manufacture-root">
      
      {/* Subheader */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-3xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Manufactura y Producción</h2>
            <p className="text-[10px] text-slate-400 font-medium">Gestione fórmulas y recetas (BOM), configure consumo de insumos y lance órdenes de fabricación en masa.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowRecipeModal(true)}
            className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-slate-200 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Crear Fórmula / Receta
          </button>
          <button
            onClick={() => {
              if (recipes.length === 0) {
                alert("Primero debe crear al menos una receta para fabricar.");
                return;
              }
              setShowOrderModal(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Lanzar Producción (Orden)
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Recipes & BOM Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recipes Card List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs lg:col-span-1 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">Recetas & Fórmulas (Filtro BOM)</h3>
            
            <div className="divide-y divide-slate-150 overflow-y-auto max-h-[360px] space-y-3.5 pr-1">
              {recipes.map((rec) => {
                const finProd = products.find(p => p.id === rec.finishedProductId);
                return (
                  <div key={rec.id} className="pt-3 first:pt-0 space-y-2">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">{rec.name}</span>
                      <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        Produce: {finProd?.name || "No definido"}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[10px] space-y-1">
                      <span className="font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Insumos Requeridos (Por Unidad)</span>
                      {rec.ingredients.map((ing) => {
                        const raw = products.find(p => p.id === ing.rawMaterialId);
                        return (
                          <div key={ing.rawMaterialId} className="flex justify-between text-slate-600">
                            <span>{raw?.name || ing.rawMaterialId}</span>
                            <span className="font-mono font-bold">{ing.qty} {raw?.unit || "unid"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {recipes.length === 0 && (
                <p className="text-center py-10 text-slate-400 italic">No hay recetas definidas para manufacturar.</p>
              )}
            </div>
          </div>

          {/* Manufacturing Orders History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-3xs lg:col-span-2 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">Bitácora de Órdenes de Producción Procesadas</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">ID Orden</th>
                    <th className="p-3">Receta Fabricada</th>
                    <th className="p-3">Cantidad Producida</th>
                    <th className="p-3">Fecha de Producción</th>
                    <th className="p-3 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-[10px] font-bold text-indigo-600">#{ord.id}</td>
                      <td className="p-3 font-bold">{ord.recipeName}</td>
                      <td className="p-3 font-semibold">{ord.qty} unidades</td>
                      <td className="p-3 text-slate-400">{new Date(ord.date).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Stock Cargado
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400 italic">Ninguna orden de producción registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL: CREAR FÓRMULA / RECETA */}
      {showRecipeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleSaveRecipe} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Settings className="w-5 h-5 text-indigo-600" />
              Crear Nueva Fórmula / Receta (BOM)
            </h3>
            <p className="text-[11px] text-slate-400">
              Configure la proporción exacta de insumos necesarios para fabricar una unidad de un producto terminado. El stock se deducirá automáticamente al procesar órdenes de producción.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Nombre de la Receta *</label>
                <input
                  type="text"
                  required
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500 font-semibold text-slate-800"
                  placeholder="Ej. Receta de Hamburguesas"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Producto Terminado a Producir *</label>
                <select
                  required
                  value={recipeFinishedProduct}
                  onChange={(e) => setRecipeFinishedProduct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-hidden text-slate-800 font-bold"
                >
                  <option value="">Seleccione Producto Terminado...</option>
                  {finishedProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* INGREDIENTS LIST */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Insumos y Proporciones (Materia Prima)</span>
                <button
                  type="button"
                  onClick={handleAddIngredientLine}
                  className="bg-indigo-50 text-indigo-600 text-[10px] font-bold px-2 py-1 rounded-md hover:bg-indigo-100 cursor-pointer"
                >
                  + Añadir Insumo
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recipeIngredients.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      required
                      value={line.rawId}
                      onChange={(e) => {
                        const updated = [...recipeIngredients];
                        updated[idx].rawId = e.target.value;
                        setRecipeIngredients(updated);
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold"
                    >
                      <option value="">Seleccione Insumo / Materia Prima...</option>
                      {rawMaterials.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="any"
                      required
                      value={line.qty}
                      onChange={(e) => {
                        const updated = [...recipeIngredients];
                        updated[idx].qty = e.target.value;
                        setRecipeIngredients(updated);
                      }}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center focus:outline-hidden"
                      placeholder="Cantidad"
                    />

                    {recipeIngredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientLine(idx)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 cursor-pointer flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowRecipeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Guardar Receta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: LANZAR ORDEN DE FABRICACIÓN */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form onSubmit={handleProcessOrder} className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Play className="w-5 h-5 text-indigo-600" />
              Lanzar Nueva Orden de Producción
            </h3>
            <p className="text-[11px] text-slate-400">
              Descuente inmediatamente los insumos necesarios de su stock de almacén y cargue los productos terminados terminados.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">Seleccione Receta *</label>
              <select
                required
                value={orderRecipeId}
                onChange={(e) => setOrderRecipeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
              >
                <option value="">Seleccione Receta...</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Cantidad a Fabricar *</label>
                <input
                  type="number"
                  required
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-center text-slate-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Almacén Destino *</label>
                <select
                  required
                  value={orderWarehouseId}
                  onChange={(e) => setOrderWarehouseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                >
                  <option value="">Seleccione Almacén...</option>
                  {companyWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Procesar Fabricación (BOM)
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
