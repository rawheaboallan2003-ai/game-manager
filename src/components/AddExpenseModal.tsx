import React, { useState } from "react";
import { addExpense } from "../services/storeService";
import { useGameStore } from "../store/useGameStore";
import { Receipt, X, DollarSign, Tag, CheckCircle } from "lucide-react";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_CATEGORIES = [
  "كهرباء ⚡",
  "إنترنت 🌐",
  "أجار عامل 👷",
  "سعر بضاعة 📦",
  "ديون ومستحقات 💳",
  "صيانة وإصلاح 🔧",
  "ضيافة ونظافة 🧹",
];

export default function AddExpenseModal({ isOpen, onClose }: AddExpenseModalProps) {
  const storeId = useGameStore((state) => state.storeId);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      setError("يرجى إدخال الخدمة/البيان والمبلغ بشكل صحيح");
      return;
    }
    if (!storeId) {
      setError("خطأ: لم يتم تحديد المتجر");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addExpense(storeId, {
        description: description.trim(),
        amount: parseFloat(amount),
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setDescription("");
        setAmount("");
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشل في تسجيل المصروف");
    } finally {
      setSubmitting(false);
    }
  };

  const selectPreset = (preset: string) => {
    setDescription(preset);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative glass-panel w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تسجيل مصروف جديد</h2>
              <p className="text-xs text-gray-400">إضافة المصاريف التشغيلية (كهرباء، نت، أجار، بضاعة...)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* ALERT STATUS */}
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-200 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-extrabold text-white">تم تسجيل المصروف بنجاح!</h3>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* PRESETS QUICK SELECT */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag size={13} />
                <span>خيارات سريعة للمصاريف:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => selectPreset(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                      description === cat
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                        : "bg-[#0b0f19] text-gray-400 border-white/5 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* DESCRIPTION INPUT */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                الخدمة / البيان
              </label>
              <input
                type="text"
                required
                placeholder="مثال: فاتورة كهرباء شهر 8 أو أجار العامل"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm"
              />
            </div>

            {/* AMOUNT INPUT */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <DollarSign size={13} />
                <span>المبلغ (₪)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-mono font-bold"
              />
            </div>

            {/* SUBMIT BUTTON */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-sm transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                {submitting ? "جاري التسجيل..." : "حفظ المصروف"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
