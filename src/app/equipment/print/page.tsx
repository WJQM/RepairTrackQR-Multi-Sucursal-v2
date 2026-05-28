"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface Equipment { id: string; code: string; name: string; type: string; brand: string | null; model: string | null; processor: string | null; ram: string | null; storage: string | null; storage2: string | null; screenSize: string | null; graphicsCard: string | null; os: string | null; cabinet: string | null; powerSupply: string | null; accessories: string | null; condition: string; price: number; notes: string | null; image: string | null; createdAt: string; }

function getDisplayName(eq: Equipment): string {
  return [eq.type === "laptop" ? "Laptop" : "PC Escritorio", eq.brand, eq.model].filter(Boolean).join(" ");
}

const condLabel: Record<string, { label: string; color: string }> = {
  disponible: { label: "DISPONIBLE", color: "#10b981" },
  vendido: { label: "VENDIDO", color: "#1ab8c4" },
  en_reparacion: { label: "EN REPARACIÓN", color: "#f59e0b" },
};

export default function EquipmentPrintPage() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterCond, setFilterCond] = useState("all");
  const [search, setSearch] = useState("");
  const [branchName, setBranchName] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null; phone: string | null; email: string | null; address: string | null }>({ companyName: "RepairTrackQR", logo: null, phone: null, email: null, address: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {});
    apiFetch("/api/equipment").then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); setLoading(false); }).catch(() => setLoading(false));
    try {
      const user = ((() => { try { return JSON.parse(sessionStorage.getItem("user") || "{}"); } catch { return {}; } })());
      if (user.branchName) setBranchName(user.branchName);
      else if (user.role === "superadmin") {
        apiFetch("/api/branches").then(r => r.json()).then(branches => {
          const abId = sessionStorage.getItem("activeBranchId");
          const ab = branches.find((b: any) => b.id === abId);
          if (ab) setBranchName(ab.name);
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const filtered = items.filter(i => {
    if (filterType !== "all" && i.type !== filterType) return false;
    if (filterCond !== "all" && i.condition !== filterCond) return false;
    if (search && !getDisplayName(i).toLowerCase().includes(search.toLowerCase()) && !(i.processor || "").toLowerCase().includes(search.toLowerCase()) && !(i.code || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, i) => s + i.price, 0);
  const today = new Date().toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "Arial" }}>Cargando...</div>;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", color: "#111" }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #fff; }
        table { width: 100%; border-collapse: collapse; }
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-content { padding-top: 0 !important; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "12px 24px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>💻 Extracto de Equipos</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por EQ-#, nombre, CPU..." style={{ padding: "7px 12px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, outline: "none", width: 220 }} />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: "7px 10px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, cursor: "pointer", outline: "none" }}>
            <option value="all">Todos</option>
            <option value="laptop">Laptops</option>
            <option value="desktop">Escritorio</option>
          </select>
          <select value={filterCond} onChange={e => setFilterCond(e.target.value)} style={{ padding: "7px 10px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, cursor: "pointer", outline: "none" }}>
            <option value="all">Todos estados</option>
            <option value="disponible">Disponible</option>
            <option value="vendido">Vendido</option>
            <option value="en_reparacion">En reparación</option>
          </select>
          <button onClick={() => window.print()} style={{ padding: "7px 18px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 1280, margin: "0 auto", padding: "70px 24px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #3b82f6", paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{settings.companyName}</h1>
            <p style={{ fontSize: 10, color: "#888", marginTop: 3 }}>SERVICIO TÉCNICO ESPECIALIZADO</p>
            {branchName && <p style={{ fontSize: 11, fontWeight: 700, color: "#1ab8c4", marginTop: 4 }}>🏢 {branchName}</p>}
            {(settings.phone || settings.email || settings.address) && (
              <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#888", marginTop: 6, flexWrap: "wrap" }}>
                {settings.phone && <span>📞 {settings.phone}</span>}
                {settings.email && <span>✉️ {settings.email}</span>}
                {settings.address && <span>📍 {settings.address}</span>}
              </div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "inline-block", padding: "6px 16px", background: "#3b82f6", borderRadius: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>💻 EXTRACTO DE EQUIPOS</span>
            </div>
            <p style={{ fontSize: 10, color: "#888", marginTop: 4 }}>{today}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Equipos", value: filtered.length, color: "#3b82f6", icon: "💻" },
            { label: "Laptops", value: filtered.filter(i => i.type === "laptop").length, color: "#8b5cf6", icon: "💻" },
            { label: "Escritorio", value: filtered.filter(i => i.type === "desktop").length, color: "#0891b2", icon: "🖥️" },
            { label: "Valor Total", value: `Bs. ${totalValue}`, color: "#f59e0b", icon: "💰" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "14px 18px", background: `${s.color}08`, borderRadius: 10, border: `1.5px solid ${s.color}25`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -6, right: -6, fontSize: 36, opacity: 0.08 }}>{s.icon}</div>
              <div style={{ fontSize: 9, color: s.color, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px" }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}>
          <table>
            <thead>
              <tr style={{ background: "#f0f4ff" }}>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 30 }}>#</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 65 }}>Código</th>
                <th style={{ padding: "10px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd" }}>Equipo</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 65 }}>Tipo</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 100 }}>CPU</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 60 }}>RAM</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 110 }}>Almacenamiento</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 100 }}>GPU</th>
                <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 85 }}>Pantalla / Gabinete</th>
                <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 80 }}>Precio</th>
                <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 75 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const cond = condLabel[item.condition] || condLabel.disponible;
                const disks = [item.storage, item.storage2].filter(Boolean).join(" + ");
                const extra = item.type === "laptop" ? item.screenSize : item.cabinet;
                return (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 8px", fontSize: 12, color: "#888", textAlign: "center" }}>{idx + 1}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#0891b2", padding: "2px 8px", borderRadius: 4, background: "#0891b210", border: "1px solid #0891b230", fontFamily: "monospace" }}>{item.code || "—"}</span>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{getDisplayName(item)}</div>
                      {item.os && <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>🖥️ {item.os}</div>}
                      {item.accessories && <div style={{ fontSize: 8, color: "#8b5cf6", marginTop: 2 }}>🎒 {item.accessories.length > 40 ? item.accessories.slice(0, 40) + "…" : item.accessories}</div>}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 10, color: "#555", textAlign: "center" }}>{item.type === "laptop" ? "💻 Laptop" : "🖥️ Desktop"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 10 }}>{item.processor || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 10, textAlign: "center", fontWeight: 600 }}>{item.ram || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 10 }}>{disks || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 10 }}>{item.graphicsCard || "—"}</td>
                    <td style={{ padding: "10px 8px", fontSize: 10 }}>
                      {extra ? <>{item.type === "laptop" ? "📐" : "🏗️"} {extra}</> : "—"}
                      {item.powerSupply && <div style={{ fontSize: 8, color: "#888", marginTop: 2 }}>⚡ {item.powerSupply}</div>}
                    </td>
                    <td style={{ padding: "10px 8px", fontSize: 12, textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }}>Bs. {Math.round(item.price || 0).toLocaleString()}</td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 8, fontWeight: 700, color: cond.color, background: `${cond.color}10`, border: `1px solid ${cond.color}30`, whiteSpace: "nowrap" }}>{cond.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: "14px 16px", borderTop: "2px solid #d0d5dd", background: "#f0f4ff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", padding: "4px 10px", borderRadius: 4, background: "#3b82f610", border: "1px solid #3b82f625" }}>
                💻 TOTAL: {filtered.length}
              </span>
              {(() => {
                const dispo = filtered.filter(i => i.condition === "disponible").length;
                const vend = filtered.filter(i => i.condition === "vendido").length;
                const repar = filtered.filter(i => i.condition === "en_reparacion").length;
                const laptops = filtered.filter(i => i.type === "laptop").length;
                const desks = filtered.filter(i => i.type === "desktop").length;
                const avg = filtered.length > 0 ? totalValue / filtered.length : 0;
                return (
                  <>
                    {laptops > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#8b5cf6" }}>💻 {laptops} Laptop{laptops !== 1 ? "s" : ""}</span>}
                    {desks > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#0891b2" }}>🖥️ {desks} Escritorio</span>}
                    <span style={{ height: 14, width: 1, background: "#d0d5dd" }} />
                    {dispo > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981" }}>✅ {dispo} Disponible{dispo !== 1 ? "s" : ""}</span>}
                    {vend > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#1ab8c4" }}>💰 {vend} Vendido{vend !== 1 ? "s" : ""}</span>}
                    {repar > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b" }}>🔧 {repar} En reparación</span>}
                    <span style={{ height: 14, width: 1, background: "#d0d5dd" }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#666" }}>📊 Promedio: Bs. {avg}</span>
                  </>
                );
              })()}
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#888", marginRight: 10 }}>VALOR TOTAL EQUIPOS</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>Bs. {totalValue}</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", paddingTop: 16, marginTop: 20, borderTop: "1px solid #e2e2e2" }}>
          <p style={{ fontSize: 10, color: "#999" }}>{settings.companyName} — Extracto de Equipos — {today}</p>
        </div>
      </div>
    </div>
  );
}
