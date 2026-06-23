// import { Leaf, Flame, Tag } from "lucide-react";
// import "../styles/MenuFilters.css";

// export function MenuFilters({
//   categories,
//   selectedCategory,
//   onCategoryChange,
//   dietFilter,
//   onDietFilterChange,
//   spiceFilter,
//   onSpiceFilterChange,
//   recommendedDishes = [],
//   language,
// }) {
//   return (
//     <div className="filter-wrap">
//       {/* ─── AI Recommended ─── */}
//       {recommendedDishes.length > 0 && (
//         <div className="recommended-section">
//           <h4 className="rec-title">⭐ Chef's Recommendations</h4>
//           <div className="rec-cards">
//             {recommendedDishes.map((dish) => (
//               <div key={dish.id} className="rec-card">
//                 <img
//                   src={dish.image}
//                   alt={dish.nameTranslations?.[language] || dish.name}
//                   className="rec-img"
//                 />
//                 <div className="rec-info">
//                   <h5 className="rec-name">
//                     {dish.nameTranslations?.[language] || dish.name}
//                   </h5>
//                   <p className="rec-price">₹{dish.price}</p>
//                   <div className="rec-stars">⭐⭐⭐⭐⭐</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}

//       {/* ─── Filters Row ─── */}
//       <div className="filters-row">
//         {/* Category pills */}
//         <div className="filter-group">
//           <label className="filter-label">
//             <Tag size={13} /> Category
//           </label>
//           <div className="category-pills">
//             {categories.map((cat) => (
//               <button
//                 key={cat}
//                 onClick={() => onCategoryChange(cat)}
//                 className={`cat-pill ${selectedCategory === cat ? "active" : ""}`}
//               >
//                 {cat === "all" ? "All" : cat}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Diet + Spice */}
//         <div className="filter-selects">
//           <div className="filter-group compact">
//             <label className="filter-label">
//               <Leaf size={13} /> Diet
//             </label>
//             <select
//               value={dietFilter}
//               onChange={(e) => onDietFilterChange(e.target.value)}
//               className="filter-select"
//             >
//               <option value="all">All</option>
//               <option value="veg">🟢 Veg</option>
//               <option value="non-veg">🔴 Non-Veg</option>
//             </select>
//           </div>

//           <div className="filter-group compact">
//             <label className="filter-label">
//               <Flame size={13} /> Spice
//             </label>
//             <select
//               value={spiceFilter}
//               onChange={(e) => onSpiceFilterChange(e.target.value)}
//               className="filter-select"
//             >
//               <option value="all">All</option>
//               <option value="none">None</option>
//               <option value="mild">🌶 Mild</option>
//               <option value="medium">🌶🌶 Medium</option>
//               <option value="spicy">🌶🌶🌶 Spicy</option>
//             </select>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import { useState, useRef } from "react";
import { Mic, MicOff, X, Volume2, Loader } from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import { menuData } from "../data/menuData";

const buildMenuSummary = (language) => menuData
  .map(item => {
    const name = item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name || "";
    return `${name} (${item.category}, ₹${item.price}, ${item.dietType}, popular: ${item.isPopular})`;
  })
  .join("; ");

