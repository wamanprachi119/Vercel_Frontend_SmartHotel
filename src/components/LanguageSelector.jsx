import { useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import "../styles/LanguageSelector.css";
import { saveLanguagePreference } from "../services/api";

const languages = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi",   native: "हिन्दी",   flag: "🇮🇳" },
  { code: "mr", name: "Marathi", native: "मराठी",    flag: "🇮🇳" },
];

const HOTEL_BG = "https://gos3.ibcdn.com/7188b3b2656e11edb95b0a58a9feac02.jpg";

function getSessionId() {
  let sid = localStorage.getItem("smartHotelSessionId");
  if (!sid) {
    sid = "sess-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem("smartHotelSessionId", sid);
  }
  return sid;
}

export function LanguageSelector({ onSelectLanguage }) {
  const [open, setOpen] = useState(false);
  // Always start with no pre-selection — user must choose every time after refresh
  const [selected, setSelected] = useState(null);

  const handleSelect = (lang) => {
    setSelected(lang);
    setOpen(false);
  };

  const handleProceed = async () => {
    if (!selected || !onSelectLanguage) return;
    const sessionId = getSessionId();
    saveLanguagePreference(sessionId, selected.code);
    onSelectLanguage(selected.code);
  };

  return (
    <div
      className="lang-page"
      style={{
        backgroundImage: `url('${HOTEL_BG}')`,
        justifyContent: "flex-start",
        paddingTop: "clamp(48px, 10vh, 96px)",
      }}
    >
      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)"
      }} />

      <div style={{
        position: "relative", zIndex: 1, width: "100%",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <h1 style={{
          color: "#f97316", fontSize: "clamp(1.8rem, 5vw, 2.8rem)",
          fontWeight: 800, margin: "0 0 8px", textAlign: "center",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          Smart Hotel
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.85)", fontSize: "clamp(0.85rem, 2vw, 1rem)",
          margin: "0 0 32px", textAlign: "center", maxWidth: 420, lineHeight: 1.5,
        }}>
          Experience comfort, smart service and delicious food at your table.
        </p>

        {/* Language Dropdown */}
        <div style={{ position: "relative", width: "min(420px, 90vw)", marginBottom: 12 }}>
          <button
            type="button"
            className="lang-btn"
            onClick={() => setOpen(!open)}
            style={{ width: "100%" }}
          >
            <div className="lang-left">
              <Globe color="#e65c00" size={20} />
              <span>
                {selected
                  ? `${selected.flag} ${selected.native}`
                  : "Select Language / भाषा चुनें / भाषा निवडा"}
              </span>
            </div>
            <ChevronDown
              size={20}
              color="#9ca3af"
              style={{
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {open && (
            <div className="lang-dropdown" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4 }}>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                >
                  <span style={{ fontSize: "1.3rem" }}>{lang.flag}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{lang.native}</span>
                  <span style={{ fontSize: "0.8rem", color: "#9ca3af" }}>{lang.name}</span>
                  {selected?.code === lang.code && (
                    <Check size={16} color="#e65c00" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          className="lang-proceed-btn"
          onClick={handleProceed}
          disabled={!selected}
          style={{ width: "min(420px, 90vw)" }}
        >
          Continue →
        </button>

        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", marginTop: 12 }}>
          Choose your preferred language to get started
        </p>
      </div>
    </div>
  );
}
