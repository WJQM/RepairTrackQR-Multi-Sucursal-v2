"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PortalTracker } from "@/components/PortalTracker";
import { ReviewForm } from "@/components/ReviewForm";

interface Repair {
  id: string; code: string; device: string; brand: string | null; model: string | null;
  issue: string; status: string; priority: string; estimatedCost: number;
  notes: string | null; clientName: string | null; clientPhone: string | null;
  clientEmail: string | null; accessories: string | null; qrCode: string;
  createdAt: string; updatedAt: string;
}

const STATUS: Record<string, { label: string; color: string; icon: string; desc: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: "⏳", desc: "Tu equipo fue recibido y está en cola de revisión." },
  diagnosed: { label: "Diagnosticado", color: "#8b5cf6", icon: "🔍", desc: "El técnico revisó tu equipo e identificó el problema." },
  waiting_parts: { label: "Esperando Repuestos", color: "#f97316", icon: "📦", desc: "Se solicitaron los repuestos necesarios para la reparación." },
  in_progress: { label: "En Progreso", color: "#3b82f6", icon: "🔧", desc: "Tu equipo está siendo reparado en este momento." },
  completed: { label: "Completado", color: "#10b981", icon: "✅", desc: "¡La reparación fue completada! Puedes pasar a recoger tu equipo." },
  delivered: { label: "Entregado", color: "#6b7280", icon: "📱", desc: "Tu equipo fue entregado. ¡Gracias por confiar en nosotros!" },
};

function parseAccessories(json: string | null): string[] { if (!json) return []; try { return JSON.parse(json); } catch { return []; } }
function parseNotesData(notesField: string | null): { notes: string; services: string[]; software: string[]; videogames: string[]; repuestos: string[]; deliveryNotes: string; discount: string } {
  if (!notesField) return { notes: "", services: [], software: [], videogames: [], repuestos: [], deliveryNotes: "", discount: "" };
  const parts = notesField.split(" | ");
  const svcPart = parts.find(p => p.startsWith("Servicios: "));
  const swPart = parts.find(p => p.startsWith("Programas: ") || p.startsWith("Software: "));
  const vgPart = parts.find(p => p.startsWith("Videojuegos: "));
  const rPart = parts.find(p => p.startsWith("Repuestos: "));
  const dPart = parts.find(p => p.startsWith("Entrega: "));
  const discPart = parts.find(p => p.startsWith("Descuento: "));
  const notesParts = parts.filter(p => !p.startsWith("Servicios: ") && !p.startsWith("Programas: ") && !p.startsWith("Software: ") && !p.startsWith("Videojuegos: ") && !p.startsWith("Repuestos: ") && !p.startsWith("Entrega: ") && !p.startsWith("Descuento: "));
  const services = svcPart ? svcPart.replace("Servicios: ", "").split(", ").filter(Boolean) : [];
  const software = swPart ? swPart.replace("Programas: ", "").replace("Software: ", "").split(", ").filter(Boolean) : [];
  const videogames = vgPart ? vgPart.replace("Videojuegos: ", "").split(", ").filter(Boolean) : [];
  const repuestos = rPart ? rPart.replace("Repuestos: ", "").split(", ").filter(Boolean) : [];
  return { notes: notesParts.join(" | "), services, software, videogames, repuestos, deliveryNotes: dPart ? dPart.replace("Entrega: ", "") : "", discount: discPart ? discPart.replace("Descuento: ", "") : "" };
}

