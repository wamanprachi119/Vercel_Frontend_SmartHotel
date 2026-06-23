import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Sparkles, ChefHat, Coffee, Utensils } from "lucide-react";
import { menuData } from "../data/menuData";

// ── Build a rich menu summary for the AI context ──
const buildMenuContext = (language) => {
  const byCategory = {};
  menuData.forEach(item => {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  });

  let ctx = "=== FULL MENU (use this to answer all food questions) ===\n";
  Object.entries(byCategory).forEach(([cat, items]) => {
    ctx += `\n[${cat}]\n`;
    items.forEach(item => {
      const name = item.nameTranslations?.[language] || Object.values(item.nameTranslations || {})[0] || item.name || "";
      const desc = item.descriptionTranslations?.[language] || Object.values(item.descriptionTranslations || {})[0] || item.description || "";
      ctx += `• ${name} — ₹${item.price} | ${item.dietType} | ${item.spiceLevel} spice | Rating: ${item.rating || "4.5"}/5`;
      if (item.isPopular) ctx += " ⭐POPULAR";
      ctx += `\n  ${desc}\n  Ingredients: ${item.ingredients?.join(", ")}\n`;
    });
  });
  return ctx;
};

const buildSystemPrompt = (language) => `You are "Raj", a warm, professional and knowledgeable food assistant at Smart Hotel — a premium multi-cuisine hotel in India.

PERSONALITY:
- Friendly, enthusiastic, and genuinely helpful like a trusted waiter who knows the menu deeply
- Use food emojis tastefully (not excessively)
- Speak naturally, conversationally — not robotically
- Address the guest warmly
- Keep replies concise (3-6 sentences usually) unless asked for something detailed

YOUR EXPERTISE:
1. Full menu knowledge — categories, prices, ingredients, dietary info, spice levels
2. Smart dish recommendations based on preferences, mood, budget, health goals
3. Food pairing — suggest drinks or sides that go well with dishes
4. Combo suggestions — 2-3 dishes that work beautifully together
5. Hotel information — hours, payment, ordering, delivery

RECOMMENDATION LOGIC:
- "spicy food" → suggest items with spiceLevel: "spicy" from any category
- "veg" or "vegetarian" → only dietType: "veg" items
- "cheap" or "budget" → items under ₹150
- "popular" → isPopular: true items
- "healthy" → Healthy Food category, salads, soups
- "kids" → Kids Special category + mild items
- "dessert" → Desserts category
- "breakfast" → Breakfast category
- "Chinese" → Chinese category
- "South Indian" → South Indian + Breakfast (dosa, idli etc)
- "Punjabi" → Punjabi category
- "Italian" → Italian category
- "drinks" → Beverages + Drinks categories
- "combos" → pair a main + bread/rice + dessert + drink

COMBO SUGGESTIONS (always include price total):
- Thali Combo: Dal Makhani + Butter Naan + Gulab Jamun + Masala Chai = great value
- South Indian Combo: Masala Dosa + Medu Vada + Filter Coffee
- Chinese Combo: Hakka Noodles + Manchow Soup + Honey Chili Potato
- Family Feast: Butter Chicken + Veg Biryani + Garlic Naan + Kulfi Falooda
- Healthy Combo: Quinoa Buddha Bowl + Turmeric Latte

HOTEL INFORMATION:
- Hours: 10:00 AM – 11:00 PM daily
- Delivery: 30-40 minutes, contactless available
- Dine-in, takeaway, home delivery all available
- Payments: UPI, Debit/Credit Card, Cash, Wallets
- Minimum order: ₹150
- Table reservations: Available online
- Catering: Yes, for events and functions
- Student discount: Yes with valid ID
- Offers: Check Offers section in app

IMPORTANT RULES:
- NEVER make up dishes not in the menu
- Always mention prices when recommending
- If asked about something not on menu, politely say it's not available today and suggest alternatives
- For dietary restrictions (allergies, Jain food, low-cal), be helpful and accurate
- Jain food: Available — ask kitchen to skip onion/garlic

${buildMenuContext(language)}`;

