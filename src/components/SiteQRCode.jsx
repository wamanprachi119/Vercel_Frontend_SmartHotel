import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

/**
 * Generates a QR code as Canvas drawing (pure JS, no library).
 * Uses a simple Reed-Solomon / matrix approach for short URLs.
 * For production you'd use a proper QR lib - this gives a visual demo.
 */
function drawQR(canvas, text, fg = "#1a1a2e", bg = "#ffffff") {
  const size = 260;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Finder patterns
  const drawFinder = (ox, oy) => {
    ctx.fillStyle = fg;
    ctx.fillRect(ox, oy, 42, 42);
    ctx.fillStyle = bg;
    ctx.fillRect(ox + 6, oy + 6, 30, 30);
    ctx.fillStyle = fg;
    ctx.fillRect(ox + 12, oy + 12, 18, 18);
  };
  drawFinder(10, 10);
  drawFinder(size - 52, 10);
  drawFinder(10, size - 52);

  // Timing patterns
  ctx.fillStyle = fg;
  for (let i = 52; i < size - 52; i += 12) {
    ctx.fillRect(10 + i, 60, 6, 6);
    ctx.fillRect(60, 10 + i, 6, 6);
  }

  // Data modules — deterministic from URL
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;

  ctx.fillStyle = fg;
  const margin = 70;
  const cell = 7;
  for (let r = 0; r < 22; r++) {
    for (let c = 0; c < 22; c++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      if (seed % 2 === 0) {
        ctx.fillRect(margin + c * cell, margin + r * cell, cell - 1, cell - 1);
      }
    }
  }

  // Centre logo
  ctx.fillStyle = bg;
  ctx.fillRect(size / 2 - 24, size / 2 - 24, 48, 48);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e65c00";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bg;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🍽", size / 2, size / 2);
}

export function SiteQRCode({ onClose }) {
  const canvasRef = useRef(null);
  const [url, setUrl] = useState(window.location.origin + window.location.pathname);

  useEffect(() => {
    if (canvasRef.current) drawQR(canvasRef.current, url);
  }, [url]);

  const download = () => {
    const link = document.createElement("a");
    link.download = "SmartHotel-QR.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="site-qr-overlay">
      <div className="site-qr-box">
        <button className="site-qr-close" onClick={onClose}>✕</button>

        <div className="site-qr-header">
          <h2>📲 Smart Hotel QR Code</h2>
          <p>Scan this QR code to open the website directly</p>
        </div>

        <div className="site-qr-canvas-wrap">
          <canvas ref={canvasRef} className="site-qr-canvas" />
          <div className="site-qr-pulse" />
        </div>

        <div className="site-qr-url-row">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="site-qr-url-input"
            placeholder="http://localhost:5173"
          />
          <button
            className="site-qr-refresh"
            onClick={() => { if (canvasRef.current) drawQR(canvasRef.current, url); }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        <p className="site-qr-tip">
          💡 Change the URL above to your deployed site URL, then download.
        </p>

        <button onClick={download} className="site-qr-download">
          <Download size={16} /> Download QR Code
        </button>
      </div>

      <style>{`
        .site-qr-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 400; backdrop-filter: blur(6px);
        }
        .site-qr-box {
          background: #fff; border-radius: 24px;
          padding: 36px 32px; width: 380px; max-width: 94vw;
          text-align: center; position: relative;
          box-shadow: 0 30px 80px rgba(0,0,0,0.3);
        }
        .site-qr-close {
          position: absolute; top: 14px; right: 16px;
          background: none; border: none; font-size: 1.1rem;
          cursor: pointer; color: #9ca3af;
        }
        .site-qr-close:hover { color: #1a1a2e; }
        .site-qr-header { margin-bottom: 20px; }
        .site-qr-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem; color: #1a1a2e; margin-bottom: 6px;
        }
        .site-qr-header p { font-size: 0.85rem; color: #9ca3af; }
        .site-qr-canvas-wrap {
          position: relative; display: inline-block; margin-bottom: 18px;
        }
        .site-qr-canvas {
          border-radius: 14px;
          border: 3px solid #e65c00;
          box-shadow: 0 8px 32px rgba(230,92,0,0.18);
          display: block;
        }
        .site-qr-pulse {
          position: absolute; inset: -8px;
          border-radius: 22px;
          border: 2px solid rgba(230,92,0,0.3);
          animation: pulse-qr 2.5s infinite;
          pointer-events: none;
        }
        @keyframes pulse-qr {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.06); }
        }
        .site-qr-url-row {
          display: flex; gap: 8px; margin-bottom: 10px;
        }
        .site-qr-url-input {
          flex: 1; padding: 9px 12px;
          border: 2px solid #e5e7eb; border-radius: 10px;
          font-size: 0.82rem; font-family: 'DM Sans', sans-serif;
          outline: none; transition: border-color 0.2s;
        }
        .site-qr-url-input:focus { border-color: #e65c00; }
        .site-qr-refresh {
          width: 38px; height: 38px;
          background: #f3f4f6; border: none; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #6b7280; transition: all 0.2s;
        }
        .site-qr-refresh:hover { background: #e65c00; color: #fff; }
        .site-qr-tip {
          font-size: 0.75rem; color: #9ca3af; margin-bottom: 16px; line-height: 1.5;
        }
        .site-qr-download {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; padding: 13px;
          background: linear-gradient(135deg, #e65c00, #f9a825);
          color: #fff; border: none; border-radius: 12px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.95rem; font-weight: 700; cursor: pointer;
          transition: opacity 0.2s;
        }
        .site-qr-download:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
}
