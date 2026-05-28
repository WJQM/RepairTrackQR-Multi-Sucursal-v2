"use client";
import { sileo } from "@/lib/toast";
import { apiFetch, getStoredAuth, getActiveBranchId, setActiveBranchId } from "@/lib/api";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";

interface User { id: string; name: string; email: string; role: string; }
interface Repair { id: string; code: string; device: string; brand: string | null; model: string | null; issue: string; status: string; priority: string; estimatedCost: number; notes: string | null; image: string | null; accessories: string | null; clientName: string | null; clientPhone: string | null; clientEmail: string | null; qrCode: string; createdAt: string; updatedAt: string; technicianId: string | null; branchId: string; technician?: { id: string; name: string } | null; }
interface ServiceItem { id: string; name: string; price: number; icon: string; }

const STATUS: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: "⏳", bg: "rgba(245,158,11,0.08)" },
  diagnosed: { label: "Diagnosticado", color: "#8b5cf6", icon: "🔍", bg: "rgba(139,92,246,0.08)" },
  waiting_parts: { label: "Esperando Repuestos", color: "#f97316", icon: "📦", bg: "rgba(249,115,22,0.08)" },
  in_progress: { label: "En Progreso", color: "#3b82f6", icon: "🔧", bg: "rgba(59,130,246,0.08)" },
  completed: { label: "Completado", color: "#10b981", icon: "✅", bg: "rgba(16,185,129,0.08)" },
  delivered: { label: "Entregado", color: "#6b7280", icon: "📱", bg: "rgba(107,114,128,0.08)" },
};
const STEPS = ["pending", "diagnosed", "waiting_parts", "in_progress", "completed"];

