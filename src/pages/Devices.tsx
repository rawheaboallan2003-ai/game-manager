import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useGameStore } from "../store/useGameStore";
import { Timestamp } from "firebase/firestore";
import {
  addDevice,
  updateDevice,
  deleteDevice,
  startSession,
  addItemsToSession,
  pauseSession,
  resumeSession,
  switchDevice,
  checkoutSession,
  createProductInvoice,
  type Device,
  type PlaySession,
} from "../services/storeService";
import {
  Plus,
  Gamepad2,
  Monitor,
  Eye,
  Cpu,
  Play,
  Pause,
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  User,
  Users,
  Settings,
  X,
  Coffee,
  Phone,
  Trash2,
  Edit2,
  Save,
  ChevronRight,
  Clock,
  Wrench,
  Receipt,
} from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const DEVICE_TYPES = [
  { value: "ps5",  label: "PlayStation 5",   icon: Gamepad2, color: "from-blue-600 to-indigo-600" },
  { value: "xbox", label: "Xbox Series X/S", icon: Gamepad2, color: "from-green-600 to-emerald-600" },
  { value: "pc",   label: "Gaming PC",       icon: Monitor,  color: "from-purple-600 to-violet-600" },
  { value: "vr",   label: "Virtual Reality", icon: Eye,      color: "from-pink-600 to-rose-600" },
  { value: "other",label: "Other Console",   icon: Cpu,      color: "from-orange-600 to-amber-600" },
] as const;

type DeviceType = "ps5" | "xbox" | "pc" | "vr" | "other";

function getDeviceConfig(type: DeviceType) {
  return DEVICE_TYPES.find((t) => t.value === type) ?? DEVICE_TYPES[4];
}

