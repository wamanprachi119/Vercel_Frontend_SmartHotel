import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, Trash2, Plus, Minus, X, Edit2, RefreshCw } from "lucide-react";
import { useTable } from "../context/TableContext";
import { useTranslation } from "../hooks/useTranslation";
import { getCart, addCartItem, updateCartItem, removeCartItem, clearCart as clearCartAPI, saveCart } from "../services/api";
import "../styles/cart.css";

// ── Change Table Modal ────────────────────────────────────────
function ChangeTableModal({ currentTable, onConfirm, onCancel, language }) {
  const t = useTranslation(language);
  const [val, setVal] = useState(currentTable || "");
  const [error, setError] = useState("");

  const confirm = () => {
    if (!val.trim()) { setError(t("tableNumberRequired")); return; }
    if (!/^\d+$/.test(val.trim())) { setError(t("numbersOnly")); return; }
    onConfirm(val.trim());
  };

  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div className="popup-box" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onCancel}>✕</button>
        <div className="popup-icon">🪑</div>
        <h3>{t("changeTableTitle")}</h3>
        <p>{t("changeTablePrompt")}</p>
        <input
          type="number"
          value={val}
          onChange={e => { setVal(e.target.value); setError(""); }}
          placeholder={t("tableExample")}
          className="popup-input"
          onKeyDown={e => e.key === "Enter" && confirm()}
          autoFocus
          min="1"
        />
        {error && <p className="popup-error-msg">{error}</p>}
        <button onClick={confirm} disabled={!val.trim()} className="popup-confirm-btn">
          {t("confirmTableChange")}
        </button>
      </div>
    </div>
  );
}

// ── Session ID helper ─────────────────────────────────────────
function getSessionId() {
  let sid = localStorage.getItem("smartHotelSessionId");
  if (!sid) {
    sid = "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("smartHotelSessionId", sid);
  }
  return sid;
}

