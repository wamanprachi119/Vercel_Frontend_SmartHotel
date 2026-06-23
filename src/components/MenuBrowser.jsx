import { useTable } from "../context/TableContext";
import React, { useState, useMemo } from "react";
import { menuData } from "../data/menuData";
import { MenuItemCard } from "./MenuItemCard";
import { AIRecommended } from "./AIRecommended";
import { Leaf, Flame, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import "../styles/menu.css";
import "../styles/MenuFilters.css";

const CAT_EMOJI = {
  "all": "🍽️", "Indian": "🇮🇳", "Chinese": "🥢", "Italian": "🍕",
  "South Indian": "🥞", "Punjabi": "🧆", "Fast Food": "🍔", "Desserts": "🍰",
  "Beverages": "🥤", "Breakfast": "🍳", "Veg": "🥗", "Non-Veg": "🍗",
  "Kids Special": "🧒", "Healthy Food": "💚", "Starter": "🍢",
  "Main Course": "🍛", "Soup": "🍲", "Salad": "🥙", "Bread": "🫓", "Drinks": "🧃",
};

// Map category key → translation key
const CAT_TRANS_KEY = {
  "all": "catAll", "Indian": "catIndian", "Chinese": "catChinese",
  "Italian": "catItalian", "South Indian": "catSouthIndian", "Punjabi": "catPunjabi",
  "Fast Food": "catFastFood", "Desserts": "catDesserts", "Beverages": "catBeverages",
  "Breakfast": "catBreakfast", "Veg": "catVeg", "Non-Veg": "catNonVeg",
  "Kids Special": "catKids", "Healthy Food": "catHealthy", "Starter": "catStarter",
  "Main Course": "catMainCourse", "Soup": "catSoup", "Salad": "catSalad",
  "Bread": "catBread", "Drinks": "catDrinks",
};

const CAT_ORDER = [
  "all","Indian","Punjabi","South Indian","Chinese","Italian",
  "Fast Food","Breakfast","Veg","Non-Veg","Starter","Main Course",
  "Soup","Salad","Bread","Healthy Food","Kids Special","Desserts","Beverages","Drinks"
];

// Normalize menu item
function normalizeItem(item) {
  const SUPPORTED_LANGS = ["en", "hi", "mr"];

  // Ensure translation objects exist for all supported languages.
  const nameTranslations = Object.assign({}, ...SUPPORTED_LANGS.map(l => ({ [l]: (item.nameTranslations && item.nameTranslations[l]) || item.name || "" })));
  const descriptionTranslations = Object.assign({}, ...SUPPORTED_LANGS.map(l => ({ [l]: (item.descriptionTranslations && item.descriptionTranslations[l]) || item.description || "" })));

  return {
    id: item.id || item.itemId || String(item.menuItemId || Math.random()),
    // keep raw name/description only as metadata; UI should use the translation objects
    name: item.name || item.itemName || "",
    description: item.description || "",
    price: item.price || 0,
    image: item.imageUrl || item.image || "",
    category: item.category || "Main Course",
    dietType: item.dietType || (item.isVeg ? "veg" : "non-veg"),
    spiceLevel: item.spiceLevel || "mild",
    available: item.available !== false,
    prepTime: item.prepTime || item.preparationTime || 15,
    isPopular: item.isPopular || false,
    rating: item.rating || 4.2,
    ingredients: item.ingredients || [],
    allergens: item.allergens || [],
    nameTranslations,
    descriptionTranslations,
  };
}

// Pre-normalize all menu data once (instant, no loading state)
const normalizedMenuData = menuData.map(normalizeItem);

export default function MenuBrowser({
  language, onAddToCart, searchQuery, setSearchQuery,
}) {
  const { tableNumber, setTableNumber } = useTable();
  const t = useTranslation(language);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dietFilter, setDietFilter]               = useState("all");
  const [spiceFilter, setSpiceFilter]             = useState("all");
  const [priceFilter, setPriceFilter]             = useState("all");
  const [showFilters, setShowFilters]             = useState(false);

  const allCategories = useMemo(() => {
    const fromData = new Set(normalizedMenuData.map(i => i.category).filter(Boolean));
    return CAT_ORDER.filter(c => c === "all" || fromData.has(c));
  }, []);

  const filteredMenu = useMemo(() => {
    const q = (searchQuery || "").toLowerCase().trim();
    return normalizedMenuData.filter(item => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (dietFilter !== "all" && item.dietType !== dietFilter) return false;
      if (spiceFilter !== "all" && item.spiceLevel !== spiceFilter) return false;
      if (priceFilter === "budget" && item.price > 150) return false;
      if (priceFilter === "mid" && (item.price <= 150 || item.price > 300)) return false;
      if (priceFilter === "premium" && item.price <= 300) return false;
      if (q) {
        const name = (item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name || "").toLowerCase();
        const desc = (item.descriptionTranslations?.[language] || Object.values(item.descriptionTranslations || {})[0] || item.description || "").toLowerCase();
        const ing  = (item.ingredients || []).join(" ").toLowerCase();
        const cat  = (item.category || "").toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !ing.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
  }, [selectedCategory, dietFilter, spiceFilter, priceFilter, searchQuery, language]);

  const activeFilterCount = [
    dietFilter !== "all", spiceFilter !== "all", priceFilter !== "all",
  ].filter(Boolean).length;

  const clearAll = () => {
    setDietFilter("all"); setSpiceFilter("all"); setPriceFilter("all");
    setSelectedCategory("all"); setSearchQuery?.("");
  };

  const dishCount = filteredMenu.length;

  return (
    <div className="menu-container">
      {/* ── CATEGORY PILLS ── */}
      <div className="filter-wrap">
        <div className="cat-scroll-row">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`cat-pill-v2 ${selectedCategory === cat ? "active" : ""}`}
            >
              <span className="cat-pill-emoji">{CAT_EMOJI[cat] || "🍽️"}</span>
              <span>{t(CAT_TRANS_KEY[cat] || "catAll")}</span>
            </button>
          ))}
        </div>

        <div className="filter-action-row">
          <button
            className={`filter-toggle-btn ${showFilters ? "open" : ""}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal size={14} />
            {t("filters")}
            {activeFilterCount > 0 && (
              <span className="filter-badge">{activeFilterCount}</span>
            )}
          </button>

          {(activeFilterCount > 0 || selectedCategory !== "all" || searchQuery) && (
            <button className="clear-filters-btn" onClick={clearAll}>
              <X size={12} /> {t("clearAll")}
            </button>
          )}

          <p className="menu-results-text-inline">
            <strong>{dishCount}</strong> {dishCount !== 1 ? t("dishesPlural") : t("dishes")}
            {selectedCategory !== "all" ? ` · ${t(CAT_TRANS_KEY[selectedCategory] || selectedCategory)}` : ""}
          </p>
        </div>

        {showFilters && (
          <div className="filter-expanded">
            <div className="filter-group compact">
              <label className="filter-label"><Leaf size={13} /> {t("filterDiet")}</label>
              <div className="filter-pills">
                {[["all", t("filterAll")], ["veg", t("filterVeg")], ["non-veg", t("filterNonVeg")]].map(([v, l]) => (
                  <button key={v} className={`fpill ${dietFilter === v ? "active" : ""}`} onClick={() => setDietFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="filter-group compact">
              <label className="filter-label"><Flame size={13} /> {t("filterSpice")}</label>
              <div className="filter-pills">
                {[
                  ["all", t("filterSpiceAny")],
                  ["none", t("filterSpiceNone")],
                  ["mild", t("filterSpiceMild")],
                  ["medium", t("filterSpiceMedium")],
                  ["spicy", t("filterSpiceSpicy")]
                ].map(([v, l]) => (
                  <button key={v} className={`fpill ${spiceFilter === v ? "active" : ""}`} onClick={() => setSpiceFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="filter-group compact">
              <label className="filter-label">{t("filterPrice")}</label>
              <div className="filter-pills">
                {[
                  ["all", t("filterPriceAll")],
                  ["budget", t("filterPriceBudget")],
                  ["mid", t("filterPriceMid")],
                  ["premium", t("filterPricePremium")]
                ].map(([v, l]) => (
                  <button key={v} className={`fpill ${priceFilter === v ? "active" : ""}`} onClick={() => setPriceFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI RECOMMENDED ── */}
      <AIRecommended
        allDishes={normalizedMenuData}
        language={language}
        onAddToCart={onAddToCart}
        tableNumber={tableNumber}
        setTableNumber={setTableNumber}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
        cartItems={[]}
      />

      {/* ── DISH GRID ── */}
      <div className="menu-grid">
        {filteredMenu.length > 0 ? (
          filteredMenu.map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              language={language}
              onAddToCart={onAddToCart}
            />
          ))
        ) : (
          <div className="no-items">
            <p>🔍 {t("noDisheFound")}</p>
            <span>{t("adjustFilters")}</span>
            <button className="clear-filters-btn" style={{marginTop:12}} onClick={clearAll}>{t("resetFiltersBtn")}</button>
          </div>
        )}
      </div>

      <style>{`
        .cat-scroll-row{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0 8px;}
        .cat-scroll-row::-webkit-scrollbar{display:none;}
        .cat-pill-v2{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:24px;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;white-space:nowrap;font-size:0.82rem;font-weight:500;color:#374151;transition:all 0.18s;flex-shrink:0;}
        .cat-pill-v2:hover{border-color:#fb923c;color:#c2410c;background:#fff7ed;}
        .cat-pill-v2.active{background:linear-gradient(135deg,#e65c00,#f9a825);border-color:transparent;color:#fff;box-shadow:0 2px 8px rgba(230,92,0,0.3);}
        .cat-pill-emoji{font-size:1rem;}
        .filter-action-row{display:flex;align-items:center;gap:8px;padding:4px 0 8px;flex-wrap:wrap;}
        .filter-toggle-btn{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;font-size:0.8rem;font-weight:500;color:#374151;transition:all 0.18s;position:relative;}
        .filter-toggle-btn.open{border-color:#e65c00;color:#e65c00;background:#fff7ed;}
        .filter-badge{background:#e65c00;color:#fff;border-radius:50%;width:16px;height:16px;font-size:0.65rem;display:flex;align-items:center;justify-content:center;}
        .clear-filters-btn{display:flex;align-items:center;gap:3px;padding:5px 10px;border-radius:16px;border:1px solid #fca5a5;background:#fff;color:#dc2626;font-size:0.75rem;cursor:pointer;transition:all 0.15s;}
        .clear-filters-btn:hover{background:#fef2f2;}
        .menu-results-text-inline{font-size:0.8rem;color:#6b7280;margin-left:auto;}
        .filter-expanded{background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;margin-bottom:4px;}
        .filter-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}
        .fpill{padding:5px 12px;border-radius:16px;border:1.5px solid #e5e7eb;background:#fff;cursor:pointer;font-size:0.78rem;font-weight:500;color:#374151;transition:all 0.15s;}
        .fpill:hover{border-color:#fb923c;color:#c2410c;}
        .fpill.active{background:#e65c00;color:#fff;border-color:transparent;}
      `}</style>
    </div>
  );
}
