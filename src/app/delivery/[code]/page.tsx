"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PortalTracker } from "@/components/PortalTracker";

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

export default function DeliveryPage() {
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
  const deliveredDate = new Date(repair.updatedAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checkedAcc: string[] = (() => { try { return JSON.parse(repair.accessories || "[]"); } catch { return []; } })();
  const parsed = parseNotesAll(repair.notes);
  const ceCode = otToCe(repair.code);
  // QR apunta a la versión de plana completa
  const qrUrl = `${baseUrl}/delivery/view/${repair.code}${branchParam ? `?branchId=${branchParam}` : ""}`;
  const qrImg = baseUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}&color=000000` : "";
  const accent = "#059669";

  const Receipt = ({ label }: { label: string }) => (
    <div style={{ padding: "10px 14px", fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", color: "#1a1a1a" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 28, height: 28, objectFit: "contain" }} />}
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", letterSpacing: "-0.3px", margin: 0 }}>{settings.companyName}</h1>
            <p style={{ fontSize: 7, color: "#999", letterSpacing: "1px", textTransform: "uppercase", margin: 0, marginTop: 1 }}>{settings.slogan}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "inline-block", padding: "3px 10px", background: accent, borderRadius: 4 }}><span style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 800, color: "#fff" }}>{ceCode}</span></div>
          <p style={{ fontSize: 8, color: "#888", margin: "2px 0 0" }}>Orden: {repair.code} · {today}</p>
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, #10b981, #6ee7b7, transparent)`, borderRadius: 1, marginBottom: 4 }} />
      {(settings.phone || settings.email || settings.address) && (
        <div style={{ display: "flex", gap: 8, fontSize: 6, color: "#999", marginBottom: 6, flexWrap: "wrap" }}>
          {settings.phone && <span>📞 {settings.phone}</span>}
          {settings.email && <span>✉️ {settings.email}</span>}
          {settings.address && <span>📍 {settings.address}</span>}
        </div>
      )}

      {/* BANNER */}
      <div style={{ background: accent, color: "#fff", padding: "6px 12px", borderRadius: 4, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px" }}>COMPROBANTE DE ENTREGA</span>
        <span style={{ fontSize: 9, fontWeight: 600, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 3 }}>{label}</span>
      </div>

      {/* QR + CLIENTE + EQUIPO */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <div style={{ textAlign: "center", padding: 8, border: "1px solid #e5e5e5", borderRadius: 6, background: "#fafafa", flexShrink: 0, alignSelf: "flex-start" }}>
          <div style={{ padding: 5, border: `2px solid ${accent}`, borderRadius: 6, display: "inline-block", background: "#fff" }}>
            {qrImg ? <img src={qrImg} alt="QR" width={90} height={90} style={{ display: "block" }} /> : <div style={{ width: 90, height: 90, background: "#f3f4f6" }} />}
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: accent, fontFamily: "monospace", margin: "4px 0 0" }}>{ceCode}</p>
          <p style={{ fontSize: 7, color: "#aaa", margin: "1px 0 0" }}>{deliveredDate}</p>
        </div>
        <div style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ background: "#f8f7ff", padding: "4px 10px", borderBottom: "1px solid #eeecfa" }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase" }}>👤 Cliente</span>
          </div>
          <div style={{ padding: "5px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
            <Row label="Nombre" value={repair.clientName || "—"} />
            <Row label="Celular" value={repair.clientPhone || "—"} />
          </div>
        </div>
        <div style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ background: "#ecfdf5", padding: "4px 10px", borderBottom: "1px solid #d1fae5" }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: accent, textTransform: "uppercase" }}>💻 Equipo Entregado</span>
          </div>
          <div style={{ padding: "5px 10px", display: "flex", flexDirection: "column", gap: 3 }}>
            <Row label="Tipo" value={repair.device} />
            <Row label="Marca" value={repair.brand || "—"} />
            <Row label="Modelo" value={repair.model || "—"} />
          </div>
        </div>
      </div>

      {/* ACCESORIOS */}
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ background: "#ecfdf5", padding: "4px 10px", borderBottom: "1px solid #d1fae5" }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: accent, textTransform: "uppercase" }}>🎒 Accesorios Devueltos</span>
        </div>
        <div style={{ padding: "5px 10px" }}>
          {checkedAcc.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3 }}>
              {(checkedAcc || []).map((a, i) => { const { name, detail } = parseAccWithDetail(a); return (
                <div key={a} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 5px", background: i % 2 === 0 ? "#ecfdf5" : "#fff", borderRadius: 3 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: accent, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 7, fontWeight: 800, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 9, fontWeight: 600, color: "#111" }}>{name}{detail && <span style={{ color: accent }}> ({detail})</span>}</span>
                </div>
              ); })}
            </div>
          ) : <span style={{ fontSize: 9, color: "#ccc" }}>— Sin accesorios —</span>}
        </div>
      </div>

      {/* RESUMEN DE COSTOS */}
      <div style={{ border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ background: "#f8f7ff", padding: "4px 10px", borderBottom: "1px solid #eeecfa" }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase" }}>💰 Resumen de Costos</span>
        </div>
        <div style={{ padding: "5px 10px" }}>
          {parsed.services.map(name => { const svc = servicesList.find(s => s.name === name); return <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 9, color: "#149aa5", borderBottom: "1px dashed #f0f0f0" }}><span>🛠️ {name}</span><span style={{ fontWeight: 600 }}>Bs. {svc?.price || "—"}</span></div>; })}
          {parsed.repuestos.map(name => { const inv = inventoryList.find(i => i.name === name); return <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 9, color: "#b45309", borderBottom: "1px dashed #f0f0f0" }}><span>📦 {name}</span><span style={{ fontWeight: 600 }}>Bs. {inv?.price || "—"}</span></div>; })}
          <div style={{ marginTop: 3, paddingTop: 3, borderTop: "1px solid #e5e5e5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", fontSize: 9, color: "#555" }}><span>Subtotal</span><span style={{ fontWeight: 600 }}>Bs. {Number(repair.estimatedCost) + Number(parsed.discount || 0)}</span></div>
            {Number(parsed.discount || 0) > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 0", fontSize: 9, color: "#ef4444" }}><span>🏷️ Descuento</span><span style={{ fontWeight: 600 }}>- Bs. {parsed.discount}</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0 0", marginTop: 2, borderTop: "2px solid #e5e5e5" }}><span style={{ fontSize: 11, fontWeight: 800 }}>TOTAL COBRADO</span><span style={{ fontSize: 14, fontWeight: 800, color: accent }}>Bs. {Math.round(repair.estimatedCost || 0).toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* CONFORMIDAD */}
      <div style={{ padding: "5px 10px", background: "#ecfdf5", borderRadius: 5, border: "1px solid #a7f3d0", marginBottom: 6 }}>
        <div style={{ fontSize: 8, fontWeight: 800, color: accent, textTransform: "uppercase", marginBottom: 2 }}>✅ Conformidad</div>
        <div style={{ fontSize: 7, color: "#333", lineHeight: 1.4 }}>El cliente recibe el equipo <strong>{[repair.brand, repair.model || repair.device].filter(Boolean).join(" ")}</strong> ({repair.code}) en condiciones satisfactorias. Garantía <strong>30 días</strong>. Daños por mal uso anulan la garantía.</div>
      </div>

      {/* FIRMAS */}
      <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
        <div style={{ flex: 1, textAlign: "center" }}><div style={{ borderBottom: "2px solid #333", height: 30 }} /><p style={{ fontSize: 8, fontWeight: 700, marginTop: 2 }}>Técnico Responsable</p></div>
        <div style={{ flex: 1, textAlign: "center" }}><div style={{ borderBottom: "2px solid #333", height: 30 }} /><p style={{ fontSize: 8, fontWeight: 700, marginTop: 2 }}>Cliente: {repair.clientName || "________________"}</p></div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <PortalTracker />
      <style>{`
        @media print { @page { size: letter landscape; margin: 5mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } .print-content { padding-top: 0 !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; } body { background: #fff; }
      `}</style>

      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 24px", background: "#0a0a12", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>📄 Comprobante x2 — {ceCode}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.open(`/delivery/view/${repair.code}${branchParam ? `?branchId=${branchParam}` : ""}`, "_blank")} style={{ padding: "8px 20px", background: "#1ab8c4", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>📄 Ver Plana Completa</button>
          <button onClick={() => window.print()} style={{ padding: "8px 20px", background: accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "8px 20px", background: "#e8ebf2", border: "1px solid #2e2e3e", borderRadius: 8, color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✕ Cerrar</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 1100, margin: "0 auto", paddingTop: 50, display: "flex" }}>
        <div style={{ flex: 1 }}><Receipt label="COPIA TALLER" /></div>
        <div style={{ borderLeft: "2px dashed #ccc", margin: "12px 0", position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: "50%", left: -20, transform: "translateY(-50%) rotate(-90deg)", background: "#fff", padding: "0 6px", fontSize: 7, color: "#bbb", whiteSpace: "nowrap" }}>✂ CORTAR</span>
        </div>
        <div style={{ flex: 1 }}><Receipt label="COPIA CLIENTE" /></div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}><span style={{ fontSize: 8, color: "#999", fontWeight: 600, textTransform: "uppercase", flexShrink: 0, width: 48 }}>{label}</span><span style={{ fontSize: 11, fontWeight: highlight ? 700 : 600, color: highlight ? "#059669" : "#111", flex: 1, borderBottom: "1px dotted #e5e5e5", paddingBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span></div>;
}
