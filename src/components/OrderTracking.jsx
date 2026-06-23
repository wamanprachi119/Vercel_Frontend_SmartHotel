import { useEffect, useState } from "react";
import "../styles/components.css";
import {
  CheckCircle, Clock, ChefHat, Package, UtensilsCrossed, CreditCard,
} from "lucide-react";
import { getOrder } from "../services/api";
import { useTranslation } from "../hooks/useTranslation";

export default function OrderTracking({ order, onFoodServed, language }) {
  const t = useTranslation(language);
  const [currentOrder, setCurrentOrder] = useState(order);
  const [elapsed, setElapsed] = useState(0);
  const [servedTriggered, setServedTriggered] = useState(false);

  const statusSteps = [
    { status: "pending",   label: t("pending"),   icon: CheckCircle,     color: "#6b7280" },
    { status: "accepted",  label: t("accepted"),  icon: Clock,           color: "#3b82f6" },
    { status: "preparing", label: t("preparing"), icon: ChefHat,         color: "#f59e0b" },
    { status: "ready",     label: t("ready"),     icon: Package,         color: "#10b981" },
    { status: "served",    label: t("served"),    icon: UtensilsCrossed, color: "#e65c00" },
    { status: "paid",      label: t("paid"),      icon: CreditCard,      color: "#7c3aed" },
  ];

  const statusMessages = {
    pending:   "⏳ " + t("pending") + "...",
    accepted:  "✅ " + t("accepted") + ".",
    preparing: "👨‍🍳 " + t("preparing") + "...",
    ready:     "🎉 " + t("ready") + "!",
    served:    "🍽️ " + t("served") + "!",
    paid:      "✅ " + t("paid") + ".",
  };

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const fresh = await getOrder(order.id);
        if (cancelled) return;
        if (fresh) {
          const normalized = {
            ...fresh,
            items: fresh.items?.map((item) => ({
              ...item,
              image: item.imageUrl || item.image,
            })),
            timestamp: fresh.createdAt
              ? new Date(fresh.createdAt).getTime()
              : (order.timestamp || Date.now()),
          };
          setCurrentOrder(normalized);
          if (
            fresh.status === "served" &&
            fresh.paymentStatus !== "completed" &&
            !servedTriggered
          ) {
            setServedTriggered(true);
            setTimeout(() => onFoodServed(normalized), 2500);
          }
        }
      } catch {
        // keep last known state
      }
    };
    check();
    const interval = setInterval(check, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [order.id, onFoodServed, servedTriggered]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!currentOrder) return null;

  const visibleSteps = currentOrder.paymentStatus === "completed"
    ? statusSteps
    : statusSteps.slice(0, 5);

  const currentStepIndex = visibleSteps.findIndex(
    (s) => s.status === currentOrder.status
  );

  const progressPercent =
    currentStepIndex >= 0
      ? (currentStepIndex / (visibleSteps.length - 1)) * 100
      : 0;

  return (
    <div className="tracking-wrapper">
      <div className="tracking-card">
        <div className="tracking-header">
          <h2 className="tracking-title">{t("orderTrackerTitle")}</h2>
          <div className="tracking-meta">
            <span className="order-id">#{currentOrder.id.slice(-8)}</span>
            {currentOrder.tableNumber && (
              <span className="order-table">🪑 {t("tableLabel")} {currentOrder.tableNumber}</span>
            )}
          </div>
        </div>

        {/* Workflow Banner */}
        <div className="workflow-banner">
          {[
            { step: 1, label: t("orderPlacedStep"), emoji: "📋", done: true },
            { step: 2, label: t("foodPrepared"),    emoji: "👨‍🍳", done: ["preparing","ready","served","paid"].includes(currentOrder.status) },
            { step: 3, label: t("foodServed"),      emoji: "🍽️", done: ["served","paid"].includes(currentOrder.status) },
            { step: 4, label: t("payment"),         emoji: "💳", done: currentOrder.paymentStatus === "completed" },
            { step: 5, label: t("feedback"),        emoji: "⭐", done: false },
          ].map((w, i, arr) => (
            <div key={w.step} className="wf-item">
              <div className={`wf-circle ${w.done ? "wf-done" : ""}`}>
                <span>{w.emoji}</span>
              </div>
              <span className={`wf-label ${w.done ? "wf-label-done" : ""}`}>{w.label}</span>
              {i < arr.length - 1 && <div className={`wf-line ${w.done ? "wf-line-done" : ""}`} />}
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Steps */}
        <div className="steps-row">
          {visibleSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <div key={step.status} className="step-item">
                <div
                  className={`step-circle ${isCompleted ? "done" : ""} ${isCurrent ? "current" : ""}`}
                  style={isCurrent ? { background: step.color, borderColor: step.color } : {}}
                >
                  <Icon size={18} />
                </div>
                <p className={`step-label ${isCompleted ? "done" : ""}`}>{step.label}</p>
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="status-msg-box">
          <p>{statusMessages[currentOrder.status] || "..."}</p>
        </div>

        {/* Payment Status Badge */}
        {currentOrder.paymentStatus === "completed" && (
          <div className="payment-done-badge">
            <CreditCard size={14} /> {t("paymentCompleted")}
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="tracking-items-card">
        <h3 className="tracking-items-title">{t("orderItems")}</h3>
        <div className="tracking-items-list">
          {currentOrder.items?.map((item, idx) => (
            <div key={item.id ?? idx} className="tracking-item">
              <img
                src={item.image || item.imageUrl}
                alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                className="tracking-item-img"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <div className="tracking-item-info">
                <p className="tracking-item-name">
                  {item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                </p>
                <p className="tracking-item-qty">{t("qty")}: {item.quantity}</p>
              </div>
              <p className="tracking-item-price">
                ₹{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="tracking-total">
          <span>{t("total")}</span>
          <span className="tracking-total-amount">
            ₹{currentOrder.total?.toFixed(2)}
          </span>
        </div>
        {currentOrder.paymentMethod && (
          <div className="tracking-total" style={{marginTop:8,fontSize:"0.82rem",color:"#6b7280"}}>
            <span>{t("paidVia")}</span>
            <span style={{textTransform:"capitalize"}}>{currentOrder.paymentMethod}</span>
          </div>
        )}
      </div>
    </div>
  );
}
