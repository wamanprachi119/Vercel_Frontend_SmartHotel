import { useState, useEffect } from "react";
import { CheckCircle, Star, ArrowRight, Download, Loader } from "lucide-react";
import "../styles/payment.css";
import { useTranslation } from "../hooks/useTranslation";

// ── jsPDF loader ────────────────────────────────────────────────
// Loaded on-demand from a CDN script tag the first time a receipt is
// downloaded, so no bundler/package.json changes are required.
let jsPDFLoadPromise = null;
function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jsPDFLoadPromise) return jsPDFLoadPromise;
  jsPDFLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = true;
    script.onload = () => {
      if (window.jspdf?.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error("jsPDF failed to load"));
    };
    script.onerror = () => reject(new Error("jsPDF failed to load"));
    document.head.appendChild(script);
  });
  return jsPDFLoadPromise;
}

export function PaymentConfirmation({ payment, order, onContinue, language }) {
  const t = useTranslation(language);
  const [confetti, setConfetti] = useState(true);
  const [downloading, setDownloading] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const methodLabel = {
    upi: t("upi"), card: t("card"), wallet: t("wallet"), cash: t("cash"), scanner: "SCANNER"
  };

  const subtotal   = payment.amount || 0;
  const tax        = payment.tax || subtotal * 0.05;
  const grandTotal = payment.grandTotal || subtotal + tax;

  const orderIdFull   = order?.id || "—";
  const paymentIdFull = payment.id || "—";

  // ── Build & download the PDF receipt ───────────────────────────
  const handleDownloadReceipt = async () => {
    setDownloading(true);
    try {
      const jsPDF = await loadJsPDF();
      const doc = new jsPDF({ unit: "pt", format: "a4" });

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let y = 50;

      // Hotel Name / header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(230, 92, 0); // brand orange
      doc.text("Smart Hotel", pageWidth / 2, y, { align: "center" });
      y += 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(100, 100, 100);
      doc.text("Payment Receipt", pageWidth / 2, y, { align: "center" });
      y += 10;
      doc.setDrawColor(230, 92, 0);
      doc.setLineWidth(1.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 26;

      doc.setTextColor(20, 20, 20);

      const dateTimeStr = new Date(payment.timestamp || Date.now()).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      const methodText = methodLabel[payment.method] || (payment.method ? payment.method.toUpperCase() : "—");

      const infoRows = [
        ["Order ID", `#${orderIdFull}`],
        ["Payment ID", paymentIdFull],
        ["Transaction ID", payment.transactionId || "—"],
        ["Table Number", String(order?.tableNumber || "—")],
        ["Date & Time", dateTimeStr],
        ["Payment Method", methodText],
        ["Payment Status", "Paid"],
      ];

      doc.setFontSize(11);
      infoRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, marginX, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(value), marginX + 140, y);
        y += 18;
      });

      y += 10;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.7);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 24;

      // Items table header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Item", marginX, y);
      doc.text("Qty", pageWidth - marginX - 160, y, { align: "right" });
      doc.text("Price", pageWidth - marginX - 80, y, { align: "right" });
      doc.text("Total", pageWidth - marginX, y, { align: "right" });
      y += 8;
      doc.setDrawColor(230, 92, 0);
      doc.setLineWidth(1);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 20;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      (order?.items || []).forEach((item) => {
        const name = item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name || "Item";
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const lineTotal = price * qty;

        // Wrap long item names so they never overflow the column
        const nameLines = doc.splitTextToSize(name, 240);
        nameLines.forEach((line, idx) => {
          doc.text(line, marginX, y + idx * 14);
        });
        doc.text(String(qty), pageWidth - marginX - 160, y, { align: "right" });
        doc.text(`Rs.${price.toFixed(2)}`, pageWidth - marginX - 80, y, { align: "right" });
        doc.text(`Rs.${lineTotal.toFixed(2)}`, pageWidth - marginX, y, { align: "right" });

        y += Math.max(18, nameLines.length * 14 + 4);

        // Page-break safety for very long orders
        if (y > doc.internal.pageSize.getHeight() - 160) {
          doc.addPage();
          y = 50;
        }
      });

      y += 10;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.7);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 22;

      // Totals
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Subtotal:", pageWidth - marginX - 160, y);
      doc.text(`Rs.${subtotal.toFixed(2)}`, pageWidth - marginX, y, { align: "right" });
      y += 18;

      doc.text("GST (5%):", pageWidth - marginX - 160, y);
      doc.text(`Rs.${tax.toFixed(2)}`, pageWidth - marginX, y, { align: "right" });
      y += 18;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(230, 92, 0);
      doc.text("Grand Total:", pageWidth - marginX - 160, y);
      doc.text(`Rs.${grandTotal.toFixed(2)}`, pageWidth - marginX, y, { align: "right" });
      y += 30;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for dining at Smart Hotel!", pageWidth / 2, doc.internal.pageSize.getHeight() - 40, { align: "center" });

      // File name format: Receipt_Order_<OrderId>.pdf
      const safeOrderId = String(orderIdFull).replace(/[^a-zA-Z0-9_-]/g, "");
      const fileName = `Receipt_Order_${safeOrderId}.pdf`;

      // doc.save() triggers a real browser download (works on Android/Chrome too)
      doc.save(fileName);
    } catch (err) {
      console.error("Failed to generate PDF receipt:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pay-confirm-wrapper">
      {confetti && (
        <div className="confetti-container">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              background: ["#e65c00","#f9a825","#16a34a","#3b82f6","#7c3aed"][i % 5],
            }} />
          ))}
        </div>
      )}

      <div className="pay-confirm-card">
        <div className="pay-confirm-icon">
          <CheckCircle size={52} color="#16a34a" />
        </div>
        <h2 className="pay-confirm-title">{t("paymentSuccessTitle")}</h2>
        <p className="pay-confirm-subtitle">{t("thankYouDining")}</p>

        {/* Receipt */}
        <div className="receipt-card">
          <div className="receipt-header">
            <span>{t("paymentReceipt")}</span>
            <span className="receipt-status">{t("receiptPaid")}</span>
          </div>

          <div className="receipt-rows">
            <div className="receipt-row">
              <span>{t("paymentId")}</span>
              <code>{payment.id?.slice(-12)}</code>
            </div>
            <div className="receipt-row">
              <span>{t("transactionRef")}</span>
              <code>{payment.transactionId || "—"}</code>
            </div>
            <div className="receipt-row">
              <span>{t("orderId")}</span>
              <code>#{order?.id?.slice(-8)}</code>
            </div>
            <div className="receipt-row">
              <span>{t("tableLabel")}</span>
              <span>{order?.tableNumber || "—"}</span>
            </div>
            <div className="receipt-row">
              <span>{t("paymentMethod")}</span>
              <span>
                {payment.method === "scanner" ? "🖨️" : payment.method === "upi" ? "📱" : payment.method === "card" ? "💳" : payment.method === "wallet" ? "👜" : "💵"}
                {" "}{methodLabel[payment.method] || payment.method?.toUpperCase()}
              </span>
            </div>
            <div className="receipt-row">
              <span>{t("dateTime")}</span>
              <span>
                {new Date(payment.timestamp || Date.now()).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
          </div>

          <div className="receipt-divider" />

          <div className="receipt-rows">
            <div className="receipt-row">
              <span>{t("subtotal")}</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="receipt-row muted">
              <span>{t("gst")}</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="receipt-row total-row">
              <span>{t("amountPaid")}</span>
              <span className="orange-bold">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Download PDF Receipt */}
        <button
          className="next-step-btn"
          onClick={handleDownloadReceipt}
          disabled={downloading}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", margin: "14px 0 4px",
            opacity: downloading ? 0.7 : 1,
            cursor: downloading ? "not-allowed" : "pointer",
          }}
        >
          {downloading ? (
            <>
              <Loader size={15} style={{ animation: "spin 1s linear infinite" }} />
              {t("generatingPdf")}
            </>
          ) : (
            <>
              <Download size={15} />
              {t("downloadReceipt")}
            </>
          )}
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        {/* Items Ordered */}
        <div className="confirm-items">
          <p className="confirm-items-title">{t("itemsOrdered")}</p>
          {order?.items?.map((item, i) => (
            <div key={i} className="confirm-item-row">
              {item.image && (
                <img src={item.image} alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name} className="confirm-item-img"
                  onError={(e) => { e.target.style.display = "none"; }} />
              )}
              <span className="confirm-item-name">
                {item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name} × {item.quantity}
              </span>
              <span className="confirm-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Feedback CTA */}
        <div className="next-step-banner">
          <Star size={18} color="#f59e0b" />
          <div>
            <strong>{t("shareExperience")}</strong>
            <p>{t("helpUsImprove")}</p>
          </div>
          <button className="next-step-btn" onClick={onContinue}>
            {t("giveFeedback")} <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
