// ── Smart Hotel API Configuration ─────────────────────────────
export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return await res.json();
}

// ─── Orders ──────────────────────────────────────────────────
export async function createOrder(tableNumber, items) {
  return request("POST", "/api/orders", {
    tableNumber,
    items: items.map((i) => ({
      itemId:   i.id || i.itemId,
      name:     i.name,
      price:    i.price,
      quantity: i.quantity,
      imageUrl: i.image || i.imageUrl,
      prepTime: i.prepTime || 0,
      tableNumber,
    })),
  });
}

export async function getOrder(id) {
  return request("GET", `/api/orders/${id}`);
}

export async function getAllOrders(status, tableNumber) {
  const params = new URLSearchParams();
  if (status)      params.set("status", status);
  if (tableNumber) params.set("tableNumber", tableNumber);
  const qs = params.toString();
  return request("GET", `/api/orders${qs ? "?" + qs : ""}`);
}

export async function updateOrderStatus(id, status) {
  return request("PATCH", `/api/orders/${id}/status`, { status });
}

export async function deleteOrder(id) {
  return request("DELETE", `/api/orders/${id}`);
}

// ─── Payments ────────────────────────────────────────────────
export async function createPayment(data) {
  return request("POST", "/api/payments", data);
}

export async function getPayment(id) {
  return request("GET", `/api/payments/${id}`);
}

// ─── Feedback ────────────────────────────────────────────────
export async function createFeedback(data) {
  return request("POST", "/api/feedback", data);
}

// ─── Cart ─────────────────────────────────────────────────────
export async function getCart(sessionId) {
  return request("GET", `/api/cart/${sessionId}`);
}

export async function saveCart(sessionId, tableNumber, items) {
  return request("PUT", "/api/cart", {
    sessionId,
    tableNumber,
    items: items.map((i) => ({
      itemId:   i.id || i.itemId,
      name:     i.name,
      price:    i.price,
      quantity: i.quantity,
      imageUrl: i.image || i.imageUrl,
      prepTime: i.prepTime || 0,
    })),
  });
}

export async function addCartItem(sessionId, item) {
  return request("POST", `/api/cart/${sessionId}/items`, {
    itemId:   item.id || item.itemId,
    name:     item.name,
    price:    item.price,
    quantity: item.quantity || 1,
    imageUrl: item.image || item.imageUrl,
    prepTime: item.prepTime || 0,
  });
}

export async function updateCartItem(sessionId, itemId, quantity) {
  return request("PATCH", `/api/cart/${sessionId}/items/${itemId}`, { quantity });
}

export async function removeCartItem(sessionId, itemId) {
  return request("DELETE", `/api/cart/${sessionId}/items/${itemId}`);
}

export async function clearCart(sessionId) {
  return request("DELETE", `/api/cart/${sessionId}`);
}

// ─── Unified helpers (API first, localStorage fallback) ──────
export async function placeOrder(tableNumber, cart, sessionId) {
  try {
    const order = await createOrder(tableNumber, cart);
    // FIX: clear the server-side cart now that the order has been placed,
    // so previously-ordered items never resurface in the cart on reload.
    if (sessionId) {
      try { await clearCart(sessionId); } catch { /* non-fatal */ }
    }
    return {
      ...order,
      items: order.items || cart.map((i) => ({ ...i, tableNumber })),
      total: order.total ?? cart.reduce((s, i) => s + i.price * i.quantity, 0),
      status: order.status || "pending",
      paymentStatus: order.paymentStatus || "pending",
      timestamp: order.createdAt ? new Date(order.createdAt).getTime() : Date.now(),
      tableNumber,
    };
  } catch (err) {
    // ── Offline fallback: create order locally ──
    console.warn("API unavailable, using local order fallback:", err.message);
    const orderId = "ORD-LOCAL-" + Date.now();
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const localOrder = {
      id: orderId,
      tableNumber,
      status: "pending",
      paymentStatus: "pending",
      total,
      items: cart.map((i) => ({
        itemId: i.id || i.itemId,
        id: i.id || i.itemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        imageUrl: i.image || i.imageUrl,
        prepTime: i.prepTime || 15,
        tableNumber,
      })),
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      isLocal: true,
    };
    // Persist locally
    const stored = JSON.parse(localStorage.getItem("localOrders") || "[]");
    stored.push(localOrder);
    localStorage.setItem("localOrders", JSON.stringify(stored));
    // Also clear server-side cart in the offline/local-fallback path, if reachable
    if (sessionId) {
      try { await clearCart(sessionId); } catch { /* non-fatal */ }
    }
    return localOrder;
  }
}

export async function savePayment(paymentData) {
  try {
    return await createPayment({
      orderId:       paymentData.orderId,
      method:        paymentData.method,
      amount:        paymentData.amount,
      tax:           paymentData.tax,
      grandTotal:    paymentData.grandTotal,
      tableNumber:   paymentData.tableNumber,
      transactionId: paymentData.transactionId,
      upiRef:        paymentData.upiRef,
      upiId:         paymentData.upiId,
      cardLast4:     paymentData.cardLast4,
      wallet:        paymentData.wallet,
    });
  } catch {
    // Offline fallback
    const localPayment = {
      id: "PAY-LOCAL-" + Date.now(),
      ...paymentData,
      status: "completed",
      createdAt: new Date().toISOString(),
      isLocal: true,
    };
    const stored = JSON.parse(localStorage.getItem("localPayments") || "[]");
    stored.push(localPayment);
    localStorage.setItem("localPayments", JSON.stringify(stored));
    return localPayment;
  }
}

export async function submitFeedback(feedbackData) {
  try {
    return await createFeedback(feedbackData);
  } catch {
    // Offline fallback — silently save locally
    const stored = JSON.parse(localStorage.getItem("localFeedback") || "[]");
    stored.push({ ...feedbackData, createdAt: new Date().toISOString(), isLocal: true });
    localStorage.setItem("localFeedback", JSON.stringify(stored));
    return { success: true, isLocal: true };
  }
}

// ─── Menu ─────────────────────────────────────────────────────
export async function getMenu() {
  return request("GET", "/api/Menu");
}

export async function getMenuCategories() {
  return request("GET", "/api/Menu/categories");
}

// ─── Notifications ────────────────────────────────────────────
export async function getNotifications() {
  return request("GET", "/api/Notifications");
}

// ─── Language Preference ──────────────────────────────────────
/**
 * Save the user's language selection to the database.
 * Called when the user clicks "Continue" on the Language Selection page.
 * Fails silently — sessionStorage/localStorage is the source of truth if API is down.
 */
export async function saveLanguagePreference(sessionId, languageCode) {
  try {
    return await request("POST", "/api/language-preference", { sessionId, languageCode });
  } catch {
    // API unavailable — language already saved in sessionStorage/localStorage
    return { saved: false, isLocal: true };
  }
}
