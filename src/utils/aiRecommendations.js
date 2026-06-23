/**
 * AI Recommendation Engine for Smart Hotel
 * Provides: category-wise, similar dishes, search-based,
 * popular, combo, veg/nonveg, rating/trend based recommendations
 */

// Category relationship map for cross-category suggestions
const CATEGORY_RELATIONS = {
  "Italian":      ["Italian", "Fast Food", "Bread", "Desserts"],
  "Chinese":      ["Chinese", "Soup", "Starter"],
  "Indian":       ["Indian", "Punjabi", "South Indian", "Main Course", "Bread"],
  "Punjabi":      ["Punjabi", "Indian", "Main Course", "Bread", "Starter"],
  "South Indian": ["South Indian", "Indian", "Breakfast", "Soup"],
  "Fast Food":    ["Fast Food", "Italian", "Kids Special", "Beverages"],
  "Desserts":     ["Desserts", "Beverages", "Drinks"],
  "Beverages":    ["Beverages", "Drinks", "Desserts"],
  "Drinks":       ["Drinks", "Beverages"],
  "Breakfast":    ["Breakfast", "South Indian", "Healthy Food", "Beverages"],
  "Starter":      ["Starter", "Soup"],
  "Main Course":  ["Main Course", "Indian", "Punjabi", "Bread", "Soup"],
  "Soup":         ["Soup", "Salad", "Starter"],
  "Salad":        ["Salad", "Healthy Food", "Soup"],
  "Bread":        ["Bread", "Main Course", "Indian"],
  "Healthy Food": ["Healthy Food", "Salad", "Soup", "Veg"],
  "Kids Special": ["Kids Special", "Fast Food", "Desserts", "Beverages"],
  "Veg":          ["Veg", "Healthy Food", "Indian", "Salad"],
  "Non-Veg":      ["Non-Veg", "Starter", "Main Course"],
};

// Keyword → category mapping for search intent
const SEARCH_KEYWORD_MAP = {
  pizza:       ["Italian"],
  pasta:       ["Italian"],
  burger:      ["Fast Food"],
  sandwich:    ["Fast Food"],
  noodles:     ["Chinese"],
  "fried rice":  ["Chinese"],
  manchurian:  ["Chinese"],
  curry:       ["Indian", "Main Course"],
  paneer:      ["Indian", "Punjabi", "Veg"],
  chicken:     ["Non-Veg", "Main Course", "Starter"],
  biryani:     ["Indian", "Main Course"],
  dosa:        ["South Indian"],
  idli:        ["South Indian"],
  samosa:      ["Starter", "Indian"],
  tea:         ["Beverages", "Drinks"],
  coffee:      ["Beverages", "Drinks"],
  juice:       ["Beverages", "Drinks"],
  shake:       ["Beverages", "Drinks"],
  cake:        ["Desserts"],
  "ice cream":   ["Desserts"],
  halwa:       ["Desserts"],
  salad:       ["Salad", "Healthy Food"],
  soup:        ["Soup"],
  bread:       ["Bread"],
  roti:        ["Bread", "Indian"],
  naan:        ["Bread", "Punjabi"],
  dal:         ["Indian", "Main Course"],
  fish:        ["Non-Veg", "Starter"],
  prawn:       ["Non-Veg", "Starter"],
  kebab:       ["Starter", "Non-Veg"],
  tikka:       ["Starter", "Indian"],
  chinese:     ["Chinese"],
  italian:     ["Italian"],
  spicy:       [],
};

// Combo meal suggestions (dish category → recommended add-ons)
const COMBO_MAP = {
  "Main Course": ["Bread", "Soup", "Beverages"],
  "Starter":     ["Beverages", "Soup"],
  "Fast Food":   ["Beverages", "Desserts"],
  "Italian":     ["Beverages", "Desserts", "Soup"],
  "Chinese":     ["Soup", "Beverages"],
  "Breakfast":   ["Beverages", "Bread"],
  "Desserts":    ["Beverages"],
  "Healthy Food":["Beverages", "Soup", "Salad"],
  "Indian":      ["Bread", "Beverages", "Soup"],
  "South Indian":["Beverages"],
  "Punjabi":     ["Bread", "Beverages"],
};

/** Score a dish based on multiple factors */
function scoreDish(dish, orderHistory = [], searchQuery = "") {
  let score = 0;

  // Base: rating
  score += (dish.rating || 4.0) * 10;

  // Popular boost
  if (dish.isPopular) score += 15;

  // Order history frequency
  const freq = orderHistory.filter(id => id === dish.id).length;
  score += freq * 8;

  // Search relevance
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    const name = (dish.nameTranslations ? Object.values(dish.nameTranslations).join(" ") : (dish.name || "")).toLowerCase();
    const desc = (dish.descriptionTranslations ? Object.values(dish.descriptionTranslations).join(" ") : (dish.description || "")).toLowerCase();
    const ingr = (dish.ingredients || []).join(" ").toLowerCase();
    if (name.includes(q)) score += 30;
    if (desc.includes(q)) score += 10;
    if (ingr.includes(q)) score += 5;
  }

  return score;
}