function parseImages(img: string | null): string[] { if (!img) return []; try { const p = JSON.parse(img); if (Array.isArray(p)) return p.filter((u: any) => typeof u === "string" && u.length > 0); } catch {} return img.trim().length > 0 ? [img] : []; }
function parseAcc(json: string | null): string[] { if (!json) return []; try { return JSON.parse(json); } catch { return []; } }
function parseNotes(n: string | null, svcList: ServiceItem[]): { notes: string; services: string[]; software: string[]; videogames: string[]; repuestos: string[]; deliveryNotes: string; discount: string } {
  if (!n) return { notes: "", services: [], software: [], videogames: [], repuestos: [], deliveryNotes: "", discount: "" };
  const parts = n.split(" | "); const sP = parts.find(p => p.startsWith("Servicios: ")); const swP = parts.find(p => p.startsWith("Programas: ") || p.startsWith("Software: ")); const vgP = parts.find(p => p.startsWith("Videojuegos: ")); const rP = parts.find(p => p.startsWith("Repuestos: ")); const dP = parts.find(p => p.startsWith("Entrega: ")); const discP = parts.find(p => p.startsWith("Descuento: "));
  const rest = parts.filter(p => !p.startsWith("Servicios: ") && !p.startsWith("Programas: ") && !p.startsWith("Software: ") && !p.startsWith("Videojuegos: ") && !p.startsWith("Repuestos: ") && !p.startsWith("Entrega: ") && !p.startsWith("Descuento: "));
  const services: string[] = []; const software: string[] = []; const videogames: string[] = []; const repuestos: string[] = [];
  if (sP) sP.replace("Servicios: ", "").split(", ").forEach(nm => { if (svcList.find(s => s.name === nm)) services.push(nm); });
  if (swP) swP.replace("Programas: ", "").replace("Software: ", "").split(", ").forEach(nm => { if (nm.trim()) software.push(nm.trim()); });
  if (vgP) vgP.replace("Videojuegos: ", "").split(", ").forEach(nm => { if (nm.trim()) videogames.push(nm.trim()); });
  if (rP) rP.replace("Repuestos: ", "").split(", ").forEach(nm => { if (nm.trim()) repuestos.push(nm.trim()); });
  return { notes: rest.join(" | "), services, software, videogames, repuestos, deliveryNotes: dP ? dP.replace("Entrega: ", "") : "", discount: discP ? discP.replace("Descuento: ", "") : "" };
}
function greet(): string { const h = new Date().getHours(); return h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches"; }

export default function AsignacionesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewImg, setViewImg] = useState<string | null>(null);
  const [svcList, setSvcList] = useState<ServiceItem[]>([]);
  const [search, setSearch] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; website: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico", logo: null, website: null });
  const load = async (token: string) => { try { const r = await apiFetch("/api/repairs", { }); if (r.ok) setRepairs(await r.json()); } catch {} };

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, slogan: d.slogan, logo: d.logo, website: d.website }).catch(() => {}); }).catch(() => {});
    const ud = sessionStorage.getItem("user"); const tk = sessionStorage.getItem("token");
    if (!ud || !tk) { router.push("/"); return; }
    const p = (() => { try { return JSON.parse(ud); } catch { return null; } })();
    if (p.role === "admin") { router.push("/dashboard"); return; }
    setUser(p); load(tk);
    apiFetch("/api/services").then(r => r.json()).then(d => { if (Array.isArray(d)) setSvcList(d); }).catch(() => {});
    setLoading(false);
  }, []);
  useEffect(() => { const tk = sessionStorage.getItem("token"); if (!tk) return; const iv = setInterval(() => load(tk), 10000); return () => clearInterval(iv); }, []);

  const sendWhatsApp = async (phone: string | null, message: string) => {
    if (!phone) { sileo.warning({ title: "Sin número de celular" }); return; }
    try {
      const res = await apiFetch("/api/whatsapp", {
        method: "POST",
        body: JSON.stringify({ phone, message }),
      });
      if (res.ok) { sileo.success({ title: "WhatsApp enviado" }); }
      else { const d = await res.json(); sileo.warning({ title: `${d.error || "Error al enviar"}` }); }
    } catch { sileo.error({ title: "Error de conexión" }); }
  };

  const getBaseUrl = () => "https://degree-project.com";


  const advance = async (id: string, next: string) => {
    const tk = sessionStorage.getItem("token"); if (!tk) return;
    try { const r = await apiFetch(`/api/repairs/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      if (r.ok) { sileo.success({ title: `${STATUS[next]?.label}` }); await load(tk); } else sileo.error({ title: "Error" });
    } catch { sileo.error({ title: "Sin conexión" }); }
  };

  const list = repairs.filter(r => {
    const ms = filter === "all" || (filter === "active" ? !["completed", "delivered"].includes(r.status) : r.status === filter);
    const mq = search === "" || r.code.toLowerCase().includes(search.toLowerCase()) || (r.clientName || "").toLowerCase().includes(search.toLowerCase()) || r.device.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  });

  const st = { total: repairs.length, pend: repairs.filter(r => ["pending", "diagnosed", "waiting_parts"].includes(r.status)).length, prog: repairs.filter(r => r.status === "in_progress").length, done: repairs.filter(r => r.status === "completed").length };

  if (!user) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", color: "var(--text-muted)", fontSize: 14 }}>Cargando...</div>;

  return (
    <div className="main-content" style={{ minHeight: "100vh", background: "var(--bg-primary)", paddingLeft: 210, paddingTop: 0 }}>
{viewImg && <div onClick={() => setViewImg(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, cursor: "pointer" }}><img src={viewImg} style={{ maxWidth: "90%", maxHeight: "90vh", borderRadius: 12 }} /></div>}

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeScale{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        .sb{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border-radius:10px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:transparent;color:var(--text-muted);transition:.15s;text-align:left}
        .sb:hover{background:rgba(99,102,241,.06);color:var(--text-secondary)}.sb.on{background:rgba(99,102,241,.12);color:#2dd4df}
        .sbi{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
        .sidebar-group-btn{display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 10px;border-radius:8px;border:none;font-size:9px;font-weight:700;cursor:pointer;background:transparent;color:var(--text-muted);letter-spacing:.5px;text-transform:uppercase;transition:.15s;text-align:left}
        .sidebar-group-btn:hover{background:rgba(99,102,241,.04);color:var(--text-secondary)}
        .group-arrow{font-size:11px;transition:transform .2s;color:var(--text-muted)}
        .sidebar-group-btn.open .group-arrow{transform:rotate(180deg)}
        .sidebar-sub-list{overflow:hidden;max-height:0;transition:max-height .25s ease}
        .sidebar-sub-list.open{max-height:200px}
        .sb.sub{padding-left:22px}
        .chip{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:6px;font-size:10px;font-weight:600}
        .abtn{transition:.15s}.abtn:hover{filter:brightness(1.15);transform:scale(1.02)}
      
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
          [style*="grid-template-columns"]{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .card-compact{flex-direction:column!important}
          .card-img{width:100%!important;min-height:160px!important;max-height:200px!important}
          .card-compact p{max-width:100%!important}
          .msg-layout{grid-template-columns:1fr!important}
          .filter-btns{overflow-x:auto;-webkit-overflow-scrolling:touch}
        }
      `}</style>

      
      {/* MOBILE HEADER */}
      <AppSidebar user={user} />

      {/* CONTENIDO */}
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.5px" }}>{greet()}, {user?.name?.split(" ")[0]} 👋</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 3 }}>Tus órdenes de trabajo asignadas</p>
        </div>

        <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
          {[{ l: "Asignadas", v: st.total, i: "📋", c: "#1ab8c4" }, { l: "Pendientes", v: st.pend, i: "⏳", c: "#f59e0b" }, { l: "En Progreso", v: st.prog, i: "🔧", c: "#3b82f6" }, { l: "Completadas", v: st.done, i: "✅", c: "#10b981" }].map((s, i) => (
            <div key={i} style={{ padding: "16px", background: `linear-gradient(135deg,${s.c}10,${s.c}03)`, borderRadius: 14, border: `1px solid ${s.c}15`, position: "relative", overflow: "hidden", animation: `fadeIn .4s ease-out ${i * .06}s both` }}>
              <div style={{ position: "absolute", top: -8, right: -8, fontSize: 40, opacity: .06 }}>{s.i}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 600 }}>{s.l}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginTop: 6 }}>{s.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180, maxWidth: 320, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-card)", borderRadius: 10, padding: "0 14px", border: "1px solid var(--border)" }}>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ flex: 1, border: "none", background: "none", padding: "10px 0", color: "var(--text-primary)", fontSize: 12, outline: "none" }} />
          </div>
          <div className="filter-btns" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[{ k: "all", l: "Todas", i: "📋", c: "#1ab8c4" }, ...Object.entries(STATUS).filter(([k]) => k !== "delivered").map(([k, v]) => ({ k, l: v.label, i: v.icon, c: v.color }))].map(f => {
              const on = filter === f.k; const n = f.k === "all" ? repairs.length : repairs.filter(r => r.status === f.k).length;
              return <button key={f.k} onClick={() => setFilter(f.k)} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: on ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, background: on ? `${f.c}15` : "var(--bg-card)", border: on ? `1.5px solid ${f.c}40` : "1.5px solid var(--border)", color: on ? f.c : "var(--text-muted)" }}><span style={{ fontSize: 11 }}>{f.i}</span>{f.l}{n > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "0 5px", borderRadius: 5, background: on ? `${f.c}20` : "var(--bg-tertiary)", color: on ? f.c : "var(--text-muted)" }}>{n}</span>}</button>;
            })}
          </div>
        </div>

        {loading ? <div style={{ padding: 50, textAlign: "center", color: "var(--text-muted)" }}>Cargando...</div>
        : list.length === 0 ? <div style={{ padding: 50, textAlign: "center", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8" }}><div style={{ fontSize: 40, marginBottom: 12 }}>📋</div><h3 style={{ fontSize: 15, fontWeight: 700 }}>Sin asignaciones</h3></div>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(list || []).map((r, i) => {
              const s = STATUS[r.status] || { label: r.status, color: "#666", icon: "❓", bg: "rgba(100,100,100,.08)" };
              const isOpen = expanded === r.id;
              const isDone = r.status === "delivered";
              const ci = isDone ? STEPS.length - 1 : STEPS.indexOf(r.status);
              const next = !isDone && ci >= 0 && ci < STEPS.length - 1 ? STEPS[ci + 1] : undefined;
              const imgs = parseImages(r.image);
              const acc = parseAcc(r.accessories);
              const p = parseNotes(r.notes, svcList);
              const dev = [r.device, r.brand, r.model].filter(Boolean).join(" ");

              return (
                <div key={r.id} onClick={() => setExpanded(isOpen ? null : r.id)} style={{ background: "var(--bg-card)", borderRadius: 14, border: `1px solid ${isOpen ? s.color + "30" : "var(--border)"}`, cursor: "pointer", transition: ".25s", animation: `fadeIn .3s ease-out ${i * .03}s both`, overflow: "hidden" }}>
                  {/* FILA COMPACTA */}
                  <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: `1px solid ${s.color}15` }}>
                      {imgs[0] ? <img src={imgs[0]} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : s.icon}
                    </div>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1ab8c4", background: "rgba(99,102,241,.07)", padding: "2px 7px", borderRadius: 5, flexShrink: 0 }}>{r.code}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dev}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>👤 {r.clientName || "—"}</span>
                    {next ? (
                      <button className="abtn" onClick={e => { e.stopPropagation(); advance(r.id, next); }} style={{ padding: "7px 14px", background: `linear-gradient(135deg,${STATUS[next].color},${STATUS[next].color}bb)`, border: "none", borderRadius: 8, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", boxShadow: `0 3px 12px ${STATUS[next].color}25`, whiteSpace: "nowrap" }}>{STATUS[next].icon} {STATUS[next].label} ▸</button>
                    ) : r.status === "completed" ? (
                      <span style={{ padding: "7px 14px", background: "rgba(16,185,129,.07)", borderRadius: 8, border: "1px solid rgba(16,185,129,.15)", color: "#10b981", fontSize: 10, fontWeight: 700 }}>✅ Listo</span>
                    ) : null}
                    <span style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 600, color: s.color, background: s.bg, flexShrink: 0 }}>{s.icon} {s.label}</span>
                    <span style={{ fontSize: 14, color: "var(--text-muted)", transform: isOpen ? "rotate(90deg)" : "none", transition: ".2s", flexShrink: 0 }}>▸</span>
                  </div>
                  {/* Barra mini */}
                  <div style={{ height: 2, background: "var(--bg-tertiary)" }}><div style={{ height: "100%", width: `${((ci + 1) / STEPS.length) * 100}%`, background: s.color, transition: "width .4s", borderRadius: 1 }} /></div>

                  {/* EXPANDIDO */}
                  {isOpen && (
                    <div style={{ padding: "16px 18px", borderTop: "1px solid var(--border)", animation: "fadeScale .2s ease-out" }}>
                      {/* Fotos */}
                      {imgs.length > 0 && (<div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>{(imgs || []).map((img, idx) => (<div key={idx} onClick={e => { e.stopPropagation(); setViewImg(img); }} style={{ width: 160, height: 110, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "1px solid var(--border)", flexShrink: 0, position: "relative" }}><img src={img} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /><span style={{ position: "absolute", bottom: 3, left: 5, fontSize: 8, color: "#fff", background: "rgba(26,29,46,0.40)", padding: "1px 5px", borderRadius: 3 }}>{idx + 1}/{imgs.length}</span></div>))}</div>)}

                      {/* ═══ LAYOUT: [CLIENTE+EQUIPO | SEGUIMIENTO] + [DETALLES] ═══ */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12 }}>
                        {/* COLUMNA IZQUIERDA */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
                          {/* FILA: CLIENTE | EQUIPO */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {/* CLIENTE */}
                            <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(26,184,196,0.08)", borderLeft: "3px solid #1ab8c4" }}>
                              <div style={{ padding: "8px 14px", background: "var(--bg-tertiary)", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13 }}>👤</span><span style={{ fontSize: 10, fontWeight: 700, color: "#1ab8c4", textTransform: "uppercase", letterSpacing: "0.6px" }}>Cliente</span></div>
                              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Nombre</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{r.clientName || "—"}</div></div>
                                <div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Celular</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{r.clientPhone || "—"}</div></div>
                              </div>
                            </div>
                            {/* EQUIPO */}
                            <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(16,185,129,0.15)", borderLeft: "3px solid #10b981" }}>
                              <div style={{ padding: "8px 14px", background: "var(--bg-tertiary)", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13 }}>💻</span><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Equipo</span></div>
                              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Dispositivo</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{r.device}</div></div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}><div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Marca</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{r.brand || "—"}</div></div><div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Modelo</div><div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: "var(--text-primary)" }}>{r.model || "—"}</div></div></div>
                                <div style={{ padding: "8px 10px", background: "rgba(245,158,11,0.04)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.12)" }}><div style={{ fontSize: 8, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>Costo Est.</div><div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, color: "#f59e0b" }}>Bs. {r.estimatedCost}</div></div>
                              </div>
                            </div>
                          </div>
                          {/* DETALLES */}
                          <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(168,85,247,0.15)", borderLeft: "3px solid #a855f7" }}>
                            <div style={{ padding: "8px 14px", background: "var(--bg-tertiary)", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13 }}>📋</span><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Detalles</span></div>
                            <div style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>
                              {r.issue && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: s.color, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>⚠️ Problema</div><div style={{ fontSize: 11, marginTop: 3, color: "var(--text-primary)", lineHeight: 1.4 }}>{r.issue}</div></div>)}
                              {p.notes && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>📝 Observaciones</div><div style={{ fontSize: 11, marginTop: 3, color: "var(--text-secondary)", lineHeight: 1.4 }}>{p.notes}</div></div>)}
                              {p.services.length > 0 && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "#a855f7", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>Servicios</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{p.services.map(name => { const sv = svcList.find(x => x.name === name); return <span key={name} style={{ padding: "2px 7px", background: "rgba(168,85,247,0.1)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "#a855f7" }}>{sv?.icon} {name}</span>; })}</div></div>)}
                              {p.software.length > 0 && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "#8b5cf6", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>💿 Programas</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{p.software.map(name => <span key={name} style={{ padding: "2px 7px", background: "rgba(139,92,246,0.1)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "#8b5cf6" }}>{name}</span>)}</div></div>)}
                              {p.videogames.length > 0 && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "#ef4444", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>🎮 Videojuegos</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{p.videogames.map(name => <span key={name} style={{ padding: "2px 7px", background: "rgba(239,68,68,0.1)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "#ef4444" }}>{name}</span>)}</div></div>)}
                              {p.repuestos.length > 0 && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid var(--border)" }}><div style={{ fontSize: 8, color: "#f59e0b", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px", marginBottom: 4 }}>📦 Repuestos</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{p.repuestos.map(name => <span key={name} style={{ padding: "2px 7px", background: "rgba(245,158,11,0.1)", borderRadius: 4, fontSize: 9, fontWeight: 600, color: "#f59e0b" }}>{name}</span>)}</div></div>)}
                              {p.deliveryNotes && (<div style={{ padding: "8px 10px", background: "var(--bg-hover)", borderRadius: 8, border: "1px solid rgba(107,114,128,0.2)" }}><div style={{ fontSize: 8, color: "#6b7280", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>📋 Notas de Entrega</div><div style={{ fontSize: 11, marginTop: 3, color: "var(--text-secondary)", lineHeight: 1.4 }}>{p.deliveryNotes}</div></div>)}
                              {Number(p.discount) > 0 && (<div style={{ padding: "8px 10px", background: "rgba(239,68,68,0.04)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}><div style={{ fontSize: 8, color: "#ef4444", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.3px" }}>🏷️ Descuento</div><div style={{ fontSize: 13, marginTop: 3, color: "#ef4444", fontWeight: 700 }}>- Bs. {p.discount}</div></div>)}
                            </div>
                          </div>
                        </div>

                        {/* COLUMNA DERECHA: SEGUIMIENTO */}
                        <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, overflow: "hidden", border: `1px solid ${s.color}20`, borderLeft: `3px solid ${s.color}`, width: 260 }}>
                          <div style={{ padding: "8px 14px", background: `linear-gradient(135deg, ${s.color}14, ${s.color}04)`, borderBottom: `1px solid ${s.color}15`, display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13 }}>📍</span><span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: "uppercase", letterSpacing: "0.5px" }}>Seguimiento</span></div>
                          <div style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                            {/* DONUT */}
                            <div style={{ position: "relative", width: 170, height: 170 }}>
                              <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                                {(() => {
                                  const allSteps = [...STEPS, ...(isDone ? ["delivered"] : [])];
                                  const totalSteps = allSteps.length;
                                  const gapDeg = 5; const totalGap = gapDeg * totalSteps; const availableDeg = 360 - totalGap; const segDeg = availableDeg / totalSteps;
                                  const rad = 42; const cx = 50; const cy = 50; const circumference = 2 * Math.PI * rad;
                                  return allSteps.map((key, idx) => {
                                    const startAngle = idx * (segDeg + gapDeg); const segLen = (segDeg / 360) * circumference; const gapLen = circumference - segLen; const offset = -(startAngle / 360) * circumference;
                                    const val = STATUS[key]; const done2 = isDone ? true : idx <= ci; const cur = !isDone && idx === ci;
                                    return <circle key={key} cx={cx} cy={cy} r={rad} fill="none" stroke={done2 ? val.color : "rgba(255,255,255,0.06)"} strokeWidth={cur ? 8 : 5} strokeDasharray={`${segLen} ${gapLen}`} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: "all 0.6s ease", filter: cur ? `drop-shadow(0 0 6px ${val.color})` : "none" }} />;
                                  });
                                })()}
                              </svg>
                              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ fontSize: 36 }}>{s.icon}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.label}</div>
                                <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 1 }}>{new Date(r.updatedAt).toLocaleDateString("es-BO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                            </div>
                            {/* BARRAS */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                              {[...STEPS, ...(isDone ? ["delivered"] : [])].map((key, idx) => {
                                const val = STATUS[key]; const done2 = isDone ? true : idx <= ci; const cur = !isDone && idx === ci;
                                return (
                                  <div key={key} style={{ opacity: done2 ? 1 : 0.3 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                      <span style={{ fontSize: cur ? 10 : 9, fontWeight: cur ? 700 : 500, color: cur ? val.color : "var(--text-muted)" }}>{val.label}</span>
                                      {done2 && !cur && <span style={{ fontSize: 9, color: val.color }}>✓</span>}
                                      {cur && <span style={{ fontSize: 7, padding: "1px 6px", borderRadius: 4, background: `${val.color}20`, color: val.color, fontWeight: 700 }}>ACTUAL</span>}
                                    </div>
                                    <div style={{ height: cur ? 6 : 4, background: "rgba(255,255,255,0.04)", borderRadius: 3, overflow: "hidden" }}>
                                      <div style={{ width: done2 ? "100%" : "0%", height: "100%", background: cur ? `linear-gradient(90deg, ${val.color}, ${val.color}aa)` : val.color, borderRadius: 3, transition: "width 0.8s ease", boxShadow: cur ? `0 0 8px ${val.color}60` : "none" }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ACCESORIOS */}
                      {acc.length > 0 && (
                        <div style={{ background: "var(--bg-tertiary)", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(16,185,129,0.15)", borderLeft: "3px solid #10b981", marginBottom: 12 }}>
                          <div style={{ padding: "8px 14px", background: "var(--bg-tertiary)", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 13 }}>🎒</span><span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Accesorios</span><span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 8, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 700 }}>{acc.length}</span></div>
                          <div style={{ padding: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {(acc || []).map(a => <span key={a} style={{ padding: "5px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 8, fontSize: 11, fontWeight: 600, color: "#10b981", border: "1px solid rgba(16,185,129,0.15)", display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10 }}>✓</span> {a}</span>)}
                          </div>
                        </div>
                      )}

                      {/* ACCIONES (solo avanzar + WhatsApp) */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {next && <button className="abtn" onClick={e => { e.stopPropagation(); advance(r.id, next); }} style={{ padding: "8px 16px", background: `${STATUS[next].color}10`, border: `1px solid ${STATUS[next].color}25`, borderRadius: 8, color: STATUS[next].color, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{STATUS[next].icon} {STATUS[next].label}</button>}
                        {r.status === "completed" && <span style={{ padding: "8px 16px", background: "rgba(16,185,129,.06)", borderRadius: 8, border: "1px solid rgba(16,185,129,.15)", color: "#10b981", fontSize: 11, fontWeight: 700 }}>✅ Esperando entrega</span>}
                        <button onClick={e => { e.stopPropagation(); const base = getBaseUrl(); const msg = `Estimado/a${r.clientName ? ` *${r.clientName}*` : ""},\n\nNos comunicamos de *${settings.companyName}* respecto a su equipo *${r.device}${r.brand ? ` ${r.brand}` : ""}* (${r.code}).\n\nPuede consultar el estado en:\n🔗 ${base}/portal\n\nAtentamente,\n*${settings.companyName}*`; sendWhatsApp(r.clientPhone, msg); }} style={{ padding: "8px 14px", background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)", borderRadius: 8, color: "#25d366", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>📲 WhatsApp</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
