import { useState, useEffect, useCallback } from "react";
import {
  ShoppingCart, ChefHat, MessageCircle, Mic, Search, ArrowLeft, Globe,
} from "lucide-react";

import { LanguageSelector } from "./components/LanguageSelector";
import MenuBrowser from "./components/MenuBrowser";
import { menuData } from "./data/menuData";
import { Payment } from "./components/Payment";
import OrderTracking from "./components/OrderTracking";
import { Feedback } from "./components/Feedback";
import { KitchenDashboard } from "./components/KitchenDashboard";
import { VoiceAssistant } from "./components/VoiceAssistant";
import { Chatbot } from "./components/Chatbot";
import { Cart } from "./components/Cart";
import Sidebar from "./components/Sidebar";
import { PaymentConfirmation } from "./components/PaymentConfirmation";
import PreviousOrders from "./components/PreviousOrders";

import { useTable } from "./context/TableContext";
import { useLanguage } from "./context/LanguageContext";
import { useTranslation } from "./hooks/useTranslation";
import {
  placeOrder, savePayment, submitFeedback,
  addCartItem, getCart,
} from "./services/api";
import "./App.css";

// ── Session helper ─────────────────────────────────────────────
function getSessionId() {
  let sid = localStorage.getItem("smartHotelSessionId");
  if (!sid) {
    sid = "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("smartHotelSessionId", sid);
  }
  return sid;
}

