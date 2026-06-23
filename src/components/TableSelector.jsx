import { useState } from "react";
import { ChefHat, UtensilsCrossed } from "lucide-react";

export function TableSelector({ onSelectTable }) {
  const [selected, setSelected] = useState(null);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");

  const tables = Array.from({ length: 20 }, (_, i) => i + 1);

  const handleConfirm = () => {
    const tableNum = selected || custom.trim();
    if (!tableNum) {
      setError("Please select or enter a table number.");
      return;
    }
    onSelectTable(String(tableNum));
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>
          <ChefHat size={36} color="#e65c00" />
        </div>
        <h1 style={styles.title}>Smart Hotel</h1>
        <p style={styles.sub}>Please select your table to get started</p>

        <div style={styles.grid}>
          {tables.map(t => (
            <button
              key={t}
              style={{
                ...styles.tableBtn,
                ...(selected === t ? styles.tableBtnActive : {}),
              }}
              onClick={() => { setSelected(t); setCustom(""); setError(""); }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={styles.orRow}>
          <div style={styles.line} /><span style={styles.orText}>or enter manually</span><div style={styles.line} />
        </div>

        <input
          style={styles.input}
          placeholder="Table number..."
          value={custom}
          onChange={e => { setCustom(e.target.value); setSelected(null); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleConfirm()}
          type="number"
          min="1"
        />

        {error && <p style={styles.error}>{error}</p>}

        <button style={styles.confirmBtn} onClick={handleConfirm}>
          <UtensilsCrossed size={16} />
          Confirm Table {selected || (custom ? `#${custom}` : "")}
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fdba74 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "20px",
  },
  card: {
    background: "#fff", borderRadius: "20px",
    padding: "36px 32px", maxWidth: "520px", width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
    textAlign: "center",
  },
  iconWrap: {
    width: 70, height: 70, borderRadius: "50%",
    background: "linear-gradient(135deg,#fff7ed,#fed7aa)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    border: "2px solid #fdba74",
  },
  title: { fontSize: "1.8rem", fontWeight: 700, color: "#1c1c1c", margin: "0 0 6px" },
  sub: { color: "#6b7280", fontSize: "0.95rem", margin: "0 0 24px" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(5,1fr)",
    gap: "10px", marginBottom: "20px",
  },
  tableBtn: {
    padding: "14px 0", borderRadius: "10px", border: "2px solid #e5e7eb",
    background: "#f9fafb", cursor: "pointer", fontSize: "1rem", fontWeight: 600,
    color: "#374151", transition: "all 0.15s",
  },
  tableBtnActive: {
    background: "linear-gradient(135deg,#e65c00,#f9a825)",
    borderColor: "transparent", color: "#fff",
    boxShadow: "0 4px 12px rgba(230,92,0,0.35)",
    transform: "scale(1.05)",
  },
  orRow: {
    display: "flex", alignItems: "center", gap: "10px", margin: "4px 0 16px",
  },
  line: { flex: 1, height: "1px", background: "#e5e7eb" },
  orText: { color: "#9ca3af", fontSize: "0.8rem", whiteSpace: "nowrap" },
  input: {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    border: "2px solid #e5e7eb", fontSize: "1rem", textAlign: "center",
    outline: "none", marginBottom: "8px", boxSizing: "border-box",
  },
  error: { color: "#dc2626", fontSize: "0.85rem", margin: "0 0 12px" },
  confirmBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
    width: "100%", padding: "14px", borderRadius: "12px",
    background: "linear-gradient(135deg,#e65c00,#f9a825)",
    color: "#fff", border: "none", cursor: "pointer",
    fontSize: "1rem", fontWeight: 700, marginTop: "8px",
    boxShadow: "0 4px 16px rgba(230,92,0,0.3)",
  },
};
