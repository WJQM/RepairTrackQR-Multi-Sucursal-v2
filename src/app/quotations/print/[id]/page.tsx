"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PortalTracker } from "@/components/PortalTracker";

interface QuotationItem { inventoryId: string; name: string; price: number; qty: number; stock: number; }
interface Quotation { id: string; code: string; type: "quotation" | "sale"; clientName: string; clientPhone: string; items: QuotationItem[]; total: number; notes: string; createdAt: string; }

export default function QuotationPrintPage() {
  const params = useParams();
  const code = params.id as string;
  const [q, setQ] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; phone: string | null; email: string | null; address: string | null; website: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null, phone: null, email: null, address: null, website: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {});
    if (!code) return;
    const branchId = new URLSearchParams(window.location.search).get("branchId");
    const url = branchId ? `/api/quotations?code=${code}&branchId=${branchId}` : `/api/quotations?code=${code}`;
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.multiple) setQ(d.quotations[0]); else if (d) setQ(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [code]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16 }}>Cargando...</div>;
  if (!q) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>Documento no encontrado: {code}</div>;

  const isQuot = q.type === "quotation";
  // COTIZACIÓN = ámbar/naranja | NOTA DE VENTA = lila/morado (diferenciado de CE que es verde)
  const color = isQuot ? "#d97706" : "#a855f7";
  const colorLight = isQuot ? "#fef3c7" : "#f3e8ff";
  const colorBorder = isQuot ? "#fde68a" : "#d8b4fe";
  const colorDark = isQuot ? "#b45309" : "#7e22ce";
  const docTitle = isQuot ? "COTIZACIÓN" : "NOTA DE VENTA";
  const docIcon = isQuot ? "📋" : "💰";
  const today = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
  const qrBranch = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("branchId") : null;
  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/quotations/print/${q.code}${qrBranch ? `?branchId=${qrBranch}` : ""}` : "";
  const qrImg = qrUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}&color=000000` : "";
  const total = q.total;
  const totalQty = q.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <PortalTracker />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; font-family: 'Segoe UI', Arial, sans-serif; color: #111; }
        @media print { @page { size: A4; margin: 15mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } .print-content { padding-top: 0 !important; } }
        table { width: 100%; border-collapse: collapse; }
      `}</style>

      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "12px 24px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>{docIcon} {docTitle} — {q.code}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.print()} style={{ padding: "8px 20px", background: `linear-gradient(135deg, ${color}, ${colorDark})`, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "8px 20px", background: "#e8ebf2", border: "1px solid #2e2e3e", borderRadius: 8, color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✕ Cerrar</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 780, margin: "0 auto", padding: "80px 40px 40px" }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `3px solid ${color}`, paddingBottom: 20, marginBottom: 24 }}>
          <div><div style={{ display: "flex", alignItems: "center", gap: 10 }}>{settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />}<div><h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{settings.companyName}</h1><p style={{ fontSize: 11, color: "#666", marginTop: 4, textTransform: "uppercase" }}>{settings.slogan}</p></div></div>{(settings.phone || settings.email || settings.address) && (<div style={{ display: "flex", gap: 14, fontSize: 10, color: "#888", marginTop: 8, flexWrap: "wrap" }}>{settings.phone && <span>📞 {settings.phone}</span>}{settings.email && <span>✉️ {settings.email}</span>}{settings.address && <span>📍 {settings.address}</span>}</div>)}</div>
          <div style={{ textAlign: "right" }}><div style={{ display: "inline-block", padding: "6px 16px", background: color, borderRadius: 6, marginBottom: 4 }}><span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "monospace", letterSpacing: "1px" }}>{q.code}</span></div><p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Fecha: {today}</p></div>
        </div>

        {/* BANNER */}
        <div style={{ background: colorLight, padding: "14px 20px", borderRadius: 8, marginBottom: 24, textAlign: "center", border: `2px solid ${colorBorder}` }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: color, textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>{docIcon} {docTitle}</h2>
          <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{isQuot ? "Presupuesto válido por 15 días a partir de la fecha de emisión" : "Documento que acredita la venta de artículos"}</p>
        </div>

        {/* CLIENTE + QR */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <div style={{ flex: 1, border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#f0f0ff", padding: "10px 16px", borderBottom: "1px solid #d5d5ef" }}><h3 style={{ fontSize: 12, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase", margin: 0 }}>👤 Datos del Cliente</h3></div>
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 60, flexShrink: 0 }}>Nombre</span><span style={{ fontSize: 14, fontWeight: 700, color: "#111", flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 4 }}>{q.clientName || "—"}</span></div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 9, color: "#888", fontWeight: 600, textTransform: "uppercase", width: 60, flexShrink: 0 }}>Celular</span><span style={{ fontSize: 14, fontWeight: 700, color: "#111", flex: 1, borderBottom: "1px dotted #ddd", paddingBottom: 4 }}>{q.clientPhone || "—"}</span></div>
            </div>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {qrImg && <div style={{ display: "inline-block", padding: 10, border: `2px solid ${color}`, borderRadius: 12, background: "#fff" }}><img src={qrImg} alt="QR" width={120} height={120} style={{ display: "block" }} /></div>}
            <p style={{ fontSize: 9, color: color, marginTop: 6, fontWeight: 600 }}>QR {docTitle}</p>
            <p style={{ fontSize: 13, fontWeight: 800, color: color, fontFamily: "monospace", marginTop: 2 }}>{q.code}</p>
          </div>
        </div>

        {/* TABLA */}
        <div style={{ marginBottom: 24, border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ background: colorLight, padding: "10px 16px", borderBottom: `1px solid ${colorBorder}` }}><h3 style={{ fontSize: 12, fontWeight: 700, color: color, textTransform: "uppercase", margin: 0 }}>🛒 Detalle de Artículos y Equipos</h3></div>
          <table>
            <thead><tr style={{ background: "#f9fafb" }}>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", borderBottom: "2px solid #e5e7eb" }}>#</th>
              <th style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", borderBottom: "2px solid #e5e7eb" }}>Descripción</th>
              <th style={{ padding: "10px 16px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", borderBottom: "2px solid #e5e7eb" }}>Cant.</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", borderBottom: "2px solid #e5e7eb" }}>P. Unitario</th>
              <th style={{ padding: "10px 16px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#666", textTransform: "uppercase", borderBottom: "2px solid #e5e7eb" }}>Subtotal</th>
            </tr></thead>
            <tbody>{q.items.map((item: any, idx: number) => {
              const isEq = item.isEquipment;
              const icon = isEq ? "💻" : "📦";
              return (
              <tr key={idx} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "10px 16px", fontSize: 12, color: "#888", borderBottom: "1px solid #f0f0f0" }}>{idx + 1}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #f0f0f0" }}>{icon} {item.name}{isEq && <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "#dbeafe", color: "#1e40af", fontWeight: 700, marginLeft: 6 }}>EQUIPO</span>}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>{item.qty}</td>
                <td style={{ padding: "10px 16px", fontSize: 12, textAlign: "right", color: "#555", borderBottom: "1px solid #f0f0f0" }}>{Math.round(item.price || 0).toLocaleString()}</td>
                <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 700, textAlign: "right", color: color, borderBottom: "1px solid #f0f0f0" }}>{(item.price * item.qty)}</td>
              </tr>
              );
            })}</tbody>
          </table>
          <div style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid #e5e7eb", background: "#f9fafb" }}>
            <span></span>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>TOTAL</div><div style={{ fontSize: 24, fontWeight: 800, color: color }}>Bs. {total}</div></div>
          </div>
        </div>

        {/* NOTAS */}
        {q.notes && (<div style={{ marginBottom: 24, border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}><div style={{ background: "#fffbeb", padding: "10px 16px", borderBottom: "1px solid #fde68a" }}><h3 style={{ fontSize: 12, fontWeight: 700, color: "#b45309", textTransform: "uppercase", margin: 0 }}>📝 Notas / Observaciones</h3></div><div style={{ padding: "12px 16px" }}><p style={{ fontSize: 13, lineHeight: 1.7, color: "#333" }}>{q.notes}</p></div></div>)}

        {/* CONDICIONES / CONFIRMACIÓN */}
        {isQuot ? (
          <div style={{ marginBottom: 24, border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}><div style={{ background: "#fef3c7", padding: "10px 16px", borderBottom: "1px solid #fde68a" }}><h3 style={{ fontSize: 12, fontWeight: 700, color: "#92400e", textTransform: "uppercase", margin: 0 }}>📋 Condiciones</h3></div><div style={{ padding: "12px 16px", fontSize: 11, color: "#666", lineHeight: 1.8 }}><p>1. Validez de <strong>15 días</strong>.</p><p>2. Precios sujetos a disponibilidad.</p><p>3. No incluye instalación salvo indicación.</p><p>4. Presente este documento o código <strong>{q.code}</strong>.</p></div></div>
        ) : (
          <div style={{ marginBottom: 24, padding: "16px 20px", background: colorLight, borderRadius: 8, border: `2px solid ${colorBorder}` }}><h3 style={{ fontSize: 12, fontWeight: 700, color: colorDark, textTransform: "uppercase", marginBottom: 8 }}>✅ Confirmación de Venta</h3><p style={{ fontSize: 11, lineHeight: 1.7, color: "#333" }}>Se confirma la venta al cliente <strong>{q.clientName}</strong> por <strong>Bs. {total}</strong>. Artículos descontados del inventario. Garantía según política de cada producto.</p></div>
        )}

        {/* FIRMAS */}
        <div style={{ display: "flex", gap: 40, marginBottom: 24, marginTop: 36 }}>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ borderBottom: "2px solid #333", marginBottom: 8, height: 50 }} /><p style={{ fontSize: 12, fontWeight: 700 }}>Vendedor / Técnico</p><p style={{ fontSize: 10, color: "#888" }}>Nombre y Firma</p></div>
          <div style={{ flex: 1, textAlign: "center" }}><div style={{ borderBottom: "2px solid #333", marginBottom: 8, height: 50 }} /><p style={{ fontSize: 12, fontWeight: 700 }}>Cliente: {q.clientName || "________________"}</p><p style={{ fontSize: 10, color: "#888" }}>Firma de Conformidad</p></div>
        </div>

        <div style={{ textAlign: "center", paddingTop: 12, borderTop: "1px solid #e2e2e2" }}><p style={{ fontSize: 10, color: "#999" }}>{settings.companyName} — {docTitle} — {today} — {q.code}</p></div>
      </div>
    </div>
  );
}
