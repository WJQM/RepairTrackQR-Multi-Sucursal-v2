"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface InventoryItem { id: string; name: string; category: string | null; quantity: number; price: number; minStock: number; image: string | null; }

export default function InventoryPrintPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");
  const [branchName, setBranchName] = useState("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null; phone: string | null; email: string | null; address: string | null }>({ companyName: "RepairTrackQR", logo: null, phone: null, email: null, address: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {});
    apiFetch("/api/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); setLoading(false); }).catch(() => setLoading(false));
    // Get branch name
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

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))] as string[];
  const filtered = items.filter(i => {
    if (filterCat !== "all" && i.category !== filterCat) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !(i.category || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalItems = filtered.length;
  const totalUnits = filtered.reduce((s, i) => s + i.quantity, 0);
  const totalValue = filtered.reduce((s, i) => s + (i.price * i.quantity), 0);
  const lowStock = filtered.filter(i => i.quantity <= i.minStock).length;
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

      {/* BARRA DE ACCIONES */}
      <div className="no-print" style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "12px 24px", background: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 100 }}>
        <span style={{ color: "#eee", fontSize: 14, fontWeight: 600 }}>📦 Extracto de Inventario</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ padding: "7px 12px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, outline: "none", width: 180 }} />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ padding: "7px 10px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#eee", fontSize: 12, cursor: "pointer", outline: "none" }}>
            <option value="all">Todas</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => window.print()} style={{ padding: "7px 18px", background: "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "7px 14px", background: "#e8ebf2", border: "1px solid #333", borderRadius: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      <div className="print-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "70px 30px 40px" }}>

        {/* HEADER */}
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
              <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>📦 EXTRACTO DE INVENTARIO</span>
            </div>
            <p style={{ fontSize: 10, color: "#888", marginTop: 4 }}>{today}</p>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Productos", value: totalItems, color: "#3b82f6", icon: "📦" },
            { label: "Unidades", value: totalUnits, color: "#10b981", icon: "🔢" },
            { label: "Valor Total", value: `Bs. ${totalValue}`, color: "#f59e0b", icon: "💰" },
            { label: "Stock Bajo", value: lowStock, color: "#ef4444", icon: "⚠️" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "14px 18px", background: `${s.color}08`, borderRadius: 10, border: `1.5px solid ${s.color}25`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -6, right: -6, fontSize: 36, opacity: 0.08 }}>{s.icon}</div>
              <div style={{ fontSize: 9, color: s.color, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.8px" }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* TABLA */}
        <div style={{ border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}>
          <table>
            <thead>
              <tr style={{ background: "#f0f4ff" }}>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 40 }}>#</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd" }}>Producto</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 110 }}>Categoría</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 70 }}>Stock</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 70 }}>Mín.</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 90 }}>Precio</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 100 }}>Valor Stock</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#555", textTransform: "uppercase", borderBottom: "2px solid #d0d5dd", width: 50 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const isLow = item.quantity <= item.minStock;

                return (
                  
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#888", textAlign: "center" }}>{idx + 1}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: "#555" }}>{item.category || "—"}</td>
                      <td style={{ padding: "10px 14px", fontSize: 14, fontWeight: 800, textAlign: "center", color: isLow ? "#ef4444" : "#10b981" }}>{item.quantity}</td>
                      <td style={{ padding: "10px 14px", fontSize: 11, textAlign: "center", color: "#888" }}>{item.minStock}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{Math.round(item.price || 0).toLocaleString()}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }}>{(item.price * item.quantity)}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        {isLow ? (
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 8, fontWeight: 700, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca" }}>BAJO</span>
                        ) : (
                          <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 8, fontWeight: 700, color: "#10b981", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>OK</span>
                        )}
                      </td>
                    </tr>


                );
              })}
            </tbody>
          </table>

          {/* TOTALES */}
          <div style={{ padding: "14px 16px", borderTop: "2px solid #d0d5dd", background: "#f0f4ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<span></span>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 11, color: "#888", marginRight: 10 }}>VALOR TOTAL INVENTARIO</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>Bs. {totalValue}</span>
            </div>
          </div>
        </div>

        {/* RESUMEN POR CATEGORÍA */}
        {categories.length > 0 && (
          <div style={{ marginTop: 20, border: "1px solid #e2e2e2", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ background: "#f8f8fc", padding: "10px 16px", borderBottom: "1px solid #e2e2e2" }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase" }}>📊 Resumen por Categoría</h3>
            </div>
            <table>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <th style={{ padding: "8px 14px", textAlign: "left", fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Categoría</th>
                  <th style={{ padding: "8px 14px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Productos</th>
                  <th style={{ padding: "8px 14px", textAlign: "center", fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Unidades</th>
                  <th style={{ padding: "8px 14px", textAlign: "right", fontSize: 9, fontWeight: 700, color: "#888", textTransform: "uppercase", borderBottom: "1px solid #e5e7eb" }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const catItems = filtered.filter(i => i.category === cat);
                  const catUnits = catItems.reduce((s, i) => s + i.quantity, 0);
                  const catValue = catItems.reduce((s, i) => s + (i.price * i.quantity), 0);
                  return (
                    <tr key={cat} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 600, borderBottom: "1px solid #f0f0f0" }}>🏷️ {cat}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>{catItems.length}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, textAlign: "center", color: "#10b981", borderBottom: "1px solid #f0f0f0" }}>{catUnits}</td>
                      <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700, textAlign: "right", color: "#3b82f6", fontFamily: "monospace", borderBottom: "1px solid #f0f0f0" }}>Bs. {catValue}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PIE */}
        <div style={{ textAlign: "center", paddingTop: 16, marginTop: 20, borderTop: "1px solid #e2e2e2" }}>
          <p style={{ fontSize: 10, color: "#999" }}>{settings.companyName} — Extracto de Inventario — {today}</p>
        </div>
      </div>
    </div>
  );
}