// ─────────────────────────────────────────────
// TIMER HOOK
// ─────────────────────────────────────────────
function useTimer() {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function calcElapsed(session: PlaySession, now: number) {
  const startMs = session.startTime.toMillis();
  const pausedMs = session.totalPausedDuration || 0;
  const extra =
    session.status === "paused" && session.pausedTime
      ? now - session.pausedTime.toMillis()
      : 0;
  return Math.max(0, now - startMs - pausedMs - extra);
}

function fmtTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function calcTimeCost(elapsedMs: number, rateSingle: number, rateMulti: number, players: 1 | 2) {
  const rate = players === 2 ? rateMulti : rateSingle;
  return (elapsedMs / (1000 * 60 * 60)) * rate;
}

// ─────────────────────────────────────────────
// SHARED INPUT STYLES
// ─────────────────────────────────────────────
const inputCls =
  "w-full px-4 py-2.5 bg-[#0b0f19] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all";
const labelCls = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";
const btnPrimary =
  "w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20";
const btnSecondary =
  "w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-semibold rounded-xl text-sm transition-all";

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function Devices() {
  const { storeId } = useParams<{ storeId: string }>();
  const devices      = useGameStore((s) => s.devices);
  const products     = useGameStore((s) => s.products);
  const activeSessions = useGameStore((s) => s.activeSessions);
  const tick         = useTimer();

  // ── Filters ──────────────────────────────
  const [filter, setFilter] = useState<"all" | "available" | "occupied" | "maintenance">("all");

  // ── Modal flags ──────────────────────────
  const [addDeviceOpen,    setAddDeviceOpen]    = useState(false);
  const [startSessionOpen, setStartSessionOpen] = useState(false);
  const [addItemsOpen,     setAddItemsOpen]     = useState(false);
  const [checkoutOpen,     setCheckoutOpen]     = useState(false);
  const [switchDeviceOpen, setSwitchDeviceOpen] = useState(false);
  const [deviceConfigOpen, setDeviceConfigOpen] = useState(false);
  const [confirmDeleteOpen,setConfirmDeleteOpen]= useState(false);
  const [posInvoiceOpen,   setPosInvoiceOpen]   = useState(false);

  // ── Selected ────────────────────────────
  const [selectedDevice,  setSelectedDevice]  = useState<Device | null>(null);
  const [selectedSession, setSelectedSession] = useState<PlaySession | null>(null);

  // ── Submitting guard ────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Add Device form ─────────────────────
  const [deviceName, setDeviceName] = useState("");
  const [deviceType, setDeviceType] = useState<DeviceType>("ps5");
  const [rateSingle, setRateSingle] = useState("5");
  const [rateMulti,  setRateMulti]  = useState("8");

  // ── Edit Device form (in Settings) ──────
  const [editMode,        setEditMode]        = useState(false);
  const [editDeviceName,  setEditDeviceName]  = useState("");
  const [editDeviceType,  setEditDeviceType]  = useState<DeviceType>("ps5");
  const [editRateSingle,  setEditRateSingle]  = useState("5");
  const [editRateMulti,   setEditRateMulti]   = useState("8");

  // ── Start Session form ───────────────────
  const [customerName,   setCustomerName]   = useState("");
  const [customerPhone,  setCustomerPhone]  = useState("");
  const [sessionType,    setSessionType]    = useState<"open" | "preset">("open");
  const [players,        setPlayers]        = useState<1 | 2>(1);
  const [presetDuration, setPresetDuration] = useState(60);

  // ── Add Items form ────────────────────────
  const [cartItems, setCartItems] = useState<{ productId: string; quantity: number }[]>([]);

  // ── Switch Device form ───────────────────
  const [switchTargetId, setSwitchTargetId] = useState("");

  // ── Checkout form ─────────────────────────
  const [discount,       setDiscount]       = useState("0");
  const [paymentMethod,  setPaymentMethod]  = useState<"cash" | "card" | "wallet">("cash");

  // ── POS Invoice form ─────────────────────
  const [posCartItems,     setPosCartItems]     = useState<{ productId: string; quantity: number }[]>([]);
  const [posCustomerName,  setPosCustomerName]  = useState("");
  const [posDiscount,      setPosDiscount]      = useState("0");
  const [posPaymentMethod, setPosPaymentMethod] = useState<"cash" | "card" | "wallet">("cash");

  // ─────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────
  const getSession = useCallback(
    (device: Device) => activeSessions.find((s) => s.deviceId === device.id) ?? null,
    [activeSessions]
  );

  const openStartSession = (device: Device) => {
    setSelectedDevice(device);
    setCustomerName("");
    setCustomerPhone("");
    setSessionType("open");
    setPlayers(1);
    setPresetDuration(60);
    setModalError(null);
    setStartSessionOpen(true);
  };

  const openAddItems = (device: Device, session: PlaySession) => {
    setSelectedDevice(device);
    setSelectedSession(session);
    setCartItems([]);
    setModalError(null);
    setAddItemsOpen(true);
  };

  const openCheckout = (device: Device, session: PlaySession) => {
    setSelectedDevice(device);
    setSelectedSession(session);
    setDiscount("0");
    setPaymentMethod("cash");
    setModalError(null);
    setCheckoutOpen(true);
  };

  const openDeviceConfig = (device: Device) => {
    setSelectedDevice(device);
    setEditMode(false);
    setEditDeviceName(device.name);
    setEditDeviceType(device.type);
    setEditRateSingle(String(device.rateSingle));
    setEditRateMulti(String(device.rateMulti));
    setModalError(null);
    setDeviceConfigOpen(true);
  };

  const openSwitchDevice = (device: Device, session: PlaySession) => {
    setSelectedDevice(device);
    setSelectedSession(session);
    setSwitchTargetId("");
    setModalError(null);
    setSwitchDeviceOpen(true);
  };

  const openPosInvoice = () => {
    setPosCartItems([]);
    setPosCustomerName("");
    setPosDiscount("0");
    setPosPaymentMethod("cash");
    setModalError(null);
    setPosInvoiceOpen(true);
  };

  // ─────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────
  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await addDevice(storeId, {
        name: deviceName.trim() || "New Device",
        type: deviceType,
        rateSingle: parseFloat(rateSingle) || 0,
        rateMulti: parseFloat(rateMulti) || 0,
      });
      setDeviceName("");
      setDeviceType("ps5");
      setRateSingle("5");
      setRateMulti("8");
      setAddDeviceOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to add device");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDeviceEdit = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await updateDevice(selectedDevice.id, {
        name: editDeviceName.trim() || selectedDevice.name,
        type: editDeviceType,
        rateSingle: parseFloat(editRateSingle) || 0,
        rateMulti: parseFloat(editRateMulti) || 0,
      });
      setEditMode(false);
      setDeviceConfigOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to update device");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await deleteDevice(selectedDevice.id);
      setConfirmDeleteOpen(false);
      setDeviceConfigOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to delete device");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMaintenance = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      const newStatus =
        selectedDevice.status === "maintenance" ? "available" : "maintenance";
      await updateDevice(selectedDevice.id, { status: newStatus });
      setDeviceConfigOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !selectedDevice) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await startSession(storeId, selectedDevice.id, selectedDevice.name, {
        customerName: customerName.trim() || "Customer",
        phoneNumber: customerPhone.trim(),
        type: sessionType,
        players,
        presetDuration,
      });
      setStartSessionOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to start session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItems = async () => {
    if (!selectedSession) return;
    const itemsToAdd = cartItems.filter((ci) => ci.quantity > 0);
    if (itemsToAdd.length === 0) { setAddItemsOpen(false); return; }
    setSubmitting(true);
    setModalError(null);
    try {
      const sessionItems = itemsToAdd.map((ci) => {
        const product = products.find((p) => p.id === ci.productId)!;
        return {
          productId: ci.productId,
          name: product.name,
          quantity: ci.quantity,
          price: product.price,
          imageUrl: product.imageUrl,
        };
      });
      await addItemsToSession(selectedSession.id, sessionItems);
      setAddItemsOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to add items");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePauseResume = async (session: PlaySession) => {
    try {
      if (session.status === "paused") {
        await resumeSession(session.id);
      } else {
        await pauseSession(session.id);
      }
    } catch (err: any) {
      alert(err.message ?? "Operation failed");
    }
  };

  const handleSwitchDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !selectedDevice || !switchTargetId) return;
    setSubmitting(true);
    setModalError(null);
    try {
      await switchDevice(selectedSession.id, selectedDevice.id, switchTargetId);
      setSwitchDeviceOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Failed to switch device");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !selectedDevice || !selectedSession) return;
    setSubmitting(true);
    setModalError(null);
    try {
      const now = Date.now();
      const elapsedMs = calcElapsed(selectedSession, now);
      const elapsedMinutes = elapsedMs / 60000;
      const timeCost = calcTimeCost(
        elapsedMs,
        selectedDevice.rateSingle,
        selectedDevice.rateMulti,
        selectedSession.players
      );
      const itemsCost = (selectedSession.items || []).reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );
      const totalCost = timeCost + itemsCost;
      const discountVal = parseFloat(discount) || 0;
      const finalAmount = Math.max(0, totalCost - discountVal);

      await checkoutSession(storeId, selectedSession.id, {
        deviceId: selectedDevice.id,
        deviceName: selectedDevice.name,
        customerName: selectedSession.customerName,
        phoneNumber: selectedSession.phoneNumber,
        startTime: selectedSession.startTime,
        endTime: Timestamp.fromMillis(now),
        elapsedMinutes,
        timeCost,
        itemsCost,
        totalCost,
        discount: discountVal,
        finalAmount,
        paymentMethod,
      });
      setCheckoutOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePosInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    const itemsToAdd = posCartItems.filter((ci) => ci.quantity > 0);
    if (itemsToAdd.length === 0) { setModalError("يرجى إضافة منتج واحد على الأقل"); return; }
    setSubmitting(true);
    setModalError(null);
    try {
      const invoiceItems = itemsToAdd.map((ci) => {
        const product = products.find((p) => p.id === ci.productId)!;
        return {
          productId: ci.productId,
          name: product.name,
          quantity: ci.quantity,
          price: product.price,
          imageUrl: product.imageUrl,
        };
      });
      await createProductInvoice(storeId, {
        customerName: posCustomerName.trim() || "زبون",
        items: invoiceItems,
        discount: parseFloat(posDiscount) || 0,
        paymentMethod: posPaymentMethod,
      });
      setPosInvoiceOpen(false);
    } catch (err: any) {
      setModalError(err.message ?? "فشل في إنشاء الفاتورة");
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────
  // CART HELPERS
  // ─────────────────────────────────────────
  const incrementCart = (productId: string, maxStock: number) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((ci) => ci.productId === productId);
      if (idx > -1) {
        if (prev[idx].quantity >= maxStock) return prev;
        return prev.map((ci, i) =>
          i === idx ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const decrementCart = (productId: string) => {
    setCartItems((prev) => {
      const idx = prev.findIndex((ci) => ci.productId === productId);
      if (idx === -1) return prev;
      if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((ci, i) =>
        i === idx ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

  // POS Cart helpers
  const incrementPosCart = (productId: string, maxStock: number) => {
    setPosCartItems((prev) => {
      const idx = prev.findIndex((ci) => ci.productId === productId);
      if (idx > -1) {
        if (prev[idx].quantity >= maxStock) return prev;
        return prev.map((ci, i) =>
          i === idx ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const decrementPosCart = (productId: string) => {
    setPosCartItems((prev) => {
      const idx = prev.findIndex((ci) => ci.productId === productId);
      if (idx === -1) return prev;
      if (prev[idx].quantity <= 1) return prev.filter((_, i) => i !== idx);
      return prev.map((ci, i) =>
        i === idx ? { ...ci, quantity: ci.quantity - 1 } : ci
      );
    });
  };

  // ─────────────────────────────────────────
  // FILTERED DEVICES — ensure occupied devices always show
  // ─────────────────────────────────────────
  const filtered = (() => {
    if (filter === "all") return devices;
    return devices.filter((d) => {
      // Always show occupied devices with active sessions
      if (d.status === "occupied" && filter === "occupied") return true;
      // Also check for devices that have sessions but wrong status (orphaned)
      const hasSession = activeSessions.some((s) => s.deviceId === d.id);
      if (hasSession && filter === "occupied") return true;
      return d.status === filter;
    });
  })();

  const counts = {
    all: devices.length,
    available: devices.filter((d) => d.status === "available").length,
    occupied: devices.filter((d) => d.status === "occupied" || activeSessions.some((s) => s.deviceId === d.id)).length,
    maintenance: devices.filter((d) => d.status === "maintenance").length,
  };

  // ─────────────────────────────────────────
  // LIVE CHECKOUT PREVIEW
  // ─────────────────────────────────────────
  const checkoutPreview = (() => {
    if (!checkoutOpen || !selectedDevice || !selectedSession) return null;
    const elapsedMs = calcElapsed(selectedSession, tick);
    const timeCost = calcTimeCost(
      elapsedMs,
      selectedDevice.rateSingle,
      selectedDevice.rateMulti,
      selectedSession.players
    );
    const itemsCost = (selectedSession.items || []).reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );
    const total = timeCost + itemsCost;
    const discountVal = parseFloat(discount) || 0;
    const final = Math.max(0, total - discountVal);
    return { timeCost, itemsCost, total, final };
  })();

  // POS Invoice total
  const posTotal = (() => {
    const itemsCost = posCartItems.reduce((s, ci) => {
      const p = products.find((pr) => pr.id === ci.productId);
      return s + (p?.price ?? 0) * ci.quantity;
    }, 0);
    const disc = parseFloat(posDiscount) || 0;
    return { itemsCost, final: Math.max(0, itemsCost - disc) };
  })();

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Gaming Stations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and monitor all your gaming devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openPosInvoice}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Receipt size={16} />
            فاتورة منتجات
          </button>
          <button
            onClick={() => {
              setAddDeviceOpen(true);
              setModalError(null);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={16} />
            Add Device
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "available", "occupied", "maintenance"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
              filter === f
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Device Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
            <Gamepad2 size={36} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-400">No devices found</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filter === "all"
              ? "Add your first gaming station to get started."
              : `No ${filter} devices right now.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((device) => {
            const session = getSession(device);
            const cfg = getDeviceConfig(device.type);
            const Icon = cfg.icon;
            const isActuallyOccupied = device.status === "occupied" || !!session;
            const elapsedMs = session ? calcElapsed(session, tick) : 0;
            const timeCost = session
              ? calcTimeCost(elapsedMs, device.rateSingle, device.rateMulti, session.players)
              : 0;
            const itemsCost = session
              ? (session.items || []).reduce((s, i) => s + i.price * i.quantity, 0)
              : 0;

            return (
              <div
                key={device.id}
                className={`relative rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isActuallyOccupied
                    ? "border-blue-500/40 bg-gradient-to-b from-blue-950/30 to-[#0f1420] shadow-lg shadow-blue-900/20"
                    : device.status === "maintenance"
                    ? "border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-[#0f1420]"
                    : "border-white/8 bg-gradient-to-b from-white/4 to-[#0f1420] hover:border-white/15"
                }`}
              >
                {/* Status bar */}
                <div
                  className={`h-1 w-full ${
                    isActuallyOccupied
                      ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                      : device.status === "maintenance"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                      : "bg-gradient-to-r from-emerald-500 to-teal-500"
                  }`}
                />

                {/* Card Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-lg`}
                      >
                        <Icon size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm leading-tight">
                          {device.name}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5 capitalize">
                          {cfg.label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          isActuallyOccupied
                            ? "bg-blue-500/20 text-blue-300"
                            : device.status === "maintenance"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {isActuallyOccupied
                          ? "Active"
                          : device.status === "maintenance"
                          ? "Repair"
                          : "Ready"}
                      </span>
                      <button
                        onClick={() => openDeviceConfig(device)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                      >
                        <Settings size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Rates */}
                  <div className="flex gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <User size={11} />
                      <span>₪{device.rateSingle}/hr</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Users size={11} />
                      <span>₪{device.rateMulti}/hr</span>
                    </div>
                  </div>
                </div>

                {/* Session Info (when occupied) */}
                {isActuallyOccupied && session && (
                  <div className="px-4 pb-3 space-y-2.5">
                    <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/20">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <User size={11} className="text-blue-300" />
                          </div>
                          <span className="text-sm font-bold text-white">
                            {session.customerName}
                          </span>
                          {session.players === 2 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-bold">
                              2P
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            session.status === "paused"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {session.status === "paused" ? "⏸ Paused" : "● Live"}
                        </span>
                      </div>
                      {session.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1.5">
                          <Phone size={10} />
                          <span>{session.phoneNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <Clock size={11} />
                          <span className="font-mono font-bold text-white text-xs">
                            {fmtTime(elapsedMs)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <span className="font-bold text-emerald-400 text-xs">
                            ₪{(timeCost + itemsCost).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items badge */}
                    {session.items && session.items.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {session.items.map((item) => (
                          <span
                            key={item.productId}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-gray-400"
                          >
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Occupied but no session found (orphaned) */}
                {device.status === "occupied" && !session && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span className="text-xs text-amber-300 font-semibold">
                        جهاز مشغول بدون جلسة نشطة
                      </span>
                    </div>
                  </div>
                )}

                {/* Maintenance */}
                {device.status === "maintenance" && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-950/30 border border-amber-500/20">
                      <AlertTriangle size={14} className="text-amber-400" />
                      <span className="text-xs text-amber-300 font-semibold">
                        Under maintenance
                      </span>
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="px-4 pb-4">
                  {device.status === "available" && !session && (
                    <button
                      onClick={() => openStartSession(device)}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-900/30"
                    >
                      <Play size={13} />
                      Rent Station
                    </button>
                  )}
                  {(isActuallyOccupied) && session && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePauseResume(session)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          session.status === "paused"
                            ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20"
                            : "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {session.status === "paused" ? (
                          <><Play size={11} />Resume</>
                        ) : (
                          <><Pause size={11} />Pause</>
                        )}
                      </button>
                      <button
                        onClick={() => openAddItems(device, session)}
                        className="flex-1 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Coffee size={11} />
                        Snacks
                      </button>
                      <button
                        onClick={() => openSwitchDevice(device, session)}
                        className="w-9 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 flex items-center justify-center transition-all"
                      >
                        <RefreshCw size={11} />
                      </button>
                      <button
                        onClick={() => openCheckout(device, session)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-900/30"
                      >
                        <CheckCircle size={11} />
                        Checkout
                      </button>
                    </div>
                  )}
                  {device.status === "maintenance" && (
                    <button
                      onClick={() => openDeviceConfig(device)}
                      className="w-full py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/20 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Wrench size={13} />
                      Finish Repair
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════
          ADD DEVICE MODAL
      ═══════════════════════════════════════ */}
      {addDeviceOpen && (
        <ModalOverlay onClose={() => setAddDeviceOpen(false)}>
          <ModalHeader title="Add New Device" onClose={() => setAddDeviceOpen(false)} />
          <form onSubmit={handleCreateDevice} className="p-6 space-y-5">
            {/* Device Type */}
            <div>
              <label className={labelCls}>Device Type</label>
              <div className="grid grid-cols-5 gap-2">
                {DEVICE_TYPES.map((t) => {
                  const TIcon = t.icon;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDeviceType(t.value as DeviceType)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                        deviceType === t.value
                          ? "border-blue-500 bg-blue-500/15 text-blue-300"
                          : "border-white/8 bg-white/3 text-gray-500 hover:border-white/15"
                      }`}
                    >
                      <TIcon size={16} />
                      {t.value.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className={labelCls}>Station Name</label>
              <input
                type="text"
                required
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. PS5 Station 1"
                className={inputCls}
              />
            </div>

            {/* Rates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Single Rate (₪/hr)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={rateSingle}
                  onChange={(e) => setRateSingle(e.target.value)}
                  placeholder="5.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Multi Rate (₪/hr)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={rateMulti}
                  onChange={(e) => setRateMulti(e.target.value)}
                  placeholder="8.00"
                  className={inputCls}
                />
              </div>
            </div>

            {modalError && <ErrorBanner message={modalError} />}

            <div className="flex gap-3">
              <button type="button" onClick={() => setAddDeviceOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting ? "Adding..." : "Add Device"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          DEVICE SETTINGS MODAL
      ═══════════════════════════════════════ */}
      {deviceConfigOpen && selectedDevice && (
        <ModalOverlay onClose={() => setDeviceConfigOpen(false)}>
          <ModalHeader
            title={editMode ? "Edit Device" : "Device Settings"}
            onClose={() => { setDeviceConfigOpen(false); setEditMode(false); }}
          />
          <div className="p-6 space-y-5">
            {!editMode ? (
              <>
                {/* Info display */}
                <div className="p-4 rounded-xl bg-white/4 border border-white/8 space-y-2">
                  <InfoRow label="Name" value={selectedDevice.name} />
                  <InfoRow label="Type" value={getDeviceConfig(selectedDevice.type).label} />
                  <InfoRow label="Single Rate" value={`₪${selectedDevice.rateSingle}/hr`} />
                  <InfoRow label="Multi Rate"  value={`₪${selectedDevice.rateMulti}/hr`} />
                  <InfoRow label="Status"      value={selectedDevice.status} />
                </div>

                {/* Action buttons */}
                <button
                  onClick={() => setEditMode(true)}
                  className="w-full py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Edit2 size={14} />
                  Edit Device Info
                </button>

                {selectedDevice.status !== "occupied" && (
                  <button
                    onClick={handleToggleMaintenance}
                    disabled={submitting}
                    className="w-full py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    <Wrench size={14} />
                    {selectedDevice.status === "maintenance"
                      ? "Mark as Available"
                      : "Set to Maintenance"}
                  </button>
                )}

                {selectedDevice.status !== "occupied" && (
                  <button
                    onClick={() => { setConfirmDeleteOpen(true); setModalError(null); }}
                    className="w-full py-3 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 size={14} />
                    Delete Device
                  </button>
                )}

                {selectedDevice.status === "occupied" && (
                  <p className="text-center text-xs text-gray-600">
                    Cannot delete or modify status while session is active
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Edit form */}
                <div>
                  <label className={labelCls}>Device Type</label>
                  <div className="grid grid-cols-5 gap-2">
                    {DEVICE_TYPES.map((t) => {
                      const TIcon = t.icon;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setEditDeviceType(t.value as DeviceType)}
                          className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                            editDeviceType === t.value
                              ? "border-blue-500 bg-blue-500/15 text-blue-300"
                              : "border-white/8 bg-white/3 text-gray-500 hover:border-white/15"
                          }`}
                        >
                          <TIcon size={16} />
                          {t.value.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Station Name</label>
                  <input
                    type="text"
                    value={editDeviceName}
                    onChange={(e) => setEditDeviceName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Single Rate (₪/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editRateSingle}
                      onChange={(e) => setEditRateSingle(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Multi Rate (₪/hr)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editRateMulti}
                      onChange={(e) => setEditRateMulti(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                {modalError && <ErrorBanner message={modalError} />}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditMode(false)} className={btnSecondary}>
                    Back
                  </button>
                  <button
                    onClick={handleSaveDeviceEdit}
                    disabled={submitting}
                    className={btnPrimary}
                  >
                    {submitting ? "Saving..." : (
                      <span className="flex items-center gap-2 justify-center">
                        <Save size={14} /> Save Changes
                      </span>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          CONFIRM DELETE MODAL
      ═══════════════════════════════════════ */}
      {confirmDeleteOpen && selectedDevice && (
        <ModalOverlay onClose={() => setConfirmDeleteOpen(false)}>
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-950/40 border border-red-500/20 flex items-center justify-center mx-auto">
              <Trash2 size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white mb-1">Delete Device?</h3>
              <p className="text-sm text-gray-400">
                Are you sure you want to permanently delete{" "}
                <span className="text-white font-bold">{selectedDevice.name}</span>? This cannot
                be undone.
              </p>
            </div>
            {modalError && <ErrorBanner message={modalError} />}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteOpen(false)}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDevice}
                disabled={submitting}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} />
                {submitting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          START SESSION MODAL
      ═══════════════════════════════════════ */}
      {startSessionOpen && selectedDevice && (
        <ModalOverlay onClose={() => setStartSessionOpen(false)}>
          <ModalHeader
            title={`Rent — ${selectedDevice.name}`}
            onClose={() => setStartSessionOpen(false)}
          />
          <form onSubmit={handleStartSession} className="p-6 space-y-5">
            {/* Customer */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ahmed"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Phone{" "}
                  <span className="text-gray-600 normal-case font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+972 5x xxx xxxx"
                    className={`${inputCls} pl-9`}
                  />
                </div>
              </div>
            </div>

            {/* Players */}
            <div>
              <label className={labelCls}>Players</label>
              <div className="grid grid-cols-2 gap-3">
                {([1, 2] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlayers(n)}
                    className={`py-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      players === n
                        ? "border-blue-500 bg-blue-500/15 text-blue-300"
                        : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                    }`}
                  >
                    {n === 1 ? <User size={16} /> : <Users size={16} />}
                    {n === 1 ? "Single Player" : "2 Players"}
                    <span className="text-[10px] opacity-60">
                      ₪{n === 1 ? selectedDevice.rateSingle : selectedDevice.rateMulti}/hr
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Mode */}
            <div>
              <label className={labelCls}>Billing Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {(["open", "preset"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSessionType(t)}
                    className={`py-3 rounded-xl border text-sm font-bold capitalize transition-all ${
                      sessionType === t
                        ? "border-blue-500 bg-blue-500/15 text-blue-300"
                        : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                    }`}
                  >
                    {t === "open" ? "⏱ Open" : "🎯 Preset"}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset duration */}
            {sessionType === "preset" && (
              <div>
                <label className={labelCls}>Duration</label>
                <div className="flex gap-2 flex-wrap">
                  {[30, 60, 90, 120, 180].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPresetDuration(d)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        presetDuration === d
                          ? "bg-blue-500 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}
                    >
                      {d < 60 ? `${d}m` : `${d / 60}h`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modalError && <ErrorBanner message={modalError} />}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStartSessionOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className={btnPrimary}>
                {submitting ? "Starting..." : "▶ Start Session"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          ADD ITEMS MODAL (IMAGE GRID)
      ═══════════════════════════════════════ */}
      {addItemsOpen && selectedSession && (
        <ModalOverlay onClose={() => setAddItemsOpen(false)}>
          <ModalHeader
            title={`Add Snacks — ${selectedSession.customerName}`}
            onClose={() => setAddItemsOpen(false)}
          />
          <div className="p-6 space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Coffee size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No products in inventory.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1 py-1">
                {products.map((product) => {
                  const ci = cartItems.find((c) => c.productId === product.id);
                  const qty = ci?.quantity ?? 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => product.stock > 0 && incrementCart(product.id, product.stock)}
                      className={`relative cursor-pointer rounded-2xl border-2 overflow-hidden transition-all duration-200 select-none ${
                        qty > 0
                          ? "border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]"
                          : "border-white/8 hover:border-white/20 hover:scale-[1.01]"
                      } ${product.stock === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {/* Image or icon */}
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-20 object-cover"
                          draggable={false}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-20 bg-gradient-to-br from-gray-800 to-gray-900 items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}>
                        <Coffee size={24} className="text-gray-600" />
                      </div>

                      {/* Info */}
                      <div className="p-2 bg-[#0f1420]">
                        <p className="text-[11px] font-bold text-white truncate leading-tight">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-gray-500">₪{product.price.toFixed(2)}</p>
                      </div>

                      {/* Qty badge */}
                      {qty > 0 && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                          <span className="text-[10px] font-extrabold text-white">{qty}</span>
                        </div>
                      )}

                      {/* Decrement button */}
                      {qty > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); decrementCart(product.id); }}
                          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg text-white font-bold text-xs leading-none"
                        >
                          −
                        </button>
                      )}

                      {/* Out of stock */}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="text-[9px] text-red-400 font-bold">Out of Stock</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart summary */}
            {cartItems.length > 0 && (
              <div className="p-3 rounded-xl bg-white/4 border border-white/8 space-y-1.5">
                <p className="text-xs font-bold text-gray-400 mb-2">Order Summary</p>
                {cartItems.map((ci) => {
                  const p = products.find((pr) => pr.id === ci.productId);
                  if (!p) return null;
                  return (
                    <div key={ci.productId} className="flex justify-between text-xs">
                      <span className="text-gray-300">{p.name} ×{ci.quantity}</span>
                      <span className="text-white font-bold">₪{(p.price * ci.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-white/8 pt-1.5 flex justify-between text-sm font-bold">
                  <span className="text-gray-300">Total</span>
                  <span className="text-emerald-400">
                    ₪
                    {cartItems
                      .reduce((s, ci) => {
                        const p = products.find((pr) => pr.id === ci.productId);
                        return s + (p?.price ?? 0) * ci.quantity;
                      }, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {modalError && <ErrorBanner message={modalError} />}

            <div className="flex gap-3">
              <button onClick={() => setAddItemsOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button
                onClick={handleAddItems}
                disabled={submitting}
                className={btnPrimary}
              >
                {submitting
                  ? "Adding..."
                  : cartItems.length === 0
                  ? "Close"
                  : `Add ${cartItems.reduce((s, c) => s + c.quantity, 0)} Item(s) to Bill`}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          SWITCH DEVICE MODAL
      ═══════════════════════════════════════ */}
      {switchDeviceOpen && selectedDevice && selectedSession && (
        <ModalOverlay onClose={() => setSwitchDeviceOpen(false)}>
          <ModalHeader title="Switch Device" onClose={() => setSwitchDeviceOpen(false)} />
          <form onSubmit={handleSwitchDevice} className="p-6 space-y-4">
            <p className="text-sm text-gray-400">
              Move{" "}
              <span className="text-white font-bold">{selectedSession.customerName}</span>'s
              session from{" "}
              <span className="text-blue-300 font-bold">{selectedDevice.name}</span> to:
            </p>
            <div>
              <label className={labelCls}>Select Target Device</label>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {devices
                  .filter((d) => d.id !== selectedDevice.id && d.status === "available")
                  .map((d) => {
                    const DIcon = getDeviceConfig(d.type).icon;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSwitchTargetId(d.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          switchTargetId === d.id
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/8 hover:border-white/15"
                        }`}
                      >
                        <DIcon size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-bold text-white">{d.name}</p>
                          <p className="text-[10px] text-gray-500">{getDeviceConfig(d.type).label}</p>
                        </div>
                        {switchTargetId === d.id && (
                          <ChevronRight size={14} className="ml-auto text-blue-400" />
                        )}
                      </button>
                    );
                  })}
                {devices.filter((d) => d.id !== selectedDevice.id && d.status === "available")
                  .length === 0 && (
                  <p className="text-center py-6 text-sm text-gray-600">
                    No available devices to switch to.
                  </p>
                )}
              </div>
            </div>
            {modalError && <ErrorBanner message={modalError} />}
            <div className="flex gap-3">
              <button type="button" onClick={() => setSwitchDeviceOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={!switchTargetId || submitting}
                className={btnPrimary}
              >
                {submitting ? "Switching..." : "Switch Device"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          CHECKOUT MODAL
      ═══════════════════════════════════════ */}
      {checkoutOpen && selectedDevice && selectedSession && checkoutPreview && (
        <ModalOverlay onClose={() => setCheckoutOpen(false)}>
          <ModalHeader
            title="Checkout"
            onClose={() => setCheckoutOpen(false)}
          />
          <form onSubmit={handleCheckout} className="p-6 space-y-5">
            {/* Summary */}
            <div className="p-4 rounded-xl bg-white/4 border border-white/8 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/6">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <User size={14} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedSession.customerName}</p>
                  {selectedSession.phoneNumber && (
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Phone size={9} />{selectedSession.phoneNumber}
                    </p>
                  )}
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-gray-500">Duration</p>
                  <p className="text-sm font-mono font-bold text-white">
                    {fmtTime(calcElapsed(selectedSession, tick))}
                  </p>
                </div>
              </div>

              <SummaryRow label={`Game Time (${selectedSession.players === 2 ? "2P" : "1P"})`} value={`₪${checkoutPreview.timeCost.toFixed(2)}`} />
              {selectedSession.items && selectedSession.items.length > 0 && (
                <>
                  {selectedSession.items.map((item) => (
                    <SummaryRow
                      key={item.productId}
                      label={`${item.name} ×${item.quantity}`}
                      value={`₪${(item.price * item.quantity).toFixed(2)}`}
                      sub
                    />
                  ))}
                  <SummaryRow label="Snacks Total" value={`₪${checkoutPreview.itemsCost.toFixed(2)}`} />
                </>
              )}
              <div className="border-t border-white/8 pt-2">
                <SummaryRow label="Subtotal" value={`₪${checkoutPreview.total.toFixed(2)}`} bold />
              </div>
            </div>

            {/* Discount */}
            <div>
              <label className={labelCls}>Discount (₪)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>

            {/* Payment method */}
            <div>
              <label className={labelCls}>Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "wallet"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                      paymentMethod === m
                        ? "border-blue-500 bg-blue-500/15 text-blue-300"
                        : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                    }`}
                  >
                    {m === "cash" ? "💵 Cash" : m === "card" ? "💳 Card" : "📱 Wallet"}
                  </button>
                ))}
              </div>
            </div>

            {/* Final amount */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-300">Total Due</span>
              <span className="text-2xl font-black text-emerald-400">
                ₪{checkoutPreview.final.toFixed(2)}
              </span>
            </div>

            {modalError && <ErrorBanner message={modalError} />}

            <div className="flex gap-3">
              <button type="button" onClick={() => setCheckoutOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 shadow-lg shadow-emerald-900/30"
              >
                {submitting ? "Processing..." : `✓ Process — ₪${checkoutPreview.final.toFixed(2)}`}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* ═══════════════════════════════════════
          POS PRODUCT-ONLY INVOICE MODAL
      ═══════════════════════════════════════ */}
      {posInvoiceOpen && (
        <ModalOverlay onClose={() => setPosInvoiceOpen(false)}>
          <ModalHeader title="فاتورة منتجات" onClose={() => setPosInvoiceOpen(false)} />
          <form onSubmit={handlePosInvoice} className="p-6 space-y-5">
            {/* Customer Name */}
            <div>
              <label className={labelCls}>اسم الزبون (اختياري)</label>
              <input
                type="text"
                value={posCustomerName}
                onChange={(e) => setPosCustomerName(e.target.value)}
                placeholder="زبون"
                className={inputCls}
              />
            </div>

            {/* Product Grid */}
            {products.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <ShoppingCart size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">لا يوجد منتجات في المخزون.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1 py-1">
                {products.map((product) => {
                  const ci = posCartItems.find((c) => c.productId === product.id);
                  const qty = ci?.quantity ?? 0;
                  return (
                    <div
                      key={product.id}
                      onClick={() => product.stock > 0 && incrementPosCart(product.id, product.stock)}
                      className={`relative cursor-pointer rounded-2xl border-2 overflow-hidden transition-all duration-200 select-none ${
                        qty > 0
                          ? "border-emerald-500 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                          : "border-white/8 hover:border-white/20 hover:scale-[1.01]"
                      } ${product.stock === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-20 object-cover"
                          draggable={false}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-20 bg-gradient-to-br from-gray-800 to-gray-900 items-center justify-center ${product.imageUrl ? 'hidden' : 'flex'}`}>
                        <Coffee size={24} className="text-gray-600" />
                      </div>
                      <div className="p-2 bg-[#0f1420]">
                        <p className="text-[11px] font-bold text-white truncate leading-tight">{product.name}</p>
                        <p className="text-[10px] text-gray-500">₪{product.price.toFixed(2)}</p>
                      </div>
                      {qty > 0 && (
                        <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <span className="text-[10px] font-extrabold text-white">{qty}</span>
                        </div>
                      )}
                      {qty > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); decrementPosCart(product.id); }}
                          className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg text-white font-bold text-xs leading-none"
                        >
                          −
                        </button>
                      )}
                      {product.stock === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <span className="text-[9px] text-red-400 font-bold">نفذ المخزون</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart summary */}
            {posCartItems.length > 0 && (
              <div className="p-3 rounded-xl bg-white/4 border border-white/8 space-y-1.5">
                <p className="text-xs font-bold text-gray-400 mb-2">ملخص الطلب</p>
                {posCartItems.map((ci) => {
                  const p = products.find((pr) => pr.id === ci.productId);
                  if (!p) return null;
                  return (
                    <div key={ci.productId} className="flex justify-between text-xs">
                      <span className="text-gray-300">{p.name} ×{ci.quantity}</span>
                      <span className="text-white font-bold">₪{(p.price * ci.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Discount */}
            <div>
              <label className={labelCls}>خصم (₪)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={posDiscount}
                onChange={(e) => setPosDiscount(e.target.value)}
                placeholder="0.00"
                className={inputCls}
              />
            </div>

            {/* Payment method */}
            <div>
              <label className={labelCls}>طريقة الدفع</label>
              <div className="grid grid-cols-3 gap-2">
                {(["cash", "card", "wallet"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPosPaymentMethod(m)}
                    className={`py-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                      posPaymentMethod === m
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                        : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
                    }`}
                  >
                    {m === "cash" ? "💵 كاش" : m === "card" ? "💳 بطاقة" : "📱 محفظة"}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-300">المجموع</span>
              <span className="text-2xl font-black text-emerald-400">
                ₪{posTotal.final.toFixed(2)}
              </span>
            </div>

            {modalError && <ErrorBanner message={modalError} />}

            <div className="flex gap-3">
              <button type="button" onClick={() => setPosInvoiceOpen(false)} className={btnSecondary}>
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || posCartItems.length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-40 shadow-lg shadow-emerald-900/30"
              >
                {submitting ? "جاري المعالجة..." : `✓ إتمام الدفع — ₪${posTotal.final.toFixed(2)}`}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// REUSABLE SUB-COMPONENTS
// ─────────────────────────────────────────────

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
      <h2 className="text-base font-black text-white">{title}</h2>
      <button
        onClick={onClose}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/25 rounded-xl">
      <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
      <p className="text-xs text-red-300">{message}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-bold text-white capitalize">{value}</span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  sub,
  bold,
}: {
  label: string;
  value: string;
  sub?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${sub ? "text-gray-600 pl-3" : "text-gray-400"}`}>{label}</span>
      <span className={`text-xs ${bold ? "text-white font-black text-sm" : "text-gray-300 font-semibold"}`}>
        {value}
      </span>
    </div>
  );
}