/** Get order history item IDs from localStorage */
function getOrderHistory() {
  const orders = JSON.parse(localStorage.getItem("orders") || "[]");
  const ids = [];
  orders.forEach(o => o.items?.forEach(i => ids.push(i.id)));
  return ids;
}

/** 1. Category-wise recommendations */
export function getCategoryRecommendations(allDishes, category, limit = 4) {
  if (category === "all") return getPopularDishes(allDishes, limit);
  const filtered = allDishes.filter(d => d.category === category);
  const history = getOrderHistory();
  return filtered
    .map(d => ({ ...d, _score: scoreDish(d, history) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 2. Similar dish recommendations */
export function getSimilarDishes(dish, allDishes, limit = 4) {
  if (!dish) return [];
  const relatedCats = CATEGORY_RELATIONS[dish.category] || [dish.category];
  const candidates = allDishes.filter(d =>
    d.id !== dish.id &&
    (relatedCats.includes(d.category) || d.dietType === dish.dietType)
  );
  const history = getOrderHistory();
  return candidates
    .map(d => {
      let score = scoreDish(d, history);
      // Boost same category
      if (d.category === dish.category) score += 20;
      // Boost same diet type
      if (d.dietType === dish.dietType) score += 10;
      // Boost similar spice
      if (d.spiceLevel === dish.spiceLevel) score += 5;
      return { ...d, _score: score };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 3. Search-based recommendations */
export function getSearchRecommendations(allDishes, searchQuery, limit = 6) {
  if (!searchQuery || !searchQuery.trim()) return [];
  const q = searchQuery.toLowerCase().trim();
  const history = getOrderHistory();

  // Detect intent categories from keywords
  let intentCategories = [];
  Object.entries(SEARCH_KEYWORD_MAP).forEach(([kw, cats]) => {
    if (q.includes(kw)) intentCategories.push(...cats);
  });

  return allDishes
    .map(d => {
      let score = scoreDish(d, history, q);
      if (intentCategories.length > 0 && intentCategories.includes(d.category)) score += 25;
      return { ...d, _score: score };
    })
    .filter(d => d._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 4. Popular dishes */
export function getPopularDishes(allDishes, limit = 4) {
  const history = getOrderHistory();
  const countMap = {};
  history.forEach(id => { countMap[id] = (countMap[id] || 0) + 1; });

  return allDishes
    .map(d => ({
      ...d,
      _score: scoreDish(d, history) + (countMap[d.id] || 0) * 10
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 5. Combo meal suggestions */
export function getComboRecommendations(cartItems, allDishes, limit = 3) {
  if (!cartItems || cartItems.length === 0) return [];
  const cartIds = new Set(cartItems.map(i => i.id));
  const cartCategories = [...new Set(cartItems.map(i => i.category))];

  const suggestedCategories = new Set();
  cartCategories.forEach(cat => {
    (COMBO_MAP[cat] || []).forEach(c => suggestedCategories.add(c));
  });

  // Remove already-in-cart categories
  cartCategories.forEach(c => suggestedCategories.delete(c));

  const history = getOrderHistory();
  return allDishes
    .filter(d => !cartIds.has(d.id) && suggestedCategories.has(d.category))
    .map(d => ({ ...d, _score: scoreDish(d, history) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 6. Veg-only recommendations */
export function getVegRecommendations(allDishes, category = "all", limit = 4) {
  const filtered = allDishes.filter(d =>
    d.dietType === "veg" && (category === "all" || d.category === category)
  );
  const history = getOrderHistory();
  return filtered
    .map(d => ({ ...d, _score: scoreDish(d, history) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 7. Non-veg recommendations */
export function getNonVegRecommendations(allDishes, category = "all", limit = 4) {
  const filtered = allDishes.filter(d =>
    d.dietType === "non-veg" && (category === "all" || d.category === category)
  );
  const history = getOrderHistory();
  return filtered
    .map(d => ({ ...d, _score: scoreDish(d, history) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 8. Trending dishes (high rating + recent orders) */
export function getTrendingDishes(allDishes, limit = 4) {
  const orders = JSON.parse(localStorage.getItem("orders") || "[]");
  const recentOrders = orders.filter(o => Date.now() - o.timestamp < 7 * 24 * 60 * 60 * 1000);
  const recentMap = {};
  recentOrders.forEach(o => o.items?.forEach(i => {
    recentMap[i.id] = (recentMap[i.id] || 0) + 1;
  }));

  return allDishes
    .map(d => ({
      ...d,
      _score: (d.rating || 4.0) * 12 + (recentMap[d.id] || 0) * 15 + (d.isPopular ? 10 : 0)
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** 9. Spicy dish recommendations */
export function getSpicyRecommendations(allDishes, limit = 4) {
  const history = getOrderHistory();
  return allDishes
    .filter(d => d.spiceLevel === "spicy" || d.spiceLevel === "medium")
    .map(d => ({ ...d, _score: scoreDish(d, history) + (d.spiceLevel === "spicy" ? 20 : 10) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

/** Master recommendation function - returns labeled sections */
export function getSmartRecommendations(allDishes, {
  searchQuery = "",
  selectedCategory = "all",
  cartItems = [],
  activeItem = null,
  language = null,
} = {}) {
  const sections = [];
  const history = getOrderHistory();

  // 1. Search-based
  if (searchQuery && searchQuery.trim().length > 1) {
    const searchRecs = getSearchRecommendations(allDishes, searchQuery, 6);
    if (searchRecs.length > 0) {
      // Detect what they searched for and add context
      const q = searchQuery.toLowerCase();
      let label = `Results for "${searchQuery}"`;
      if (q.includes("pizza") || q.includes("pasta")) label = "🍕 Italian Selections";
      else if (q.includes("chinese") || q.includes("noodles")) label = "🥢 Chinese Picks";
      else if (q.includes("spicy")) label = "🌶️ Spicy Favorites";
      else if (q.includes("veg")) label = "🥗 Veg Specials";
      sections.push({ type: "search", label, dishes: searchRecs, icon: "🔍" });
    }
  }

  // 2. Category-specific
  if (selectedCategory !== "all") {
    const catRecs = getCategoryRecommendations(allDishes, selectedCategory, 4);
    if (catRecs.length > 0) {
      sections.push({
        type: "category",
        label: `⭐ Top ${selectedCategory} Picks`,
        dishes: catRecs,
        icon: "⭐",
      });

      // Cross-category suggestions
      const relatedCats = CATEGORY_RELATIONS[selectedCategory] || [];
      const crossCatDishes = allDishes.filter(d =>
        relatedCats.includes(d.category) && d.category !== selectedCategory
      );
      if (crossCatDishes.length > 0) {
        const crossRecs = crossCatDishes
          .map(d => ({ ...d, _score: scoreDish(d, history) }))
          .sort((a, b) => b._score - a._score)
          .slice(0, 4);
        if (crossRecs.length > 0) {
          sections.push({
            type: "cross-category",
            label: `🔄 You Might Also Like`,
            dishes: crossRecs,
            icon: "🔄",
            subtitle: `Since you're browsing ${selectedCategory}`,
          });
        }
      }
    }
  }

  // 3. Combo suggestions (if cart has items)
  if (cartItems && cartItems.length > 0) {
    const combos = getComboRecommendations(cartItems, allDishes, 3);
    if (combos.length > 0) {
      sections.push({
        type: "combo",
        label: "🍱 Complete Your Meal",
        dishes: combos,
        icon: "🍱",
        subtitle: "Pairs perfectly with your order",
      });
    }
  }

  // 4. Similar to active item
  if (activeItem) {
    const similar = getSimilarDishes(activeItem, allDishes, 4);
    if (similar.length > 0) {
      const activeName = activeItem.nameTranslations?.[language] || Object.values(activeItem.nameTranslations || {})[0] || activeItem.name || "";
      sections.push({
        type: "similar",
        label: `🍴 Similar to ${activeName}`,
        dishes: similar,
        icon: "🍴",
      });
    }
  }

  // 5. Trending (always show)
  const trending = getTrendingDishes(allDishes, 4);
  sections.push({
    type: "trending",
    label: "🔥 Trending Now",
    dishes: trending,
    icon: "🔥",
    subtitle: "Most ordered this week",
  });

  // 6. Popular (baseline)
  if (sections.length < 2) {
    const popular = getPopularDishes(allDishes, 4);
    sections.push({
      type: "popular",
      label: "🏆 Most Popular",
      dishes: popular,
      icon: "🏆",
    });
  }

  // Remove duplicates across sections
  const seenIds = new Set();
  return sections.map(section => ({
    ...section,
    dishes: section.dishes.filter(d => {
      if (seenIds.has(d.id)) return false;
      seenIds.add(d.id);
      return true;
    })
  })).filter(s => s.dishes.length > 0);
}
