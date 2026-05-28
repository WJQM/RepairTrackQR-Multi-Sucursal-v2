"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setActiveBranchId, getStoredAuth } from "@/lib/api";
import { AppSidebar } from "@/components/AppSidebar";

interface StatsData {
  revenue: {
    repairs: { today: number; week: number; month: number; year: number; all: number };
    sales: { today: number; week: number; month: number; year: number; all: number };
    combined: { today: number; week: number; month: number; year: number; all: number };
  };
  repairs: { total: number; byStatus: Record<string, number>; avgTicket: number };
  timeline: { month: string; count: number; revenue: number }[];
  topTechnicians: { id: string; name: string; image: string | null; count: number; revenue: number }[];
  inventory: { lowStock: { id: string; name: string; quantity: number; price: number; image: string | null; branch: { name: string } | null }[] };
  consoles: { disponibles: number; vendidas: number; reservadas: number };
  quotations: { cotizaciones: number; notasVenta: number };
  traffic?: {
    visits: { today: number; week: number; month: number; all: number; uniqueToday: number; uniqueWeek: number; uniqueMonth: number };
    byType: { type: string; count: number }[];
    topDocuments: { code: string | null; type: string | null; count: number }[];
    byHour: { hour: number; count: number }[];
    last7Days: { day: string; count: number }[];
  };
}

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b", icon: "⏳" },
  diagnosed: { label: "Diagnosticado", color: "#0891b2", icon: "🔍" },
  waiting_parts: { label: "Esperando Repuestos", color: "#f97316", icon: "📦" },
  in_progress: { label: "En Progreso", color: "#1ab8c4", icon: "🔧" },
  completed: { label: "Completado", color: "#10b981", icon: "✅" },
  delivered: { label: "Entregado", color: "#8b5cf6", icon: "📬" },
};

const DOC_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  ot: { label: "OT (Reparación)", color: "#1ab8c4", icon: "🔧" },
  ce: { label: "CE (Entrega)", color: "#10b981", icon: "📬" },
  cot: { label: "Cotización", color: "#f59e0b", icon: "🧾" },
  nv: { label: "Nota de Venta", color: "#a855f7", icon: "💰" },
  cl: { label: "Certificado", color: "#ec4899", icon: "🏅" },
  eq: { label: "Equipo", color: "#0891b2", icon: "💻" },
  cn: { label: "Consola", color: "#f97316", icon: "🕹️" },
  vg: { label: "Videojuego", color: "#ef4444", icon: "🎮" },
  sw: { label: "Programa", color: "#8b5cf6", icon: "💿" },
  track: { label: "Seguimiento", color: "#2dd4df", icon: "📋" },
  quotation: { label: "Documento", color: "#94a3b8", icon: "📄" },
};

