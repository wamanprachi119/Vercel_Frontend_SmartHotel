import { useState } from "react";
import { Clock, Plus, Flame, Star } from "lucide-react";
import { useTable } from "../context/TableContext";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/menuCard.css";

// FIX 3: Use a reliable data-URI as ultimate fallback so broken images always show something
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
const DATA_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' font-family='sans-serif'%3E%F0%9F%8D%BD%EF%B8%8F%3C/text%3E%3C/svg%3E";

function TableModal({ onConfirm, onCancel, language }) {
  const t = useTranslation(language);
  const [val, setVal] = useState("");
  const [error, setError] = useState("");

  const confirm = () => {
    if (!val.trim()) { setError(t("tableNumberRequired")); return; }
    if (!/^\d+$/.test(val.trim())) { setError(t("numbersOnly")); return; }
    onConfirm(val.trim());
  };

  return (
    <div className="popup-overlay">
      <div className="popup-box" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onCancel}>✕</button>
        <div className="popup-icon">🪑</div>
        <h3>{t("enterTableNumber")}</h3>
        <p>{t("tablePrompt")}</p>
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
        <button
          onClick={confirm}
          disabled={!val.trim()}
          className="popup-confirm-btn"
        >
          {t("confirmAddToCart")}
        </button>
      </div>
    </div>
  );
}

export function MenuItemCard({ item, language, onAddToCart }) {
  const { tableNumber, setTableNumber } = useTable();
  const t = useTranslation(language);
  const [showModal, setShowModal] = useState(false);
  const [added, setAdded] = useState(false);

  // FIX 3: Two-stage fallback — try item image → CDN fallback → data URI
  const [imgSrc, setImgSrc] = useState(item.image || FALLBACK_IMAGE);
  const [fallbackStage, setFallbackStage] = useState(0);

  const handleImageError = () => {
    if (fallbackStage === 0) {
      setFallbackStage(1);
      setImgSrc(FALLBACK_IMAGE);
    } else {
      // CDN also failed — use inline SVG data URI (always works)
      setFallbackStage(2);
      setImgSrc(DATA_FALLBACK);
    }
  };

  const handleAddClick = () => {
    if (tableNumber) {
      onAddToCart({ ...item, tableNumber });
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    } else {
      setShowModal(true);
    }
  };

  const handleModalConfirm = (tbl) => {
    setTableNumber(tbl);
    onAddToCart({ ...item, tableNumber: tbl });
    setShowModal(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const isVeg = item.dietType === "veg";

  const getSpiceIcons = () => {
    if (!item.spiceLevel || item.spiceLevel === "none") return null;
    const count = item.spiceLevel === "mild" ? 1 : item.spiceLevel === "medium" ? 2 : 3;
    return (
      <span className="spice-icons">
        {Array.from({ length: count }).map((_, i) => (
          <Flame key={i} size={11} fill="currentColor" />
        ))}
      </span>
    );
  };

  return (
    <>
      <div className="menu-card">
        <div className="menu-card-img-wrap">
          <img
            src={imgSrc}
            alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
            className="menu-card-img"
            onError={handleImageError}
            loading="lazy"
          />
          {item.isPopular && (
            <span className="popular-tag">
              <Star size={10} fill="currentColor" /> {t("popular")}
            </span>
          )}
          <div className="diet-tag">
            <div className="diet-dot-box" style={{ borderColor: isVeg ? "#16a34a" : "#dc2626" }}>
              <div className="diet-dot" style={{ background: isVeg ? "#16a34a" : "#dc2626" }} />
            </div>
          </div>
        </div>

        <div className="menu-card-body">
          <h3 className="menu-card-name">
            {(
              item.nameTranslations?.[language] ||
              Object.values(item.nameTranslations || {})[0] ||
              item.name ||
              ""
            )}
          </h3>
          <p className="menu-card-desc">
            {(
              item.descriptionTranslations?.[language] ||
              Object.values(item.descriptionTranslations || {})[0] ||
              item.description ||
              ""
            )}
          </p>

          {item.ingredients?.length > 0 && (
            <div className="menu-ingredients">
              {item.ingredients.slice(0, 3).map((ing, i) => (
                <span key={i} className="ingredient-tag">{ing}</span>
              ))}
            </div>
          )}

          <div className="menu-card-meta">
            <span className="meta-item"><Clock size={13} /> {item.prepTime} {t("min")}</span>
            {getSpiceIcons()}
            {item.allergens?.length > 0 && (
              <span className="allergen-tag" title={`${t("contains")}: ${item.allergens.join(", ")}`}>
                {t("allergens")}
              </span>
            )}
          </div>

          <div className="menu-card-footer">
            <span className="menu-price">₹{item.price}</span>
            {item.rating && <span className="dish-rating">⭐ {item.rating}</span>}
            <button onClick={handleAddClick} className={`add-btn ${added ? "added" : ""}`}>
              {added ? `✓ ${t("added")}!` : <><Plus size={15} /> {t("add")}</>}
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
