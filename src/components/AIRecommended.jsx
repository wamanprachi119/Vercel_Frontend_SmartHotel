import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { getSmartRecommendations } from "../utils/aiRecommendations";
import "../styles/AIRecommended.css";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

// ── Table Number Modal ───────────────────────────────────────
function TableModal({ onConfirm, onCancel, language }) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");
  const t = useTranslation(language);

  const confirm = () => {
    if (!val.trim()) { setError(t("tableNumberRequired") || "Table number is required"); return; }
    if (!/^\d+$/.test(val.trim())) { setError(t("numbersOnly") || "Please enter numbers only"); return; }
    onConfirm(val.trim());
  };

  return (
    <div className="table-popup-overlay" onClick={onCancel}>
      <div className="table-popup" onClick={e => e.stopPropagation()}>
        <div className="popup-modal-icon">🪑</div>
        <h4>{t("enterTableNumber")}</h4>
        <p className="popup-modal-sub">{t("tablePrompt")}</p>
        <input
          type="number"
          placeholder={t("tableExample") || "e.g. 7"}
          value={val}
          onChange={e => { setVal(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && confirm()}
          autoFocus
          min="1"
        />
        {error && <p className="popup-error">{error}</p>}
        <div className="table-popup-btns">
          <button onClick={onCancel} className="popup-cancel">{t("back") || "Cancel"}</button>
          <button onClick={confirm} className="popup-confirm">{t("confirmAddToCart") || "Confirm & Add"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Single AI Recommendation Card ───────────────────────────
function RecCard({ dish, language, onAddToCart, tableNumber, setTableNumber, rank }) {
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [imgSrc, setImgSrc] = useState(dish.image || FALLBACK_IMAGE);

  const handleAdd = () => {
    if (tableNumber) {
      onAddToCart({ ...dish, tableNumber });
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } else {
      setShowModal(true);
    }
  };

  const handleModalConfirm = (tbl) => {
    setTableNumber(tbl);
    localStorage.setItem("tableNumber", tbl);
    onAddToCart({ ...dish, tableNumber: tbl });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    setShowModal(false);
  };

  const rankEmoji = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : null;

  return (
    <>
      <div className="ai-rec-card">
        {rankEmoji && <div className="ai-rank-badge">{rankEmoji}</div>}
        <div className="ai-rec-img-wrap">
          <img
            src={imgSrc}
            alt={dish.nameTranslations?.[language] || Object.values(dish.nameTranslations || {})[0] || dish.name}
            className="ai-rec-img"
            onError={() => setImgSrc(FALLBACK_IMAGE)}
            loading="lazy"
          />
          <div className="ai-diet-dot" style={{ borderColor: dish.dietType === "veg" ? "#16a34a" : "#dc2626" }}>
            <div className="ai-dot-inner" style={{ background: dish.dietType === "veg" ? "#16a34a" : "#dc2626" }} />
          </div>
          {dish.isPopular && <div className="ai-popular-tag">Popular</div>}
        </div>
        <div className="ai-rec-info">
          <h5 className="ai-rec-name">{dish.nameTranslations?.[language] || Object.values(dish.nameTranslations || {})[0] || dish.name}</h5>
          <p className="ai-rec-cat">{dish.category}</p>
          <p className="ai-rec-desc">
            {(dish.descriptionTranslations?.[language] || Object.values(dish.descriptionTranslations || {})[0] || dish.description || "").slice(0, 55)}
            {(dish.description || "").length > 55 ? "…" : ""}
          </p>
          <div className="ai-rec-meta-row">
            <span className="ai-rating">⭐ {dish.rating || "4.5"}</span>
            {dish.spiceLevel && dish.spiceLevel !== "none" && (
              <span className="ai-spice">
                {"🌶".repeat(dish.spiceLevel === "mild" ? 1 : dish.spiceLevel === "medium" ? 2 : 3)}
              </span>
            )}
          </div>
          <div className="ai-rec-bottom">
            <span className="ai-rec-price">₹{dish.price}</span>
            <button className={`ai-add-btn ${added ? "added" : ""}`} onClick={handleAdd}>
              {added ? "✓" : <Plus size={14} />}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <TableModal
          onConfirm={handleModalConfirm}
          onCancel={() => setShowModal(false)}
          language={language}
        />
      )}
    </>
  );
}

// ── Main AI Recommended Section ──────────────────────────────
export function AIRecommended({
  allDishes,
  language,
  onAddToCart,
  tableNumber,
  setTableNumber,
  searchQuery,
  selectedCategory,
  cartItems,
  activeItem,
}) {
  const [sections, setSections] = useState([]);
  const [scrollIdx, setScrollIdx] = useState(0);
  const visible = 3;

  const menuDishes = allDishes || [];
  const t = useTranslation(language);

  useEffect(() => {
    if (menuDishes.length === 0) return;
    const recs = getSmartRecommendations(menuDishes, {
      searchQuery,
      selectedCategory,
      cartItems,
      activeItem,
      language,
    });
    setSections(recs);
    setScrollIdx(0);
  }, [searchQuery, selectedCategory, cartItems?.length, activeItem?.id]);

  // Flatten all dishes from all sections into one curated list, deduplicated
  const allRecommended = (() => {
    const seen = new Set();
    const result = [];
    for (const sec of sections) {
      for (const dish of sec.dishes) {
        if (!seen.has(dish.id)) {
          seen.add(dish.id);
          result.push(dish);
        }
      }
    }
    return result.slice(0, 12);
  })();

  if (menuDishes.length === 0 || allRecommended.length === 0) return null;

  const canLeft  = scrollIdx > 0;
  const canRight = scrollIdx + visible < allRecommended.length;
  const totalPages = Math.ceil(allRecommended.length / visible);

  return (
    <div className="ai-recommended-wrapper">
      {/* Header */}
      <div className="ai-main-header">
        <div className="ai-main-badge">
          <Sparkles size={13} />
          <span>AI</span>
        </div>

        <h3 className="ai-main-title">{t("aiRecommended")}</h3>

        <p className="ai-main-subtitle">{t("aiRecommendedSubtitle")}</p>
      </div>
      {/* Slider */}
      <div className="ai-slider-wrapper">
        {canLeft && (
          <button className="ai-scroll-btn left" onClick={() => setScrollIdx(i => Math.max(0, i - 1))}>
            <ChevronLeft size={18} />
          </button>
        )}

        <div className="ai-rec-grid">
          {allRecommended.slice(scrollIdx, scrollIdx + visible).map((dish, idx) => (
            <RecCard
              key={dish.id}
              dish={dish}
              language={language}
              onAddToCart={onAddToCart}
              tableNumber={tableNumber}
              setTableNumber={setTableNumber}
              rank={scrollIdx + idx}
            />
          ))}
        </div>

        {canRight && (
          <button className="ai-scroll-btn right" onClick={() => setScrollIdx(i => Math.min(allRecommended.length - visible, i + 1))}>
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Dot Indicators */}
      {totalPages > 1 && (
        <div className="ai-dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`ai-dot ${Math.floor(scrollIdx / visible) === i ? "active" : ""}`}
              onClick={() => setScrollIdx(i * visible)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
