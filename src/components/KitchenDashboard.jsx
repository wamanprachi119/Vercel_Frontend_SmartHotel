import { useEffect, useState, useCallback } from "react";
import { CheckCircle, Trash2, RefreshCw, Lock, LogOut, UserPlus, Eye, EyeOff, Users, AlertCircle, X } from "lucide-react";
import { getAllOrders, updateOrderStatus as apiUpdateStatus, deleteOrder as apiDeleteOrder } from "../services/api";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/components.css";

const STAFF_CREDENTIALS = {
  Prachi_Waman: { password: "Prachi@2004", role: "manager", label: "Manager" },
  chef1:        { password: "chef123",     role: "chef",    label: "Chef"    },
  chef2:        { password: "chef456",     role: "chef",    label: "Chef"    },
};

const ACTIVE_SESSIONS = {};
const SESSION_KEY = "smarthotel_staff_session";
const SESSION_TTL = 24 * 60 * 60 * 1000;

function saveSession(data) { localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, savedAt: Date.now() })); }
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (Date.now() - s.savedAt > SESSION_TTL) { localStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch { return null; }
}
function clearSession() { localStorage.removeItem(SESSION_KEY); }

// ── Inline toast notification (replaces alert()) ──────────────
function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const bg    = type === "error"   ? "#fef2f2" : type === "success" ? "#f0fdf4" : "#fffbeb";
  const color = type === "error"   ? "#b91c1c" : type === "success" ? "#15803d" : "#92400e";
  const border= type === "error"   ? "#fca5a5" : type === "success" ? "#86efac" : "#fde68a";

  return (
    <div style={{
      position: "fixed", top: 18, right: 18, zIndex: 9999,
      background: bg, color, border: `1.5px solid ${border}`,
      borderRadius: 10, padding: "12px 18px", display: "flex",
      alignItems: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      maxWidth: 380, fontSize: "0.9rem", fontWeight: 500,
    }}>
      <AlertCircle size={18} />
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color, padding: 2 }}>
        <X size={16} />
      </button>
    </div>
  );
}

function KitchenLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = () => {
    const cred = STAFF_CREDENTIALS[username];
    if (cred && cred.password === password) {
      const sessionData = { username, role: cred.role, label: cred.label };
      ACTIVE_SESSIONS[username] = { ...sessionData, loginTime: new Date() };
      saveSession(sessionData);
      onLogin(sessionData);
    } else {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="kitchen-login-wrap">
      <div className="kitchen-login-card">
        <div className="kitchen-login-icon">🔐</div>
        <h2 className="kitchen-login-title">Kitchen Access</h2>
        <p className="kitchen-login-sub">Staff login required</p>
        <div className="kitchen-login-form">
          <div className="kl-field">
            <label>Username</label>
            <input type="text" placeholder="Enter username" value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          </div>
          <div className="kl-field">
            <label>Password</label>
            <div className="kl-pwd-wrap">
              <input type={showPwd ? "text" : "password"} placeholder="Enter password" value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              <button className="kl-eye" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="kl-error">{error}</p>}
          <button className="kl-login-btn" onClick={handleLogin}>
            <Lock size={16} /> Login to Kitchen
          </button>
          <div className="kl-hint">
            <p>Demo: <b>Prachi_Waman</b> / Prachi@2004 (manager)</p>
            <p>Or: <b>chef1</b> / chef123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KitchenDashboard({ language }) {
  const t = useTranslation(language);
  const [staff, setStaff]             = useState(() => loadSession());
  const [orders, setOrders]           = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [addChefOpen, setAddChefOpen] = useState(false);
  const [showStaffPanel, setShowStaffPanel] = useState(false);
  const [newChefUser, setNewChefUser] = useState("");
  const [newChefPass, setNewChefPass] = useState("");
  const [chefMsg, setChefMsg]         = useState("");
  const [toast, setToast]             = useState(null); // { message, type }
  const [updatingIds, setUpdatingIds] = useState(new Set()); // track in-flight updates
  const [backendOnline, setBackendOnline] = useState(true);

  const showToast = useCallback((message, type = "error") => {
    setToast({ message, type });
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const apiOrders = await getAllOrders();
      if (Array.isArray(apiOrders)) {
        const normalized = apiOrders.map((o) => ({
          ...o,
          id: o.id || o.Id,
          timestamp: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
        }));
        setOrders(normalized.sort((a, b) => b.timestamp - a.timestamp));
        setLastRefresh(new Date());
        setBackendOnline(true);
      }
    } catch (err) {
      console.warn("[Kitchen] Failed to load orders from API:", err.message);
      setBackendOnline(false);
      // Load from localStorage as fallback
      const localOrders = JSON.parse(localStorage.getItem("localOrders") || "[]");
      if (localOrders.length > 0) {
        const normalized = localOrders.map((o) => ({
          ...o,
          timestamp: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
        }));
        setOrders(normalized.sort((a, b) => b.timestamp - a.timestamp));
      }
    }
  }, []);

  useEffect(() => {
    if (!staff) return;
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [staff, loadOrders]);

  const updateOrderStatus = async (orderId, status) => {
    // Prevent double-click
    if (updatingIds.has(orderId)) return;

    // Local-only orders: just update localStorage + state
    if (String(orderId).startsWith("ORD-LOCAL-")) {
      const stored = JSON.parse(localStorage.getItem("localOrders") || "[]");
      const updated = stored.map((o) => o.id === orderId ? { ...o, status } : o);
      localStorage.setItem("localOrders", JSON.stringify(updated));
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, status } : o)
      );
      return;
    }

    setUpdatingIds((prev) => new Set(prev).add(orderId));

    // Optimistically update UI immediately
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status, lastUpdatedBy: staff.username, lastUpdatedRole: staff.label }
          : o
      )
    );

    try {
      await apiUpdateStatus(orderId, status);
      // Success — state already updated optimistically, nothing more to do
    } catch (err) {
      console.error("[Kitchen] Status update failed:", err.message);
      // Revert the optimistic update
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: o._prevStatus || o.status } : o
        )
      );
      // Show inline toast instead of alert()
      if (err.message.includes("timed out") || err.message.includes("fetch")) {
        showToast("Cannot reach server. Is the backend running on port 5000?", "error");
      } else {
        showToast(`Failed to update order #${String(orderId).slice(-8)}: ${err.message}`, "error");
      }
      // Reload to get actual state from server
      setTimeout(loadOrders, 500);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const deleteOrder = async (orderId) => {
    if (staff?.role !== "manager") return;

    // Remove from UI immediately
    setOrders((prev) => prev.filter((o) => o.id !== orderId));

    // Local-only orders: just update localStorage
    if (String(orderId).startsWith("ORD-LOCAL-")) {
      const stored = JSON.parse(localStorage.getItem("localOrders") || "[]");
      localStorage.setItem("localOrders", JSON.stringify(stored.filter((o) => o.id !== orderId)));
      return;
    }

    try {
      await apiDeleteOrder(orderId);
    } catch (err) {
      console.error("[Kitchen] Delete failed:", err.message);
      // Already removed from UI — silently ignore
    }
  };

  const addChef = () => {
    if (!newChefUser || !newChefPass) { setChefMsg("Please fill both fields."); return; }
    if (STAFF_CREDENTIALS[newChefUser]) { setChefMsg("Username already exists."); return; }
    STAFF_CREDENTIALS[newChefUser] = { password: newChefPass, role: "chef", label: "Chef" };
    setChefMsg(`Chef "${newChefUser}" added successfully!`);
    setNewChefUser(""); setNewChefPass("");
  };

  const handleLogout = () => {
    if (staff?.username) delete ACTIVE_SESSIONS[staff.username];
    clearSession();
    setStaff(null);
  };

  if (!staff) return <KitchenLogin onLogin={setStaff} />;

  const activeOrders    = orders.filter((o) => o.status !== "served" && o.status !== "paid");
  const completedOrders = orders.filter((o) => o.status === "served" || o.status === "paid");
  const activeChefsOnDuty = Object.entries(ACTIVE_SESSIONS).filter(([, s]) => s.role === "chef");

  const getTimeSince = (ts) => {
    const totalSeconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (totalSeconds < 60) return totalSeconds <= 1 ? "Just now" : `${totalSeconds} sec ago`;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min ago`;
    const totalHours = Math.floor(totalMinutes / 60);
    const remMinutes = totalMinutes % 60;
    if (totalHours < 24) return remMinutes > 0 ? `${totalHours} hr ${remMinutes} min ago` : `${totalHours} hr ago`;
    const totalDays = Math.floor(totalHours / 24);
    return totalDays === 1 ? "1 day ago" : `${totalDays} days ago`;
  };

  const nextStatus = {
    pending:   { label: t("markAsAccepted"),  next: "accepted",  cls: "btn-blue"   },
    accepted:  { label: t("markAsPreparing"), next: "preparing", cls: "btn-orange" },
    preparing: { label: t("markAsReady"),     next: "ready",     cls: "btn-green"  },
    ready:     { label: t("markAsServed") + " ✓", next: "served", cls: "btn-gray" },
  };

  const paymentBadge = (order) => {
    if (order.paymentStatus === "completed" || order.status === "paid") {
      return <span className="pay-status-badge paid">✅ Paid</span>;
    }
    return <span className="pay-status-badge pending">⏳ Unpaid</span>;
  };

  return (
    <div className="kitchen-wrapper">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Backend offline warning */}
      {!backendOnline && (
        <div style={{
          background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8,
          padding: "10px 16px", marginBottom: 12, fontSize: "0.85rem",
          color: "#92400e", display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertCircle size={16} />
          <span>
            ⚠️ Backend server not reachable. Showing cached orders.
            Start the .NET backend on port 5000 and refresh.
          </span>
        </div>
      )}

      <div className="kitchen-header">
        <div>
          <h2 className="kitchen-title">🍳 {t("kitchenDashboard")}</h2>
          <p className="kitchen-role-tag">Logged in as <b>{staff.username}</b> ({staff.label})</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {staff.role === "manager" && (
            <>
              <button className="action-btn btn-blue" onClick={() => setAddChefOpen((v) => !v)}>
                <UserPlus size={14} /> Add Chef
              </button>
              <button className="action-btn btn-purple" onClick={() => setShowStaffPanel((v) => !v)}>
                <Users size={14} /> Staff ({activeChefsOnDuty.length})
              </button>
            </>
          )}
          <div className="kitchen-refresh">
            <RefreshCw size={14} />
            <span>Last: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <button className="action-btn btn-gray" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {showStaffPanel && staff.role === "manager" && (
        <div className="staff-panel">
          <h4>👨‍🍳 Chefs On Duty</h4>
          {activeChefsOnDuty.length === 0 ? (
            <p className="staff-panel-empty">No chefs currently logged in.</p>
          ) : (
            <div className="staff-list">
              {activeChefsOnDuty.map(([username, session]) => (
                <div key={username} className="staff-card">
                  <div className="staff-avatar">👨‍🍳</div>
                  <div className="staff-info">
                    <p className="staff-name">{username}</p>
                    <p className="staff-duration">{Math.floor((Date.now() - new Date(session.loginTime)) / 60000)} min on duty</p>
                  </div>
                  <span className="staff-online-dot">● Online</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {addChefOpen && staff.role === "manager" && (
        <div className="add-chef-panel">
          <h4>➕ Add New Chef</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input placeholder="Chef username" value={newChefUser}
              onChange={(e) => setNewChefUser(e.target.value)} className="kl-mini-input" />
            <input placeholder="Password" type="password" value={newChefPass}
              onChange={(e) => setNewChefPass(e.target.value)} className="kl-mini-input" />
            <button className="action-btn btn-green" onClick={addChef}>Add Chef</button>
          </div>
          {chefMsg && <p style={{ color: "#10b981", fontSize: "0.82rem", marginTop: 6 }}>{chefMsg}</p>}
        </div>
      )}

      {/* Stats */}
      <div className="kitchen-stats">
        {[
          { label: t("allOrders"),    value: orders.length,                                         color: "#6366f1" },
          { label: t("activeOrders"), value: activeOrders.length,                                   color: "#f59e0b" },
          { label: t("preparing"),    value: orders.filter((o) => o.status === "preparing").length, color: "#3b82f6" },
          { label: t("paid"),         value: orders.filter((o) => o.paymentStatus === "completed" || o.status === "paid").length, color: "#10b981" },
        ].map((stat) => (
          <div key={stat.label} className="stat-card" style={{ borderTopColor: stat.color }}>
            <p className="stat-label">{stat.label}</p>
            <h3 className="stat-value" style={{ color: stat.color }}>{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Active Orders */}
      <h3 className="section-title">🔥 {t("activeOrders")}</h3>
      {activeOrders.length === 0 ? (
        <div className="kitchen-empty">
          <CheckCircle size={40} color="#10b981" />
          <p>{t("noItems")}</p>
        </div>
      ) : (
        <div className="kitchen-table-wrap">
          <table className="kitchen-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>{t("tableLabel")}</th>
                <th>{t("orderItems")}</th>
                <th>{t("orderStatus")}</th>
                <th>{t("payment")}</th>
                <th>Time</th>
                <th>Action</th>
                {staff.role === "manager" && <th>Del</th>}
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => {
                const btn = nextStatus[order.status];
                const isUpdating = updatingIds.has(order.id);
                return (
                  <tr key={order.id}>
                    <td className="order-id-cell">
                      #{String(order.id).slice(-8)}
                      {order.isLocal && <span style={{ fontSize: "0.65rem", color: "#f59e0b", marginLeft: 4 }}>(local)</span>}
                    </td>
                    <td><span className="table-badge">{order.tableNumber || "—"}</span></td>
                    <td>
                      <div className="items-list">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="kitchen-item">
                            <span className="item-qty">{item.quantity}×</span>
                            <span>{item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill status-${order.status}`}>{order.status}</span>
                    </td>
                    <td>{paymentBadge(order)}</td>
                    <td className="time-cell">{getTimeSince(order.timestamp)}</td>
                    <td>
                      {btn && (
                        <button
                          className={`action-btn ${btn.cls}`}
                          onClick={() => updateOrderStatus(order.id, btn.next)}
                          disabled={isUpdating}
                          style={{ opacity: isUpdating ? 0.6 : 1 }}
                        >
                          {isUpdating ? "..." : btn.label}
                        </button>
                      )}
                    </td>
                    {staff.role === "manager" && (
                      <td>
                        <button className="delete-btn" onClick={() => deleteOrder(order.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 32 }}>✅ {t("completedOrders")}</h3>
          <div className="kitchen-table-wrap">
            <table className="kitchen-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>{t("tableLabel")}</th>
                  <th>{t("orderItems")}</th>
                  <th>{t("total")}</th>
                  <th>{t("payment")}</th>
                  <th>Time</th>
                  {staff.role === "manager" && <th>Del</th>}
                </tr>
              </thead>
              <tbody>
                {completedOrders.slice(-10).reverse().map((order) => (
                  <tr key={order.id} className="completed-row">
                    <td className="order-id-cell">#{String(order.id).slice(-8)}</td>
                    <td><span className="table-badge">{order.tableNumber || "—"}</span></td>
                    <td>{order.items?.length} item(s)</td>
                    <td>₹{order.total?.toFixed(0)}</td>
                    <td>{paymentBadge(order)}</td>
                    <td className="time-cell">{getTimeSince(order.timestamp)}</td>
                    {staff.role === "manager" && (
                      <td>
                        <button className="delete-btn" onClick={() => deleteOrder(order.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <style>{`
        .pay-status-badge {
          display: inline-block; border-radius: 20px;
          padding: 2px 10px; font-size: 0.73rem; font-weight: 600;
        }
        .pay-status-badge.paid { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
        .pay-status-badge.pending { background: #fefce8; color: #92400e; border: 1px solid #fde68a; }
        .btn-purple { background: #7c3aed !important; color: #fff !important; }
      `}</style>
    </div>
  );
}