const QUICK_PROMPTS = [
  { icon: "🌶️", label: "Spicy food", query: "Suggest your spiciest dishes" },
  { icon: "🥗", label: "Best veg", query: "What are your best vegetarian dishes?" },
  { icon: "💰", label: "Budget picks", query: "Cheap but tasty options under ₹150?" },
  { icon: "⭐", label: "Popular dishes", query: "What are the most popular dishes?" },
  { icon: "🍰", label: "Desserts", query: "Tell me about your desserts" },
  { icon: "🥘", label: "Suggest a combo", query: "Suggest a great meal combo for 2 people" },
];

export function Chatbot({ onClose, language }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm **Raj**, your Smart Hotel food assistant!\n\nI know our entire menu inside-out and can suggest dishes, combos, drinks, and answer any questions. What are you in the mood for today? 😊",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatMessage = (text) => {
    // Convert **bold** and newlines to JSX
    return text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            part.startsWith('**') && part.endsWith('**')
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  const sendMessage = async (text) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;

    const userMsg = { role: "user", content: msgText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 600,
            system: buildSystemPrompt(language) + `\n\nCurrent language preference: ${language || "en"}. Reply in the user's language and use the menu item names and descriptions provided in the menu context.`,
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          }),
      });

      const data = await response.json();
      const reply = data?.content?.[0]?.text || "I'm sorry, I couldn't process that. Please try again!";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "😅 I'm having trouble connecting right now. Please try again in a moment!",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cb-overlay">
      <div className="cb-box">
        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-left">
            <div className="cb-avatar">
              <ChefHat size={20} />
            </div>
            <div>
              <p className="cb-name">Raj — Food Assistant</p>
              <p className="cb-status">
                <span className="cb-dot" />
                Online · Menu Expert
              </p>
            </div>
          </div>
          <button className="cb-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Quick prompts */}
        <div className="cb-quick-wrap">
          <p className="cb-quick-label"><Sparkles size={12} /> Quick asks</p>
          <div className="cb-quick-row">
            {QUICK_PROMPTS.map(p => (
              <button
                key={p.label}
                className="cb-quick-btn"
                onClick={() => sendMessage(p.query)}
                disabled={loading}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="cb-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`cb-msg ${msg.role}`}>
              <div className="cb-bubble">
                {msg.role === "assistant" && (
                  <div className="cb-icon-wrap assistant-icon"><Bot size={13} /></div>
                )}
                <div className="cb-text">{formatMessage(msg.content)}</div>
                {msg.role === "user" && (
                  <div className="cb-icon-wrap user-icon"><User size={13} /></div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="cb-msg assistant">
              <div className="cb-bubble">
                <div className="cb-icon-wrap assistant-icon"><Bot size={13} /></div>
                <div className="cb-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="cb-input-wrap">
          <div className="cb-input-inner">
            <Utensils size={15} className="cb-input-icon" />
            <input
              ref={inputRef}
              className="cb-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Ask about food, combos, prices…"
            />
            <button
              className="cb-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .cb-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:300;backdrop-filter:blur(6px);padding:16px;}
        .cb-box{background:#fff;border-radius:24px;width:440px;max-width:100%;height:600px;max-height:95vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.25);overflow:hidden;animation:cbSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1);}
        @keyframes cbSlideIn{from{opacity:0;transform:scale(0.9) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}

        /* Header */
        .cb-header{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:linear-gradient(135deg,#c0392b 0%,#e65c00 50%,#f9a825 100%);color:#fff;flex-shrink:0;}
        .cb-header-left{display:flex;align-items:center;gap:10px;}
        .cb-avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.3);}
        .cb-name{font-weight:700;font-size:0.92rem;margin:0;letter-spacing:0.02em;}
        .cb-status{font-size:0.72rem;opacity:0.9;margin:0;display:flex;align-items:center;gap:4px;}
        .cb-dot{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 2px rgba(74,222,128,0.3);display:inline-block;}
        .cb-close{background:rgba(255,255,255,0.15);border:none;cursor:pointer;color:#fff;padding:6px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background 0.2s;}
        .cb-close:hover{background:rgba(255,255,255,0.25);}

        /* Quick prompts */
        .cb-quick-wrap{padding:10px 14px 8px;background:#fff8f3;border-bottom:1px solid #fde8d8;flex-shrink:0;}
        .cb-quick-label{font-size:0.7rem;color:#9a3412;font-weight:600;margin:0 0 6px;display:flex;align-items:center;gap:4px;text-transform:uppercase;letter-spacing:0.05em;}
        .cb-quick-row{display:flex;gap:5px;flex-wrap:wrap;}
        .cb-quick-btn{background:#fff;border:1.5px solid #fed7aa;color:#c2410c;border-radius:20px;padding:4px 10px;font-size:0.73rem;cursor:pointer;white-space:nowrap;transition:all 0.15s;font-weight:500;}
        .cb-quick-btn:hover:not(:disabled){background:#fff7ed;border-color:#fb923c;transform:translateY(-1px);}
        .cb-quick-btn:disabled{opacity:0.5;cursor:not-allowed;}

        /* Messages */
        .cb-messages{flex:1;overflow-y:auto;padding:14px 14px 8px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;}
        .cb-messages::-webkit-scrollbar{width:4px;}
        .cb-messages::-webkit-scrollbar-thumb{background:#f1d4b8;border-radius:4px;}
        .cb-msg{display:flex;animation:msgIn 0.2s ease;}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
        .cb-msg.user{justify-content:flex-end;}
        .cb-msg.assistant{justify-content:flex-start;}
        .cb-bubble{max-width:85%;display:flex;align-items:flex-start;gap:7px;}
        .cb-msg.user .cb-bubble{flex-direction:row-reverse;}
        .cb-icon-wrap{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}
        .assistant-icon{background:linear-gradient(135deg,#e65c00,#f9a825);color:#fff;}
        .user-icon{background:#e5e7eb;color:#6b7280;}
        .cb-text{padding:9px 13px;border-radius:16px;font-size:0.86rem;line-height:1.55;word-break:break-word;}
        .cb-msg.assistant .cb-text{background:#f3f4f6;color:#1f2937;border-bottom-left-radius:4px;}
        .cb-msg.user .cb-text{background:linear-gradient(135deg,#c0392b,#e65c00);color:#fff;border-bottom-right-radius:4px;}

        /* Typing indicator */
        .cb-typing{display:flex;gap:4px;align-items:center;padding:9px 13px;background:#f3f4f6;border-radius:16px;border-bottom-left-radius:4px;}
        .cb-typing span{width:7px;height:7px;border-radius:50%;background:#d1d5db;animation:typingBounce 1.3s infinite;}
        .cb-typing span:nth-child(2){animation-delay:0.2s;}
        .cb-typing span:nth-child(3){animation-delay:0.4s;}
        @keyframes typingBounce{0%,80%,100%{transform:translateY(0);}40%{transform:translateY(-7px);}}

        /* Input */
        .cb-input-wrap{padding:10px 12px;border-top:1px solid #f3f4f6;flex-shrink:0;background:#fff;}
        .cb-input-inner{display:flex;align-items:center;gap:6px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:14px;padding:6px 8px 6px 12px;transition:border-color 0.2s;}
        .cb-input-inner:focus-within{border-color:#e65c00;background:#fff;}
        .cb-input-icon{color:#9ca3af;flex-shrink:0;}
        .cb-input{flex:1;border:none;background:transparent;font-size:0.88rem;outline:none;color:#1f2937;}
        .cb-input::placeholder{color:#9ca3af;}
        .cb-send{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#e65c00,#f9a825);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:opacity 0.2s,transform 0.15s;}
        .cb-send:hover:not(:disabled){transform:scale(1.05);}
        .cb-send:disabled{opacity:0.4;cursor:not-allowed;}
      `}</style>
    </div>
  );
}
