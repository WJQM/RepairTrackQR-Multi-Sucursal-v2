"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Repair {
  id: string; code: string; device: string; brand: string | null; model: string | null;
  issue: string; status: string; estimatedCost: number; notes: string | null;
  image: string | null; accessories: string | null;
  clientName: string | null; clientPhone: string | null; clientEmail: string | null;
  qrCode: string; createdAt: string; updatedAt: string;
}

function parseAccWithDetail(raw: string): { name: string; detail: string } { const match = raw.match(/^(.+?)\s*\((.+)\)$/); if (match) return { name: match[1].trim(), detail: match[2].trim() }; return { name: raw.trim(), detail: "" }; }
function parseNotesAll(n: string | null): { notes: string; services: string[]; software: string[]; videogames: string[]; repuestos: string[]; deliveryNotes: string; discount: string } {
  if (!n) return { notes: "", services: [], software: [], videogames: [], repuestos: [], deliveryNotes: "", discount: "" };
  const parts = n.split(" | ");
  const svc = parts.find(p => p.startsWith("Servicios: ")); const sw = parts.find(p => p.startsWith("Programas: ") || p.startsWith("Software: ")); const vg = parts.find(p => p.startsWith("Videojuegos: ")); const rep = parts.find(p => p.startsWith("Repuestos: ")); const del = parts.find(p => p.startsWith("Entrega: ")); const disc = parts.find(p => p.startsWith("Descuento: "));
  const rest = parts.filter(p => !p.startsWith("Servicios: ") && !p.startsWith("Programas: ") && !p.startsWith("Software: ") && !p.startsWith("Videojuegos: ") && !p.startsWith("Repuestos: ") && !p.startsWith("Entrega: ") && !p.startsWith("Descuento: "));
  return { notes: rest.join(" | "), services: svc ? svc.replace("Servicios: ", "").split(", ").filter(Boolean) : [], software: sw ? sw.replace("Programas: ", "").replace("Software: ", "").split(", ").filter(Boolean) : [], videogames: vg ? vg.replace("Videojuegos: ", "").split(", ").filter(Boolean) : [], repuestos: rep ? rep.replace("Repuestos: ", "").split(", ").filter(Boolean) : [], deliveryNotes: del ? del.replace("Entrega: ", "") : "", discount: disc ? disc.replace("Descuento: ", "") : "" };
}
function otToCe(otCode: string): string { return `CE-${otCode.replace(/^OT-/i, "")}`; }

