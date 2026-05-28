"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type DocType = "ot" | "ce" | "cot" | "nv" | "cl";

const TYPES: Record<DocType, { title: string; subtitle: string; badge: string; color: string; accent: string; pathFn: (code: string, branchId: string) => string; codeDisplay: (code: string) => string }> = {
  ot: {
    title: "Orden de Trabajo",
    subtitle: "Escanea para rastrear tu equipo",
    badge: "📋 Seguimiento",
    color: "#3b82f6",
    accent: "#1e3a8a",
    pathFn: (code, bid) => `/track/${code}${bid ? `?branchId=${bid}` : ""}`,
    codeDisplay: (code) => code,
  },
  ce: {
    title: "Comprobante de Entrega",
    subtitle: "Escanea para ver el comprobante",
    badge: "📄 Entrega",
    color: "#10b981",
    accent: "#065f46",
    pathFn: (code, bid) => `/delivery/${code}${bid ? `?branchId=${bid}` : ""}`,
    codeDisplay: (code) => `CE-${code.replace(/^OT-/i, "")}`,
  },
  cot: {
    title: "Cotización",
    subtitle: "Escanea para ver la cotización",
    badge: "🧾 Cotización",
    color: "#f59e0b",
    accent: "#92400e",
    pathFn: (code, bid) => `/quotations/print/${code}${bid ? `?branchId=${bid}` : ""}`,
    codeDisplay: (code) => code,
  },
  nv: {
    title: "Nota de Venta",
    subtitle: "Escanea para ver la nota de venta",
    badge: "💰 Venta",
    color: "#a855f7",
    accent: "#6b21a8",
    pathFn: (code, bid) => `/quotations/print/${code}${bid ? `?branchId=${bid}` : ""}`,
    codeDisplay: (code) => code,
  },
  cl: {
    title: "Certificado de Licencia",
    subtitle: "Escanea para verificar licencias",
    badge: "🏅 Licencia",
    color: "#ec4899",
    accent: "#9d174d",
    pathFn: (code, bid) => `/certificate-view/${code}${bid ? `?branchId=${bid}` : ""}`,
    codeDisplay: (code) => code,
  },
};

export default function PrintQRPage() {
  const params = useParams();
  const type = (params.type as string)?.toLowerCase() as DocType;
  const code = params.code as string;
  const [baseUrl, setBaseUrl] = useState("");
  const [branchId, setBranchId] = useState("");
  const [stickerSize, setStickerSize] = useState<"small" | "medium" | "large">("medium");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    setBaseUrl(window.location.origin);
    setBranchId(new URLSearchParams(window.location.search).get("branchId") || "");
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
  }, []);

  const cfg = TYPES[type];
  if (!cfg) {
    return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>
      Tipo de documento no válido: {type}. Usa: ot, ce, cot, nv, cl.
    </div>;
  }

  const displayCode = cfg.codeDisplay(code);
  const targetUrl = baseUrl ? `${baseUrl}${cfg.pathFn(code, branchId)}` : "";

  const sizeMap = {
    small: { qr: 120, card: 180, title: 11, code: 14, brand: 8, sub: 8 },
    medium: { qr: 180, card: 240, title: 13, code: 18, brand: 9, sub: 9 },
    large: { qr: 260, card: 340, title: 15, code: 22, brand: 10, sub: 10 },
  };
  const sz = sizeMap[stickerSize];
  const qrImg = targetUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=${sz.qr * 2}x${sz.qr * 2}&data=${encodeURIComponent(targetUrl)}&color=000000&margin=2` : "";

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        @media print {
          @page { size: auto; margin: 6mm; }
          .no-print { display: none !important; }
          .sticker-wrap { padding: 0 !important; min-height: auto !important; }
          .sticker-card { border: 2px dashed #888 !important; box-shadow: none !important; page-break-inside: avoid; }
        }
      `}</style>

      {/* Top bar (not printed) */}
      <div className="no-print" style={{ position: "sticky", top: 0, padding: "12px 24px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100, flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>
          🏷️ Sticker QR · {displayCode}
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Sticker size */}
          <div style={{ display: "flex", gap: 0, background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
            <button onClick={() => setStickerSize("small")} style={{ padding: "7px 12px", background: stickerSize === "small" ? cfg.color : "transparent", border: "none", color: stickerSize === "small" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>S</button>
            <button onClick={() => setStickerSize("medium")} style={{ padding: "7px 12px", background: stickerSize === "medium" ? cfg.color : "transparent", border: "none", color: stickerSize === "medium" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>M</button>
            <button onClick={() => setStickerSize("large")} style={{ padding: "7px 12px", background: stickerSize === "large" ? cfg.color : "transparent", border: "none", color: stickerSize === "large" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>L</button>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(targetUrl); }} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔗 Copiar link</button>
          <button onClick={() => window.print()} style={{ padding: "7px 18px", background: cfg.color, border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* Sticker */}
      <div className="sticker-wrap" style={{ display: "flex", justifyContent: "center", padding: "28px 16px", minHeight: "calc(100vh - 60px)" }}>
        <div className="sticker-card" style={{
          width: sz.card,
          background: "#fff",
          border: "2px dashed #bbb",
          borderRadius: 10,
          padding: "14px 14px 10px",
          textAlign: "center",
          boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
          fontFamily: "'Segoe UI', Arial, sans-serif",
        }}>
          {/* Brand header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
            {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 20, height: 20, objectFit: "contain" }} />}
            <span style={{ fontSize: sz.brand, fontWeight: 800, color: cfg.accent, letterSpacing: "-0.2px" }}>{settings.companyName}</span>
          </div>

          {/* Badge */}
          <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 14, background: cfg.color, color: "#fff", fontSize: sz.brand, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
            {cfg.badge}
          </div>

          {/* Title */}
          <div style={{ fontSize: sz.title, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2, marginBottom: 2 }}>
            {cfg.title}
          </div>
          <div style={{ fontSize: sz.sub, color: "#666", marginBottom: 10, fontWeight: 500 }}>
            {cfg.subtitle}
          </div>

          {/* QR */}
          <div style={{ display: "inline-block", padding: 6, background: "#fff", border: `2px solid ${cfg.color}`, borderRadius: 8 }}>
            {qrImg ? (
              <img src={qrImg} alt="QR" width={sz.qr} height={sz.qr} style={{ display: "block" }} />
            ) : (
              <div style={{ width: sz.qr, height: sz.qr, background: "#f3f4f6" }} />
            )}
          </div>

          {/* Code */}
          <div style={{ fontSize: sz.code, fontWeight: 800, color: cfg.color, fontFamily: "monospace", marginTop: 6, letterSpacing: "0.5px" }}>{displayCode}</div>

          {/* Instruction */}
          <div style={{ fontSize: sz.sub, color: "#666", marginTop: 4, fontWeight: 600 }}>📱 Escanea con tu celular</div>
        </div>
      </div>
    </div>
  );
}
