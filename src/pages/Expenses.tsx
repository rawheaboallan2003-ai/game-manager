import { useState, useMemo } from "react";
import { useGameStore } from "../store/useGameStore";
import { deleteExpense } from "../services/storeService";
import AddExpenseModal from "../components/AddExpenseModal";
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Trash2,
  DollarSign,
  TrendingDown,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";

export default function Expenses() {
  const expenses = useGameStore((state) => state.expenses);

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- FILTER LOGIC ---
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      // 1. Search Query
      const matchSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      // 2. Date Filter
      const expDate = exp.timestamp?.toDate ? exp.timestamp.toDate() : new Date(exp.timestamp as any);
      const now = new Date();

      if (dateFilter === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        if (expDate < startOfToday) return false;
      } else if (dateFilter === "week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 7);
        if (expDate < startOfWeek) return false;
      } else if (dateFilter === "month") {
        const startOfMonth = new Date();
        startOfMonth.setMonth(now.getMonth() - 1);
        if (expDate < startOfMonth) return false;
      }

      return true;
    });
  }, [expenses, searchQuery, dateFilter]);

  // Aggregates
  const aggregates = useMemo(() => {
    const totalCount = filteredExpenses.length;
    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayExpenses = expenses.filter((exp) => {
      const d = exp.timestamp?.toDate ? exp.timestamp.toDate() : new Date(exp.timestamp as any);
      return d >= startOfToday;
    });
    const todayTotal = todayExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return {
      totalCount,
      totalAmount,
      todayTotal,
    };
  }, [filteredExpenses, expenses]);

  const handleDelete = async (id: string, description: string) => {
    if (!window.confirm(`هل أنت تأكد من حذف المصروف: "${description}"؟`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteExpense(id);
    } catch (err: any) {
      alert(err.message || "فشل في حذف المصروف");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("ar-EG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">المصاريف والنفقات</h1>
          <p className="text-gray-400 mt-1 text-sm">إدارة وتتبع النفقات التشغيلية للمحل (كهرباء، نت، أجار، بضاعة...)</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 self-start md:self-auto"
        >
          <Plus size={18} />
          <span>إضافة مصروف جديد</span>
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">مصاريف اليوم</span>
            <h3 className="text-2xl font-extrabold text-amber-400 mt-1 timer-text">₪{aggregates.todayTotal.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">إجمالي المفلترة</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">₪{aggregates.totalAmount.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">عدد العمليات</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">{aggregates.totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileSpreadsheet size={20} />
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#090d16] p-4 rounded-2xl border border-white/5">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="البحث باسم الخدمة أو البيان (مثلاً: كهرباء)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2.5 bg-[#05080e] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs transition-all"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs"><Calendar size={15} /></span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="flex-1 px-3 py-2.5 bg-[#05080e] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-amber-500 text-xs"
          >
            <option value="all">جميع التواريخ</option>
            <option value="today">مصاريف اليوم فقط</option>
            <option value="week">آخر 7 أيام</option>
            <option value="month">آخر 30 يوم</option>
          </select>
        </div>
      </div>

      {/* EXPENSES LIST TABLE */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center text-gray-500 space-y-2">
            <AlertCircle size={32} className="mx-auto text-gray-600" />
            <p className="text-sm font-medium">لا يوجد مصاريف مسجلة تفي بالفلترة الحالية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-[#090d16] text-gray-400 text-xs uppercase font-bold border-b border-white/5">
                <tr>
                  <th className="px-6 py-4">الخدمة / البيان</th>
                  <th className="px-6 py-4">التاريخ والوقت</th>
                  <th className="px-6 py-4">المبلغ</th>
                  <th className="px-6 py-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Receipt size={16} />
                      </div>
                      <span>{exp.description}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {formatDate(exp.timestamp)}
                    </td>
                    <td className="px-6 py-4 font-mono font-extrabold text-amber-400 text-base">
                      ₪{Number(exp.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <button
                        onClick={() => handleDelete(exp.id, exp.description)}
                        disabled={deletingId === exp.id}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 ml-auto disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        <span>{deletingId === exp.id ? "جاري الحذف..." : "حذف"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD EXPENSE MODAL */}
      <AddExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
