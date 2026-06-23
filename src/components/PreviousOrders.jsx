import { useState, useEffect } from "react";
import { RefreshCw, Package, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { getAllOrders } from "../services/api";
import { useTable } from "../context/TableContext";
import { useTranslation } from "../hooks/useTranslation";

const STATUS_COLOR = {
  pending:    { bg: "#fef3c7", color: "#92400e" },
  preparing:  { bg: "#dbeafe", color: "#1e40af" },
  ready:      { bg: "#d1fae5", color: "#065f46" },
  served:     { bg: "#f3e8ff", color: "#6b21a8" },
  paid:       { bg: "#dcfce7", color: "#15803d" },
  cancelled:  { bg: "#fee2e2", color: "#991b1b" },
};

function StatusBadge({ status, t }) {
  const s = STATUS_COLOR[status?.toLowerCase()] || { bg: "#f3f4f6", color: "#374151" };
  // Map status to translation key
  const labelKey = {
    pending: "pending", preparing: "preparing", ready: "ready",
    served: "served", paid: "paid", cancelled: "cancelled",
  }[status?.toLowerCase()] || status;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600,
      background: s.bg, color: s.color
    }}>{t(labelKey) || status}</span>
  );
}

function OrderCard({ order, language, onReorder, t }) {
  const [expanded, setExpanded] = useState(false);
  const date = order.createdAt ? new Date(order.createdAt).toLocaleString() : "—";
  const items = order.items || order.orderItems || [];
  const total = order.total ?? items.reduce((s, i) => s + (i.price * i.quantity), 0);
  const gst = total * 0.05;
  const grand = total + gst;

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
      padding: 16, marginBottom: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>
            {t("orderId")} #{order.id || order.orderId}
          </p>
          <p style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 2 }}>{date}</p>
          <p style={{ fontSize: "0.78rem", color: "#6b7280" }}>🪑 {t("tableLabel")} {order.tableNumber || "—"}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <StatusBadge status={order.status} t={t} />
          <p style={{ fontWeight: 700, color: "#e65c00", marginTop: 6, fontSize: "1rem" }}>
            ₹{grand.toFixed(2)}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 12px", borderRadius: 16, border: "1px solid #e5e7eb",
            background: "#f9fafb", fontSize: "0.78rem", cursor: "pointer", color: "#374151"
          }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded
            ? t("hideItems") || "Hide"
            : `${t("viewItems") || "View"} ${items.length} ${items.length !== 1 ? (t("dishesPlural") || "items") : (t("dishes") || "item")}`
          }
        </button>
        <button
          onClick={() => onReorder(order)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "5px 12px", borderRadius: 16,
            border: "1.5px solid #fb923c", background: "#fff7ed",
            color: "#c2410c", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer"
          }}
        >
          <RotateCcw size={13} /> {t("reorder") || "Reorder"}
        </button>
      </div>

      {expanded && items.length > 0 && (
        <div style={{ marginTop: 12, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "5px 0",
              borderBottom: idx < items.length - 1 ? "1px dashed #f3f4f6" : "none"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {(item.imageUrl || item.image) && (
                  <img src={item.imageUrl || item.image} alt={
                    item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name
                  }
                    style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }}
                    onError={e => e.target.style.display = "none"}
                  />
                )}
                <div>
                  <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>{
                    item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name
                  }</p>
                  <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>{t("qty")}: {item.quantity} × ₹{item.price}</p>
                </div>
              </div>
              <p style={{ fontWeight: 600, color: "#374151", fontSize: "0.88rem" }}>
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6b7280" }}>
              <span>{t("subtotal")}</span><span>₹{total.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#6b7280" }}>
              <span>{t("gst")}</span><span>₹{gst.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#e65c00", marginTop: 4 }}>
              <span>{t("total")}</span><span>₹{grand.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PreviousOrders({ language, onReorder }) {
  const { tableNumber } = useTable();
  const t = useTranslation(language);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const loadOrders = () => {
    setLoading(true);
    setError(null);
    getAllOrders()
      .then(data => {
        const arr = Array.isArray(data) ? data : (data?.orders || data?.items || []);
        const localOrders = JSON.parse(localStorage.getItem("localOrders") || "[]");
        const apiIds = new Set(arr.map(o => o.id));
        const mergedLocal = localOrders.filter(o => !apiIds.has(o.id));
        const all = [...arr, ...mergedLocal].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setOrders(all);
      })
      .catch(() => {
        const localOrders = JSON.parse(localStorage.getItem("localOrders") || "[]");
        setOrders(localOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        if (localOrders.length === 0) setError(t("failedToFetch") || "Could not connect to server.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const filteredOrders = filter === "all"
    ? orders
    : orders.filter(o => o.status?.toLowerCase() === filter);

  const statusCounts = orders.reduce((acc, o) => {
    const s = o.status?.toLowerCase() || "unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#111827" }}>
          <Package size={20} style={{ verticalAlign: "middle", marginRight: 6, color: "#e65c00" }} />
          {t("previousOrders")}
        </h2>
        <button
          onClick={loadOrders}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 16, border: "1px solid #e5e7eb",
            background: "#fff", fontSize: "0.8rem", cursor: "pointer"
          }}
        >
          <RefreshCw size={13} /> {t("tryAgain") || "Refresh"}
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          ["all", t("filterAll") || "All", orders.length],
          ["pending", t("pending"), statusCounts.pending || 0],
          ["preparing", t("preparing"), statusCounts.preparing || 0],
          ["served", t("served"), statusCounts.served || 0],
          ["paid", t("paid"), statusCounts.paid || 0],
        ].map(([val, label, count]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: "5px 12px", borderRadius: 16,
              border: `1.5px solid ${filter === val ? "#e65c00" : "#e5e7eb"}`,
              background: filter === val ? "#fff7ed" : "#fff",
              color: filter === val ? "#c2410c" : "#6b7280",
              fontSize: "0.78rem", fontWeight: 600, cursor: "pointer"
            }}
          >
            {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          <RefreshCw size={28} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: 8 }}>{t("loadingCart") || "Loading..."}</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {error && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
          padding: "10px 14px", color: "#dc2626", fontSize: "0.85rem"
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && filteredOrders.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <Package size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: "1rem", fontWeight: 600 }}>{t("noItems") || "No orders found"}</p>
          <p style={{ fontSize: "0.85rem", marginTop: 4 }}>{t("noItemsDesc") || "Your order history will appear here"}</p>
        </div>
      )}

      {filteredOrders.map(order => (
        <OrderCard
          key={order.id || order.orderId}
          order={order}
          language={language}
          onReorder={onReorder}
          t={t}
        />
      ))}
    </div>
  );
}