export default function App() {
  const { tableNumber, setTableNumber } = useTable();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation(language);

  const [currentView, setCurrentView]       = useState("menu");
  const [viewHistory, setViewHistory]       = useState([]);
  const [cart, setCart]                     = useState([]);
  const [cartCount, setCartCount]           = useState(0);
  const [currentOrder, setCurrentOrder]     = useState(null);
  const [showVoiceAssistant, setShowVA]     = useState(false);
  const [showChatbot, setShowChatbot]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [orderError, setOrderError]         = useState(null);
  const [showLangMenu, setShowLangMenu]     = useState(false);

  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
    { code: "mr", name: "मराठी", flag: "🇮🇳" },
  ];

  const sessionId = getSessionId();

  const navigateTo = (view) => {
    setViewHistory((prev) => [...prev, currentView]);
    setCurrentView(view);
  };

  const navigateBack = () => {
    if (!viewHistory.length) return;
    const prev = viewHistory[viewHistory.length - 1];
    setViewHistory((h) => h.slice(0, -1));
    setCurrentView(prev);
  };

  // Load cart from localStorage on init (instant, no API wait)
  useEffect(() => {
    const saved = localStorage.getItem("hotelCart");
    if (saved) { try { setCart(JSON.parse(saved)); } catch {} }
  }, []);

  // Save cart to localStorage when changed
  useEffect(() => {
    localStorage.setItem("hotelCart", JSON.stringify(cart));
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    setCartCount(count);
  }, [cart]);

  // Sync cart count from API (non-blocking, background)
  const refreshCartCount = useCallback(async () => {
    try {
      const data = await getCart(sessionId);
      if (data?.items && data.items.length > 0) {
        const count = data.items.reduce((s, i) => s + (i.quantity || 0), 0);
        setCartCount(count);
        const localItems = data.items.map(item => {
          // Try to preserve translations: prefer API-provided, otherwise lookup from local menuData
          const original = menuData.find(d => (d.id && (d.id === item.itemId || d.id === item.id)) || (d.itemId && (d.itemId === item.itemId || d.itemId === item.id)));
          return {
            id: item.itemId || item.id,
            itemId: item.itemId || item.id,
            name: item.name,
            nameTranslations: item.nameTranslations || (original && original.nameTranslations) || undefined,
            descriptionTranslations: item.descriptionTranslations || (original && original.descriptionTranslations) || undefined,
            price: item.price,
            quantity: item.quantity,
            image: item.imageUrl || item.image,
            tableNumber: data.tableNumber || tableNumber,
            prepTime: item.prepTime || 15,
          };
        });
        setCart(localItems);
        localStorage.setItem("hotelCart", JSON.stringify(localItems));
      }
    } catch {
      // API unavailable — keep local state, no error shown
    }
  }, [sessionId, tableNumber]);

  const addToCart = async (item) => {
    // Optimistic local update (instant)
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      return existing
        ? prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...item, quantity: 1, tableNumber }];
    });

    // API sync in background (non-blocking)
    try {
      await addCartItem(sessionId, {
        id: item.id,
        name: item.name,
        nameTranslations: item.nameTranslations,
        descriptionTranslations: item.descriptionTranslations,
        price: item.price,
        quantity: 1,
        imageUrl: item.image || item.imageUrl,
        prepTime: item.prepTime || 15,
        tableNumber: item.tableNumber || tableNumber,
      });
    } catch {
      // Silently ignore — local state already updated
    }
  };

  const updateQuantity = async (id, quantity) => {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => i.id === id ? { ...i, quantity } : i)
    );
  };

  const clearCart = () => {
    setCart([]);
    setCartCount(0);
  };

  const handleCartTableRefresh = (newTable) => {
    setCart(prev => prev.map(item => ({ ...item, tableNumber: newTable })));
  };

  // ── STEP 1: Place order → tracking ──────────────────────────
  const handleOrderPlaced = async () => {
    setOrderError(null);
    if (!tableNumber) {
      setOrderError(t("tableRequired"));
      return;
    }
    try {
      const order = await placeOrder(tableNumber, cart, sessionId);
      setCurrentOrder(order);
      clearCart();
      navigateTo("tracking");
    } catch (err) {
      setOrderError(t("failedToPlaceOrder") + ": " + err.message);
    }
  };

  // ── STEP 2: Food served → payment ────────────────────────────
  const handleFoodServed = (order) => {
    setCurrentOrder(order);
    navigateTo("payment");
  };

  // ── STEP 3: Payment complete → confirmation ──────────────────
  const handlePaymentComplete = async (paymentMethod, paymentData) => {
    const subtotal = currentOrder.total;
    const tax      = subtotal * 0.05;
    const grand    = subtotal + tax;

    const payment = await savePayment({
      orderId: currentOrder.id,
      method: paymentMethod,
      amount: subtotal,
      tax,
      grandTotal: grand,
      tableNumber: currentOrder.tableNumber || tableNumber,
      ...paymentData,
    });

    const updatedOrder = {
      ...currentOrder,
      paymentStatus: "completed",
      paymentMethod,
      paymentId: payment.id,
      status: "paid",
    };
    setCurrentOrder(updatedOrder);
    setPaymentDetails({ ...payment, amount: subtotal, tax, grandTotal: grand, timestamp: Date.now() });
    navigateTo("payment-confirmation");
  };

  // ── STEP 4: Feedback ─────────────────────────────────────────
  const handleGoToFeedback = () => navigateTo("feedback");

  const handleFeedbackComplete = () => {
    setCurrentOrder(null);
    setPaymentDetails(null);
    setViewHistory([]);
    setCurrentView("menu");
  };

  // Reorder from previous orders
  const handleReorder = (order) => {
    const items = order.items || order.orderItems || [];
    items.forEach(item => {
      addToCart({
        id: item.itemId || item.id,
        name: item.name,
        nameTranslations: item.nameTranslations,
        descriptionTranslations: item.descriptionTranslations,
        price: item.price,
        image: item.imageUrl || item.image,
        prepTime: item.prepTime || 15,
        tableNumber: order.tableNumber || tableNumber,
      });
    });
    navigateTo("cart");
  };

  if (!language) return <LanguageSelector onSelectLanguage={setLanguage} />;

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} setCurrentView={navigateTo} language={language} />

      <div className="main-content">
        {/* HEADER */}
        <header className="header">
          <div className="header-left">
            {viewHistory.length > 0 && (
              <button className="icon-btn back-btn" onClick={navigateBack} style={{ marginRight: 4 }}>
                <ArrowLeft size={20} />
              </button>
            )}
            <ChefHat className="logo-icon" />
            <div>
              <h1 className="hotel-title">Smart Hotel</h1>
              {tableNumber && <p className="table-text">🪑 {t("table")}: {tableNumber}</p>}
            </div>
          </div>

          <div className="search-wrapper">
            <Search className="search-icon" />
            <input
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("searchDishes")}
            />
          </div>

          <div className="header-buttons">
            <button className="icon-btn" onClick={() => setShowVA(true)}><Mic /></button>
            <button className="icon-btn" onClick={() => setShowChatbot(true)}><MessageCircle /></button>
            <div style={{ position: "relative", display: "inline-block" }}>
              <button 
                className="icon-btn" 
                onClick={() => setShowLangMenu(!showLangMenu)}
                title="Change language"
              >
                <Globe size={20} />
              </button>
              {showLangMenu && (
                <div style={{
                  position: "absolute", top: "100%", right: 0,
                  background: "#fff", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  border: "1px solid #e5e7eb", zIndex: 1000, minWidth: 140, marginTop: 4
                }}>
                  {languages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setShowLangMenu(false);
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", padding: "10px 14px", border: "none",
                        background: language === lang.code ? "#fff7ed" : "#fff",
                        color: language === lang.code ? "#c2410c" : "#374151",
                        fontSize: "0.9rem", fontWeight: language === lang.code ? 600 : 500,
                        cursor: "pointer", borderBottom: lang.code !== "mr" ? "1px solid #f3f4f6" : "none",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        if (language !== lang.code) {
                          e.target.style.background = "#f9fafb";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (language !== lang.code) {
                          e.target.style.background = "#fff";
                        }
                      }}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                      {language === lang.code && <span style={{ marginLeft: "auto" }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="icon-btn cart-btn" onClick={() => navigateTo("cart")}>
              <ShoppingCart />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </header>

        {/* ORDER ERROR BANNER */}
        {orderError && (
          <div className="error-banner" style={{
            background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626",
            padding: "10px 16px", margin: "0 0 8px 0", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 8, fontSize: "0.9rem"
          }}>
            ⚠️ {orderError}
            <button
              onClick={() => setOrderError(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1.1rem" }}
            >✕</button>
          </div>
        )}

        {/* PAGES */}
        <main className="page">
          {currentView === "menu" && (
            // FIX 2: key={language} forces MenuBrowser to remount on language change,
            // ensuring all menu item names, descriptions, and category labels update
            <MenuBrowser
              key={language}
              language={language}
              onAddToCart={addToCart}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}

          {currentView === "cart" && (
            <Cart
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onClearCart={clearCart}
              onCheckout={handleOrderPlaced}
              language={language}
              onCartRefreshed={handleCartTableRefresh}
            />
          )}

          {currentView === "orders" && (
            <PreviousOrders
              language={language}
              onReorder={handleReorder}
            />
          )}

          {currentView === "tracking" && currentOrder && (
            <OrderTracking
              order={currentOrder}
              onFoodServed={handleFoodServed}
              language={language}
            />
          )}

          {currentView === "tracking" && !currentOrder && (
            <div className="empty-state">
              <p>{t("noActiveOrder")}</p>
              <button className="btn-primary" onClick={() => navigateTo("menu")}>{t("browseMenu")}</button>
            </div>
          )}

          {currentView === "payment" && currentOrder && (
            <Payment
              cart={currentOrder.items}
              order={currentOrder}
              onPaymentComplete={handlePaymentComplete}
              onBack={navigateBack}
              language={language}
            />
          )}

          {currentView === "payment-confirmation" && paymentDetails && (
            <PaymentConfirmation
              payment={paymentDetails}
              order={currentOrder}
              onContinue={handleGoToFeedback}
              language={language}
            />
          )}

          {currentView === "feedback" && currentOrder && (
            <Feedback
              order={currentOrder}
              onComplete={handleFeedbackComplete}
              language={language}
            />
          )}

          {currentView === "kitchen" && (
            <KitchenDashboard language={language} />
          )}
        </main>

        {showVoiceAssistant && (
          <VoiceAssistant onClose={() => setShowVA(false)} onAddToCart={addToCart} language={language} />
        )}
        {showChatbot && (
          <Chatbot onClose={() => setShowChatbot(false)} language={language} />
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {[
          { id: "menu",     label: t("menu"),           emoji: "🍽️" },
          { id: "cart",     label: t("cart"),           emoji: "🛒", badge: cartCount },
          { id: "orders",   label: t("previousOrders"), emoji: "📋" },
          { id: "tracking", label: t("myOrders"),       emoji: "📦" },
          { id: "kitchen",  label: t("kitchen"),        emoji: "👨‍🍳" },
        ].map((item) => (
          <button
            key={item.id}
            className={`mobile-nav-btn ${currentView === item.id ? "active" : ""}`}
            onClick={() => navigateTo(item.id)}
          >
            <span className="mobile-nav-emoji">{item.emoji}</span>
            {item.badge > 0 && <span className="mobile-nav-badge">{item.badge}</span>}
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
