"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", diagnosed: "Diagnosticado", waiting_parts: "Esperando Repuestos",
  in_progress: "En Progreso", completed: "Completado", delivered: "Entregado",
};

export default function MonthlyReportPage() {
  const params = useParams<{ year: string; month: string }>();
  const search = useSearchParams();
  const branchId = search.get("branchId");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("RepairTrackQR");

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d?.companyName) setCompanyName(d.companyName).catch(() => {}); }).catch(() => {});

    const url = `/api/reports/monthly?year=${params.year}&month=${params.month}${branchId ? `&branchId=${branchId}` : ""}`;
    apiFetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [params, branchId]);

  useEffect(() => {
    // Auto-imprimir al cargar
    if (data) setTimeout(() => window.print(), 500);
  }, [data]);

  const fmtBs = (n: number) => `Bs. ${(n || 0).toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit" });

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Cargando reporte...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>Error al cargar el reporte</div>;

  return (
    <div style={{ background: "#fff", minHeight: "100vh", color: "#000", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print { .no-print { display: none !important; } body { background: #fff; } }
        .report-table { width: 100%; border-collapse: collapse; font-size: 10px; }
        .report-table th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-weight: 700; border: 1px solid #cbd5e1; }
        .report-table td { padding: 6px 8px; border: 1px solid #e2e8f0; }
        .report-table tr:nth-child(even) td { background: #fafbfc; }
      `}</style>

      <div className="no-print" style={{ padding: 16, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>Reporte mensual — se imprimirá automáticamente</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: "8px 16px", background: "#1ab8c4", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir / Guardar PDF</button>
          <button onClick={() => window.close()} style={{ padding: "8px 16px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "3px solid #1ab8c4", paddingBottom: 14, marginBottom: 18 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1ab8c4", margin: 0 }}>{companyName}</h1>
            <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0" }}>{data.branchName}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.8px" }}>Reporte Mensual</div>
            <div style={{ fontSize: 17, fontWeight: 800, textTransform: "capitalize" }}>{data.period.label}</div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Generado: {new Date().toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          </div>
        </div>

        {/* Resumen */}
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>📊 Resumen Ejecutivo</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {[
              { label: "OTs creadas", value: data.summary.totalRepairs, color: "#1ab8c4" },
              { label: "OTs entregadas", value: data.summary.deliveredCount, color: "#10b981" },
              { label: "Ventas", value: data.summary.salesCount, color: "#a855f7" },
              { label: "Cotizaciones", value: data.summary.quotationsCount, color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} style={{ padding: "10px 12px", border: `1px solid ${s.color}30`, borderLeft: `3px solid ${s.color}`, borderRadius: 6, background: `${s.color}08` }}>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, padding: "12px 14px", background: "#ecfdf5", borderRadius: 8, border: "1px solid #10b98140", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px" }}>💰 Ingresos Totales del Mes</div>
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>Reparaciones entregadas: {fmtBs(data.summary.repairIncome)} + Ventas: {fmtBs(data.summary.salesIncome)}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#059669" }}>{fmtBs(data.summary.totalIncome)}</div>
          </div>
        </div>

        {/* Por estado */}
        {Object.keys(data.summary.byStatus).length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>📋 OTs por Estado</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.entries(data.summary.byStatus).map(([k, v]: [string, any]) => (
                <span key={k} style={{ padding: "5px 12px", background: "#f1f5f9", borderRadius: 6, fontSize: 10, fontWeight: 600, color: "#334155" }}>
                  {STATUS_LABELS[k] || k}: <strong>{v}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Por técnico */}
        {data.byTechnician.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>👷 Desglose por Técnico (OTs entregadas)</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Técnico</th>
                  <th style={{ width: 80, textAlign: "center" }}>OTs</th>
                  <th style={{ width: 120, textAlign: "right" }}>Ingresos Generados</th>
                </tr>
              </thead>
              <tbody>
                {data.byTechnician.map((t: any, i: number) => (
                  <tr key={t.id}>
                    <td>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</td>
                    <td><strong>{t.name}</strong></td>
                    <td style={{ textAlign: "center" }}>{t.count}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#059669" }}>{fmtBs(t.income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detalle OTs */}
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>📑 Detalle de Órdenes de Trabajo</h2>
          {data.repairs.length === 0 ? (
            <p style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>No hay órdenes en este período</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Código</th>
                  <th style={{ width: 55 }}>Fecha</th>
                  <th>Cliente</th>
                  <th>Equipo</th>
                  <th style={{ width: 80 }}>Técnico</th>
                  <th style={{ width: 75 }}>Estado</th>
                  <th style={{ width: 80, textAlign: "right" }}>Costo</th>
                </tr>
              </thead>
              <tbody>
                {data.repairs.map((r: any) => (
                  <tr key={r.code}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.code}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td>{r.clientName || "—"}</td>
                    <td>{r.device || "—"}</td>
                    <td style={{ fontSize: 9 }}>{r.technicianName || "—"}</td>
                    <td style={{ fontSize: 9 }}>{STATUS_LABELS[r.status] || r.status}</td>
                    <td style={{ textAlign: "right", fontWeight: r.status === "delivered" ? 700 : 400, color: r.status === "delivered" ? "#059669" : "#64748b" }}>{fmtBs(r.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cotizaciones/Ventas */}
        {data.quotations.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 12, fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>🧾 Cotizaciones y Notas de Venta</h2>
            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Código</th>
                  <th style={{ width: 55 }}>Fecha</th>
                  <th style={{ width: 70 }}>Tipo</th>
                  <th>Cliente</th>
                  <th style={{ width: 100, textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.quotations.map((q: any) => (
                  <tr key={q.code}>
                    <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{q.code}</td>
                    <td>{fmtDate(q.createdAt)}</td>
                    <td style={{ color: q.type === "sale" ? "#a855f7" : "#f59e0b", fontWeight: 700, fontSize: 9 }}>{q.type === "sale" ? "NV" : "COT"}</td>
                    <td>{q.clientName || "—"}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: q.type === "sale" ? "#a855f7" : "#334155" }}>{fmtBs(q.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 10, borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: 9, color: "#94a3b8" }}>
          {companyName} · Reporte generado el {new Date().toLocaleString("es-BO")} · Sistema RepairTrackQR
        </div>
      </div>
    </div>
  );
}