export function VoiceAssistant({ onClose, onAddToCart, language }) {
  const t = useTranslation(language);
  const [listening, setListening]     = useState(false);
  const [transcript, setTranscript]   = useState("");
  const [response, setResponse]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const recogRef = useRef(null);

  // ── Text-to-Speech ──────────────────────────────────────────
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    utt.rate = 0.95;
    window.speechSynthesis.speak(utt);
  };

  // ── Smart Menu Filter ───────────────────────────────────────
  // Returns best/popular dishes based on what user said
  const filterMenuItems = (command) => {
    const lower = command.toLowerCase();

    // Helper: sort by popularity first, then by name
    const sortBest = (items) => {
      return [...items].sort((a, b) => {
        if (b.isPopular && !a.isPopular) return 1;
        if (a.isPopular && !b.isPopular) return -1;
        return 0;
      });
    };

    // ── Non-Veg ──
    if (
      lower.includes("non veg") ||
      lower.includes("nonveg") ||
      lower.includes("non-veg") ||
      lower.includes("chicken") ||
      lower.includes("mutton") ||
      lower.includes("fish") ||
      lower.includes("prawn") ||
      lower.includes("egg") ||
      lower.includes("meat") ||
      lower.includes("seafood")
    ) {
      return sortBest(menuData.filter(i => i.dietType === "non-veg"));
    }

    // ── Veg ──
    if (
      lower.includes("veg") ||
      lower.includes("vegetarian") ||
      lower.includes("veg food") ||
      lower.includes("no meat") ||
      lower.includes("plant")
    ) {
      return sortBest(menuData.filter(i => i.dietType === "veg"));
    }

    // ── Drinks / Beverages ──
    if (
      lower.includes("drink") ||
      lower.includes("beverage") ||
      lower.includes("juice") ||
      lower.includes("coffee") ||
      lower.includes("tea") ||
      lower.includes("lassi") ||
      lower.includes("soda") ||
      lower.includes("water") ||
      lower.includes("chaas") ||
      lower.includes("buttermilk")
    ) {
      return sortBest(menuData.filter(i => i.category === "Drinks"));
    }

    // ── Salad ──
    if (
      lower.includes("salad") ||
      lower.includes("healthy") ||
      lower.includes("diet") ||
      lower.includes("green") ||
      lower.includes("fresh")
    ) {
      return sortBest(menuData.filter(i => i.category === "Salad"));
    }

    // ── Soup ──
    if (
      lower.includes("soup") ||
      lower.includes("warm") ||
      lower.includes("hot soup")
    ) {
      return sortBest(menuData.filter(i => i.category === "Soup"));
    }

    // ── Dessert / Sweet ──
    if (
      lower.includes("dessert") ||
      lower.includes("sweet") ||
      lower.includes("ice cream") ||
      lower.includes("gulab") ||
      lower.includes("halwa") ||
      lower.includes("kheer") ||
      lower.includes("brownie") ||
      lower.includes("kulfi")
    ) {
      return sortBest(menuData.filter(i => i.category === "Dessert"));
    }

    // ── Starter / Snack ──
    if (
      lower.includes("starter") ||
      lower.includes("snack") ||
      lower.includes("appetizer") ||
      lower.includes("tikka") ||
      lower.includes("kebab") ||
      lower.includes("rolls")
    ) {
      return sortBest(menuData.filter(i => i.category === "Starter"));
    }

    // ── Main Course ──
    if (
      lower.includes("main") ||
      lower.includes("main course") ||
      lower.includes("curry") ||
      lower.includes("biryani") ||
      lower.includes("rice") ||
      lower.includes("noodles") ||
      lower.includes("roti") ||
      lower.includes("dal")
    ) {
      return sortBest(menuData.filter(i => i.category === "Main Course" || i.category === "Non-Veg"));
    }

    // ── Bread ──
    if (
      lower.includes("bread") ||
      lower.includes("naan") ||
      lower.includes("paratha") ||
      lower.includes("roti")
    ) {
      return sortBest(menuData.filter(i => i.category === "Bread"));
    }

    // ── Spicy ──
    if (
      lower.includes("spicy") ||
      lower.includes("hot") ||
      lower.includes("fiery") ||
      lower.includes("kolhapuri")
    ) {
      return sortBest(menuData.filter(i => i.spiceLevel === "spicy"));
    }

    // ── Mild / Less Spicy ──
    if (
      lower.includes("mild") ||
      lower.includes("less spicy") ||
      lower.includes("not spicy") ||
      lower.includes("light")
    ) {
      return sortBest(menuData.filter(i => i.spiceLevel === "mild" || i.spiceLevel === "none"));
    }

    // ── Cheap / Budget ──
    if (
      lower.includes("cheap") ||
      lower.includes("budget") ||
      lower.includes("affordable") ||
      lower.includes("low price") ||
      lower.includes("less price")
    ) {
      return [...menuData].sort((a, b) => a.price - b.price).slice(0, 8);
    }

    // ── Expensive / Premium ──
    if (
      lower.includes("expensive") ||
      lower.includes("premium") ||
      lower.includes("special") ||
      lower.includes("best")
    ) {
      return sortBest(menuData.filter(i => i.isPopular));
    }

    // ── Recommend / Popular / Today's special ──
    if (
      lower.includes("recommend") ||
      lower.includes("popular") ||
      lower.includes("today") ||
      lower.includes("special") ||
      lower.includes("most ordered") ||
      lower.includes("best dish") ||
      lower.includes("what should i order")
    ) {
      return sortBest(menuData.filter(i => i.isPopular));
    }

    // ── Default: show all popular items ──
    return sortBest(menuData.filter(i => i.isPopular));
  };

  // ── Call Anthropic API ──────────────────────────────────────
  const getAIResponse = async (userText) => {
    setLoading(true);
    setSuggestions([]);

    // Immediately show filtered menu results
    const filtered = filterMenuItems(userText);
    setSuggestions(filtered);

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 150,
          system: `You are a friendly voice assistant for Smart Hotel. 
Respond in exactly 1-2 short sentences. 
Be specific about the dishes shown.
Hotel hours: 10 AM to 11 PM. 
Language: ${language}.
Menu: ${buildMenuSummary(language)}`,
          messages: [{
            role: "user",
            content: userText
          }],
        }),
      });
      const data = await res.json();
      const text = data?.content?.[0]?.text || "Here are the best dishes for you!";
      setResponse(text);
      speak(text);
    } catch {
      const fallback = "Here are the best matching dishes for you!";
      setResponse(fallback);
      speak(fallback);
    } finally {
      setLoading(false);
    }
  };

  // ── Real Microphone ─────────────────────────────────────────
  const toggleListen = () => {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      setResponse("⚠️ Voice recognition not supported. Please use Chrome browser.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recogRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => setListening(false);

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      getAIResponse(text);
    };

    recognition.onerror = () => {
      setListening(false);
      setResponse("Could not capture voice. Please check microphone permissions.");
    };

    recognition.start();
  };

  // ── Example button click ────────────────────────────────────
  const handleExample = (ex) => {
    setTranscript(ex);
    getAIResponse(ex);
  };

  // ── Add to cart ─────────────────────────────────────────────
  const handleAddToCart = (item) => {
    onAddToCart(item);
    const name = item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name;
    const msg = `${name} has been added to your cart!`;
    setResponse(msg);
    speak(msg);
  };

  const exampleCommands = [
    "Show me non-veg dishes",
    "I want vegetarian food",
    "Show me drinks",
    "What salads do you have?",
    "Show me spicy dishes",
    "What desserts do you have?",
    "Show me starters",
    "Recommend best dishes",
  ];

  return (
    <div className="modal-overlay">
      <div className="va-box">

        {/* ── Header ── */}
        <div className="va-header">
          <div className="va-header-left">
            <Volume2 size={20}/>
            <div>
              <h2 className="va-title">Voice Assistant</h2>
              <p className="va-subtitle">Speak to find dishes or add to cart</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18}/>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="va-body">

          {/* Mic Button */}
          <div className="va-mic-wrap">
            <div
              className={`voice-circle ${listening ? "pulse" : ""}`}
              onClick={toggleListen}
            >
              {listening ? <MicOff size={32}/> : <Mic size={32}/>}
            </div>
            <p className="voice-hint">
              {listening ? "🔴 Listening… speak now" : "Tap the mic to speak"}
            </p>
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

          {/* Loading */}
          {loading && (
            <div className="voice-loading">
              <Loader size={16} className="spin"/>
              Finding the best dishes for you…
            </div>
          )}

          {/* AI Response */}
          {response && !loading && (
            <div className="voice-response">
              <p className="va-label">Assistant:</p>
              <p>{response}</p>
              <button className="voice-replay" onClick={() => speak(response)}>
                🔊 Replay
              </button>
            </div>
          )}

          {/* Menu Results */}
          {suggestions.length > 0 && !loading && (
            <div className="va-section">
              <p className="va-label">
                {suggestions.length} dish{suggestions.length !== 1 ? "es" : ""} found
                &nbsp;·&nbsp;
                <span style={{ color: "#10b981", fontWeight: 600 }}>
                  ⭐ Popular shown first
                </span>
              </p>
              <div className="va-results-list">
                {suggestions.map(item => (
                  <div key={item.id} className="va-result-row">
                    {/* Popular badge */}
                    <div className="va-result-img-wrap">
                      <img
                        src={item.image}
                        alt={item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                        className="va-result-img"
                      />
                      {item.isPopular && (
                        <span className="va-popular-badge">⭐</span>
                      )}
                    </div>

                    <div className="va-result-info">
                      <p className="va-result-name">
                        {item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name}
                      </p>
                      <p className="va-result-desc">
                        {item.descriptionTranslations?.[language] || Object.values(item.descriptionTranslations || {})[0] || item.description}
                      </p>
                      <div className="va-result-meta">
                        <span className="va-result-price">₹{item.price}</span>
                        {item.spiceLevel && item.spiceLevel !== "none" && (
                          <span className={`spice-tag ${item.spiceLevel}`}>
                            {item.spiceLevel}
                          </span>
                        )}
                        <span className={`va-diet-dot ${item.dietType === "veg" ? "veg" : "nonveg"}`}>
                          {item.dietType === "veg" ? "🟢 Veg" : "🔴 Non-veg"}
                        </span>
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
          {!transcript && (
            <div className="va-section">
              <p className="va-label">Try saying:</p>
              <div className="va-examples-grid">
                {exampleCommands.map((ex, i) => (
                  <button
                    key={i}
                    className="va-example-btn"
                    onClick={() => handleExample(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          z-index: 300; backdrop-filter: blur(4px);
        }
        .va-box {
          background: #fff; border-radius: 22px;
          width: 500px; max-width: 96vw; max-height: 92vh;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 70px rgba(0,0,0,0.22);
          overflow: hidden;
        }
        /* Header */
        .va-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px;
          background: linear-gradient(135deg, #e65c00, #f9a825);
          color: #fff; flex-shrink: 0;
        }
        .va-header-left { display: flex; align-items: center; gap: 12px; }
        .va-title { font-family:'Playfair Display',serif; font-size:1.1rem; margin:0; }
        .va-subtitle { font-size:0.76rem; opacity:0.88; margin:2px 0 0; }
        .modal-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.8); padding:4px; }
        .modal-close:hover { color:#fff; }
        /* Body */
        .va-body {
          flex: 1; overflow-y: auto; padding: 20px 22px;
          display: flex; flex-direction: column; gap: 16px;
        }
        /* Mic */
        .va-mic-wrap { display:flex; flex-direction:column; align-items:center; gap:10px; padding: 8px 0; }
        .voice-circle {
          width:88px; height:88px; border-radius:50%;
          background: linear-gradient(135deg,#e65c00,#f9a825);
          display:flex; align-items:center; justify-content:center;
          color:#fff; cursor:pointer;
          box-shadow: 0 6px 24px rgba(230,92,0,0.4);
          transition: transform 0.2s;
        }
        .voice-circle:hover { transform: scale(1.06); }
        .voice-circle.pulse { animation: pulse-ring 1s infinite; }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(230,92,0,0.45); }
          70%  { box-shadow: 0 0 0 20px rgba(230,92,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(230,92,0,0); }
        }
        .voice-hint { font-size:0.86rem; color:#9ca3af; margin:0; }
        /* Sections */
        .va-section { display:flex; flex-direction:column; gap:8px; }
        .va-label {
          font-size:0.74rem; font-weight:700; color:#9ca3af;
          text-transform:uppercase; letter-spacing:0.06em; margin:0;
        }
        /* Transcript */
        .voice-transcript {
          display:flex; align-items:center; gap:8px;
          background:#eff6ff; border:1px solid #bfdbfe;
          padding:10px 14px; border-radius:10px;
          font-size:0.88rem; color:#1d4ed8;
        }
        /* Loading */
        .voice-loading {
          display:flex; align-items:center; gap:8px;
          font-size:0.88rem; color:#e65c00; font-weight:500;
          padding: 10px 14px; background:#fff8f3;
          border-radius:10px;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg);} to{transform:rotate(360deg);} }
        /* Response */
        .voice-response {
          background:#f0fdf4; border:1px solid #bbf7d0;
          padding:14px 16px; border-radius:12px;
          display:flex; flex-direction:column; gap:8px;
        }
        .voice-response p { font-size:0.9rem; color:#374151; margin:0; line-height:1.5; }
        .voice-replay {
          background:none; border:1px solid #10b981; color:#10b981;
          border-radius:8px; padding:5px 14px; font-size:0.8rem;
          cursor:pointer; width:fit-content; transition: all 0.2s;
        }
        .voice-replay:hover { background:#10b981; color:#fff; }
        /* Results */
        .va-results-list { display:flex; flex-direction:column; gap:10px; }
        .va-result-row {
          display:flex; align-items:center; gap:12px;
          padding:10px 12px; border:1px solid #f3f4f6;
          border-radius:14px; background:#fafafa;
          transition: all 0.15s;
        }
        .va-result-row:hover { background:#fff8f3; border-color:#fed7aa; }
        .va-result-img-wrap { position:relative; flex-shrink:0; }
        .va-result-img { width:56px; height:56px; border-radius:10px; object-fit:cover; display:block; }
        .va-popular-badge {
          position:absolute; top:-5px; right:-5px;
          font-size:0.7rem; background:#fef9c3;
          border-radius:50%; width:18px; height:18px;
          display:flex; align-items:center; justify-content:center;
          border:1px solid #fde047;
        }
        .va-result-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
        .va-result-name {
          font-size:0.88rem; font-weight:700; color:#1a1a2e; margin:0;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .va-result-desc {
          font-size:0.74rem; color:#9ca3af; margin:0;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        }
        .va-result-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
        .va-result-price { font-size:0.88rem; font-weight:700; color:#e65c00; }
        .va-diet-dot { font-size:0.72rem; color:#6b7280; }
        .va-add-btn {
          background:#e65c00; color:#fff; border:none;
          padding:8px 16px; border-radius:10px;
          font-size:0.82rem; font-weight:700;
          cursor:pointer; flex-shrink:0; transition:background 0.2s;
        }
        .va-add-btn:hover { background:#c44e00; }
        .va-add-btn:disabled { background:#d1d5db; cursor:not-allowed; }
        /* Spice tags */
        .spice-tag { font-size:0.68rem; padding:2px 7px; border-radius:20px; font-weight:600; }
        .spice-tag.mild    { background:#fef9c3; color:#854d0e; }
        .spice-tag.medium  { background:#fed7aa; color:#9a3412; }
        .spice-tag.spicy   { background:#fee2e2; color:#991b1b; }
        /* Examples */
        .va-examples-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .va-example-btn {
          text-align:left; padding:9px 13px;
          background:#f9fafb; border:1px solid #e5e7eb;
          border-radius:10px; font-size:0.82rem; color:#374151;
          cursor:pointer; transition:all 0.15s; line-height:1.4;
        }
        .va-example-btn:hover { background:#fff3eb; border-color:#fed7aa; color:#e65c00; }
      `}</style>
    </div>
  );
}
