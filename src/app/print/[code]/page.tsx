"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Repair {
  id: string; code: string; device: string; brand: string | null; model: string | null;
  issue: string; status: string; priority: string; estimatedCost: number;
  notes: string | null; image: string | null; accessories: string | null;
  clientName: string | null; clientPhone: string | null; clientEmail: string | null;
  qrCode: string; createdAt: string; updatedAt: string;
}

const STATUS: Record<string, string> = { pending: "Pendiente", diagnosed: "Diagnosticado", waiting_parts: "Esperando Repuestos", in_progress: "En Progreso", completed: "Completado", delivered: "Entregado" };
const ACCESSORIES_ALL = ["Cargador", "Batería", "Disco Duro", "Memoria RAM", "Cable de Poder", "Pantalla", "Tornillos", "Maletín/Bolsa", "Otros"];

function parseAccWithDetail(raw: string): { name: string; detail: string } { const match = raw.match(/^(.+?)\s*\((.+)\)$/); if (match) return { name: match[1].trim(), detail: match[2].trim() }; return { name: raw.trim(), detail: "" }; }

function parseNotesAll(n: string | null): { notes: string; services: string[]; software: string[]; videogames: string[]; repuestos: string[] } {
  if (!n) return { notes: "", services: [], software: [], videogames: [], repuestos: [] };
  const parts = n.split(" | ");
  const svc = parts.find(p => p.startsWith("Servicios: ")); const sw = parts.find(p => p.startsWith("Programas: ") || p.startsWith("Software: ")); const vg = parts.find(p => p.startsWith("Videojuegos: ")); const rep = parts.find(p => p.startsWith("Repuestos: "));
  const rest = parts.filter(p => !p.startsWith("Servicios: ") && !p.startsWith("Programas: ") && !p.startsWith("Software: ") && !p.startsWith("Videojuegos: ") && !p.startsWith("Repuestos: ") && !p.startsWith("Entrega: "));
  return { notes: rest.join(" | "), services: svc ? svc.replace("Servicios: ", "").split(", ").filter(Boolean) : [], software: sw ? sw.replace("Programas: ", "").replace("Software: ", "").split(", ").filter(Boolean) : [], videogames: vg ? vg.replace("Videojuegos: ", "").split(", ").filter(Boolean) : [], repuestos: rep ? rep.replace("Repuestos: ", "").split(", ").filter(Boolean) : [] };
}