export default function StatsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    const token = sessionStorage.getItem("token"); const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const u = (() => { try { return JSON.parse(userData); } catch { return null; } })(); setUser(u);
    if (u.role === "tech") { router.push("/asignaciones"); return; }
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    if (u.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length > 0) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(u.branchId || ""); }
    load();
  }, []);

  const load = async () => {
    setLoading(true); setErrorMsg("");
    try {
      const res = await apiFetch("/api/stats");
      if (res.ok) {
        setData(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.details || err.error || `Error ${res.status}`);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Error de red");
    }
    setLoading(false);
  };

  const fmtBs = (n: number) => `Bs. ${(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!user) return null;

  const maxTimelineRev = data ? Math.max(1, ...data.timeline.map(t => t.revenue)) : 1;
  const maxTimelineCount = data ? Math.max(1, ...data.timeline.map(t => t.count)) : 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <style>{`
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
        .stat-card { padding: 20px; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border); transition: all 0.2s; }
        .stat-card:hover { border-color: rgba(26,184,196,0.10); }
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
          .sidebar-overlay{display:block!important}
        }
      `}</style>

      <AppSidebar user={user} />

      {/* MAIN */}
      <div className="main-content" style={{ marginLeft: 210, padding: "24px 28px 60px", maxWidth: "100%" }}>
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>📈 Panel de estadísticas</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Resumen de ingresos, órdenes y actividad</p>
          </div>
          <button onClick={load} disabled={loading} style={{ padding: "8px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>{loading ? "Cargando..." : "🔄 Refrescar"}</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>Cargando estadísticas...</div>
        ) : errorMsg ? (
          <div style={{ padding: 24, background: "#fff5f5", borderRadius: 12, border: "1.5px solid rgba(239,68,68,0.25)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>⚠️ No se pudieron cargar las estadísticas</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "monospace" }}>{errorMsg}</div>
            <button onClick={load} style={{ marginTop: 12, padding: "8px 16px", background: "#ef4444", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Reintentar</button>
          </div>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>Sin datos</div>
        ) : (
          <>
            {/* INGRESOS - CARDS GRANDES */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>💰 Ingresos combinados (OT + Ventas)</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  { label: "Hoy", value: data.revenue.combined.today, icon: "🌅", color: "#10b981" },
                  { label: "Esta semana", value: data.revenue.combined.week, icon: "📆", color: "#0891b2" },
                  { label: "Este mes", value: data.revenue.combined.month, icon: "📊", color: "#1ab8c4" },
                  { label: "Este año", value: data.revenue.combined.year, icon: "🏆", color: "#8b5cf6" },
                  { label: "Histórico total", value: data.revenue.combined.all, icon: "💎", color: "#f59e0b" },
                ].map(c => (
                  <div key={c.label} className="stat-card" style={{ borderLeft: `4px solid ${c.color}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</span>
                      <span style={{ fontSize: 18 }}>{c.icon}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: c.color, letterSpacing: "-0.5px" }}>{fmtBs(c.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* DESGLOSE */}
            <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="stat-card" style={{ borderTop: "3px solid #1ab8c4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>🔧</span>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Ingresos por reparaciones</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 11 }}>
                  <div><div style={{ color: "var(--text-muted)" }}>Hoy</div><div style={{ fontWeight: 700, color: "#1ab8c4", fontSize: 14 }}>{fmtBs(data.revenue.repairs.today)}</div></div>
                  <div><div style={{ color: "var(--text-muted)" }}>Semana</div><div style={{ fontWeight: 700, color: "#1ab8c4", fontSize: 14 }}>{fmtBs(data.revenue.repairs.week)}</div></div>
                  <div><div style={{ color: "var(--text-muted)" }}>Mes</div><div style={{ fontWeight: 700, color: "#1ab8c4", fontSize: 14 }}>{fmtBs(data.revenue.repairs.month)}</div></div>
                  <div><div style={{ color: "var(--text-muted)" }}>Total</div><div style={{ fontWeight: 700, color: "#1ab8c4", fontSize: 14 }}>{fmtBs(data.revenue.repairs.all)}</div></div>
                </div>
              </div>
              <div className="stat-card" style={{ borderTop: "3px solid #a855f7" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>💰</span>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>Ingresos por ventas (NV)</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, fontSize: 11 }}>
                  <div><div style={{ color: "var(--text-muted)" }}>Hoy</div><div style={{ fontWeight: 700, color: "#a855f7", fontSize: 14 }}>{fmtBs(data.revenue.sales.today)}</div></div>
                  <div><div style={{ color: "var(--text-muted)" }}>Semana</div><div style={{ fontWeight: 700, color: "#a855f7", fontSize: 14 }}>{fmtBs(data.revenue.sales.week)}</div></div>
                  <div><div style={{ color: "var(--text-muted)" }}>Mes</div><div style={{ fontWeight: 700, color: "#a855f7", fontSize: 14 }}>{fmtBs(data.revenue.sales.month)}</div></div>
                  <div><div style={{ color: "var(--text-muted)" }}>Total</div><div style={{ fontWeight: 700, color: "#a855f7", fontSize: 14 }}>{fmtBs(data.revenue.sales.all)}</div></div>
                </div>
              </div>
            </div>

            {/* TIMELINE 6 MESES */}
            <div className="stat-card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14 }}>📊 Últimos 6 meses</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 180, paddingTop: 20 }}>
                {data.timeline.map((t, i) => {
                  const barH = Math.max(6, (t.revenue / maxTimelineRev) * 140);
                  const countH = Math.max(6, (t.count / maxTimelineCount) * 140);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#1ab8c4" }}>{fmtBs(t.revenue)}</div>
                      <div style={{ width: "100%", display: "flex", gap: 4, alignItems: "flex-end", height: 140 }}>
                        <div style={{ flex: 1, height: barH, background: "linear-gradient(180deg, #1ab8c4, #4338ca)", borderRadius: "6px 6px 0 0" }} title={`Ingresos: ${fmtBs(t.revenue)}`} />
                        <div style={{ flex: 1, height: countH, background: "linear-gradient(180deg, #10b981, #047857)", borderRadius: "6px 6px 0 0" }} title={`OTs: ${t.count}`} />
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>{t.month}</div>
                      <div style={{ fontSize: 9, color: "#10b981", fontWeight: 600 }}>{t.count} OTs</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)", fontSize: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#1ab8c4" }} />Ingresos OT (Bs)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981" }} />Cantidad OTs</div>
              </div>
            </div>

            {/* OTs POR ESTADO */}
            <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div className="stat-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>📋 OTs por estado</h3>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total: <strong style={{ color: "var(--text-primary)" }}>{data.repairs.total}</strong></span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(STATUS_META).map(([key, meta]) => {
                    const count = data.repairs.byStatus[key] || 0;
                    const pct = data.repairs.total > 0 ? (count / data.repairs.total) * 100 : 0;
                    return (
                      <div key={key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                          <span style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
                          <span style={{ color: "var(--text-secondary)" }}>{count} · {pct.toFixed(0)}%</span>
                        </div>
                        <div style={{ width: "100%", height: 8, background: "var(--bg-tertiary)", borderRadius: 6, overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: meta.color, transition: "width 0.3s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: "#ffffff", border: "1px solid var(--border)", borderTop: "4px solid #10b981", boxShadow: "0 4px 18px rgba(30,42,58,0.10), 0 1px 3px rgba(30,42,58,0.05)" }}>
                <span style={{ fontSize: 38 }}>🎯</span>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 8 }}>Ticket Promedio</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", marginTop: 4 }}>{fmtBs(data.repairs.avgTicket)}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>por OT entregada</div>
              </div>
            </div>

            {/* TOP TÉCNICOS */}
            {data.topTechnicians.length > 0 && (
              <div className="stat-card" style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14 }}>🏆 Top Técnicos</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.topTechnicians.map((t, idx) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: "50%", background: idx === 0 ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : idx === 1 ? "linear-gradient(135deg, #cbd5e1, #94a3b8)" : idx === 2 ? "linear-gradient(135deg, #f97316, #ea580c)" : "linear-gradient(135deg, #1ab8c4, #2dd4df)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                      </div>
                      {t.image ? <img src={t.image} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} /> : <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.count} OTs cerradas</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>{fmtBs(t.revenue)}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)" }}>generado</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OTRAS MÉTRICAS */}
            <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div className="stat-card">
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>🧾 Documentos</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>📋 Cotizaciones</span><strong style={{ color: "#f59e0b" }}>{data.quotations.cotizaciones}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>💰 Notas de Venta</span><strong style={{ color: "#a855f7" }}>{data.quotations.notasVenta}</strong></div>
                </div>
              </div>
              <div className="stat-card">
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>🕹️ Consolas</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>✅ Disponibles</span><strong style={{ color: "#10b981" }}>{data.consoles.disponibles}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>💰 Vendidas</span><strong style={{ color: "#1ab8c4" }}>{data.consoles.vendidas}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>🔖 Reservadas</span><strong style={{ color: "#f59e0b" }}>{data.consoles.reservadas}</strong></div>
                </div>
              </div>
            </div>

            {/* TRÁFICO DEL PORTAL */}
            {data.traffic && (
              <>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4, marginBottom: 12 }}>👁️ Tráfico del portal público</h2>

                {/* Visitas totales */}
                <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Visitas hoy", v: data.traffic.visits.today, u: data.traffic.visits.uniqueToday, color: "#10b981", icon: "🌅" },
                    { label: "Esta semana", v: data.traffic.visits.week, u: data.traffic.visits.uniqueWeek, color: "#0891b2", icon: "📆" },
                    { label: "Este mes", v: data.traffic.visits.month, u: data.traffic.visits.uniqueMonth, color: "#1ab8c4", icon: "📊" },
                    { label: "Histórico total", v: data.traffic.visits.all, u: null, color: "#f59e0b", icon: "💎" },
                  ].map(c => (
                    <div key={c.label} className="stat-card" style={{ borderLeft: `4px solid ${c.color}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</span>
                        <span style={{ fontSize: 18 }}>{c.icon}</span>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: c.color, letterSpacing: "-0.5px" }}>{c.v.toLocaleString("es-BO")}</div>
                      {c.u !== null && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>👥 {c.u.toLocaleString("es-BO")} visitantes únicos</div>}
                    </div>
                  ))}
                </div>

                {/* Últimos 7 días + distribución horaria */}
                <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="stat-card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14 }}>📈 Últimos 7 días</h3>
                    {(() => {
                      const maxV = Math.max(1, ...data.traffic.last7Days.map(d => d.count));
                      return (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, paddingTop: 16 }}>
                          {data.traffic.last7Days.map((d, i) => {
                            const h = Math.max(4, (d.count / maxV) * 100);
                            return (
                              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>{d.count}</div>
                                <div style={{ width: "100%", height: h, background: "linear-gradient(180deg, #10b981, #047857)", borderRadius: "6px 6px 0 0" }} />
                                <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, textAlign: "center" }}>{d.day}</div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="stat-card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14 }}>🕐 Distribución por hora (7 días)</h3>
                    {(() => {
                      const maxH = Math.max(1, ...data.traffic.byHour.map(h => h.count));
                      const peakHour = data.traffic.byHour.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });
                      return (
                        <>
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 100 }}>
                            {data.traffic.byHour.map(h => (
                              <div key={h.hour} title={`${h.hour}:00 - ${h.count} visitas`} style={{ flex: 1, height: Math.max(3, (h.count / maxH) * 90), background: h.hour === peakHour.hour && peakHour.count > 0 ? "#f59e0b" : "#2dd4df", borderRadius: "3px 3px 0 0", opacity: h.count === 0 ? 0.15 : 1 }} />
                            ))}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: "var(--text-muted)" }}>
                            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                          </div>
                          {peakHour.count > 0 && <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 8, fontSize: 11 }}>⏰ <strong style={{ color: "#f59e0b" }}>Hora pico: {peakHour.hour}:00</strong> ({peakHour.count} visitas)</div>}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Visitas por tipo + Top docs */}
                <div style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="stat-card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14 }}>📑 Tipo de documento (30 días)</h3>
                    {data.traffic.byType.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 11 }}>Sin consultas de documentos aún</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {data.traffic.byType.map(t => {
                          const meta = DOC_TYPE_META[t.type] || { label: t.type, color: "#94a3b8", icon: "📄" };
                          const total = data.traffic!.byType.reduce((s, x) => s + x.count, 0);
                          const pct = total > 0 ? (t.count / total) * 100 : 0;
                          return (
                            <div key={t.type}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                                <span style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
                                <span style={{ color: "var(--text-secondary)" }}>{t.count} · {pct.toFixed(0)}%</span>
                              </div>
                              <div style={{ width: "100%", height: 6, background: "var(--bg-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: meta.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="stat-card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14 }}>🏆 Top documentos consultados</h3>
                    {data.traffic.topDocuments.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 11 }}>Sin datos aún</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {data.traffic.topDocuments.map((d, idx) => {
                          const meta = DOC_TYPE_META[d.type || "quotation"] || { label: "", color: "#94a3b8", icon: "📄" };
                          return (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--bg-tertiary)", borderRadius: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", minWidth: 18 }}>#{idx + 1}</span>
                              <span style={{ fontSize: 14 }}>{meta.icon}</span>
                              <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: meta.color, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.code}</span>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--text-primary)" }}>{d.count}</span>
                              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>consultas</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* INVENTARIO BAJO STOCK */}
            {data.inventory.lowStock.length > 0 && (
              <div className="stat-card" style={{ marginBottom: 40, border: "1px solid rgba(239,68,68,0.3)" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 14, color: "#ef4444" }}>⚠️ Inventario con stock bajo (≤ 5)</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {data.inventory.lowStock.map(item => (
                    <div key={item.id} style={{ padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: 10, display: "flex", gap: 10, alignItems: "center", border: `1px solid ${item.quantity === 0 ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.3)"}` }}>
                      {item.image ? <img src={item.image} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain", background: "var(--bg-hover)", padding: 2 }} /> : <div style={{ width: 40, height: 40, borderRadius: 8, background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📦</div>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{item.branch?.name}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: item.quantity === 0 ? "#ef4444" : "#f59e0b" }}>{item.quantity}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)" }}>en stock</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