export default function TrackPage() {
  const params = useParams();
  const code = params.code as string;
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fromScanner, setFromScanner] = useState(false);
  const [multipleResults, setMultipleResults] = useState<any[]>([]);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null });

  useEffect(() => { setMounted(true); setFromScanner(new URLSearchParams(window.location.search).get("from") === "scanner"); fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {}); }, []);
  useEffect(() => { if (code) loadRepair(); }, [code]);

  const loadRepair = async () => {
    try {
      const branchId = new URLSearchParams(window.location.search).get("branchId");
      const url = branchId ? `/api/track/${code}?branchId=${branchId}` : `/api/track/${code}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.multiple) {
          setMultipleResults(data.repairs);
          setShowBranchPicker(true);
        } else {
          setRepair(data);
        }
      } else setNotFound(true);
    } catch { setNotFound(true); }
    setLoading(false);
  };

  const selectBranch = (r: any) => {
    setShowBranchPicker(false);
    setRepair(r);
  };

  const handleClose = () => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from === "scanner") { window.location.href = "/scanner"; }
    else if (from === "portal") { window.location.href = "/portal"; }
    else { window.close(); if (!window.closed) window.location.href = "/portal"; }
  };

  if (showBranchPicker) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #0f2040 40%, #0a1a30 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ maxWidth: 420, width: "100%", background: "rgba(17,17,24,0.95)", borderRadius: 14, border: "1px solid rgba(26,184,196,0.08)", padding: "32px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1d2e", marginBottom: 8 }}>Selecciona la Sucursal</h2>
          <p style={{ color: "#4a5068", fontSize: 13, marginBottom: 24 }}>La orden <strong style={{ color: "#2dd4df" }}>{code}</strong> existe en varias sucursales</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {multipleResults.map((r: any) => (
              <button key={r.id} onClick={() => selectBranch(r)} style={{ padding: "14px 18px", background: "rgba(26,184,196,0.05)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 14, color: "#1a1d2e", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                <span>🏢 {r.branch?.name || "Sucursal"}</span>
                <span style={{ fontSize: 12, color: "#2dd4df" }}>{r.device}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #0f2040 40%, #0a1a30 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.95); } }`}</style>
        <div style={{ textAlign: "center", animation: "pulse 1.5s ease-in-out infinite" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <p style={{ color: "#4a5068", fontSize: 15, fontWeight: 500 }}>Buscando orden...</p>
        </div>
      </div>
    );
  }

  if (notFound || !repair) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #0f2040 40%, #0a1a30 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div style={{ textAlign: "center", padding: 48, background: "rgba(17,17,24,0.9)", borderRadius: 14, border: "1px solid rgba(239,68,68,0.15)", maxWidth: 420, animation: "fadeUp 0.5s ease-out", boxShadow: "0 0 60px rgba(239,68,68,0.05)" }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>😔</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1a1d2e", marginBottom: 10 }}>No encontrada</h2>
          <p style={{ color: "#4a5068", fontSize: 14, lineHeight: 1.6 }}>No existe ninguna orden con el código:</p>
          <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#ef4444", margin: "12px 0", padding: "10px 20px", background: "rgba(239,68,68,0.06)", borderRadius: 10, display: "inline-block" }}>{code}</div>
          <p style={{ color: "#9298ae", fontSize: 13, marginTop: 12 }}>Verifica el código e intenta de nuevo</p>
          <button onClick={handleClose} style={{ marginTop: 20, padding: "10px 24px", background: "rgba(26,184,196,0.06)", border: "1px solid rgba(26,184,196,0.10)", borderRadius: 12, color: "#2dd4df", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← {fromScanner ? "Volver al Escáner" : "Cerrar"}</button>
        </div>
      </div>
    );
  }

  const status = STATUS[repair.status] || STATUS.pending;
  const statusKeys = Object.keys(STATUS);
  const currentIndex = statusKeys.indexOf(repair.status);
  const progress = ((currentIndex + 1) / statusKeys.length) * 100;
  const deviceName = [repair.device, repair.brand, repair.model].filter(Boolean).join(" ");
  const accessories = parseAccessories(repair.accessories);
  const { notes, services, software, videogames, repuestos, deliveryNotes, discount } = parseNotesData(repair.notes);

  return (
    <div style={{ minHeight: "100vh", background: "#eef2f8", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "16px 0 48px", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .app-card { background:#ffffff; border-radius:18px; box-shadow:0 2px 12px rgba(30,42,58,0.08), 0 1px 3px rgba(30,42,58,0.05); border:1px solid #dde6f5; }
        .info-row { display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f0f3f8; }
        .info-row:last-child { border-bottom:none; }
        .status-step { display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:14px; transition:all 0.2s; }
        .status-step.active { background:var(--step-color-bg); }
        .step-dot { width:32px; height:32px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; transition:all 0.3s; }
        .tag-pill { padding:4px 10px; border-radius:99px; font-size:11px; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
        @media(max-width:640px){ .track-content{ padding:0 12px!important; } }
      `}</style>

      {/* App-style header — white card matching the rest */}
      <div style={{ width:"100%", maxWidth:520, opacity:mounted?1:0, transition:"opacity 0.5s ease", padding:"0 16px", marginBottom:12 }}>
        <div style={{ background:"#ffffff", borderRadius:18, border:`2px solid ${status.color}`, boxShadow:`0 4px 20px ${status.color}20, 0 2px 8px rgba(30,42,58,0.08)`, overflow:"hidden", borderTop:`4px solid ${status.color}` }}>

          {/* Top bar */}
          <div style={{ padding:"14px 16px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <button onClick={handleClose} style={{ width:34, height:34, borderRadius:10, background:"#f5f7fc", border:"1px solid #dde6f5", color:"#4a5878", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>←</button>
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", background:`${status.color}10`, borderRadius:99, border:`1px solid ${status.color}30` }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:status.color, boxShadow:`0 0 6px ${status.color}` }} />
              <span style={{ fontSize:11, fontWeight:700, color:status.color, letterSpacing:"0.3px" }}>{settings.companyName}</span>
            </div>
            <div style={{ width:34 }} />
          </div>

          {/* Hero */}
          <div style={{ padding:"18px 20px 16px", textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:10, filter:`drop-shadow(0 4px 12px ${status.color}40)`, animation:"pulse 2.5s ease-in-out infinite" }}>{status.icon}</div>
            <div style={{ fontSize:24, fontWeight:800, color:status.color, marginBottom:6, letterSpacing:"-0.5px" }}>{status.label}</div>
            <div style={{ fontSize:13, color:"#6b7a9a", lineHeight:1.6, maxWidth:320, margin:"0 auto 16px" }}>{status.desc}</div>

            {/* Code badge */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:`${status.color}08`, border:`1.5px solid ${status.color}30`, borderRadius:12, padding:"9px 20px" }}>
              <span style={{ fontSize:10, color:"#9298ae", textTransform:"uppercase", letterSpacing:"1px", fontWeight:700 }}>Código</span>
              <span style={{ fontFamily:"monospace", fontSize:19, fontWeight:800, color:status.color, letterSpacing:"2px" }}>{repair.code}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding:"0 16px 14px" }}>
            <div style={{ height:7, background:"#f0f3f8", borderRadius:99, overflow:"hidden", border:"1px solid #e8ecf4" }}>
              <div style={{ height:"100%", width:`${progress}%`, background:`linear-gradient(90deg, ${status.color}cc, ${status.color})`, borderRadius:99, transition:"width 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
              <span style={{ fontSize:10, color:"#9298ae", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>Progreso</span>
              <span style={{ fontSize:10, color:status.color, fontWeight:800 }}>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="track-content" style={{ width:"100%", maxWidth:520, padding:"0 16px", opacity:mounted?1:0, animation:mounted?"slideUp 0.6s 0.2s ease-out both":"none" }}>

        {/* Row 1: Cliente + Equipo */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          {repair.clientName && (
            <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", border:"2px solid #1ab8c4", boxShadow:"0 2px 10px rgba(26,184,196,0.10)" }}>
              <div style={{ fontSize:9, color:"#1ab8c4", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:5 }}>Cliente</div>
              <div style={{ fontSize:14, fontWeight:800, color:"#1e2a3a", lineHeight:1.3 }}>{repair.clientName}</div>
            </div>
          )}
          <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", border:"2px solid #8b5cf6", boxShadow:"0 2px 10px rgba(139,92,246,0.10)" }}>
            <div style={{ fontSize:9, color:"#8b5cf6", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:5 }}>Equipo</div>
            <div style={{ fontSize:13, fontWeight:800, color:"#1e2a3a", lineHeight:1.3 }}>{deviceName}</div>
          </div>
        </div>

        {/* Row 2: Celular + Costo */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
          {repair.clientPhone && (
            <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", border:"2px solid #3b82f6", boxShadow:"0 2px 10px rgba(59,130,246,0.10)" }}>
              <div style={{ fontSize:9, color:"#3b82f6", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:5 }}>Celular</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#1e2a3a" }}>{repair.clientPhone}</div>
            </div>
          )}
          <div style={{ background:"#fff", borderRadius:14, padding:"14px 16px", border:"2px solid #10b981", boxShadow:"0 2px 10px rgba(16,185,129,0.10)" }}>
            <div style={{ fontSize:9, color:"#10b981", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:5 }}>Costo Estimado</div>
            <div style={{ fontSize:16, fontWeight:800, color:"#1ab8c4", letterSpacing:"-0.3px" }}>Bs. {Math.round(repair.estimatedCost).toLocaleString()}</div>
          </div>
        </div>

        {/* Dates */}
        <div style={{ background:"#fff", borderRadius:14, padding:"14px 18px", marginBottom:12, border:"2px solid #64748b", boxShadow:"0 2px 10px rgba(100,116,139,0.10)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
            <div style={{ paddingRight:12, borderRight:"1px solid #f0f3f8" }}>
              <div style={{ fontSize:9, color:"#9298ae", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:4 }}>Fecha ingreso</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1e2a3a" }}>{new Date(repair.createdAt).toLocaleDateString("es-BO")}</div>
            </div>
            <div style={{ paddingLeft:12 }}>
              <div style={{ fontSize:9, color:"#9298ae", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:4 }}>Última actualización</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1e2a3a" }}>{new Date(repair.updatedAt).toLocaleDateString("es-BO")}</div>
            </div>
          </div>
        </div>

        {/* Problema */}
        <div style={{ background:"#fff", borderRadius:14, padding:"14px 18px", marginBottom:12, border:"2px solid #e11d48", boxShadow:"0 2px 10px rgba(225,29,72,0.08)" }}>
          <div style={{ fontSize:9, color:"#e11d48", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:6 }}>Problema Reportado</div>
          <div style={{ fontSize:14, fontWeight:600, color:"#1e2a3a", lineHeight:1.6 }}>{repair.issue}</div>
        </div>

        {/* Observaciones */}
        {notes && (
          <div style={{ background:"#fff", borderRadius:14, padding:"14px 18px", marginBottom:12, border:"2px solid #d97706", boxShadow:"0 2px 10px rgba(217,119,6,0.08)" }}>
            <div style={{ fontSize:9, color:"#d97706", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:6 }}>Observaciones</div>
            <div style={{ fontSize:13, color:"#4a5878", lineHeight:1.6 }}>{notes}</div>
          </div>
        )}

        {/* Tags row: servicios, accesorios, etc */}
        {(accessories.length > 0 || services.length > 0 || software.length > 0 || videogames.length > 0 || repuestos.length > 0) && (
          <div style={{ background:"#fff", borderRadius:14, padding:"14px 18px", marginBottom:12, border:"2px solid #64748b", boxShadow:"0 2px 10px rgba(100,116,139,0.10)" }}>
            {accessories.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:9, color:"#10b981", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:7 }}>Accesorios Entregados</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {accessories.map(a => <span key={a} className="tag-pill" style={{ background:"rgba(16,185,129,0.10)", color:"#059669", border:"1px solid rgba(16,185,129,0.25)" }}>✓ {a}</span>)}
                </div>
              </div>
            )}
            {services.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:9, color:"#8b5cf6", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:7 }}>Servicios</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {services.map(s => <span key={s} className="tag-pill" style={{ background:"rgba(139,92,246,0.10)", color:"#7c3aed", border:"1px solid rgba(139,92,246,0.25)" }}>{s}</span>)}
                </div>
              </div>
            )}
            {software.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:9, color:"#3b82f6", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:7 }}>Programas</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {software.map(s => <span key={s} className="tag-pill" style={{ background:"rgba(59,130,246,0.10)", color:"#1d4ed8", border:"1px solid rgba(59,130,246,0.25)" }}>{s}</span>)}
                </div>
              </div>
            )}
            {videogames.length > 0 && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:9, color:"#ef4444", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:7 }}>Videojuegos a Instalar</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {videogames.map(v => <span key={v} className="tag-pill" style={{ background:"rgba(239,68,68,0.10)", color:"#dc2626", border:"1px solid rgba(239,68,68,0.25)" }}>🎮 {v}</span>)}
                </div>
              </div>
            )}
            {repuestos.length > 0 && (
              <div>
                <div style={{ fontSize:9, color:"#f59e0b", textTransform:"uppercase", fontWeight:700, letterSpacing:"0.5px", marginBottom:7 }}>Repuestos</div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {repuestos.map(r => <span key={r} className="tag-pill" style={{ background:"rgba(245,158,11,0.10)", color:"#d97706", border:"1px solid rgba(245,158,11,0.25)" }}>{r}</span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Descuento */}
        {Number(discount) > 0 && (
          <div className="app-card" style={{ padding:"12px 18px", marginBottom:12, background:"linear-gradient(135deg,rgba(239,68,68,0.05),rgba(239,68,68,0.02))", borderLeft:"3px solid #ef4444" }}>
            <div style={{ fontSize:9, color:"#e11d48", textTransform:"uppercase", fontWeight:700, marginBottom:4 }}>Descuento Aplicado</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#e11d48" }}>- Bs. {discount}</div>
          </div>
        )}

        {/* Timeline */}
        <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", marginBottom:12, border:"2px solid #1ab8c4", boxShadow:"0 2px 10px rgba(26,184,196,0.10)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#1e2a3a", letterSpacing:"-0.2px", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:3, height:14, borderRadius:2, background:"#1ab8c4" }} />
            Estado Detallado
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {Object.entries(STATUS).map(([key, val], i) => {
              const done = i <= currentIndex;
              const current = i === currentIndex;
              return (
                <div key={key} className={`status-step${current?" active":""}`} style={{ "--step-color-bg": `${val.color}10` } as any}>
                  <div className="step-dot" style={{ background:done?`${val.color}18`:"#f0f3f8", border:`2px solid ${done?val.color:"#dde6f5"}`, fontSize:done&&i<currentIndex?13:14, boxShadow:current?`0 0 0 4px ${val.color}20`:"none" }}>
                    {done && i < currentIndex ? "✓" : val.icon}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:current?800:500, color:done?"#1e2a3a":"#9298ae" }}>{val.label}</div>
                    {current && <div style={{ fontSize:11, color:val.color, marginTop:1, fontWeight:500 }}>{val.desc}</div>}
                  </div>
                  {current && <div style={{ width:8, height:8, borderRadius:"50%", background:val.color, boxShadow:`0 0 8px ${val.color}`, animation:"pulse 2s ease-in-out infinite", flexShrink:0 }} />}
                  {done && i < currentIndex && <div style={{ fontSize:11, color:val.color, fontWeight:700, flexShrink:0 }}>✓</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas de entrega */}
        {deliveryNotes && (
          <div className="app-card" style={{ padding:"14px 18px", marginBottom:12, borderLeft:"3px solid #6b7280" }}>
            <div style={{ fontSize:9, color:"#6b7280", textTransform:"uppercase", fontWeight:700, marginBottom:6 }}>Notas de Entrega</div>
            <div style={{ fontSize:13, color:"#4a5878", lineHeight:1.6 }}>{deliveryNotes}</div>
          </div>
        )}

        {/* Review form */}
        {repair.status === "delivered" && (
          <div style={{ marginTop:8 }}>
            <ReviewForm repairCode={repair.code} clientName={repair.clientName} />
          </div>
        )}
      </div>
    </div>
  );
}
