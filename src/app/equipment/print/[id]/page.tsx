"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface Equipment {
  id: string; code: string; name: string; type: string; brand: string | null; model: string | null;
  processor: string | null; ram: string | null; storage: string | null; storage2: string | null;
  screenSize: string | null; graphicsCard: string | null; os: string | null; cabinet: string | null;
  powerSupply: string | null; motherboard: string | null; accessories: string | null;
  condition: string; price: number; notes: string | null; image: string | null;
  createdAt: string; branch?: { id: string; name: string } | null;
}

function parseImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr.filter(Boolean); } catch {}
  return img.trim() ? [img] : [];
}

function getDisplayName(eq: Equipment): string {
  if (eq.type === "desktop") {
    const cab = (eq.cabinet || "").trim();
    return cab ? `PC Escritorio ${cab}` : "PC Escritorio";
  }
  return ["Laptop", eq.brand, eq.model].filter(Boolean).join(" ") || "Laptop";
}

const CONDITIONS: Record<string, { label: string; color: string; icon: string }> = {
  disponible: { label: "DISPONIBLE", color: "#10b981", icon: "✅" },
  vendido: { label: "VENDIDO", color: "#1ab8c4", icon: "💰" },
  en_reparacion: { label: "EN REPARACIÓN", color: "#f59e0b", icon: "🔧" },
};

