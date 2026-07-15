import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useGameStore } from "../store/useGameStore";
import {
  DollarSign,
  Gamepad2,
  Users,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Clock,
  Coffee,
  CheckCircle2
} from "lucide-react";

export default function Dashboard() {
  const { storeId } = useParams<{ storeId: string }>();
  const devices = useGameStore((state) => state.devices);
  const products = useGameStore((state) => state.products);
  const activeSessions = useGameStore((state) => state.activeSessions);
  const transactions = useGameStore((state) => state.transactions);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    // Total revenue today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTxs = transactions.filter((tx) => {
      const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp as any);
      return txDate >= startOfToday;
    });

    const revenueToday = todayTxs.reduce((sum, tx) => sum + tx.finalAmount, 0);
    const cashRevenue = todayTxs.filter(t => t.paymentMethod === "cash").reduce((s, t) => s + t.finalAmount, 0);
    const cardRevenue = todayTxs.filter(t => t.paymentMethod === "card").reduce((s, t) => s + t.finalAmount, 0);
    const walletRevenue = todayTxs.filter(t => t.paymentMethod === "wallet").reduce((s, t) => s + t.finalAmount, 0);

    // Active session count
    const activeCount = activeSessions.filter((s) => s.status === "active").length;
    const pausedCount = activeSessions.filter((s) => s.status === "paused").length;

    // Total active players
    const activePlayers = activeSessions.reduce((sum, s) => sum + (s.players || 1), 0);

    // Total devices and occupancies
    const totalDevices = devices.length;
    const occupiedDevices = devices.filter((d) => d.status === "occupied").length;
    const maintenanceDevices = devices.filter((d) => d.status === "maintenance").length;
    const availableDevices = devices.filter((d) => d.status === "available").length;

    // Low stock count
    const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

    return {
      revenueToday,
      cashRevenue,
      cardRevenue,
      walletRevenue,
      todayTxCount: todayTxs.length,
      activeCount,
      pausedCount,
      activePlayers,
      totalDevices,
      occupiedDevices,
      maintenanceDevices,
      availableDevices,
      lowStockProducts,
    };
  }, [transactions, activeSessions, devices, products]);

  // Last 5 checkouts
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1 text-sm">Real-time statistics and quick operations for your lounge.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/store/${storeId}/devices`}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10"
          >
            <Gamepad2 size={16} />
            <span>Manage Stations</span>
          </Link>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* REVENUE CARD */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Earnings Today</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white timer-text">
              ₪{stats.revenueToday.toFixed(2)}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
              <TrendingUp size={12} />
              <span>{stats.todayTxCount} sessions completed today</span>
            </div>
          </div>
        </div>

        {/* ACTIVE SESSIONS */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Stations</span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
              <Gamepad2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white timer-text">
              {stats.occupiedDevices} <span className="text-lg font-medium text-gray-500">/ {stats.totalDevices}</span>
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-400 mt-2 font-medium">
              <Clock size={12} className="animate-spin-slow" />
              <span>
                {stats.activeCount} active, {stats.pausedCount} paused sessions
              </span>
            </div>
          </div>
        </div>

        {/* ACTIVE PLAYERS */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-purple-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Players</span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/10">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white timer-text">
              {stats.activePlayers}
            </span>
            <div className="text-[11px] text-purple-400 mt-2 font-medium">
              In-lounge multiplayer sessions
            </div>
          </div>
        </div>

        {/* INVENTORY ALERTS */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Alerts</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              stats.lowStockProducts.length > 0
                ? "bg-amber-500/10 text-amber-400 border-amber-500/10 animate-pulse"
                : "bg-gray-800 text-gray-400 border-white/5"
            }`}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-white timer-text">
              {stats.lowStockProducts.length}
            </span>
            <div className={`text-[11px] mt-2 font-medium ${
              stats.lowStockProducts.length > 0 ? "text-amber-400" : "text-gray-500"
            }`}>
              {stats.lowStockProducts.length > 0
                ? "Items require immediate restock"
                : "Inventory levels healthy"}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD SECTION DETAILS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* RECENT TRANSACTIONS */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Recent Activity Log</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 5 checkouts processed</p>
            </div>
            <Link
              to={`/store/${storeId}/history`}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
            >
              <span>View full ledger</span>
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {recentTransactions.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-xl">
                <p className="text-sm text-gray-500">No transactions recorded yet.</p>
              </div>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 bg-[#080d16]/50 hover:bg-[#0b121e]/50 border border-white/5 hover:border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{tx.customerName}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {tx.deviceName} • {tx.elapsedMinutes} mins
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-baseline sm:items-end justify-between">
                    <span className="text-base font-extrabold text-white timer-text">
                      ₪{tx.finalAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-500 capitalize bg-white/5 px-2 py-0.5 rounded-full mt-0.5">
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* INVENTORY & ROOM STATE */}
        <div className="space-y-8">
          {/* LOUNGE DEVICE BREAKDOWN */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
            <h2 className="text-lg font-bold text-white">Device Status</h2>
            <div className="space-y-3">
              {/* Available */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-green" />
                  <span className="text-gray-400 font-medium">Available for play</span>
                </div>
                <span className="font-extrabold text-white">{stats.availableDevices}</span>
              </div>
              {/* Occupied */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 glow-purple animate-pulse-glow" />
                  <span className="text-gray-400 font-medium">Occupied / Playing</span>
                </div>
                <span className="font-extrabold text-white">{stats.occupiedDevices}</span>
              </div>
              {/* Maintenance */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 glow-yellow" />
                  <span className="text-gray-400 font-medium">Under maintenance</span>
                </div>
                <span className="font-extrabold text-white">{stats.maintenanceDevices}</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
              <span>Total registered stations:</span>
              <span className="font-bold text-gray-300">{stats.totalDevices}</span>
            </div>
          </div>

          {/* STOCK WARNINGS */}
          <div className="glass-panel rounded-2xl p-6 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Low Stock Warning</h2>
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/10">
                <AlertTriangle size={14} />
              </div>
            </div>

            <div className="space-y-2.5">
              {stats.lowStockProducts.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-white/5 rounded-xl">
                  <p className="text-xs text-gray-500">All products have sufficient stock.</p>
                </div>
              ) : (
                stats.lowStockProducts.slice(0, 3).map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 bg-[#080d16]/30 border border-white/5 rounded-xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 border border-white/5">
                        <Coffee size={15} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{prod.name}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">Price: ₪{prod.price}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-500/25 rounded-md">
                        {prod.stock} left
                      </span>
                    </div>
                  </div>
                ))
              )}

              {stats.lowStockProducts.length > 3 && (
                <Link
                  to={`/store/${storeId}/inventory`}
                  className="block text-center text-xs font-bold text-blue-400 hover:text-blue-300 mt-2"
                >
                  View all {stats.lowStockProducts.length} warnings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
