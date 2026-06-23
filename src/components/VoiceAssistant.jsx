import { useState, useRef } from "react";
import { Mic, MicOff, X, Volume2, Loader, Search } from "lucide-react";
import { menuData } from "../data/menuData";
import { useTranslation } from "../hooks/useTranslation";
import { useTable } from "../context/TableContext";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

const menuSummary = menuData
  .map(i => `${i.name} (${i.category}, ₹${i.price}, ${i.dietType}, ${i.spiceLevel})`)
  .join("; ");

// ── Known spelling / transliteration variants ───────────────────
// Maps common mis-spellings or alternate transliterations to a canonical
// form so "biriyani", "biryanee", "बिर्याणी" etc. all resolve the same way.
const SPELLING_VARIANTS = [
  { canonical: "biryani", variants: ["biryani", "biriyani", "biryanee", "briyani", "beriani", "बिरयानी", "बिर्याणी", "बिरियानी"] },
  { canonical: "paneer",  variants: ["paneer", "panner", "panir", "पनीर"] },
  { canonical: "chicken", variants: ["chicken", "checken", "chiken", "चिकन"] },
  { canonical: "kebab",   variants: ["kebab", "kabab", "kebob", "कबाब"] },
];

// Builds a lookup so any variant word can be replaced with its canonical form.
const VARIANT_TO_CANONICAL = SPELLING_VARIANTS.reduce((map, { canonical, variants }) => {
  variants.forEach(v => { map[v.toLowerCase()] = canonical; });
  return map;
}, {});

