"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface ConsoleItem {
  id: string; code: string; name: string; category: string | null; state: string | null;
  brand: string | null; model: string | null; color: string | null;
  storage: string | null; generation: string | null; accessories: string | null;
  condition: string; price: number; notes: string | null; image: string | null;
  createdAt: string; branch?: { id: string; name: string } | null;
}

function parseImages(img: string | null): string[] {
  if (!img) return [];
  try { const arr = JSON.parse(img); if (Array.isArray(arr)) return arr.filter(Boolean); } catch {}
  return img.trim() ? [img] : [];
}

function getDisplayName(cn: ConsoleItem): string {
  return [cn.brand, cn.name, cn.model].filter(Boolean).join(" ").trim() || cn.name;
}

const CONDITIONS: Record<string, { label: string; color: string; icon: string }> = {
  disponible: { label: "DISPONIBLE", color: "#10b981", icon: "✅" },
  vendida: { label: "VENDIDA", color: "#1ab8c4", icon: "💰" },
  reservada: { label: "RESERVADA", color: "#f59e0b", icon: "🔖" },
};

export default function ConsoleFichaPrintPage() {
  const params = useParams();
  const id = params.id as string;
  const [cn, setCn] = useState<ConsoleItem | null>(null);
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
    apiFetch("/api/consoles").then(r => r.ok ? r.json() : []).then((items: ConsoleItem[]) => {
      if (Array.isArray(items)) {
        const found = items.find(it => it.id === id);
        if (found) setCn(found);
        else setNotFound(true);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [id]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16 }}>Cargando ficha técnica...</div>;
  if (notFound || !cn) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>Consola no encontrada</div>;

  const imgs = parseImages(cn.image);
  const mainImg = imgs[0] || null;
  const dName = getDisplayName(cn);
  const shortCode = cn.code || "CN-?";
  const cond = CONDITIONS[cn.condition] || CONDITIONS.disponible;
  const portalUrl = baseUrl ? `${baseUrl}/portal?cn=${cn.id}` : "";
  const today = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
  const createdDate = new Date(cn.createdAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric" });
  const accent = "#9a3412";
  const cnColor = "#f97316";

  const specs: { icon: string; label: string; value: string; color: string }[] = [];
  if (cn.brand) specs.push({ icon: "🏢", label: "Marca", value: cn.brand, color: "#1ab8c4" });
  if (cn.model) specs.push({ icon: "📦", label: "Modelo", value: cn.model, color: "#1ab8c4" });
  if (cn.category) specs.push({ icon: "🏷️", label: "Categoría", value: cn.category, color: "#f97316" });
  if (cn.state) specs.push({ icon: cn.state === "Nueva" ? "✨" : "🔄", label: "Estado", value: cn.state, color: cn.state === "Nueva" ? "#10b981" : "#f59e0b" });
  if (cn.color) specs.push({ icon: "🎨", label: "Color", value: cn.color, color: "#7c3aed" });
  if (cn.storage) specs.push({ icon: "💾", label: "Almacenamiento", value: cn.storage, color: "#f59e0b" });
  if (cn.generation) specs.push({ icon: "🎯", label: "Generación", value: cn.generation, color: "#0891b2" });

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

      <div className="no-print" style={{ position: "sticky", top: 0, padding: "12px 24px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100, flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>
          {mode === "sticker" ? "🏷️ Sticker QR Consola" : "🕹️ Ficha Técnica Consola"} · {shortCode}
        </span>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 0, background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
            <button onClick={() => { setMode("full"); const u = new URL(window.location.href); u.searchParams.delete("mode"); window.history.replaceState({}, "", u.toString()); }} style={{ padding: "7px 12px", background: mode === "full" ? cnColor : "transparent", border: "none", color: mode === "full" ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📄 Ficha completa</button>
            <button onClick={() => { setMode("sticker"); const u = new URL(window.location.href); u.searchParams.set("mode", "sticker"); window.history.replaceState({}, "", u.toString()); }} style={{ padding: "7px 12px", background: mode === "sticker" ? cnColor : "transparent", border: "none", color: mode === "sticker" ? "#fff" : "#888", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🏷️ Solo QR</button>
          </div>
          {mode === "sticker" && (
            <div style={{ display: "flex", gap: 0, background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, overflow: "hidden" }}>
              <button onClick={() => setStickerSize("small")} style={{ padding: "7px 10px", background: stickerSize === "small" ? cnColor : "transparent", border: "none", color: stickerSize === "small" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>S</button>
              <button onClick={() => setStickerSize("medium")} style={{ padding: "7px 10px", background: stickerSize === "medium" ? cnColor : "transparent", border: "none", color: stickerSize === "medium" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>M</button>
              <button onClick={() => setStickerSize("large")} style={{ padding: "7px 10px", background: stickerSize === "large" ? cnColor : "transparent", border: "none", color: stickerSize === "large" ? "#fff" : "#888", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>L</button>
            </div>
          )}
          <button onClick={() => { navigator.clipboard.writeText(portalUrl); }} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔗 Copiar link</button>
          <button onClick={() => window.open(portalUrl, "_blank")} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>👁️ Ver en portal</button>
          <button onClick={() => window.print()} style={{ padding: "7px 18px", background: cnColor, border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {mode === "sticker" ? (() => {
        const sizeMap = {
          small: { qr: 140, card: 200, title: 11, code: 14, brand: 8, sub: 8 },
          medium: { qr: 200, card: 280, title: 13, code: 18, brand: 9, sub: 9 },
          large: { qr: 280, card: 380, title: 15, code: 22, brand: 10, sub: 10 },
        };
        const sz = sizeMap[stickerSize];
        const qrImgBig = portalUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=${sz.qr * 2}x${sz.qr * 2}&data=${encodeURIComponent(portalUrl)}&color=1a1a2e&margin=2` : "";
        return (
          <div className="sticker-wrap" style={{ display: "flex", justifyContent: "center", padding: "28px 16px", minHeight: "calc(100vh - 60px)" }}>
            <style>{`
              @media print {
                @page { size: auto; margin: 6mm; }
                .sticker-wrap { padding: 0 !important; min-height: auto !important; }
                .sticker-card { border: 2px dashed #888 !important; box-shadow: none !important; page-break-inside: avoid; }
              }
            `}</style>
            <div className="sticker-card" style={{ width: sz.card, background: "#fff", border: "2px dashed #bbb", borderRadius: 10, padding: "14px 14px 12px", textAlign: "center", boxShadow: "0 4px 18px rgba(0,0,0,0.08)", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 20, height: 20, objectFit: "contain" }} />}
                <span style={{ fontSize: sz.brand, fontWeight: 800, color: accent, letterSpacing: "-0.2px" }}>{settings.companyName}</span>
              </div>
              <div style={{ display: "inline-block", padding: "3px 12px", borderRadius: 14, background: cnColor, color: "#fff", fontSize: sz.brand, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>
                🕹️ Consola
              </div>
              <div style={{ fontSize: sz.title, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2, marginBottom: 10, padding: "0 4px" }}>{dName}</div>
              <div style={{ display: "inline-block", padding: 6, background: "#fff", border: `2px solid ${cnColor}`, borderRadius: 8 }}>
                {qrImgBig ? <img src={qrImgBig} alt="QR" width={sz.qr} height={sz.qr} style={{ display: "block" }} /> : <div style={{ width: sz.qr, height: sz.qr, background: "#f3f4f6" }} />}
              </div>
              <div style={{ fontSize: sz.code, fontWeight: 800, color: cnColor, fontFamily: "monospace", marginTop: 6, letterSpacing: "0.5px" }}>{shortCode}</div>
              {cn.price > 0 && <div style={{ fontSize: sz.title, fontWeight: 800, color: "#10b981", marginTop: 4 }}>Bs. {Math.round(cn.price || 0).toLocaleString()}</div>}
              <div style={{ fontSize: sz.sub, color: "#666", marginTop: 4, fontWeight: 600 }}>📱 Escanea para ver detalles</div>
            </div>
          </div>
        );
      })() : (
        <div className="ficha-content" style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px" }}>
          <div className="ficha-page" style={{ background: "#fff", borderRadius: 10, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <div style={{ background: `linear-gradient(135deg, ${cnColor} 0%, ${accent} 100%)`, color: "#fff", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                {settings.logo ? <img src={settings.logo} alt="Logo" style={{ width: 42, height: 42, borderRadius: 8, background: "#fff", padding: 4, objectFit: "contain" }} /> : <div style={{ width: 42, height: 42, borderRadius: 8, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🕹️</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, letterSpacing: "0.3px" }}>{settings.companyName}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.3px" }}>🕹️ Ficha Técnica · Consola</div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 10, opacity: 0.8, letterSpacing: "0.5px", textTransform: "uppercase" }}>Código</div>
                <div style={{ fontSize: 20, fontWeight: 900, fontFamily: "monospace", letterSpacing: "1px" }}>{shortCode}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: mainImg ? "340px 1fr" : "1fr", gap: 0, borderBottom: "1px solid #e5e7eb" }}>
              {mainImg && (
                <div style={{ padding: 18, borderRight: "1px solid #e5e7eb", background: "#fafafa", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: `2px solid ${cnColor}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={mainImg} alt={dName} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                  </div>
                  {imgs.length > 1 && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      {imgs.slice(1, 4).map((img, idx) => (
                        <div key={idx} style={{ aspectRatio: "1/1", borderRadius: 6, overflow: "hidden", border: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <img src={img} alt={`${dName} ${idx + 2}`} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* QR debajo de las imágenes */}
                  <div style={{ marginTop: 4, padding: "12px 10px", background: "#fff", border: `2px solid ${cnColor}`, borderRadius: 8, textAlign: "center" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>📱 Escanea para ver en línea</div>
                    {portalUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(portalUrl)}&color=1a1a2e&margin=2`} alt="QR" width={140} height={140} style={{ display: "block", margin: "0 auto" }} />}
                    <div style={{ fontSize: 12, fontWeight: 800, color: cnColor, fontFamily: "monospace", marginTop: 6, letterSpacing: "0.5px" }}>{shortCode}</div>
                  </div>
                </div>
              )}

              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.2, letterSpacing: "-0.4px" }}>{dName}</h1>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {cn.category && <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${cnColor}22`, color: accent, border: `1px solid ${cnColor}55`, textTransform: "uppercase", letterSpacing: "0.3px" }}>🏷️ {cn.category}</span>}
                  {cn.state && <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: cn.state === "Nueva" ? "#dcfce7" : "#fef3c7", color: cn.state === "Nueva" ? "#15803d" : "#a16207", border: `1px solid ${cn.state === "Nueva" ? "#86efac" : "#fcd34d"}`, textTransform: "uppercase", letterSpacing: "0.3px" }}>{cn.state === "Nueva" ? "✨" : "🔄"} {cn.state}</span>}
                  <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: `${cond.color}22`, color: cond.color, border: `1px solid ${cond.color}55`, textTransform: "uppercase", letterSpacing: "0.3px" }}>{cond.icon} {cond.label}</span>
                  {cn.branch && <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: "#eef2ff", color: "#4338ca", border: "1px solid #fde68a", textTransform: "uppercase", letterSpacing: "0.3px" }}>🏢 {cn.branch.name}</span>}
                </div>

                <div style={{ padding: "14px 18px", background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)", borderRadius: 10, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>Precio de venta</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: "#15803d", lineHeight: 1 }}>Bs. {Math.round(cn.price || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: 34 }}>💰</div>
                </div>

                {specs.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, marginTop: 4 }}>📋 Especificaciones</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                      {specs.map((spec, idx) => (
                        <div key={idx} style={{ padding: "8px 12px", background: "#fafafa", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.3px" }}>{spec.icon} {spec.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: spec.color, marginTop: 2 }}>{spec.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Si no hay imagen, mostrar QR aquí en la columna derecha */}
                {!mainImg && (
                  <div style={{ marginTop: 8, padding: "12px 14px", background: "#fff", border: `2px solid ${cnColor}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flexShrink: 0 }}>
                      {portalUrl && <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(portalUrl)}&color=1a1a2e&margin=2`} alt="QR" width={110} height={110} style={{ display: "block" }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>📱 Escanea para ver en línea</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: cnColor, fontFamily: "monospace", letterSpacing: "0.5px" }}>{shortCode}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(cn.accessories || cn.notes) && (
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: cn.accessories && cn.notes ? "1fr 1fr" : "1fr", gap: 14 }}>
                {cn.accessories && (
                  <div style={{ padding: "12px 14px", background: "#faf5ff", borderRadius: 8, border: "1px solid #e9d5ff" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#7e22ce", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>🎒 Accesorios incluidos</div>
                    <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{cn.accessories}</div>
                  </div>
                )}
                {cn.notes && (
                  <div style={{ padding: "12px 14px", background: "#fef3c7", borderRadius: 8, border: "1px solid #fcd34d" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#a16207", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>📝 Notas</div>
                    <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>{cn.notes}</div>
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: "10px 24px", background: "#fafafa", fontSize: 10, color: "#888", textAlign: "center" }}>
              Registrada el {createdDate} · Ficha generada el {today}
            </div>

            {(settings.phone || settings.email || settings.address) && (
              <div style={{ padding: "10px 24px", background: accent, color: "#fff", fontSize: 10, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
                {settings.phone && <span>📞 {settings.phone}</span>}
                {settings.email && <span>✉️ {settings.email}</span>}
                {settings.address && <span>📍 {settings.address}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
