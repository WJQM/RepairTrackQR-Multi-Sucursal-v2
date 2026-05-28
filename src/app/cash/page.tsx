"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setActiveBranchId } from "@/lib/api";
import { sileo } from "@/lib/toast";
import { AppSidebar } from "@/components/AppSidebar";

interface Movement {
  id: string; type: string; category: string; amount: number; description: string; notes: string | null;
  createdByName: string | null; createdAt: string;
}

const CATEGORIES: { value: string; label: string; icon: string; type: "income" | "expense" | "both" }[] = [
  { value: "repuestos", label: "Compra de repuestos", icon: "🔧", type: "expense" },
  { value: "servicios", label: "Pago de servicios", icon: "💡", type: "expense" },
  { value: "pagos", label: "Pagos / Sueldos", icon: "💼", type: "expense" },
  { value: "ventas", label: "Venta directa", icon: "💰", type: "income" },
  { value: "otros_ing", label: "Otros ingresos", icon: "➕", type: "income" },
  { value: "ajuste", label: "Ajuste de caja", icon: "⚖️", type: "both" },
  { value: "otros", label: "Otros", icon: "📌", type: "both" },
];

export default function CashPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formCat, setFormCat] = useState("repuestos");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");

  useEffect(() => {
    const token = sessionStorage.getItem("token"); const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const u = (() => { try { return JSON.parse(userData); } catch { return null; } })(); setUser(u);
    if (u.role === "tech") { router.push("/asignaciones"); return; }
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    if (u.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(u.branchId || ""); }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/cash");
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const submitMovement = async () => {
    if (saving) return;
    if (!formAmount || Number(formAmount) <= 0) { sileo.error("Monto inválido"); return; }
    if (!formDesc.trim()) { sileo.error("Descripción requerida"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: formType, category: formCat, amount: Number(formAmount), description: formDesc.trim(), notes: formNotes.trim() || null }),
      });
      if (res.ok) {
        sileo.success("Movimiento registrado");
        setShowForm(false); setFormAmount(""); setFormDesc(""); setFormNotes("");
        load();
      } else {
        const err = await res.json().catch(() => ({}));
        sileo.error(err.error || "Error al guardar");
      }
    } catch { sileo.error("Error de red"); }
    setSaving(false);
  };

  const deleteMovement = async (id: string) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      const res = await apiFetch(`/api/cash?id=${id}`, { method: "DELETE" });
      if (res.ok) { sileo.success("Eliminado"); load(); } else { sileo.error("Error al eliminar"); }
    } catch { sileo.error("Error de red"); }
  };

  const fmtBs = (n: number) => `Bs. ${(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const filteredMov = data?.movements?.filter((m: Movement) => filterType === "all" || m.type === filterType) || [];

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

      {/* MAIN */}
      <div className="main-content" style={{ marginLeft: 210, padding: "24px 28px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>💵 Caja Chica</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Registro de ingresos y egresos de la sucursal</p>
          </div>
          <button onClick={() => setShowForm(true)} style={{ padding: "10px 20px", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>➕ Nuevo movimiento</button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>Cargando...</div>
        ) : (
          <>
            {/* Resúmenes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { label: "Hoy", data: data?.today, color: "#1ab8c4", icon: "🌅" },
                { label: "Este mes", data: data?.month, color: "#8b5cf6", icon: "📆" },
                { label: "Filtro actual", data: { income: data?.summary?.totalIncome || 0, expense: data?.summary?.totalExpense || 0, balance: data?.summary?.balance || 0 }, color: "#10b981", icon: "📊" },
              ].map(c => (
                <div key={c.label} style={{ padding: 18, background: "var(--bg-card)", borderRadius: 14, border: `1px solid ${c.color}20`, borderLeft: `3px solid ${c.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{c.label}</span>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                  </div>
                  <div style={{ display: "flex", gap: 14, marginBottom: 8, fontSize: 11 }}>
                    <div><div style={{ color: "#10b981", fontWeight: 600 }}>↑ Ingresos</div><div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>{fmtBs(c.data?.income || 0)}</div></div>
                    <div><div style={{ color: "#ef4444", fontWeight: 600 }}>↓ Egresos</div><div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>{fmtBs(c.data?.expense || 0)}</div></div>
                  </div>
                  <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Saldo</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: (c.data?.balance || 0) >= 0 ? c.color : "#ef4444" }}>{fmtBs(c.data?.balance || 0)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filtros */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[
                { k: "all", l: "Todos", c: "#1ab8c4" },
                { k: "income", l: "Ingresos", c: "#10b981" },
                { k: "expense", l: "Egresos", c: "#ef4444" },
              ].map(f => (
                <button key={f.k} onClick={() => setFilterType(f.k as any)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", background: filterType === f.k ? `${f.c}15` : "var(--bg-card)", border: `1px solid ${filterType === f.k ? f.c + "40" : "var(--border)"}`, color: filterType === f.k ? f.c : "var(--text-muted)" }}>{f.l}</button>
              ))}
            </div>

            {/* Lista */}
            <div style={{ background: "var(--bg-card)", borderRadius: 14, border: "1.5px solid #cbd5e8", overflow: "hidden" }}>
              {filteredMov.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No hay movimientos registrados</div>
              ) : (
                filteredMov.map((m: Movement) => {
                  const cat = CATEGORIES.find(c => c.value === m.category);
                  const isIncome = m.type === "income";
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderBottom: "1.5px solid #cbd5e8" }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: isIncome ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)", color: isIncome ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{cat?.icon || (isIncome ? "↑" : "↓")}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.description}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                          <span style={{ color: isIncome ? "#10b981" : "#ef4444", fontWeight: 700 }}>{cat?.label || m.category}</span>
                          {m.createdByName && <span> · 👤 {m.createdByName}</span>}
                          <span> · {new Date(m.createdAt).toLocaleDateString("es-BO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {m.notes && <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2, fontStyle: "italic" }}>💬 {m.notes}</div>}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: isIncome ? "#10b981" : "#ef4444", flexShrink: 0 }}>{isIncome ? "+" : "-"} {fmtBs(m.amount)}</div>
                      <button onClick={() => deleteMovement(m.id)} style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer", fontSize: 14 }} title="Eliminar">🗑️</button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL NUEVO MOVIMIENTO */}
      {showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(26,29,46,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "var(--bg-card)", borderRadius: 12, border: "1.5px solid #cbd5e8", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1.5px solid #cbd5e8", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>💵 Nuevo movimiento</h3>
              <button onClick={() => setShowForm(false)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-tertiary)", color: "var(--text-muted)", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Tipo */}
              <div>
                <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" }}>Tipo</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setFormType("income"); setFormCat("ventas"); }} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: `2px solid ${formType === "income" ? "#10b981" : "var(--border)"}`, background: formType === "income" ? "rgba(16,185,129,0.08)" : "transparent", color: formType === "income" ? "#10b981" : "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>↑ Ingreso</button>
                  <button onClick={() => { setFormType("expense"); setFormCat("repuestos"); }} style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: `2px solid ${formType === "expense" ? "#ef4444" : "var(--border)"}`, background: formType === "expense" ? "rgba(239,68,68,0.08)" : "transparent", color: formType === "expense" ? "#ef4444" : "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>↓ Egreso</button>
                </div>
              </div>
              {/* Categoría */}
              <div>
                <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" }}>Categoría</label>
                <select value={formCat} onChange={(e) => setFormCat(e.target.value)} style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }}>
                  {CATEGORIES.filter(c => c.type === formType || c.type === "both").map(c => <option key={c.value} value={c.value} style={{ background: "#ffffff" }}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              {/* Monto */}
              <div>
                <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" }}>Monto (Bs.)</label>
                <input type="number" step="0.01" min="0" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" style={{ width: "100%", padding: "12px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 18, fontWeight: 700, fontFamily: "monospace" }} />
              </div>
              {/* Descripción */}
              <div>
                <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" }}>Descripción</label>
                <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Ej: Compra de RAM DDR4 8GB" style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 13 }} />
              </div>
              {/* Notas opcionales */}
              <div>
                <label style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: 6, display: "block" }}>Notas (opcional)</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Detalles adicionales..." rows={2} style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12, resize: "vertical" }} />
              </div>
              {/* Botones */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: 11, background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontWeight: 700, cursor: "pointer" }}>Cancelar</button>
                <button onClick={submitMovement} disabled={saving} style={{ flex: 2, padding: 11, background: `linear-gradient(135deg, ${formType === "income" ? "#10b981, #059669" : "#ef4444, #b91c1c"})`, border: "none", borderRadius: 10, color: "#fff", fontWeight: 800, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Guardando..." : "💾 Guardar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