// ── Cart Component ────────────────────────────────────────────
export function Cart({ cart: localCart, onUpdateQuantity, onClearCart, onCheckout, language, onCartRefreshed }) {
  const t = useTranslation(language);
  const { tableNumber, setTableNumber } = useTable();
  const [apiCart, setApiCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showChangeTable, setShowChangeTable] = useState(false);
  const [updatingItem, setUpdatingItem] = useState(null);

  const sessionId = getSessionId();

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCart(sessionId);
      setApiCart(data);
      // Update table number from API cart if available
      if (data?.tableNumber && data.tableNumber !== tableNumber) {
        setTableNumber(String(data.tableNumber));
      }
    } catch (err) {
      // Fall back to local cart
      setApiCart(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId, tableNumber, setTableNumber]);

  useEffect(() => {
    loadCart();
  }, []);

  // Determine which cart to display: API cart takes priority
  const displayCart = apiCart?.items?.length > 0
    ? apiCart.items.map(item => ({
        id: item.itemId || item.id,
        itemId: item.itemId || item.id,
        name: item.name,
        nameTranslations: item.nameTranslations,
        descriptionTranslations: item.descriptionTranslations,
        price: item.price,
        quantity: item.quantity,
        image: item.imageUrl || item.image,
        tableNumber: apiCart.tableNumber,
        prepTime: item.prepTime || 15,
      }))
    : localCart;

  const effectiveTableNumber = apiCart?.tableNumber
    ? String(apiCart.tableNumber)
    : tableNumber;

  const subtotal = displayCart.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const itemCount = displayCart.reduce((s, i) => s + i.quantity, 0);
  const prepTime = displayCart.length > 0 ? Math.max(...displayCart.map(i => i.prepTime || 15)) : 0;

  const handleQuantityChange = async (itemId, newQty) => {
    setUpdatingItem(itemId);
    try {
      if (newQty <= 0) {
        await removeCartItem(sessionId, itemId);
      } else {
        await updateCartItem(sessionId, itemId, newQty);
      }
      await loadCart();
      onUpdateQuantity(itemId, newQty); // also update local state
    } catch {
      // fallback to local
      onUpdateQuantity(itemId, newQty);
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCartAPI(sessionId);
      setApiCart({ items: [], total: 0, tableNumber: effectiveTableNumber });
    } catch {}
    onClearCart();
  };

  const handleChangeTable = (newTable) => {
    setTableNumber(newTable);
    setShowChangeTable(false);
    // Update cart on API with new table number
    if (apiCart && apiCart.items?.length > 0) {
      saveCart(sessionId, newTable, apiCart.items).then(loadCart).catch(() => {});
    }
    // Update all local cart items
    if (onCartRefreshed) onCartRefreshed(newTable);
  };

  const handleCheckout = () => {
    if (!effectiveTableNumber) {
      setShowChangeTable(true);
      return;
    }
    onCheckout();
  };

  if (loading) {
    return (
      <div className="cart-empty">
        <RefreshCw className="cart-empty-icon" style={{ animation: "spin 1s linear infinite" }} />
        <h2>{t("loadingCart")}</h2>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (displayCart.length === 0) {
    return (
      <div className="cart-empty">
        <ShoppingCart className="cart-empty-icon" />
        <h2>{t("cartEmpty")}</h2>
        <p>{t("cartEmptyDesc")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="cart-container">
        {/* Header */}
        <div className="cart-header">
          <h2 className="cart-title">{t("yourCart")}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Change Table button */}
            <button
              className="cart-change-table-btn"
              onClick={() => setShowChangeTable(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 20,
                border: "1.5px solid #fb923c", background: "#fff7ed",
                color: "#c2410c", fontSize: "0.8rem", fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Edit2 size={13} />
              {effectiveTableNumber ? `${t("table")} ${effectiveTableNumber}` : t("setTable")}
            </button>
            <button className="cart-clear-btn" onClick={handleClearCart}>
              <Trash2 size={14} /> {t("clearAll")}
            </button>
          </div>
        </div>

        {/* Table Number Info */}
        {effectiveTableNumber && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8,
            padding: "8px 14px", marginBottom: 12, display: "flex",
            alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#15803d"
          }}>
            🪑 <strong>{t("table")} {effectiveTableNumber}</strong> — {t("deliveredHere")}
          </div>
        )}
        {!effectiveTableNumber && (
          <div style={{
            background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8,
            padding: "8px 14px", marginBottom: 12, display: "flex",
            alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#92400e"
          }}>
            ⚠️ {t("tableRequired")} — <button
              onClick={() => setShowChangeTable(true)}
              style={{ background: "none", border: "none", color: "#b45309", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
            >{t("setTableNumber")}</button>
          </div>
        )}

        {/* Items */}
        <div className="cart-items">
          {displayCart.map((item) => (
            <div key={item.id} className="cart-item">
              {item.image && (
                <img
                  src={item.image}
                  alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                  className="cart-item-img"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              <div className="cart-item-info">
                <p className="cart-item-name">{item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}</p>
                {effectiveTableNumber && (
                  <p className="cart-item-table">🪑 {t("table")} {effectiveTableNumber}</p>
                )}
                <p className="cart-item-unit">₹{item.price} {t("perItem")}</p>
                <div className="cart-qty-row">
                  <button
                    className="qty-btn"
                    onClick={() => handleQuantityChange(item.id || item.itemId, item.quantity - 1)}
                    disabled={updatingItem === (item.id || item.itemId)}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-value">
                    {updatingItem === (item.id || item.itemId) ? "..." : item.quantity}
                  </span>
                  <button
                    className="qty-btn"
                    onClick={() => handleQuantityChange(item.id || item.itemId, item.quantity + 1)}
                    disabled={updatingItem === (item.id || item.itemId)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="cart-item-right">
                <p className="cart-item-total">₹{(item.price * item.quantity).toFixed(2)}</p>
                <button
                  className="cart-delete-btn"
                  onClick={() => handleQuantityChange(item.id || item.itemId, 0)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <div className="summary-row">
            <span>{t("items")} ({itemCount})</span>
            <span>{itemCount} {t("items").toLowerCase()}</span>
          </div>
          <div className="summary-row">
            <span>{t("subtotal")}</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>{t("gst")} (5%)</span>
            <span>₹{tax.toFixed(2)}</span>
          </div>
          {prepTime > 0 && (
            <div className="summary-row muted">
              <span>⏱ {t("estPrepTime")}</span>
              <span>~{prepTime} {t("min")}</span>
            </div>
          )}
          <div className="summary-row total-row">
            <span>{t("total")}</span>
            <span className="total-amount">₹{total.toFixed(2)}</span>
          </div>

          {/* Validation warning */}
          {!effectiveTableNumber && (
            <p style={{ color: "#dc2626", fontSize: "0.82rem", textAlign: "center", marginBottom: 6 }}>
              ⚠️ {t("pleaseSetTable")}
            </p>
          )}

          <button className="checkout-btn" onClick={handleCheckout}>
            {t("placeOrder")} →
          </button>
        </div>
      </div>

      {showChangeTable && (
        <ChangeTableModal
          currentTable={effectiveTableNumber}
          onConfirm={handleChangeTable}
          onCancel={() => setShowChangeTable(false)}
          language={language}
        />
      )}
    </>
  );
}
