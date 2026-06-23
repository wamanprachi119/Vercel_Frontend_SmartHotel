import { useState } from "react";
import "../styles/payment.css";
import {
  CreditCard, Smartphone, Wallet, ArrowLeft, Check, Banknote, QrCode,
  UtensilsCrossed, ShieldCheck, CheckCircle2,
} from "lucide-react";
import phonePeQR from "../assets/payment/phonepe-qr.png";
import { useTranslation } from "../hooks/useTranslation";

const HOTEL_UPI_ID = "902984211@axl";
const HOTEL_NAME   = "Prachi Ramnath Waman";

export function Payment({ cart, order, onPaymentComplete, onBack, language }) {
  const t = useTranslation(language);
  const [selectedMethod, setSelectedMethod] = useState("scanner");
  const [processing, setProcessing]         = useState(false);
  const [done, setDone]                     = useState(false);
  const [upiId, setUpiId]                   = useState("");
  const [cardNumber, setCardNumber]         = useState("");
  const [cardExpiry, setCardExpiry]         = useState("");
  const [cardCvv, setCardCvv]               = useState("");
  const [cardName, setCardName]             = useState("");
  const [selectedWallet, setSelectedWallet] = useState("paytm");
  const [errors, setErrors]                 = useState({});
  const [scannerPaid, setScannerPaid]       = useState(false);
  const [transactionId]                     = useState("TXN" + Math.random().toString(36).slice(2, 10).toUpperCase());

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax      = subtotal * 0.05;
  const total    = subtotal + tax;

  const formatCard   = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d; };

  const validate = () => {
    const e = {};
    if (selectedMethod === "upi" && !upiId.includes("@")) e.upiId = "Enter a valid UPI ID (e.g. name@upi)";
    if (selectedMethod === "card") {
      if (cardNumber.replace(/\s/g, "").length < 16) e.cardNumber = "Enter a valid 16-digit card number";
      if (cardExpiry.length < 5) e.cardExpiry = "Enter valid expiry (MM/YY)";
      if (cardCvv.length < 3) e.cardCvv = "CVV must be 3 digits";
      if (!cardName.trim()) e.cardName = "Enter cardholder name";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePayment = () => {
    if (selectedMethod !== "scanner" && !validate()) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
      const paymentData = {
        transactionId,
        upiRef: selectedMethod === "scanner" ? "UPI" + Date.now() : undefined,
        upiId:  selectedMethod === "upi" ? upiId : selectedMethod === "scanner" ? HOTEL_UPI_ID : undefined,
        cardLast4: selectedMethod === "card" ? cardNumber.replace(/\s/g, "").slice(-4) : undefined,
        wallet: selectedMethod === "wallet" ? selectedWallet : undefined,
      };
      setTimeout(() => onPaymentComplete(selectedMethod, paymentData), 1200);
    }, 2000);
  };

  const paymentMethods = [
    { id: "scanner", name: t("scanAndPay"),  description: t("scanQrInstantly"),    icon: QrCode },
    { id: "upi",     name: t("upi"),         description: t("gpayPhonepePaytm"),   icon: Smartphone },
    { id: "card",    name: t("card"),        description: t("creditDebitCard"),    icon: CreditCard },
    { id: "wallet",  name: t("wallet"),      description: t("paytmPhonepeWallet"), icon: Wallet },
    { id: "cash",    name: t("cash"),        description: t("payAtCounter"),       icon: Banknote },
  ];

  if (done) {
    return (
      <div className="payment-success">
        <div className="success-circle"><Check size={36} /></div>
        <h2>{t("paymentSuccessTitle")}</h2>
        <p>{t("processingConfirmation")}</p>
        <div className="spinner" style={{ margin: "16px auto" }} />
      </div>
    );
  }

  return (
    <div className="payment-wrapper">
      {/* Food Served Banner */}
      <div className="food-served-banner">
        <UtensilsCrossed size={18} />
        <div>
          <strong>{t("foodServedBanner")}</strong>
          <span>{t("completePayment")}</span>
        </div>
        <ShieldCheck size={18} style={{ marginLeft: "auto", color: "#16a34a" }} />
      </div>

      <button onClick={onBack} className="back-btn"><ArrowLeft size={16} /> {t("back")}</button>

      {/* Workflow Steps */}
      <div className="payment-workflow">
        {[
          { label: t("orderPlacedStep"), emoji: "📋", done: true },
          { label: t("foodPrepared"),    emoji: "👨‍🍳", done: true },
          { label: t("foodServed"),      emoji: "🍽️", done: true },
          { label: t("payment"),         emoji: "💳", done: false, current: true },
          { label: t("feedback"),        emoji: "⭐", done: false },
        ].map((s, i, arr) => (
          <div key={i} className="pwf-step">
            <div className={`pwf-circle ${s.done ? "pwf-done" : s.current ? "pwf-current" : ""}`}>{s.emoji}</div>
            <span className={`pwf-label ${s.done || s.current ? "pwf-active" : ""}`}>{s.label}</span>
            {i < arr.length - 1 && <div className={`pwf-line ${s.done ? "pwf-line-done" : ""}`} />}
          </div>
        ))}
      </div>

      <div className="payment-grid">
        {/* LEFT: Method + Form */}
        <div className="payment-card">
          <h2 className="payment-title">{t("choosePaymentMethod")}</h2>

          <div className="method-list">
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              const isActive = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => { setSelectedMethod(method.id); setErrors({}); }}
                  className={`method-btn ${isActive ? "active" : ""} ${method.id === "scanner" ? "scanner-btn" : ""}`}
                >
                  <div className={`method-icon ${isActive ? "active" : ""} ${method.id === "scanner" ? "scanner-icon" : ""}`}>
                    <Icon size={20} />
                  </div>
                  <div className="method-text">
                    <p className="method-name">{method.name}</p>
                    <p className="method-desc">{method.description}</p>
                  </div>
                  {isActive && <Check className="method-check" size={18} />}
                </button>
              );
            })}
          </div>

          <div className="payment-form">
            {/* SCANNER */}
            {selectedMethod === "scanner" && (
              <div className="scanner-section">
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "#5f259f", color: "#fff",
                    padding: "6px 18px", borderRadius: 20, fontSize: "0.9rem", fontWeight: 700,
                  }}>
                    <span style={{ fontSize: "1.2rem" }}>Pe</span> PhonePe Accepted
                  </div>
                </div>

                <div className="phonepe-qr-card">
                  <div className="phonepe-qr-header">
                    <span className="phonepe-qr-title">{t("scanAndPay")}</span>
                    <span className="phonepe-qr-subtitle">Using PhonePe App</span>
                  </div>
                  <div className="phonepe-qr-imgwrap">
                    <img src={phonePeQR} alt="PhonePe QR Code" className="phonepe-qr-img" />
                  </div>
                  <div className="phonepe-qr-amount">
                    {t("amountToPay")}: <strong>₹{total.toFixed(2)}</strong>
                  </div>
                  {order?.tableNumber && (
                    <div className="phonepe-qr-table">
                      🪑 {t("tableLabel")}: <strong>{order.tableNumber}</strong>
                    </div>
                  )}
                  <div className="phonepe-qr-name">{HOTEL_NAME}</div>
                </div>

                <div style={{
                  background: "#f9fafb", border: "1px solid #e5e7eb",
                  borderRadius: 10, padding: "10px 14px", margin: "10px 0", fontSize: "0.85rem",
                }}>
                  <div style={{ color: "#6b7280", marginBottom: 2 }}>{t("upiId")}</div>
                  <div style={{ fontWeight: 700, color: "#1c1c1c", fontSize: "0.95rem" }}>{HOTEL_UPI_ID}</div>
                </div>

                <div className="scanner-apps">
                  <span>📱 GPay</span><span>🟣 PhonePe</span>
                  <span>📱 Paytm</span><span>📱 BHIM</span>
                </div>

                <p className="scanner-note">
                  Scan with any UPI app → Pay ₹{total.toFixed(2)} → tap <strong>"{t("iHavePaid")}"</strong>
                </p>

                <div style={{
                  background: scannerPaid ? "#f0fdf4" : "#f9fafb",
                  border: `1px solid ${scannerPaid ? "#86efac" : "#e5e7eb"}`,
                  borderRadius: 10, padding: "10px 14px", marginTop: 8,
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={scannerPaid}
                      onChange={(e) => setScannerPaid(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "#5f259f" }}
                    />
                    <span style={{ fontWeight: 600, color: scannerPaid ? "#16a34a" : "#374151" }}>
                      {scannerPaid ? t("paymentCompletedOnApp") : t("iHavePaid")}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {selectedMethod === "upi" && (
              <div className="form-group">
                <label>{t("upiId")}</label>
                <input value={upiId} onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi" className={errors.upiId ? "error" : ""} />
                {errors.upiId && <span className="err-msg">{errors.upiId}</span>}
                <div className="upi-apps" style={{ marginTop: 8 }}>
                  {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                    <span key={app} className="upi-app-tag">{app}</span>
                  ))}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 6 }}>
                  {t("transactionRef")}: <code style={{ background: "#f3f4f6", padding: "1px 6px", borderRadius: 4 }}>{transactionId}</code>
                </div>
              </div>
            )}

            {selectedMethod === "card" && (
              <>
                <div className="form-group">
                  <label>{t("cardholderName")}</label>
                  <input value={cardName} onChange={(e) => setCardName(e.target.value)}
                    placeholder={t("nameOnCard")} className={errors.cardName ? "error" : ""} />
                  {errors.cardName && <span className="err-msg">{errors.cardName}</span>}
                </div>
                <div className="form-group">
                  <label>{t("cardNumber")}</label>
                  <input value={cardNumber} onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    placeholder="1234 5678 9012 3456" maxLength={19} className={errors.cardNumber ? "error" : ""} />
                  {errors.cardNumber && <span className="err-msg">{errors.cardNumber}</span>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t("expiry")}</label>
                    <input value={cardExpiry} onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY" maxLength={5} className={errors.cardExpiry ? "error" : ""} />
                    {errors.cardExpiry && <span className="err-msg">{errors.cardExpiry}</span>}
                  </div>
                  <div className="form-group">
                    <label>{t("cvv")}</label>
                    <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="•••" type="password" maxLength={3} className={errors.cardCvv ? "error" : ""} />
                    {errors.cardCvv && <span className="err-msg">{errors.cardCvv}</span>}
                  </div>
                </div>
              </>
            )}

            {selectedMethod === "wallet" && (
              <div className="form-group">
                <label>{t("selectWallet")}</label>
                <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)}>
                  <option value="paytm">Paytm</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="amazon">Amazon Pay</option>
                  <option value="freecharge">Freecharge</option>
                </select>
              </div>
            )}

            {selectedMethod === "cash" && (
              <div className="cash-note">
                💵 {t("cashNote")} <strong>₹{total.toFixed(2)}</strong><br />
                <small style={{ color: "#6b7280", marginTop: 8, display: "block" }}>
                  {t("showOrderId")}: #{order?.id?.slice(-8)}
                </small>
              </div>
            )}
          </div>

          <div className="txn-id-row">
            <span>{t("transactionRef")}:</span>
            <code>{transactionId}</code>
          </div>
        </div>

        {/* RIGHT: Bill Summary */}
        <div className="payment-summary-card">
          <h3 className="summary-heading">{t("billSummary")}</h3>

          {order && (
            <div className="bill-order-meta">
              <span>{t("orderId")} #{order.id?.slice(-8)}</span>
              {order.tableNumber && <span>{t("tableLabel")} {order.tableNumber}</span>}
            </div>
          )}

          <div className="bill-items">
            {cart.map((item, i) => (
              <div key={i} className="bill-item-row">
                <div className="bill-item-card">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                      className="bill-item-img-big"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <div className="bill-item-details">
                    <span className="bill-item-name">
                      {item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                      <span className="bill-item-qty"> ×{item.quantity}</span>
                    </span>
                    <span className="bill-item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bill-divider" />

          <div className="bill-totals">
            <div className="bill-row"><span>{t("subtotal")}</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="bill-row tax"><span>{t("gst")}</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="bill-row grand"><span>{t("totalAmount")}</span><span>₹{total.toFixed(2)}</span></div>
          </div>

          <div className="security-badges">
            <div className="sec-badge"><ShieldCheck size={13} /> {t("securedPayment")}</div>
            <div className="sec-badge">✅ {t("gstIncluded")}</div>
          </div>
        </div>
      </div>

      {/* Pay Button */}
      <div className="pay-btn-wrap">
        <button
          className="pay-btn"
          onClick={handlePayment}
          disabled={processing || (selectedMethod === "scanner" && !scannerPaid)}
        >
          {processing ? (
            <><div className="spinner-sm" /> {t("verifyingPayment")}</>
          ) : selectedMethod === "scanner" ? (
            scannerPaid
              ? <><CheckCircle2 size={18} /> {t("confirmPayment")} — ₹{total.toFixed(2)}</>
              : <>{t("scanPayFirst")}</>
          ) : (
            <><ShieldCheck size={18} /> {t("payAmount")} ₹{total.toFixed(2)}</>
          )}
        </button>
      </div>
    </div>
  );
}