export default function PrintPage() {
  const params = useParams();
  const code = params.code as string;
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; phone: string | null; email: string | null; address: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null, phone: null, email: null, address: null });
  const [branchParam, setBranchParam] = useState("");

  useEffect(() => { setBaseUrl(window.location.origin); const bp = new URLSearchParams(window.location.search).get("branchId") || ""; setBranchParam(bp); fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {}); }, []);
  useEffect(() => { if (code) { (() => { const bp = new URLSearchParams(window.location.search).get("branchId"); return fetch(`/api/track/${code}${bp ? `?branchId=${bp}` : ""}`); })().then(r => r.ok ? r.json() : null).then(d => { if (d && d.multiple) setRepair(d.repairs[0]); else if (d) setRepair(d); setLoading(false); }).catch(() => setLoading(false)); } }, [code]);

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16 }}>Cargando orden...</div>;
  if (!repair) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial", fontSize: 16, color: "#e44" }}>Orden no encontrada: {code}</div>;

  const today = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
  const createdDate = new Date(repair.createdAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checkedAcc: string[] = (() => { try { return JSON.parse(repair.accessories || "[]"); } catch { return []; } })();
  const parsed = parseNotesAll(repair.notes);
  const trackUrl = `${baseUrl}/track/${repair.code}${branchParam ? `?branchId=${branchParam}` : ""}`;
  const qrImg = baseUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(trackUrl)}&color=000000` : "";
  const accent = "#1a1a2e";

  const Receipt = ({ label }: { label: string }) => (
    <div style={{ padding: "12px 20px", fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", color: "#1a1a1a" }}>
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 32, height: 32, objectFit: "contain" }} />}
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: accent, letterSpacing: "-0.3px", margin: 0 }}>{settings.companyName}</h1>
            <p style={{ fontSize: 7, color: "#999", letterSpacing: "1px", textTransform: "uppercase", margin: 0, marginTop: 1 }}>{settings.slogan}</p>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 800, color: accent }}>{repair.code}</div>
          <p style={{ fontSize: 8, color: "#888", margin: 0 }}>{today}</p>
        </div>
      </div>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, #1ab8c4, #a5b4fc, transparent)`, borderRadius: 1, marginBottom: 4 }} />
      {(settings.phone || settings.email || settings.address) && (
        <div style={{ display: "flex", gap: 8, fontSize: 6, color: "#999", marginBottom: 6, flexWrap: "wrap" }}>
          {settings.phone && <span>📞 {settings.phone}</span>}
          {settings.email && <span>✉️ {settings.email}</span>}
          {settings.address && <span>📍 {settings.address}</span>}
        </div>
      )}

      {/* BANNER */}
      <div style={{ background: accent, color: "#fff", padding: "5px 10px", borderRadius: 4, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.3px" }}>ORDEN DE TRABAJO — RECEPCIÓN</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 7, fontWeight: 600, background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: 3 }}>{STATUS[repair.status] || repair.status}</span>
          <span style={{ fontSize: 7, fontWeight: 600, background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: 3 }}>{label}</span>
        </div>
      </div>

      {/* QR + CLIENTE + EQUIPO */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <div style={{ textAlign: "center", padding: 6, border: "1px solid #e5e5e5", borderRadius: 6, background: "#fafafa", flexShrink: 0, alignSelf: "flex-start" }}>
          <div style={{ padding: 3, border: `2px solid ${accent}`, borderRadius: 5, display: "inline-block", background: "#fff" }}>
            {qrImg ? <img src={qrImg} alt="QR" width={55} height={55} style={{ display: "block" }} /> : <div style={{ width: 55, height: 55, background: "#f3f4f6" }} />}
          </div>
          <p style={{ fontSize: 9, fontWeight: 800, color: accent, fontFamily: "monospace", margin: "3px 0 0" }}>{repair.code}</p>
          <p style={{ fontSize: 7, color: "#888", marginTop: 2 }}>{createdDate}</p>
        </div>
        <div style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ background: "#f8f7ff", padding: "3px 8px", borderBottom: "1px solid #eeecfa" }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase", letterSpacing: "0.5px" }}>👤 Cliente</span>
          </div>
          <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Row label="Nombre" value={repair.clientName || "—"} />
            <Row label="Celular" value={repair.clientPhone || "—"} />
          </div>
        </div>
        <div style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ background: "#f0fdf4", padding: "3px 8px", borderBottom: "1px solid #dcfce7" }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>💻 Equipo</span>
          </div>
          <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Row label="Tipo" value={repair.device} />
            <Row label="Marca" value={repair.brand || "—"} />
            <Row label="Modelo" value={repair.model || "—"} />
            <Row label="Costo" value={`Bs. ${repair.estimatedCost}`} highlight />
          </div>
        </div>
      </div>

      {/* DETALLES + ACCESORIOS (ancho completo) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <div style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ background: "#faf5ff", padding: "3px 8px", borderBottom: "1px solid #e9d5ff" }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: "#149aa5", textTransform: "uppercase", letterSpacing: "0.5px" }}>📋 Detalles</span>
          </div>
          <div style={{ padding: "4px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
            {repair.issue && <div style={{ padding: "3px 6px", background: "#f7f7f8", borderRadius: 3, borderLeft: "2px solid #555" }}><div style={{ fontSize: 6, color: "#888", fontWeight: 700, textTransform: "uppercase" }}>Problema</div><div style={{ fontSize: 8, color: "#222", marginTop: 1 }}>{repair.issue}</div></div>}
            {parsed.notes && <div style={{ padding: "3px 6px", background: "#fffbeb", borderRadius: 3, borderLeft: "2px solid #f59e0b" }}><div style={{ fontSize: 6, color: "#b45309", fontWeight: 700, textTransform: "uppercase" }}>Observaciones</div><div style={{ fontSize: 8, color: "#333", marginTop: 1 }}>{parsed.notes}</div></div>}
            {parsed.services.length > 0 && <div style={{ padding: "3px 6px", background: "#faf5ff", borderRadius: 3, borderLeft: "2px solid #149aa5" }}><div style={{ fontSize: 6, color: "#149aa5", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Servicios</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{parsed.services.map(n => <span key={n} style={{ padding: "1px 5px", background: "#f0ebff", border: "1px solid #e9d5ff", borderRadius: 3, fontSize: 7, fontWeight: 600, color: "#149aa5" }}>{n}</span>)}</div></div>}
            {parsed.software.length > 0 && <div style={{ padding: "3px 6px", background: "#f5f3ff", borderRadius: 3, borderLeft: "2px solid #6d28d9" }}><div style={{ fontSize: 6, color: "#6d28d9", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Programas</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{parsed.software.map(n => <span key={n} style={{ padding: "1px 5px", background: "#ede9fe", border: "1px solid #ddd6fe", borderRadius: 3, fontSize: 7, fontWeight: 600, color: "#6d28d9" }}>{n}</span>)}</div></div>}
            {parsed.videogames.length > 0 && <div style={{ padding: "3px 6px", background: "#fef2f2", borderRadius: 3, borderLeft: "2px solid #b91c1c" }}><div style={{ fontSize: 6, color: "#b91c1c", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Videojuegos</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{parsed.videogames.map(n => <span key={n} style={{ padding: "1px 5px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 3, fontSize: 7, fontWeight: 600, color: "#b91c1c" }}>{n}</span>)}</div></div>}
            {parsed.repuestos.length > 0 && <div style={{ padding: "3px 6px", background: "#fffbeb", borderRadius: 3, borderLeft: "2px solid #b45309" }}><div style={{ fontSize: 6, color: "#b45309", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>Repuestos</div><div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>{parsed.repuestos.map(n => <span key={n} style={{ padding: "1px 5px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 3, fontSize: 7, fontWeight: 600, color: "#b45309" }}>{n}</span>)}</div></div>}
          </div>
        </div>
        <div style={{ flex: 1, border: "1px solid #e5e5e5", borderRadius: 5, overflow: "hidden" }}>
          <div style={{ background: "#f0fdf4", padding: "3px 8px", borderBottom: "1px solid #dcfce7" }}>
            <span style={{ fontSize: 7, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.5px" }}>🎒 Accesorios Recibidos</span>
          </div>
          <div style={{ padding: "4px 8px" }}>
            {checkedAcc.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{checkedAcc.map((a, i) => { const { name, detail } = parseAccWithDetail(a); return <div key={a} style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 4px", background: i % 2 === 0 ? "#f0fdf4" : "#fff", borderRadius: 2 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#16a34a", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 6, fontWeight: 800, flexShrink: 0 }}>✓</span><span style={{ fontSize: 7, fontWeight: 600, color: "#111" }}>{name}{detail && <span style={{ color: "#16a34a" }}> ({detail})</span>}</span></div>; })}</div> : <span style={{ fontSize: 7, color: "#ccc" }}>—</span>}
          </div>
        </div>
      </div>

      {/* TÉRMINOS */}
      <div style={{ padding: "4px 8px", background: "#f0f0f0", borderRadius: 4, border: "1px solid #ccc" }}>
        <div style={{ fontSize: 7, fontWeight: 800, color: "#222", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 2 }}>Términos y Condiciones</div>
        <div style={{ fontSize: 6, color: "#333", lineHeight: 1.4, fontWeight: 500 }}>1. Reparación según diagnóstico aprobado. 2. Costo puede variar por daños adicionales. 3. Garantía 30 días. 4. Equipos no reclamados en 90 días serán abandonados. 5. No responsables por datos perdidos. 6. Seguimiento con QR — <strong>{repair.code}</strong>.</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @media print { @page { size: letter portrait; margin: 5mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } .print-content { padding-top: 0 !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; } body { background: #fff; }
      `}</style>

      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "10px 24px", background: "#0a0a12", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>🖨️ Recepción x2 — {repair.code}</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.print()} style={{ padding: "8px 20px", background: "#1ab8c4", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "8px 20px", background: "#e8ebf2", border: "1px solid #2e2e3e", borderRadius: 8, color: "#888", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✕ Cerrar</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 900, margin: "0 auto", paddingTop: 50, display: "flex" }}>
        {/* COPIA 1: TALLER */}
        <div className="receipt-container" style={{ flex: 1 }}>
          <Receipt label="COPIA TALLER" />
        </div>

        {/* LÍNEA DE CORTE VERTICAL */}
        <div style={{ borderLeft: "2px dashed #ccc", margin: "12px 0", position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", top: "50%", left: -20, transform: "translateY(-50%) rotate(-90deg)", background: "#fff", padding: "0 6px", fontSize: 7, color: "#bbb", whiteSpace: "nowrap" }}>✂ CORTAR</span>
        </div>

        {/* COPIA 2: CLIENTE */}
        <div className="receipt-container" style={{ flex: 1 }}>
          <Receipt label="COPIA CLIENTE" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}><span style={{ fontSize: 7, color: "#999", fontWeight: 600, textTransform: "uppercase", flexShrink: 0, width: 40 }}>{label}</span><span style={{ fontSize: 9, fontWeight: highlight ? 700 : 600, color: highlight ? "#1ab8c4" : "#111", flex: 1, borderBottom: "1px dotted #e5e5e5", paddingBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span></div>;
}