export default function DeliveryFullPage() {
  const params = useParams();
  const code = params.code as string;
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [servicesList, setServicesList] = useState<{name: string; price: number}[]>([]);
  const [inventoryList, setInventoryList] = useState<{name: string; price: number}[]>([]);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; phone: string | null; email: string | null; address: string | null; website: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null, phone: null, email: null, address: null, website: null });
  const [branchParam, setBranchParam] = useState("");

  useEffect(() => { setBaseUrl(window.location.origin); const bp = new URLSearchParams(window.location.search).get("branchId") || ""; setBranchParam(bp); fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {}); }, []);
  useEffect(() => {
    if (code) {
      (() => { const bp = new URLSearchParams(window.location.search).get("branchId"); return fetch(`/api/track/${code}${bp ? `?branchId=${bp}` : ""}`); })().then(r => r.ok ? r.json() : null).then(d => { if (d && d.multiple) setRepair(d.repairs[0]); else if (d) setRepair(d); setLoading(false); }).catch(() => setLoading(false));
      fetch("/api/services").then(r => r.ok ? r.json() : []).then(d => setServicesList(d)).catch(() => {});
      fetch("/api/inventory").then(r => r.ok ? r.json() : []).then(d => setInventoryList(d)).catch(() => {});
    }
  }, [code]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16 }}>Cargando...</div>;
  if (!repair) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>Orden no encontrada: {code}</div>;

  const today = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
  const createdDate = new Date(repair.createdAt).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric" });
  const deliveredDate = new Date(repair.updatedAt).toLocaleDateString("es-BO", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checkedAcc: string[] = (() => { try { return JSON.parse(repair.accessories || "[]"); } catch { return []; } })();
  const parsed = parseNotesAll(repair.notes);
  const ceCode = otToCe(repair.code);
  const qrUrl = `${baseUrl}/delivery/view/${repair.code}${branchParam ? `?branchId=${branchParam}` : ""}`;
  const qrImg = baseUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&color=000000` : "";
  const accent = "#059669";
  const deviceName = [repair.brand, repair.model || repair.device].filter(Boolean).join(" ");

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @media print { @page { size: A4; margin: 12mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } .print-content { padding-top: 0 !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; } body { background: #fff; }
      `}</style>

      {/* BARRA DE ACCIONES */}
      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 24px", background: "#0a0a12", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>📄 Comprobante de Entrega — {ceCode} — Plana Completa</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.open(`/delivery/${repair.code}${branchParam ? `?branchId=${branchParam}` : ""}`, "_blank")} style={{ padding: "8px 20px", background: "#1ab8c4", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📋 Ver Doble Copia</button>
          <button onClick={() => window.print()} style={{ padding: "8px 20px", background: accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "8px 20px", background: "#e8ebf2", border: "1px solid #2e2e3e", borderRadius: 8, color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✕ Cerrar</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 800, margin: "0 auto", padding: "60px 40px 40px", fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", color: "#111" }}>

        {/* ═══ HEADER ═══ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 18, marginBottom: 20, borderBottom: `3px solid ${accent}` }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />}
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.5px", margin: 0 }}>{settings.companyName}</h1>
                <p style={{ fontSize: 11, color: "#888", letterSpacing: "1.5px", textTransform: "uppercase", margin: "4px 0 0" }}>{settings.slogan}</p>
              </div>
            </div>
            {(settings.phone || settings.email || settings.address) && (
              <div style={{ display: "flex", gap: 14, fontSize: 10, color: "#888", marginTop: 8, flexWrap: "wrap" }}>
                {settings.phone && <span>📞 {settings.phone}</span>}
                {settings.email && <span>✉️ {settings.email}</span>}
                {settings.address && <span>📍 {settings.address}</span>}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", padding: "6px 18px", background: accent, borderRadius: 6, marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>{ceCode}</span>
            </div>
            <p style={{ fontSize: 11, color: "#888", margin: "4px 0 0" }}>Orden: {repair.code}</p>
            <p style={{ fontSize: 11, color: "#888" }}>{today}</p>
          </div>
        </div>

        {/* ═══ BANNER ═══ */}
        <div style={{ background: `linear-gradient(135deg, ${accent}, #10b981)`, color: "#fff", padding: "16px 24px", borderRadius: 10, marginBottom: 28, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "2px", margin: 0 }}>📄 COMPROBANTE DE ENTREGA</h2>
          <p style={{ fontSize: 12, opacity: 0.85, margin: "4px 0 0" }}>Documento que certifica la entrega del equipo reparado al cliente</p>
        </div>

        {/* ═══ QR + CLIENTE + EQUIPO ═══ */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          {/* QR Grande */}
          <div style={{ textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ padding: 10, border: `3px solid ${accent}`, borderRadius: 14, background: "#fff", boxShadow: "0 2px 12px rgba(5,150,105,0.1)" }}>
              {qrImg ? <img src={qrImg} alt="QR" width={150} height={150} style={{ display: "block" }} /> : <div style={{ width: 150, height: 150, background: "#f3f4f6" }} />}
            </div>
            <p style={{ fontSize: 18, fontWeight: 800, color: accent, fontFamily: "monospace", margin: "8px 0 0", letterSpacing: "1px" }}>{ceCode}</p>
            <p style={{ fontSize: 10, color: "#aaa", margin: "2px 0 0" }}>Entrega: {deliveredDate}</p>
          </div>

          {/* Cliente + Equipo lado a lado */}
          <div style={{ flex: 1, display: "flex", gap: 14 }}>
            <div style={{ flex: 1, border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: "#f0f0ff", padding: "10px 18px", borderBottom: "1px solid #d5d5ef" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase" }}>👤 Cliente</span>
              </div>
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 70, flexShrink: 0 }}>Nombre</span><span style={{ fontSize: 15, fontWeight: 700, flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 2 }}>{repair.clientName || "—"}</span></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 70, flexShrink: 0 }}>Celular</span><span style={{ fontSize: 15, fontWeight: 700, flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 2 }}>{repair.clientPhone || "—"}</span></div>
              </div>
            </div>
            <div style={{ flex: 1, border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: "#ecfdf5", padding: "10px 18px", borderBottom: "1px solid #d1fae5" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: "uppercase" }}>💻 Equipo Entregado</span>
              </div>
              <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 58, flexShrink: 0 }}>Tipo</span><span style={{ fontSize: 15, fontWeight: 600, flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 2 }}>{repair.device}</span></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 58, flexShrink: 0 }}>Marca</span><span style={{ fontSize: 15, fontWeight: 600, flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 2 }}>{repair.brand || "—"}</span></div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}><span style={{ fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 58, flexShrink: 0 }}>Modelo</span><span style={{ fontSize: 15, fontWeight: 600, flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 2 }}>{repair.model || "—"}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ACCESORIOS ═══ */}
        <div style={{ marginBottom: 22, border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#ecfdf5", padding: "10px 18px", borderBottom: "1px solid #d1fae5" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: accent, textTransform: "uppercase" }}>🎒 Accesorios Devueltos al Cliente</span>
          </div>
          <div style={{ padding: "12px 18px" }}>
            {checkedAcc.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {(checkedAcc || []).map((a, i) => { const { name, detail } = parseAccWithDetail(a); return (
                  <div key={a} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: i % 2 === 0 ? "#f0fdf4" : "#fff", borderRadius: 6, border: "1px solid #d1fae5" }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, background: accent, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{name}{detail && <span style={{ color: accent, fontSize: 11 }}> ({detail})</span>}</span>
                  </div>
                ); })}
              </div>
            ) : <p style={{ fontSize: 13, color: "#aaa" }}>— Sin accesorios registrados —</p>}
          </div>
        </div>

        {/* ═══ RESUMEN DE COSTOS ═══ */}
        <div style={{ marginBottom: 22, border: "1px solid #e2e2e2", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ background: "#f0f0ff", padding: "10px 18px", borderBottom: "1px solid #d5d5ef" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase" }}>💰 Resumen de Costos</span>
          </div>
          <div style={{ padding: "12px 18px" }}>
            {parsed.services.map(name => { const svc = servicesList.find(s => s.name === name); return (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "#149aa5", borderBottom: "1px dashed #f0f0f0" }}>
                <span style={{ fontWeight: 600 }}>🛠️ {name}</span>
                <span style={{ fontWeight: 700 }}>Bs. {svc?.price || "—"}</span>
              </div>
            ); })}
            {parsed.repuestos.map(name => { const inv = inventoryList.find(i => i.name === name); return (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "#b45309", borderBottom: "1px dashed #f0f0f0" }}>
                <span style={{ fontWeight: 600 }}>📦 {name}</span>
                <span style={{ fontWeight: 700 }}>Bs. {inv?.price || "—"}</span>
              </div>
            ); })}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "2px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#555" }}><span>Subtotal</span><span style={{ fontWeight: 700 }}>Bs. {Number(repair.estimatedCost) + Number(parsed.discount || 0)}</span></div>
              {Number(parsed.discount || 0) > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, color: "#ef4444" }}><span>🏷️ Descuento</span><span style={{ fontWeight: 700 }}>- Bs. {parsed.discount}</span></div>}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", marginTop: 6, borderTop: "3px solid #e5e7eb" }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>TOTAL COBRADO</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: accent }}>Bs. {Math.round(repair.estimatedCost || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ CONFORMIDAD ═══ */}
        <div style={{ marginBottom: 28, padding: "18px 22px", background: "#ecfdf5", borderRadius: 10, border: "2px solid #86efac" }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: accent, textTransform: "uppercase", marginBottom: 8 }}>✅ Declaración de Conformidad</h3>
          <p style={{ fontSize: 12, lineHeight: 1.7, color: "#333" }}>
            El cliente declara haber recibido el equipo <strong>{deviceName}</strong> ({repair.code}) en condiciones de funcionamiento satisfactorio,
            junto con todos los accesorios listados arriba. Acepta que la garantía de reparación es de <strong>30 días</strong> a partir de esta fecha
            y cubre únicamente el trabajo realizado descrito en este documento. Daños por mal uso, caídas, líquidos o manipulación por terceros anulan la garantía.
          </p>
        </div>

        {/* ═══ FIRMAS ═══ */}
        <div style={{ display: "flex", gap: 50, marginBottom: 30 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ borderBottom: "2px solid #333", height: 60 }} />
            <p style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Técnico Responsable</p>
            <p style={{ fontSize: 10, color: "#888" }}>Nombre y Firma</p>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ borderBottom: "2px solid #333", height: 60 }} />
            <p style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Cliente: {repair.clientName || "________________"}</p>
            <p style={{ fontSize: 10, color: "#888" }}>Firma de Conformidad</p>
          </div>
        </div>

        {/* ═══ PIE ═══ */}
        <div style={{ padding: "12px 16px", background: "#f9f9f9", borderRadius: 8, border: "1px solid #e8e8e8", marginBottom: 16 }}>
          <p style={{ fontSize: 9, color: "#aaa", lineHeight: 1.7 }}>Este documento certifica la entrega del equipo reparado. La garantía de 30 días cubre exclusivamente el trabajo descrito. Conserve este documento como comprobante. Para verificar, escanee el código QR o use el código <strong>{ceCode}</strong> en el escáner.</p>
        </div>

        <div style={{ textAlign: "center", paddingTop: 10, borderTop: "1px solid #e2e2e2" }}>
          <p style={{ fontSize: 10, color: "#bbb" }}>{settings.companyName} — Comprobante de Entrega — {today} — {ceCode} — Orden {repair.code}</p>
        </div>
      </div>
    </div>
  );
}
