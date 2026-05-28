"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setActiveBranchId } from "@/lib/api";
import { AppSidebar } from "@/components/AppSidebar";

type Kind = "inventory" | "consoles" | "equipment" | "software" | "videogames";

interface Item {
  id: string;
  code?: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  price?: number;
  image?: string | null;
  kind: Kind;
  qrUrl: string;
  subtitle?: string;
}

const KIND_LABEL: Record<Kind, { label: string; icon: string; color: string; prefix: string }> = {
  inventory: { label: "Productos", icon: "📦", color: "#a855f7", prefix: "INV" },
  consoles: { label: "Consolas", icon: "🕹️", color: "#f97316", prefix: "CN" },
  equipment: { label: "Equipos", icon: "💻", color: "#0891b2", prefix: "EQ" },
  software: { label: "Programas", icon: "💿", color: "#8b5cf6", prefix: "SW" },
  videogames: { label: "Videojuegos", icon: "🎮", color: "#ef4444", prefix: "VG" },
};

export default function QrBatchPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  const [kind, setKind] = useState<Kind>("inventory");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [size, setSize] = useState<"S" | "M" | "L">("M");
  const [showLogo, setShowLogo] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token"); const userData = sessionStorage.getItem("user");
    if (!token || !userData) { router.push("/"); return; }
    const u = (() => { try { return JSON.parse(userData); } catch { return null; } })(); setUser(u);
    if (u.role === "tech") { router.push("/asignaciones"); return; }
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }).catch(() => {}); }).catch(() => {});
    if (u.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => { if (Array.isArray(b)) { setBranches(b); const ab = sessionStorage.getItem("activeBranchId"); if (ab) setActiveBranch(ab); else if (b.length) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); } } }).catch(() => {});
    } else { setActiveBranch(u.branchId || ""); }
  }, []);

  useEffect(() => {
    load();
    setSelected({});
  }, [kind]);

  const load = async () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const res = await apiFetch(`/api/${kind}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.items || data.results || []);
        const mapped: Item[] = list.map((it: any) => {
          let qrUrl = "";
          let subtitle = "";
          if (kind === "inventory") { qrUrl = `${origin}/portal?branchId=${activeBranch}`; subtitle = `Stock: ${it.quantity || 0} · Bs. ${it.price || 0}`; }
          else if (kind === "consoles") { qrUrl = `${origin}/consoles/print/${it.id}`; subtitle = `${it.code || ""} · Bs. ${it.price || 0}`; }
          else if (kind === "equipment") { qrUrl = `${origin}/equipment/print/${it.id}`; subtitle = `${it.code || ""} · Bs. ${it.price || 0}`; }
          else if (kind === "software") { qrUrl = `${origin}/portal?sw=${it.id}`; subtitle = it.category || ""; }
          else if (kind === "videogames") { qrUrl = `${origin}/portal?vg=${it.id}`; subtitle = it.platform || ""; }
          return { id: it.id, code: it.code, name: it.name, brand: it.brand, model: it.model, price: it.price, image: it.image, kind, qrUrl, subtitle };
        });
        setItems(mapped);
      }
    } catch {}
    setLoading(false);
  };

  const toggleAll = () => {
    const allSelected = filteredItems.every(i => selected[i.id]);
    const next: Record<string, boolean> = { ...selected };
    filteredItems.forEach(i => { next[i.id] = !allSelected; });
    setSelected(next);
  };

  const filteredItems = items.filter(i => !search.trim() || i.name.toLowerCase().includes(search.toLowerCase()) || (i.code || "").toLowerCase().includes(search.toLowerCase()) || (i.brand || "").toLowerCase().includes(search.toLowerCase()));
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectedItems = items.filter(i => selected[i.id]);

  const print = () => {
    if (selectedCount === 0) return;
    // Guardar datos en sessionStorage para la vista de impresión
    const data = {
      items: selectedItems,
      size, showLogo,
      companyName: settings.companyName,
      logo: settings.logo,
      kind,
    };
    sessionStorage.setItem("qrBatchData", JSON.stringify(data));
    window.open("/qr-batch/print", "_blank");
  };

  if (!user) return null;

  const meta = KIND_LABEL[kind];

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
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>🏷️ Imprimir QR múltiples</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Selecciona items y genera una hoja A4 con stickers QR listos para imprimir</p>
        </div>

        {/* Selector tipo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {(Object.keys(KIND_LABEL) as Kind[]).map(k => {
            const m = KIND_LABEL[k];
            const active = kind === k;
            return (
              <button key={k} onClick={() => setKind(k)} style={{ padding: "8px 14px", borderRadius: 10, cursor: "pointer", background: active ? `${m.color}15` : "var(--bg-card)", border: `1px solid ${active ? m.color + "40" : "var(--border)"}`, color: active ? m.color : "var(--text-muted)", fontSize: 12, fontWeight: 700 }}>
                {m.icon} {m.label}
              </button>
            );
          })}
        </div>

        {/* Controles */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar..." style={{ flex: 1, minWidth: 200, padding: "9px 14px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-primary)", fontSize: 12 }} />
          <button onClick={toggleAll} style={{ padding: "9px 16px", background: "var(--bg-tertiary)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {filteredItems.every(i => selected[i.id]) ? "☒ Deseleccionar todos" : "☐ Seleccionar todos"}
          </button>
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--bg-tertiary)", borderRadius: 8, border: "1px solid var(--border)" }}>
            {(["S", "M", "L"] as const).map(s => (
              <button key={s} onClick={() => setSize(s)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: size === s ? "#1ab8c4" : "transparent", color: size === s ? "#fff" : "var(--text-muted)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{s}</button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={showLogo} onChange={e => setShowLogo(e.target.checked)} />
            Logo empresa
          </label>
        </div>

        {/* Botón imprimir */}
        <div style={{ position: "sticky", top: 8, zIndex: 10, marginBottom: 16, padding: "12px 16px", background: selectedCount > 0 ? "rgba(26,184,196,0.05)" : "var(--bg-card)", border: `1px solid ${selectedCount > 0 ? "rgba(26,184,196,0.14)" : "var(--border)"}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 13 }}>
            <strong style={{ color: selectedCount > 0 ? "#2dd4df" : "var(--text-muted)" }}>{selectedCount}</strong> items seleccionados
            {selectedCount > 0 && <span style={{ color: "var(--text-muted)", marginLeft: 8, fontSize: 11 }}>· ≈ {Math.ceil(selectedCount / (size === "S" ? 24 : size === "M" ? 12 : 6))} página{Math.ceil(selectedCount / (size === "S" ? 24 : size === "M" ? 12 : 6)) !== 1 ? "s" : ""}</span>}
          </div>
          <button onClick={print} disabled={selectedCount === 0} style={{ padding: "10px 22px", background: selectedCount > 0 ? "linear-gradient(135deg,#1ab8c4,#8b5cf6)" : "var(--bg-tertiary)", border: "none", borderRadius: 10, color: selectedCount > 0 ? "#fff" : "var(--text-muted)", fontSize: 13, fontWeight: 800, cursor: selectedCount > 0 ? "pointer" : "not-allowed", opacity: selectedCount > 0 ? 1 : 0.5 }}>🖨️ Imprimir hoja A4</button>
        </div>

        {/* Grid de items */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>Cargando {meta.label.toLowerCase()}...</div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)", fontSize: 13 }}>No hay {meta.label.toLowerCase()} disponibles</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {(filteredItems || []).map(it => {
              const isSel = !!selected[it.id];
              return (
                <div key={it.id} onClick={() => setSelected(s => ({ ...s, [it.id]: !s[it.id] }))} style={{ padding: 10, background: "var(--bg-card)", border: `2px solid ${isSel ? meta.color : "var(--border)"}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${isSel ? meta.color : "var(--border)"}`, background: isSel ? meta.color : "transparent", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{isSel ? "✓" : ""}</div>
                  {it.image ? <img src={it.image} style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--bg-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{meta.icon}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                    {it.subtitle && <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{it.subtitle}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
