import { useState } from "react";
import { getInvoicesLast24h, getExpensesLast24h, getDebtsLast24h } from "../services/storeService";
import { useParams } from "react-router-dom";

export default function ReportButton() {
  const { storeId } = useParams<{ storeId: string }>();
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [invoices, expenses, debts] = await Promise.all([
        getInvoicesLast24h(storeId),
        getExpensesLast24h(storeId),
        getDebtsLast24h(storeId),
      ]);
      // Simple printable view: render data in a new window
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        const doc = printWindow.document;
        doc.write("<html><head><title>تقرير اليوم</title><style>body{font-family:Arial;padding:20px}h2{margin-top:20px}</style></head><body>");
        doc.write(`<h1>تقرير اليوم - المتجر ${storeId}</h1>`);
        doc.write(`<h2>الفواتير (${invoices.length})</h2><pre>${JSON.stringify(invoices, null, 2)}</pre>`);
        doc.write(`<h2>المصروفات (${expenses.length})</h2><pre>${JSON.stringify(expenses, null, 2)}</pre>`);
        doc.write(`<h2>الديون (${debts.length})</h2><pre>${JSON.stringify(debts, null, 2)}</pre>`);
        doc.write("</body></html>");
        doc.close();
        printWindow.print();
      }
    } catch (e) {
      console.error("Report fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
    >
      🖨️ طباعة تقرير اليوم
    </button>
  );
}
