import { useState, useMemo } from "react";
import { useGameStore } from "../store/useGameStore";
import {
  Search,
  Filter,
  Calendar,
  CreditCard,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Receipt,
  FileSpreadsheet
} from "lucide-react";

export default function History() {
  const transactions = useGameStore((state) => state.transactions);

  // --- STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "cash" | "card" | "wallet">("all");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // --- FILTER LOGIC ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Search Query
      const matchSearch =
        tx.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.deviceName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      // 2. Date Filter
      const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp as any);
      const now = new Date();

      if (dateFilter === "today") {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        if (txDate < startOfToday) return false;
      } else if (dateFilter === "week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - 7);
        if (txDate < startOfWeek) return false;
      } else if (dateFilter === "month") {
        const startOfMonth = new Date();
        startOfMonth.setMonth(now.getMonth() - 1);
        if (txDate < startOfMonth) return false;
      }

      // 3. Payment Method Filter
      if (paymentFilter !== "all" && tx.paymentMethod !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [transactions, searchQuery, dateFilter, paymentFilter]);

  // Aggregate stats of filtered transactions
  const aggregates = useMemo(() => {
    const totalCount = filteredTransactions.length;
    const totalCollected = filteredTransactions.reduce((sum, tx) => sum + tx.finalAmount, 0);
    const totalDiscounts = filteredTransactions.reduce((sum, tx) => sum + tx.discount, 0);
    const avgTicket = totalCount > 0 ? totalCollected / totalCount : 0;

    return {
      totalCount,
      totalCollected,
      totalDiscounts,
      avgTicket
    };
  }, [filteredTransactions]);

  const toggleExpand = (id: string) => {
    if (expandedTxId === id) {
      setExpandedTxId(null);
    } else {
      setExpandedTxId(id);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case "cash":
        return "bg-emerald-950 text-emerald-400 border border-emerald-500/20";
      case "card":
        return "bg-blue-950 text-blue-400 border border-blue-500/20";
      case "wallet":
        return "bg-purple-950 text-purple-400 border border-purple-500/20";
      default:
        return "bg-gray-800 text-gray-400";
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Transaction History</h1>
          <p className="text-gray-400 mt-1 text-sm">Review logs, receipts, and revenue breakdowns.</p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Sales</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">₪{aggregates.totalCollected.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Checkout Transactions</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">{aggregates.totalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center text-blue-400">
            <Receipt size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Average Ticket</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">₪{aggregates.avgTicket.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/10 flex items-center justify-center text-purple-400">
            <FileSpreadsheet size={20} />
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Discounts Given</span>
            <h3 className="text-2xl font-extrabold text-white mt-1 timer-text">₪{aggregates.totalDiscounts.toFixed(2)}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/10 flex items-center justify-center text-red-400">
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      {/* FILTERS TOOLBAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#090d16] p-4 rounded-2xl border border-white/5">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search by customer or console..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#05080e] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-all"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs"><Calendar size={14} /></span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="flex-1 px-3 py-2 bg-[#05080e] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>

        {/* Payment Filter */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs"><Filter size={14} /></span>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="flex-1 px-3 py-2 bg-[#05080e] border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash Only</option>
            <option value="card">Card Only</option>
            <option value="wallet">Mobile Wallet Only</option>
          </select>
        </div>
      </div>

      {/* TRANSACTION LIST */}
      <div className="space-y-4">
        {filteredTransactions.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
            <p className="text-gray-500 text-sm">No transaction records found matching filters.</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isExpanded = expandedTxId === tx.id;
            return (
              <div
                key={tx.id}
                className={`glass-panel rounded-2xl border transition-all overflow-hidden ${
                  isExpanded ? "border-blue-500/20 shadow-md shadow-blue-500/5 bg-[#090d16]/70" : "border-white/5"
                }`}
              >
                {/* TRANSACTION ROW SUMMARY */}
                <div
                  onClick={() => toggleExpand(tx.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-all select-none"
                >
                  <div className="flex items-start md:items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 border border-white/5 flex items-center justify-center text-gray-400">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-sm font-bold text-white">{tx.customerName}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${getPaymentBadge(tx.paymentMethod)}`}>
                          {tx.paymentMethod}
                        </span>
                        {tx.type === "pos" && (
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                            فاتورة منتجات
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {tx.type === "pos" ? "شراء منتجات فقط" : `${tx.deviceName} • ${tx.elapsedMinutes} دقيقة`} • {formatDate(tx.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                    <div className="text-right">
                      {tx.discount > 0 && (
                        <span className="text-[10px] text-gray-500 line-through block leading-none mb-1">
                          ₪{tx.totalCost.toFixed(2)}
                        </span>
                      )}
                      <span className="text-base font-extrabold text-emerald-400 timer-text leading-none">
                        ₪{tx.finalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED DETAILS */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-[#05080e]/40 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-[#090d16] rounded-xl border border-white/5 space-y-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                          {tx.type === "pos" ? "تفاصيل الفاتورة" : "تفاصيل الجلسة"}
                        </span>
                        {tx.type !== "pos" && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">تكلفة اللعب:</span>
                            <span className="text-white font-semibold">₪{tx.timeCost.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-400">تكلفة المنتجات:</span>
                          <span className="text-white font-semibold">₪{tx.itemsCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">المجموع قبل الخصم:</span>
                          <span className="text-white font-semibold">₪{tx.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-red-400">
                          <span>الخصم المطبق:</span>
                          <span className="font-bold">-₪{tx.discount.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Items details */}
                      <div className="p-3 bg-[#090d16] rounded-xl border border-white/5 space-y-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">المنتجات المباعة</span>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {tx.items && tx.items.length > 0 ? (
                            tx.items.map((item, index) => (
                              <div key={index} className="flex justify-between text-gray-400">
                                <span>{item.name} (x{item.quantity})</span>
                                <span className="text-white font-semibold">₪{(item.quantity * item.price).toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-gray-600 italic">لا يوجد منتجات في هذه الفاتورة.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
