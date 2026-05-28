"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setActiveBranchId } from "@/lib/api";
import { AppSidebar } from "@/components/AppSidebar";

interface Client {
  phoneKey: string; phone: string; name: string; email: string | null;
  totalRepairs: number; totalSpent: number; totalQuotations: number; totalSales: number;
  lastActivity: string; firstActivity: string;
  repairs: { code: string; device: string; status: string; createdAt: string; cost: number }[];
  quotations: { code: string; type: string; total: number; createdAt: string }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "#f59e0b" },
  diagnosed: { label: "Diagnosticado", color: "#8b5cf6" },
  waiting_parts: { label: "Esperando", color: "#f97316" },
  in_progress: { label: "En progreso", color: "#3b82f6" },
  completed: { label: "Completado", color: "#10b981" },
  delivered: { label: "Entregado", color: "#6b7280" },
};

export default function ClientsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token"); const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const u = (() => { try { return JSON.parse(userData); } catch { return null; } })(); setUser(u);
    if (u.role === "tech") { router.push("/asignaciones"); return; }
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    if (u.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.ok ? r.json() : Promise.reject(r.status)).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(u.branchId || ""); }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/clients");
      if (res.ok) { const d = await res.json(); setClients(d.clients || []); }
    } catch {}
    setLoading(false);
  };

  const fmtBs = (n: number) => `Bs. ${(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });

  const filtered = clients.filter(c => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <style>{`
        .sidebar-btn { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px; border-radius: 10px; border: none; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--sidebar-text); transition: all 0.15s; text-align: left; }
        .sidebar-btn:hover { background: rgba(26,184,196,0.05); color: var(--text-secondary); }
        .sidebar-btn.active { background: rgba(26,184,196,0.07); color: #2dd4df; }
        .sidebar-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; background: var(--sidebar-item); color: var(--sidebar-text); }
        @media(max-width:1024px){
          .sidebar-desktop{transform:translateX(-100%)!important}
          .sidebar-desktop.open{transform:translateX(0)!important}
          .main-content{padding-left:0!important;margin-left:0!important;padding-top:56px!important}
          .mobile-header{display:flex!important}
        }
      `}</style>

      <AppSidebar user={user} />

      <div className="main-content" style={{ marginLeft: 210, padding: "24px 28px 60px" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>👥 Clientes frecuentes</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{clients.length} clientes registrados con historial de compras y reparaciones</p>
        </div>

        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar por nombre, teléfono o email..." style={{ width: "100%", maxWidth: 400, padding: "10px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, marginBottom: 20 }} />

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>Cargando clientes...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>
            {search ? "No hay clientes que coincidan con tu búsqueda" : "Aún no hay clientes registrados. Los clientes aparecen automáticamente al crear OTs o Cotizaciones con número de teléfono."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {(filtered || []).map((c, idx) => {
              const isVip = c.totalSpent >= 1000 || c.totalRepairs >= 5;
              return (
                <button key={c.phoneKey} onClick={() => setSelected(c)} style={{ textAlign: "left", padding: 16, background: "var(--bg-card)", border: `1px solid ${isVip ? "rgba(245,158,11,0.3)" : "var(--border)"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isVip ? "linear-gradient(135deg,#fbbf24,#f59e0b)" : "linear-gradient(135deg,#1ab8c4,#2dd4df)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>
                      {c.name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        {c.name}
                        {isVip && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 700 }}>⭐ VIP</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, fontFamily: "monospace" }}>📱 {c.phone}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 10 }}>
                    <div><div style={{ color: "var(--text-muted)" }}>Total gastado</div><div style={{ fontWeight: 700, color: "#10b981", fontSize: 13 }}>{fmtBs(c.totalSpent)}</div></div>
                    <div><div style={{ color: "var(--text-muted)" }}>OTs</div><div style={{ fontWeight: 700, color: "#1ab8c4", fontSize: 13 }}>{c.totalRepairs}</div></div>
                    <div><div style={{ color: "var(--text-muted)" }}>Ventas / COT</div><div style={{ fontWeight: 700, color: "#a855f7", fontSize: 12 }}>{c.totalSales} / {c.totalQuotations}</div></div>
                    <div><div style={{ color: "var(--text-muted)" }}>Última visita</div><div style={{ fontWeight: 700, color: "var(--text-secondary)", fontSize: 11 }}>{fmtDate(c.lastActivity)}</div></div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALLE */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 600, maxHeight: "85vh", background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#1ab8c4,#2dd4df)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800 }}>{selected.name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?"}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{selected.name}</h3>
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>📱 {selected.phone}{selected.email && ` · 📧 ${selected.email}`}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 22, overflow: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 18 }}>
                <div style={{ padding: 10, background: "rgba(26,184,196,0.05)", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#1ab8c4" }}>{selected.totalRepairs}</div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>OTs</div></div>
                <div style={{ padding: 10, background: "rgba(245,158,11,0.08)", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{selected.totalQuotations}</div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>COT</div></div>
                <div style={{ padding: 10, background: "rgba(168,85,247,0.08)", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 20, fontWeight: 800, color: "#a855f7" }}>{selected.totalSales}</div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Ventas</div></div>
                <div style={{ padding: 10, background: "rgba(16,185,129,0.08)", borderRadius: 8, textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 800, color: "#10b981" }}>{fmtBs(selected.totalSpent)}</div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Gastado</div></div>
              </div>
              {selected.repairs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Últimas reparaciones</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selected.repairs.map(r => {
                      const st = STATUS_LABELS[r.status] || { label: r.status, color: "#94a3b8" };
                      return (
                        <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-tertiary)", borderRadius: 8 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#1ab8c4" }}>{r.code}</span>
                          <span style={{ flex: 1, fontSize: 11 }}>{r.device}</span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: `${st.color}15`, color: st.color, fontWeight: 700 }}>{st.label}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981" }}>{fmtBs(r.cost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {selected.quotations.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Cotizaciones y ventas</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selected.quotations.map(q => (
                      <div key={q.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-tertiary)", borderRadius: 8 }}>
                        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: q.type === "sale" ? "#a855f7" : "#f59e0b" }}>{q.code}</span>
                        <span style={{ flex: 1, fontSize: 11, color: "var(--text-muted)" }}>{fmtDate(q.createdAt)}</span>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: q.type === "sale" ? "rgba(168,85,247,0.1)" : "rgba(245,158,11,0.1)", color: q.type === "sale" ? "#a855f7" : "#f59e0b", fontWeight: 700 }}>{q.type === "sale" ? "VENTA" : "COT"}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: q.type === "sale" ? "#a855f7" : "var(--text-primary)" }}>{fmtBs(q.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