export default function EquipmentFichaPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [mode, setMode] = useState<"full" | "sticker">("full");
  const [stickerSize, setStickerSize] = useState<"small" | "medium" | "large">("medium");
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; phone: string | null; email: string | null; address: string | null }>({
    companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null, phone: null, email: null, address: null,
  });

  useEffect(() => {
    setBaseUrl(window.location.origin);
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "sticker") setMode("sticker");
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    apiFetch("/api/equipment").then(r => r.ok ? r.json() : []).then((items: Equipment[]) => {
      if (Array.isArray(items)) {
        const found = items.find(it => it.id === id);
        if (found) setEquipment(found);
        else setNotFound(true);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16 }}>Cargando ficha técnica...</div>;
  if (notFound || !equipment) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>Equipo no encontrado</div>;

  const eq = equipment;
  const imgs = parseImages(eq.image);
  const mainImg = imgs[0] || null;
  const dName = getDisplayName(eq);
  const shortCode = eq.code || `EQ-?`;
  const cond = CONDITIONS[eq.condition] || CONDITIONS.disponible;
  const portalUrl = baseUrl ? `${baseUrl}/portal?eq=${eq.id}` : "";
  const qrImg = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(portalUrl)}&color=1a1a2e&margin=4` : "";
  const today = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
  const createdDate = new Date(eq.createdAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" });
  const accent = "#1a1a2e";

  // Build specs list
  const specs: { icon: string; label: string; value: string; color: string }[] = [];
  if (eq.brand) specs.push({ icon: "🏷️", label: "Marca", value: eq.brand, color: "#1ab8c4" });
  if (eq.model) specs.push({ icon: "📦", label: "Modelo", value: eq.model, color: "#1ab8c4" });
  if (eq.processor) specs.push({ icon: "⚡", label: "Procesador", value: eq.processor, color: "#1ab8c4" });
  if (eq.ram) specs.push({ icon: "🧠", label: "Memoria RAM", value: eq.ram, color: "#10b981" });
  if (eq.storage) specs.push({ icon: "💾", label: "Disco Principal", value: eq.storage, color: "#f59e0b" });
  if (eq.storage2) specs.push({ icon: "💾", label: "Disco Secundario", value: eq.storage2, color: "#f59e0b" });
  if (eq.graphicsCard) specs.push({ icon: "🎮", label: "Tarjeta Gráfica", value: eq.graphicsCard, color: "#ec4899" });
  if (eq.screenSize) specs.push({ icon: "📐", label: "Pantalla", value: eq.screenSize, color: "#a855f7" });
  if (eq.os) specs.push({ icon: "🖥️", label: "Sistema Operativo", value: eq.os, color: "#0891b2" });
  if (eq.cabinet) specs.push({ icon: "🏗️", label: "Gabinete", value: eq.cabinet, color: "#e11d48" });
  if (eq.motherboard) specs.push({ icon: "🔌", label: "Placa Madre", value: eq.motherboard, color: "#14b8a6" });
  if (eq.powerSupply) specs.push({ icon: "⚡", label: "Fuente de Poder", value: eq.powerSupply, color: "#ea580c" });

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .ficha-content { padding: 0 !important; max-width: none !important; }
          .ficha-page { box-shadow: none !important; border: none !important; page-break-inside: avoid; }
        }
      `}</style>

      {/* Top bar (not printed) */}
      <div className="no-print" style={{ position: "sticky", top: 0, padding: "12px 24px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100, flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>
          {mode === "sticker" ? "🏷️ Sticker QR" : "🏷️ Ficha Técnica"} · {shortCode}
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 0, background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
            <button onClick={() => { setMode("full"); const u = new URL(window.location.href); u.searchParams.delete("mode"); window.history.replaceState({}, "", u.toString()); }} style={{ padding: "7px 12px", background: mode === "full" ? "#3b82f6" : "transparent", border: "none", color: mode === "full" ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📄 Ficha completa</button>
            <button onClick={() => { setMode("sticker"); const u = new URL(window.location.href); u.searchParams.set("mode", "sticker"); window.history.replaceState({}, "", u.toString()); }} style={{ padding: "7px 12px", background: mode === "sticker" ? "#0891b2" : "transparent", border: "none", color: mode === "sticker" ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏷️ Solo QR</button>
          </div>
          {/* Sticker size (only visible in sticker mode) */}
          {mode === "sticker" && (
            <div style={{ display: "flex", gap: 0, background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
              <button onClick={() => setStickerSize("small")} style={{ padding: "7px 10px", background: stickerSize === "small" ? "#0891b2" : "transparent", border: "none", color: stickerSize === "small" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>S</button>
              <button onClick={() => setStickerSize("medium")} style={{ padding: "7px 10px", background: stickerSize === "medium" ? "#0891b2" : "transparent", border: "none", color: stickerSize === "medium" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>M</button>
              <button onClick={() => setStickerSize("large")} style={{ padding: "7px 10px", background: stickerSize === "large" ? "#0891b2" : "transparent", border: "none", color: stickerSize === "large" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>L</button>
            </div>
          )}
          <button onClick={() => { navigator.clipboard.writeText(portalUrl); }} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔗 Copiar link</button>
          <button onClick={() => window.open(portalUrl, "_blank")} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>👁️ Ver en portal</button>
          <button onClick={() => window.print()} style={{ padding: "7px 18px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* STICKER MODE: only QR + code + name */}
      {mode === "sticker" ? (() => {
        const sizeMap = {
          small: { qr: 120, card: 180, title: 11, code: 14, brand: 8, sub: 8 },
          medium: { qr: 180, card: 240, title: 13, code: 18, brand: 9, sub: 9 },
          large: { qr: 260, card: 340, title: 15, code: 22, brand: 10, sub: 10 },
        };
        const sz = sizeMap[stickerSize];
        const qrImgBig = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=${sz.qr * 2}x${sz.qr * 2}&data=${encodeURIComponent(portalUrl)}&color=000000&margin=2` : "";
        const eqColor = "#0891b2";
        const eqAccent = "#0e7490";
        return (
          <div className="sticker-wrap" style={{ display: "flex", justifyContent: "center", padding: "28px 16px", minHeight: "calc(100vh - 60px)" }}>
            <style>{`
              @media print {
                @page { size: auto; margin: 6mm; }
                .sticker-wrap { padding: 0 !important; min-height: auto !important; }
                .sticker-card { border: 2px dashed #888 !important; box-shadow: none !important; page-break-inside: avoid; }
              }
            `}</style>
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
                <span style={{ fontSize: sz.brand, fontWeight: 800, color: eqAccent, letterSpacing: "-0.2px" }}>{settings.companyName}</span>
              </div>

              {/* Badge */}
              <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 14, background: eqColor, color: "#fff", fontSize: sz.brand, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                {eq.type === "laptop" ? "💻 Laptop" : "🖥️ Desktop"}
              </div>

              {/* Equipment name */}
              <div style={{ fontSize: sz.title, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2, marginBottom: 2, padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={dName}>
                {dName}
              </div>

              {/* Price */}
              <div style={{ fontSize: sz.title + 1, fontWeight: 800, color: "#10b981", marginBottom: 10 }}>
                Bs. {Math.round(eq.price || 0).toLocaleString()}
              </div>

              {/* QR */}
              <div style={{ display: "inline-block", padding: 6, background: "#fff", border: `2px solid ${eqColor}`, borderRadius: 8 }}>
                {qrImgBig ? (
                  <img src={qrImgBig} alt="QR" width={sz.qr} height={sz.qr} style={{ display: "block" }} />
                ) : (
                  <div style={{ width: sz.qr, height: sz.qr, background: "#f3f4f6" }} />
                )}
              </div>

              {/* Code */}
              <div style={{ fontSize: sz.code, fontWeight: 800, color: eqColor, fontFamily: "monospace", marginTop: 6, letterSpacing: "0.5px" }}>{shortCode}</div>

              {/* Instruction */}
              <div style={{ fontSize: sz.sub, color: "#666", marginTop: 4, fontWeight: 600 }}>📱 Escanea con tu celular</div>

              {eq.branch && (
                <div style={{ fontSize: sz.sub - 1, color: "#999", marginTop: 2 }}>🏢 {eq.branch.name}</div>
              )}
            </div>
          </div>
        );
      })() : (

      /* Ficha — A4 portrait */
      <div className="ficha-content" style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
        <div className="ficha-page" style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, padding: "18px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

          {/* HEADER */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 42, height: 42, objectFit: "contain" }} />}
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: accent, letterSpacing: "-0.3px" }}>{settings.companyName}</h1>
                <p style={{ fontSize: 8, color: "#888", letterSpacing: "1px", textTransform: "uppercase", marginTop: 1 }}>{settings.slogan}</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", padding: "4px 12px", background: accent, borderRadius: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>🏷️ FICHA TÉCNICA</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: accent, fontFamily: "monospace", marginTop: 4 }}>{shortCode}</div>
              <p style={{ fontSize: 8, color: "#888" }}>{today}</p>
            </div>
          </div>
          <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, #1ab8c4, #a5b4fc, transparent)`, borderRadius: 2, marginBottom: 12 }} />

          {/* Company contact line */}
          {(settings.phone || settings.email || settings.address) && (
            <div style={{ display: "flex", gap: 12, fontSize: 8, color: "#888", marginBottom: 10, flexWrap: "wrap" }}>
              {settings.phone && <span>📞 {settings.phone}</span>}
              {settings.email && <span>✉️ {settings.email}</span>}
              {settings.address && <span>📍 {settings.address}</span>}
              {eq.branch && <span style={{ color: "#1ab8c4", fontWeight: 700 }}>🏢 {eq.branch.name}</span>}
            </div>
          )}

          {/* Title + condition + type */}
          <div style={{ padding: "10px 14px", background: "#f8f9ff", border: "1px solid #e5e7fa", borderRadius: 6, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 2 }}>
                {eq.type === "laptop" ? "💻 Laptop" : "🖥️ PC de Escritorio"}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>{dName}</h2>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ padding: "4px 12px", borderRadius: 12, fontSize: 9, fontWeight: 700, color: cond.color, background: `${cond.color}10`, border: `1px solid ${cond.color}30` }}>
                {cond.icon} {cond.label}
              </span>
            </div>
          </div>

          {/* Main content grid: photos | qr+price */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 12 }}>

            {/* LEFT: Photo */}
            <div>
              <div style={{ width: "100%", height: 320, background: "#fafafa", border: "1px solid #e5e5e5", borderRadius: 6, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {mainImg ? (
                  <img src={mainImg} alt={dName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ textAlign: "center", color: "#ccc" }}>
                    <div style={{ fontSize: 72 }}>{eq.type === "laptop" ? "💻" : "🖥️"}</div>
                    <div style={{ fontSize: 11, marginTop: 6 }}>Sin imagen</div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: QR + price */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Price big */}
              <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, #10b98108, #10b98103)", border: "2px solid #10b98140", borderRadius: 6, textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 2 }}>💰 Precio</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#10b981", lineHeight: 1.1 }}>Bs. {Math.round(eq.price || 0).toLocaleString()}</div>
              </div>

              {/* QR code */}
              <div style={{ padding: "10px 10px 8px", border: `2px solid ${accent}`, borderRadius: 6, textAlign: "center", background: "#fff" }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 4 }}>📱 Escanea para ver online</div>
                <div style={{ padding: 4, background: "#fff", display: "inline-block" }}>
                  {qrImg ? (
                    <img src={qrImg} alt="QR" width={160} height={160} style={{ display: "block" }} />
                  ) : (
                    <div style={{ width: 160, height: 160, background: "#f3f4f6" }} />
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: "monospace", marginTop: 4 }}>{shortCode}</div>
              </div>
            </div>
          </div>

          {/* SPECIFICATIONS */}
          {specs.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ padding: "5px 10px", background: accent, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", borderRadius: "4px 4px 0 0" }}>
                📋 ESPECIFICACIONES TÉCNICAS
              </div>
              <div style={{ border: "1px solid #e5e5e5", borderTop: "none", borderRadius: "0 0 4px 4px", padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                {specs.map((s, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "4px 0", borderBottom: i < specs.length - 2 ? "1px dashed #eee" : "none" }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap" }}>
                      {s.icon} {s.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color, textAlign: "right", wordBreak: "break-word" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accesorios */}
          {eq.accessories && (
            <div style={{ padding: "8px 12px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 4, marginBottom: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>🎒 Accesorios incluidos</div>
              <div style={{ fontSize: 10, color: "#333", lineHeight: 1.5 }}>{eq.accessories}</div>
            </div>
          )}

          {/* Notas */}
          {eq.notes && (
            <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, marginBottom: 8 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>📝 Notas adicionales</div>
              <div style={{ fontSize: 10, color: "#333", lineHeight: 1.5 }}>{eq.notes}</div>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8, color: "#999" }}>
            <span>Registrado: {createdDate}</span>
            <span>{settings.companyName} — Ficha Técnica — {today}</span>
            <span style={{ fontFamily: "monospace", fontWeight: 700, color: accent }}>{shortCode}</span>
          </div>
        </div>

        {/* Small instruction (not printed) */}
        <div className="no-print" style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#666" }}>
          💡 Tip: Imprime esta hoja y pégala junto al equipo. Los clientes pueden escanear el QR para ver fotos y especificaciones en línea.
        </div>
      </div>
      )}
    </div>
  );
}