// ── Normalize a raw voice/text query ────────────────────────────
// - lowercases
// - strips punctuation
// - collapses repeated words (e.g. "biryani, biryani, biryani" → "biryani")
// - replaces known spelling variants with a canonical form
function normalizeQuery(raw) {
  const cleaned = (raw || "")
    .toLowerCase()
    .replace(/[.,!?।]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  const deduped = [];
  words.forEach(w => {
    const canonical = VARIANT_TO_CANONICAL[w] || w;
    if (deduped[deduped.length - 1] !== canonical) deduped.push(canonical);
  });
  return deduped.join(" ");
}

// ── Levenshtein distance (small, fast — only used for short food words) ──
function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp = Array.from({ length: al + 1 }, (_, i) => [i, ...Array(bl).fill(0)]);
  for (let j = 0; j <= bl; j++) dp[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[al][bl];
}

// Fuzzy check: does `query` contain a word close enough to `target`?
function fuzzyContains(query, target) {
  if (!target) return false;
  const t = target.toLowerCase();
  if (query.includes(t)) return true;
  // word-level fuzzy match for words of reasonable length (avoid false positives on short words)
  if (t.length < 4) return false;
  return query.split(" ").some(word => {
    if (word.length < 3) return false;
    const maxDist = t.length <= 5 ? 1 : 2;
    return levenshtein(word, t) <= maxDist;
  });
}

// ── Core matcher: does this menu item match the normalized query? ──
// Checks dish name, every language translation of the name, category,
// and every language translation of the description — with partial and
// fuzzy (spelling-variant) matching, not just exact substring on English name.
function matchesDish(item, normalizedQuery) {
  const candidates = [
    item.name,
    item.category,
    item.description,
    ...Object.values(item.nameTranslations || {}),
    ...Object.values(item.descriptionTranslations || {}),
  ].filter(Boolean);

  return candidates.some(text => {
    const normalizedText = normalizeQuery(text);
    // Substring match either direction (handles multi-word dish names and
    // multi-word queries like "chicken biryani")
    if (normalizedQuery.includes(normalizedText) || normalizedText.includes(normalizedQuery)) {
      return true;
    }
    // Word-level: any significant word in the dish text appears in the query
    const textWords = normalizedText.split(" ").filter(w => w.length > 2);
    return textWords.some(w => fuzzyContains(normalizedQuery, w));
  });
}

// ── Small input used inside the VoiceAssistant's table-number modal ──
function VATableModalInput({ onConfirm, t }) {
  const [val, setVal] = useState("");
  const [error, setError] = useState("");

  const confirm = () => {
    if (!val.trim()) { setError(t("tableNumberRequired")); return; }
    if (!/^\d+$/.test(val.trim())) { setError(t("numbersOnly")); return; }
    onConfirm(val.trim());
  };

  return (
    <>
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
        {t("confirmAddToCart")}
      </button>
    </>
  );
}

export function VoiceAssistant({ onClose, onAddToCart, language }) {
  const t = useTranslation(language);
  const { tableNumber, setTableNumber } = useTable();
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [response, setResponse]       = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [textInput, setTextInput]     = useState("");
  const [showTableModal, setShowTableModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const recogRef = useRef(null);

  // ── Text-to-Speech ──────────────────────────────────────────
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    utt.rate = 0.92;
    window.speechSynthesis.speak(utt);
  };

  // ── Smart local filter first, then AI fallback ──────────────
  const filterAndRespond = async (command) => {
    // Normalize: lowercase + collapse repeated words/punctuation users say when
    // talking to a voice assistant (e.g. "biryani, biryani, biryani.")
    const lower = normalizeQuery(command);
    setLoading(true);

    const top8 = (items) =>
      [...items]
        .sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0))
        .slice(0, 8);

    // 1. Direct dish match — checks name, ALL language translations,
    //    category, and description, with spelling-variant / fuzzy support.
    const directMatch = menuData.filter(item => matchesDish(item, lower));
    if (directMatch.length > 0) {
      const sorted = top8(directMatch);
      setSuggestions(sorted);
      const displayName = sorted[0].nameTranslations?.[language] || sorted[0].name;
      const msg = sorted.length === 1
        ? `Found ${displayName} for ₹${sorted[0].price}!`
        : `Found ${sorted.length} matching dishes for you!`;
      setResponse(msg);
      speak(msg);
      setLoading(false);
      return;
    }

    // 2. Category keyword matches (only reached if no direct dish matched)
    const categoryMap = {
      "non.?veg|chicken|mutton|fish|prawn|egg|meat|seafood": d => d.dietType === "non-veg",
      "\\bveg\\b|vegetarian|no meat|plant.based": d => d.dietType === "veg",
      "drink|beverage|juice|coffee|tea|lassi|soda|chaas|buttermilk|mocktail|smoothie": d => ["Beverages","Drinks"].includes(d.category),
      "salad|fresh|healthy food": d => d.category === "Salad",
      "soup|warm soup": d => d.category === "Soup",
      "dessert|sweet|ice cream|gulab|kheer|brownie|kulfi|mithai|halwa": d => d.category === "Desserts",
      "starter|snack|appetizer|tikka|kebab|spring roll": d => d.category === "Starter",
      "pizza": d => d.name.toLowerCase().includes("pizza"),
      "burger": d => d.name.toLowerCase().includes("burger"),
      "pasta|spaghetti": d => d.category === "Italian" && d.name.toLowerCase().includes("pasta") || d.name.toLowerCase().includes("spaghetti"),
      "noodles": d => d.name.toLowerCase().includes("noodles"),
      "chinese|indo.?chinese": d => d.category === "Chinese",
      "italian": d => d.category === "Italian",
      "south indian|dosa|idli|vada|uttapam": d => d.category === "South Indian",
      "punjabi|north indian|butter chicken|chole|sarson": d => d.category === "Punjabi",
      "breakfast|morning": d => d.category === "Breakfast",
      "bread|naan|paratha|roti": d => d.category === "Bread",
      "main course|main dish|curry|dal|rajma": d => ["Main Course","Indian","Veg","Non-Veg","Punjabi"].includes(d.category),
      "kids|children|child": d => d.category === "Kids Special",
      "healthy|diet|light food|fitness": d => d.category === "Healthy Food",
      "spicy|hot food|fiery": d => d.spiceLevel === "spicy",
      "mild|less spicy|not spicy": d => d.spiceLevel === "mild" || d.spiceLevel === "none",
      "cheap|budget|affordable|low price": () => false, // handled separately
      "popular|best|recommend|special|top|must try|what should": d => d.isPopular,
    };

    for (const [pattern, filter] of Object.entries(categoryMap)) {
      if (new RegExp(pattern, "i").test(lower)) {
        if (pattern.includes("cheap")) {
          const items = [...menuData].sort((a, b) => a.price - b.price).slice(0, 8);
          setSuggestions(items);
          const msg = `Here are our most affordable dishes starting from ₹${items[0].price}!`;
          setResponse(msg); speak(msg); setLoading(false); return;
        }
        const items = top8(menuData.filter(filter));
        if (items.length > 0) {
          setSuggestions(items);
          const msg = `Found ${items.length} great dishes for you!`;
          setResponse(msg); speak(msg); setLoading(false); return;
        }
      }
    }

    // 3. AI fallback via Claude API
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          system: `You are a smart food assistant for Smart Hotel. Given a customer voice command, return a JSON object: {"message": "short friendly response 1-2 sentences", "dishIds": ["id1","id2",...]} - pick up to 8 dish IDs from the menu that best match. Return ONLY valid JSON, no markdown.
Menu: ${menuSummary}`,
          messages: [{ role: "user", content: command }],
        }),
      });
      const data = await res.json();
      const text = data?.content?.[0]?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const matchedDishes = (parsed.dishIds || [])
        .map(id => menuData.find(d => d.id === id))
        .filter(Boolean);
      if (matchedDishes.length > 0) {
        setSuggestions(matchedDishes);
        setResponse(parsed.message || `Found ${matchedDishes.length} dishes for you!`);
        speak(parsed.message || `Found ${matchedDishes.length} dishes for you!`);
        setLoading(false);
        return;
      }
    } catch (e) { /* ignore AI error, fall through */ }

    // 4. Final fallback: popular dishes
    const items = top8(menuData.filter(i => i.isPopular));
    setSuggestions(items);
    const msg = `Here are our top ${items.length} popular dishes! Try saying "pizza", "biryani", "drinks" or any dish name.`;
    setResponse(msg);
    speak(msg);
    setLoading(false);
  };

  // ── Real Microphone ─────────────────────────────────────────
  const toggleListen = () => {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      const msg = "Voice recognition is not supported. Please use Chrome browser or type below.";
      setResponse(msg);
      speak(msg);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recogRef.current = recognition;

    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      filterAndRespond(text);
    };
    recognition.onerror = () => {
      setListening(false);
      const msg = "Could not capture voice. Please check microphone permissions or type below.";
      setResponse(msg);
    };
    recognition.start();
  };

  const handleExample = (ex) => {
    setTranscript(ex);
    filterAndRespond(ex);
  };

  const handleTextSearch = () => {
    if (!textInput.trim()) return;
    setTranscript(textInput.trim());
    filterAndRespond(textInput.trim());
    setTextInput("");
  };

  const handleAddToCart = (item) => {
    if (tableNumber) {
      onAddToCart({ ...item, tableNumber });
      const name = item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name;
      const msg = `${name} added to your cart!`;
      setResponse(msg);
      speak(msg);
    } else {
      setPendingItem(item);
      setShowTableModal(true);
    }
  };

  const handleTableModalConfirm = (tbl) => {
    setTableNumber(tbl);
    if (pendingItem) {
      onAddToCart({ ...pendingItem, tableNumber: tbl });
      const name = pendingItem.nameTranslations?.[language] || Object.values(pendingItem.nameTranslations || {})[0] || pendingItem.name;
      const msg = `${name} added to your cart!`;
      setResponse(msg);
      speak(msg);
    }
    setPendingItem(null);
    setShowTableModal(false);
  };

  const exampleCommands = [
    "Show me non-veg dishes", "I want vegetarian food",
    "Show me drinks", "What desserts do you have?",
    "Show me spicy dishes", "Show me starters",
    "Chicken biryani", "Recommend best dishes",
  ];

  return (
    <div className="modal-overlay">
      <div className="va-box">
        <div className="va-header">
          <div className="va-header-left">
            <Volume2 size={20}/>
            <div>
              <h2 className="va-title">Voice Assistant</h2>
              <p className="va-subtitle">Speak or type to find dishes</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>

        <div className="va-body">
          {/* Mic Button */}
          <div className="va-mic-wrap">
            <div className={`voice-circle ${listening ? "pulse" : ""}`} onClick={toggleListen}>
              {loading ? <Loader size={32} className="spin"/> : listening ? <MicOff size={32}/> : <Mic size={32}/>}
            </div>
            <p className="voice-hint">
              {loading ? "Searching..." : listening ? "🔴 Listening… speak now" : "Tap the mic to speak"}
            </p>
          </div>

          {/* Text search fallback */}
          <div className="va-text-search">
            <input
              className="va-text-input"
              placeholder="Or type here: pizza, biryani, spicy..."
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleTextSearch()}
            />
            <button className="va-text-btn" onClick={handleTextSearch}><Search size={16}/></button>
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="va-section">
              <p className="va-label">You said:</p>
              <div className="voice-transcript">
                <Volume2 size={14}/>
                <span>"{transcript}"</span>
              </div>
            </div>
          )}

          {/* Assistant Response */}
          {response && !loading && (
            <div className="voice-response">
              <p className="va-label">Assistant:</p>
              <p>{response}</p>
              <button className="voice-replay" onClick={() => speak(response)}>🔊 Replay</button>
            </div>
          )}

          {/* Menu Results */}
          {suggestions.length > 0 && (
            <div className="va-section">
              <p className="va-label">
                {suggestions.length} dishes found &nbsp;·&nbsp;
                <span style={{ color: "#10b981", fontWeight: 600 }}>⭐ Popular shown first</span>
              </p>
              <div className="va-results-list">
                {suggestions.map(item => (
                  <div key={item.id} className="va-result-row">
                    <div className="va-result-img-wrap">
                      <img
                        src={item.image || FALLBACK_IMAGE}
                        alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                        className="va-result-img"
                        onError={e => { e.target.src = FALLBACK_IMAGE; }}
                        loading="lazy"
                      />
                      {item.isPopular && <span className="va-popular-badge">⭐</span>}
                    </div>
                    <div className="va-result-info">
                      <p className="va-result-name">{item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}</p>
                      <p className="va-result-desc">{item.descriptionTranslations?.[language] || Object.values(item.descriptionTranslations || {})[0] || item.description}</p>
                      <div className="va-result-meta">
                        <span className="va-result-price">₹{item.price}</span>
                        {item.spiceLevel && item.spiceLevel !== "none" && (
                          <span className={`spice-tag ${item.spiceLevel}`}>{item.spiceLevel}</span>
                        )}
                        <span className="va-diet-dot">{item.dietType === "veg" ? "🟢 Veg" : "🔴 Non-veg"}</span>
                      </div>
                    </div>
                    <button
                      className="va-add-btn"
                      disabled={!item.available}
                      onClick={() => handleAddToCart(item)}
                    >
                      {item.available ? t("add") : "N/A"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Example Commands */}
          {!transcript && !loading && (
            <div className="va-section">
              <p className="va-label">Try saying:</p>
              <div className="va-examples-grid">
                {exampleCommands.map((ex, i) => (
                  <button key={i} className="va-example-btn" onClick={() => handleExample(ex)}>{ex}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showTableModal && (
        <div className="popup-overlay" onClick={() => setShowTableModal(false)}>
          <div className="popup-box" onClick={e => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowTableModal(false)}>✕</button>
            <div className="popup-icon">🪑</div>
            <h3>{t("enterTableNumber")}</h3>
            <p>{t("tablePrompt")}</p>
            <VATableModalInput onConfirm={handleTableModalConfirm} t={t} />
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:300;backdrop-filter:blur(4px);}
        .va-box{background:#fff;border-radius:22px;width:500px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,0.22);overflow:hidden;}
        .va-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;background:linear-gradient(135deg,#e65c00,#f9a825);color:#fff;flex-shrink:0;}
        .va-header-left{display:flex;align-items:center;gap:12px;}
        .va-title{font-family:'Playfair Display',serif;font-size:1.1rem;margin:0;}
        .va-subtitle{font-size:0.76rem;opacity:0.88;margin:2px 0 0;}
        .modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.8);padding:4px;}
        .modal-close:hover{color:#fff;}
        .va-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:16px;}
        .va-mic-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0;}
        .voice-circle{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#e65c00,#f9a825);display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;box-shadow:0 6px 24px rgba(230,92,0,0.4);transition:transform 0.2s;}
        .voice-circle:hover{transform:scale(1.06);}
        .voice-circle.pulse{animation:pulse-ring 1s infinite;}
        @keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(230,92,0,0.45);}70%{box-shadow:0 0 0 20px rgba(230,92,0,0);}100%{box-shadow:0 0 0 0 rgba(230,92,0,0);}}
        .voice-hint{font-size:0.86rem;color:#9ca3af;margin:0;}
        .spin{animation:spin 1s linear infinite;}
        @keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
        .va-text-search{display:flex;gap:8px;width:100%;}
        .va-text-input{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:9px 14px;font-size:0.88rem;outline:none;transition:border-color 0.2s;}
        .va-text-input:focus{border-color:#e65c00;}
        .va-text-btn{background:#e65c00;color:#fff;border:none;border-radius:10px;padding:9px 14px;cursor:pointer;display:flex;align-items:center;transition:background 0.2s;}
        .va-text-btn:hover{background:#c44e00;}
        .va-section{display:flex;flex-direction:column;gap:8px;}
        .va-label{font-size:0.74rem;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0;}
        .voice-transcript{display:flex;align-items:center;gap:8px;background:#eff6ff;border:1px solid #bfdbfe;padding:10px 14px;border-radius:10px;font-size:0.88rem;color:#1d4ed8;}
        .voice-response{background:#f0fdf4;border:1px solid #bbf7d0;padding:14px 16px;border-radius:12px;display:flex;flex-direction:column;gap:8px;}
        .voice-response p{font-size:0.9rem;color:#374151;margin:0;line-height:1.5;}
        .voice-replay{background:none;border:1px solid #10b981;color:#10b981;border-radius:8px;padding:5px 14px;font-size:0.8rem;cursor:pointer;width:fit-content;transition:all 0.2s;}
        .voice-replay:hover{background:#10b981;color:#fff;}
        .va-results-list{display:flex;flex-direction:column;gap:10px;}
        .va-result-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #f3f4f6;border-radius:14px;background:#fafafa;transition:all 0.15s;}
        .va-result-row:hover{background:#fff8f3;border-color:#fed7aa;}
        .va-result-img-wrap{position:relative;flex-shrink:0;}
        .va-result-img{width:56px;height:56px;border-radius:10px;object-fit:cover;display:block;}
        .va-popular-badge{position:absolute;top:-5px;right:-5px;font-size:0.7rem;background:#fef9c3;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;border:1px solid #fde047;}
        .va-result-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
        .va-result-name{font-size:0.88rem;font-weight:700;color:#1a1a2e;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .va-result-desc{font-size:0.74rem;color:#9ca3af;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .va-result-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
        .va-result-price{font-size:0.88rem;font-weight:700;color:#e65c00;}
        .va-diet-dot{font-size:0.72rem;color:#6b7280;}
        .va-add-btn{background:#e65c00;color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:0.82rem;font-weight:700;cursor:pointer;flex-shrink:0;transition:background 0.2s;}
        .va-add-btn:hover{background:#c44e00;}
        .va-add-btn:disabled{background:#d1d5db;cursor:not-allowed;}
        .spice-tag{font-size:0.68rem;padding:2px 7px;border-radius:20px;font-weight:600;}
        .spice-tag.mild{background:#fef9c3;color:#854d0e;}
        .spice-tag.medium{background:#fed7aa;color:#9a3412;}
        .spice-tag.spicy{background:#fee2e2;color:#991b1b;}
        .va-examples-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
        .va-example-btn{text-align:left;padding:9px 13px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;font-size:0.82rem;color:#374151;cursor:pointer;transition:all 0.15s;line-height:1.4;}
        .va-example-btn:hover{background:#fff3eb;border-color:#fed7aa;color:#e65c00;}
      `}</style>
    </div>
  );
}
