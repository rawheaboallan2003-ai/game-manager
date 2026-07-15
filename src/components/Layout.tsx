import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useGameStore } from "../store/useGameStore";
import {
  LayoutDashboard,
  Gamepad2,
  Package,
  History,
  LogOut,
  Menu,
  X,
  User,
  Activity,
  GripVertical,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { storeId } = useParams<{ storeId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const clearStore = useGameStore((state) => state.clearStore);
  const storeName = useGameStore((state) => state.storeName);
  const user = useGameStore((state) => state.user);
  const activeSessions = useGameStore((state) => state.activeSessions);

  // --- REORDERING STATE ---
  const [orderedKeys, setOrderedKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem("sidebar_order");
    return saved ? JSON.parse(saved) : ["dashboard", "devices", "inventory", "history"];
  });

  const [draggedKey, setDraggedKey] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, key: string) => {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    if (draggedKey === null || draggedKey === key) return;

    const newKeys = [...orderedKeys];
    const draggedIdx = newKeys.indexOf(draggedKey);
    const targetIdx = newKeys.indexOf(key);

    newKeys.splice(draggedIdx, 1);
    newKeys.splice(targetIdx, 0, draggedKey);

    setOrderedKeys(newKeys);
    localStorage.setItem("sidebar_order", JSON.stringify(newKeys));
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
  };

  const moveItem = (key: string, direction: "up" | "down") => {
    const idx = orderedKeys.indexOf(key);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === orderedKeys.length - 1) return;

    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const newKeys = [...orderedKeys];
    const temp = newKeys[idx];
    newKeys[idx] = newKeys[targetIdx];
    newKeys[targetIdx] = temp;

    setOrderedKeys(newKeys);
    localStorage.setItem("sidebar_order", JSON.stringify(newKeys));
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      clearStore();
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const baseItems: Record<string, { name: string; path: string; icon: any; badge?: number }> = {
    dashboard: {
      name: "الرئيسية",
      path: `/store/${storeId}/dashboard`,
      icon: LayoutDashboard,
    },
    devices: {
      name: "الأجهزة الصالة",
      path: `/store/${storeId}/devices`,
      icon: Gamepad2,
      badge: activeSessions.filter((s) => s.status === "active").length || undefined,
    },
    inventory: {
      name: "المخزون والمبيعات",
      path: `/store/${storeId}/inventory`,
      icon: Package,
    },
    history: {
      name: "سجل الفواتير",
      path: `/store/${storeId}/history`,
      icon: History,
    },
  };

  // Build menuItems dynamically based on orderedKeys
  const menuItems = orderedKeys
    .map((key) => {
      const item = baseItems[key];
      if (!item) return null;
      return { key, ...item };
    })
    .filter(Boolean) as Array<{ key: string; name: string; path: string; icon: any; badge?: number }>;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex font-sans">
      {/* MOBILE HEADER */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#090d16] border-b border-white/5 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎮</span>
          <span className="font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {storeName || "Game Zone"}
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* SIDEBAR FOR DESKTOP & MOBILE TRANSITION */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-[#090d16]/95 lg:bg-[#090d16] border-r border-white/5 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* LOGO AREA */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <span className="text-lg">🎮</span>
            </div>
            <div>
              <span className="font-extrabold text-white text-base block leading-none">
                {storeName || "Game Zone"}
              </span>
              <span className="text-[10px] text-gray-500 mt-1 block">لوحة التحكم</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-[10px] text-gray-500 px-4 mb-2 tracking-wider font-bold">
            ترتيب القائمة (اسحب أو استخدم الأسهم)
          </div>
          {menuItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                draggable
                onDragStart={(e) => handleDragStart(e, item.key)}
                onDragOver={(e) => handleDragOver(e, item.key)}
                onDragEnd={handleDragEnd}
                className={`relative group flex items-center justify-between rounded-xl transition-all border ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600/15 to-purple-600/5 text-white border-blue-500/35 glow-blue"
                    : "text-gray-400 hover:text-white hover:bg-white/5 border-transparent"
                } ${draggedKey === item.key ? "opacity-30 border-blue-500/50" : ""}`}
              >
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing px-2 py-3 text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center">
                  <GripVertical size={14} />
                </div>

                <Link
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className="flex-1 flex items-center justify-between py-3 pr-4"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={`transition-colors ${
                        isActive ? "text-blue-400" : "text-gray-400 group-hover:text-white"
                      }`}
                    />
                    <span className="text-sm font-semibold">{item.name}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-gradient-to-r from-emerald-500 to-green-400 text-black rounded-full flex items-center gap-1">
                      <Activity size={8} className="animate-pulse" />
                      {item.badge}
                    </span>
                  )}
                </Link>

                {/* Quick arrows - always visible */}
                <div className="flex items-center gap-0.5 px-2">
                  {idx > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(item.key, "up");
                      }}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp size={12} />
                    </button>
                  )}
                  {idx < menuItems.length - 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(item.key, "down");
                      }}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </nav>

        {/* PROFILE & LOGOUT SECTION */}
        <div className="p-4 border-t border-white/5 bg-[#05080e]">
          <div className="flex items-center gap-3 px-2 py-2 mb-4 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 border border-white/5">
              <User size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {user?.email || "Manager"}
              </p>
              <p className="text-[10px] text-gray-500 capitalize">
                {user?.role || "Administrator"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-semibold text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* MAIN CONTENT WRAPPER */}
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <div className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
