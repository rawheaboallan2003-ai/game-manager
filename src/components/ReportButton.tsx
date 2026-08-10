import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { Printer, MessageCircle, X, FileText } from "lucide-react";

export default function ReportButton() {
  const storeName = useGameStore((state) => state.storeName);
  const transactions = useGameStore((state) => state.transactions);
  const expenses = useGameStore((state) => state.expenses);

  const [modalOpen, setModalOpen] = useState(false);

  // Compute Today's data
  const getTodayReportData = () => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayTxs = transactions.filter((tx) => {
      const txDate = tx.timestamp?.toDate ? tx.timestamp.toDate() : new Date(tx.timestamp as any);
      return txDate >= startOfToday;
    });

    const todayExp = expenses.filter((exp) => {
      const expDate = exp.timestamp?.toDate ? exp.timestamp.toDate() : new Date(exp.timestamp as any);
      return expDate >= startOfToday;
    });

    const totalRevenue = todayTxs.reduce((sum, tx) => sum + tx.finalAmount, 0);
    const cashRevenue = todayTxs.filter(t => t.paymentMethod === "cash").reduce((s, t) => s + t.finalAmount, 0);
    const cardRevenue = todayTxs.filter(t => t.paymentMethod === "card").reduce((s, t) => s + t.finalAmount, 0);
    const walletRevenue = todayTxs.filter(t => t.paymentMethod === "wallet").reduce((s, t) => s + t.finalAmount, 0);
    const debtRevenue = todayTxs.filter(t => t.paymentMethod === "debt").reduce((s, t) => s + t.finalAmount, 0);

    const totalExpenses = todayExp.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const todayDateStr = new Date().toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return {
      todayDateStr,
      txCount: todayTxs.length,
      totalRevenue,
      cashRevenue,
      cardRevenue,
      walletRevenue,
      debtRevenue,
      totalExpenses,
      netProfit,
      expensesList: todayExp,
    };
  };

  const data = getTodayReportData();

  // Send WhatsApp Report
  const handleSendWhatsApp = () => {
    const phoneNumber = "970595287073";
    const message = `📊 *تقرير المبيعات والنشاط اليومي*
🏪 *المحل:* ${storeName || "Game Zone"}
📅 *اليوم والتاريخ:* ${data.todayDateStr}

💰 *إجمالي الإيرادات:* ${data.totalRevenue.toFixed(2)} ₪
🛒 *عدد الفواتير:* ${data.txCount}
💸 *إجمالي المصاريف:* ${data.totalExpenses.toFixed(2)} ₪
📈 *صافي الأرباح اليومية:* ${data.netProfit.toFixed(2)} ₪

💳 *تفاصيل المقبوضات:*
• 💵 كاش: ${data.cashRevenue.toFixed(2)} ₪
• 💳 بطاقة: ${data.cardRevenue.toFixed(2)} ₪
• 📱 محفظة: ${data.walletRevenue.toFixed(2)} ₪
• 📝 ديون: ${data.debtRevenue.toFixed(2)} ₪

شكرًا لاستخدامك Game Manager! 🎮`;

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${phoneNumber}?text=${encoded}`;
    window.open(waUrl, "_blank");
    setModalOpen(false);
  };

  // Print Thermal/A4 Receipt Report
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      const doc = printWindow.document;
      doc.write(`
        <html dir="rtl" lang="ar">
        <head>
          <title>تقرير اليوم - ${storeName || "Game Zone"}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; }
            .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
            .card { background: #f8f9fa; border: 1px solid #ddd; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #ccc; }
            .row:last-child { border-bottom: none; }
            .net { font-size: 18px; font-weight: bold; color: #2e7d32; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">🎮 ${storeName || "Game Zone"}</div>
            <div class="subtitle">تقرير اليوم المالي والشامل • ${data.todayDateStr}</div>
          </div>

          <div class="card">
            <div class="row"><span>المبيعات الكلية (المقبوضات):</span> <strong>₪${data.totalRevenue.toFixed(2)}</strong></div>
            <div class="row"><span>عدد الفواتير المنفذة:</span> <strong>${data.txCount}</strong></div>
            <div class="row"><span>كاش:</span> <span>₪${data.cashRevenue.toFixed(2)}</span></div>
            <div class="row"><span>بطاقة:</span> <span>₪${data.cardRevenue.toFixed(2)}</span></div>
            <div class="row"><span>محفظة إلكترونية:</span> <span>₪${data.walletRevenue.toFixed(2)}</span></div>
            <div class="row"><span>ديون ومستحقات:</span> <span>₪${data.debtRevenue.toFixed(2)}</span></div>
          </div>

          <div class="card">
            <div class="row"><span>إجمالي المصروفات اليومية:</span> <strong>₪${data.totalExpenses.toFixed(2)}</strong></div>
            <div class="row net"><span>صافي الربح اليومي:</span> <span>₪${data.netProfit.toFixed(2)}</span></div>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `);
      doc.close();
    }
    setModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
      >
        <span>🖨️</span>
        <span>تقرير اليوم والواتساب</span>
      </button>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setModalOpen(false)} aria-hidden="true" />
          <div className="relative glass-panel w-full max-w-md rounded-2xl border border-emerald-500/30 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">ملخص تقرير اليوم</h2>
                  <p className="text-xs text-gray-400">{data.todayDateStr}</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* PREVIEW SUMMARY */}
            <div className="p-4 bg-[#090d16] border border-white/5 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">اسم المحل:</span>
                <span className="text-white font-bold">{storeName || "Game Zone"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">إجمالي الإيرادات:</span>
                <span className="text-emerald-400 font-extrabold text-sm">₪{data.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">إجمالي المصاريف:</span>
                <span className="text-amber-400 font-bold">₪{data.totalExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-extrabold">
                <span className="text-white">صافي الأرباح:</span>
                <span className="text-green-400">₪{data.netProfit.toFixed(2)}</span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="space-y-3 pt-1">
              <button
                onClick={handleSendWhatsApp}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle size={18} />
                <span>إرسال التقرير عبر الواتساب (+970595287073)</span>
              </button>

              <button
                onClick={handlePrint}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                <span>طباعة التقرير (معاينة وطباعة)</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
