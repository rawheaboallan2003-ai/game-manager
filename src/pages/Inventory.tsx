import { useState, useMemo, useRef } from "react";
import { useGameStore } from "../store/useGameStore";
import {
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  type Product
} from "../services/storeService";
import {
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  Package,
  Coffee,
  CheckCircle,
  Upload,
  Image as ImageIcon
} from "lucide-react";

export default function Inventory() {
  console.log("[Inventory Component] Rendering or state update triggered...");
  const products = useGameStore((state) => state.products);
  const storeId = useGameStore((state) => state.storeId);

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SEARCH/FILTER ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Inventory analytics
  const analytics = useMemo(() => {
    const totalItems = products.length;
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const projectedProfit = products.reduce((sum, p) => sum + (p.stock * (p.price - p.cost)), 0);
    
    return {
      totalItems,
      lowStockCount,
      totalInventoryValue,
      projectedProfit
    };
  }, [products]);

  // --- IMAGE HANDLING ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("[handleImageSelect] No file selected.");
      return;
    }
    console.log("[handleImageSelect] File chosen:", file.name, "size:", file.size);
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      console.log("[handleImageSelect] FileReader completed. Preview set.");
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    console.log("[clearImage] Clearing image from state...");
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- ACTIONS ---
  const handleOpenCreateModal = () => {
    console.log("[handleOpenCreateModal] Opening product creation modal...");
    setSelectedProduct(null);
    setName("");
    setPrice("");
    setCost("");
    setStock("");
    setMinStock("2");
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    setProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    console.log("[handleOpenEditModal] Opening product editing modal...", product);
    setSelectedProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setCost(product.cost.toString());
    setStock(product.stock.toString());
    setMinStock(product.minStock.toString());
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(product.imageUrl || null);
    setProductModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[handleSubmit] Save button clicked. Validating inputs...");
    if (!name.trim() || !price || !cost || !stock || !minStock) {
      console.warn("[handleSubmit] Validation failed: missing fields.");
      return;
    }

    console.log("[handleSubmit] Activating loader submitting=true");
    setSubmitting(true);

    try {
      let imageUrl: string = existingImageUrl || "";
      console.log("[handleSubmit] Current image state:", { imageFileSelected: !!imageFile, existingImageUrl });

      // Upload new image if selected
      if (imageFile) {
        if (!storeId) {
          throw new Error("Store ID is missing, cannot upload image.");
        }
        console.log("[handleSubmit] Image file detected. Starting upload...");
        imageUrl = await uploadProductImage(imageFile, storeId);
        console.log("[handleSubmit] Image upload succeeded. Link received:", imageUrl);
      }

      // Defensive payload creation
      const data = {
        name: name.trim(),
        price: Number(price) || 0,
        cost: Number(cost) || 0,
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 0,
        imageUrl: imageUrl || "", // Guarantee never undefined
      };

      console.log("[handleSubmit] Ready to save payload to Firestore:", data);

      if (selectedProduct) {
        console.log("[handleSubmit] Edit mode detected. Updating doc ID:", selectedProduct.id);
        await updateProduct(selectedProduct.id, data);
        console.log("[handleSubmit] Update product query completed successfully.");
      } else {
        console.log("[handleSubmit] Create mode detected. Adding product...");
        await addProduct(storeId!, data);
        console.log("[handleSubmit] Add product query completed successfully.");
      }
      
      console.log("[handleSubmit] Closing product modal.");
      setProductModalOpen(false);
    } catch (err: any) {
      console.error("[handleSubmit] Error caught in form submission flow:", err);
      alert("فشل في حفظ المنتج: " + (err?.message || err));
    } finally {
      console.log("[handleSubmit] Deactivating loader in finally block: submitting=false");
      setSubmitting(false);
    }
  };

  const openDeleteConfirm = (productId: string, productName: string) => {
    console.log("[openDeleteConfirm] Triggering custom confirm modal for:", productName);
    setDeleteTargetId(productId);
    setDeleteTargetName(productName);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    console.log("[handleConfirmDelete] Executing delete product for ID:", deleteTargetId);
    setSubmitting(true);
    try {
      await deleteProduct(deleteTargetId);
      console.log("[handleConfirmDelete] Product deleted successfully from Firestore.");
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
    } catch (err: any) {
      console.error("[handleConfirmDelete] Error deleting product:", err);
      alert("فشل في حذف المنتج: " + (err?.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRestock = async (product: Product, amount: number) => {
    console.log("[handleQuickRestock] Quick restock requested for:", product.name, "amount:", amount);
    try {
      await updateProduct(product.id, {
        stock: (Number(product.stock) || 0) + amount
      });
      console.log("[handleQuickRestock] Quick restock query completed successfully.");
    } catch (err: any) {
      console.error("[handleQuickRestock] Error restocking product:", err);
      alert("فشل في إعادة التخزين: " + (err?.message || err));
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Snack & Product Inventory</h1>
          <p className="text-gray-400 mt-1 text-sm">Manage item sales, stock levels, and lounge pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10"
          >
            <Plus size={16} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Items</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">{analytics.totalItems}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-400">
            <Package size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Low Stock alerts</span>
            <h3 className="text-2xl font-extrabold mt-1 timer-text text-amber-400">{analytics.lowStockCount}</h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            analytics.lowStockCount > 0 ? "bg-amber-500/10 border-amber-500/10 text-amber-400 animate-pulse" : "bg-gray-800 border-white/5 text-gray-400"
          }`}>
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Inventory Value</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">₪{analytics.totalInventoryValue.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Projected profit</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">₪{analytics.projectedProfit.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/10 flex items-center justify-center text-purple-400">
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search products by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm shadow-inner"
        />
      </div>

      {/* PRODUCTS DISPLAY LIST */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
          <p className="text-gray-500 text-sm">No items found matching "{searchQuery}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isLowStock = product.stock <= product.minStock;
            return (
              <div
                key={product.id}
                className={`glass-panel rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isLowStock ? "border-amber-500/20 bg-[#16110a]/50" : "border-white/5 hover:border-white/10"
                }`}
              >
                {/* Product Image */}
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-36 object-cover"
                    draggable={false}
                    onError={(e) => {
                      console.warn("[Product Image Load Error] Fallback triggered for:", product.name);
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex items-center justify-center">
                    <Coffee size={36} className="text-gray-700" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide">{product.name}</h4>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        Price: ₪{product.price.toFixed(2)} • Profit: ₪{(product.price - product.cost).toFixed(2)}
                      </p>
                    </div>
                    {isLowStock && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-500/25 text-[9px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <AlertTriangle size={8} />
                        Low Stock
                      </span>
                    )}
                  </div>

                  {/* Stock counter */}
                  <div className="mt-4 flex items-center justify-between text-xs bg-[#0b0f19]/70 p-3 rounded-xl border border-white/5">
                    <span className="text-gray-500 font-semibold">Stock Level</span>
                    <span className={`font-extrabold text-sm timer-text ${isLowStock ? "text-amber-400" : "text-white"}`}>
                      {product.stock} units
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleQuickRestock(product, 10)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold transition-all border border-white/5"
                        title="Quick Restock +10"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleQuickRestock(product, 25)}
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold transition-all border border-white/5"
                        title="Quick Restock +25"
                      >
                        +25
                      </button>
                    </div>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
                        title="Edit Item"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(product.id, product.name)}
                        className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-all"
                        title="Delete Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmOpen(false)} aria-hidden="true" />
          <div className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center mx-auto">
                <Trash2 size={24} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white mb-1">حذف المنتج؟</h3>
                <p className="text-sm text-gray-400">
                  هل أنت متأكد من حذف{" "}
                  <span className="text-white font-bold">{deleteTargetName}</span>؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold rounded-xl text-sm transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={submitting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} />
                  {submitting ? "جاري الحذف..." : "نعم، احذف"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT PRODUCT MODAL --- */}
      {productModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setProductModalOpen(false)} aria-hidden="true" />
          <div className="relative glass-panel w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {selectedProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </h2>
              <button onClick={() => setProductModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Product Image Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">صورة المنتج</label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-white/10 overflow-hidden flex items-center justify-center bg-[#0b0f19] flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : existingImageUrl ? (
                      <img src={existingImageUrl} alt="Current" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload size={13} />
                      {imagePreview || existingImageUrl ? "تغيير الصورة" : "رفع صورة"}
                    </button>
                    {(imagePreview || existingImageUrl) && (
                      <button
                        type="button"
                        onClick={() => { clearImage(); setExistingImageUrl(null); }}
                        className="w-full px-4 py-1.5 text-[10px] text-red-400 hover:text-red-300 transition-all"
                      >
                        إزالة الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">اسم المنتج</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كوكاكولا 330مل"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">سعر الشراء (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    required
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">سعر البيع (₪)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.05"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">المخزون الحالي</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">حد التنبيه</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg disabled:opacity-40"
              >
                {submitting ? "جاري الحفظ..." : selectedProduct ? "حفظ التعديلات" : "تسجيل المنتج"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
