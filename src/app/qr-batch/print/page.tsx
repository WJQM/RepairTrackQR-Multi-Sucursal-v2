"use client";
import { useEffect, useState } from "react";

// Tamaños (en mm aproximados, convertidos a columnas)
const SIZE_CONFIG = {
  S: { cols: 4, rows: 6, perPage: 24, qrSize: 90, fontSize: 8, padding: 6 },
  M: { cols: 3, rows: 4, perPage: 12, qrSize: 140, fontSize: 10, padding: 8 },
  L: { cols: 2, rows: 3, perPage: 6, qrSize: 200, fontSize: 12, padding: 12 },
};

export default function QrBatchPrintPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("qrBatchData");
    if (stored) {
      try { setData(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    if (data && data.items?.length > 0) {
      // Esperar a que los QRs se generen antes de imprimir
      setTimeout(() => window.print(), 1200);
    }
  }, [data]);

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: "center", background: "#fff", color: "#000", minHeight: "100vh" }}>
        <h2>No hay datos para imprimir</h2>
        <p>Vuelve a la página anterior y selecciona items.</p>
      </div>
    );
  }

  const config = SIZE_CONFIG[data.size as "S" | "M" | "L"] || SIZE_CONFIG.M;
  const pages: any[][] = [];
  for (let i = 0; i < data.items.length; i += config.perPage) {
    pages.push(data.items.slice(i, i + config.perPage));
  }

  return (
    <div style={{ background: "#fff", color: "#000", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
          .qr-page { page-break-after: always; }
          .qr-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .qr-page { margin: 20px auto; padding: 12mm; border: 1px dashed #ccc; }
        }
      `}</style>

      <div className="no-print" style={{ padding: 16, background: "#f1f5f9", borderBottom: "1px solid #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 13, color: "#334155" }}>
          <strong>{data.items.length}</strong> stickers · tamaño {data.size} · {pages.length} página{pages.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{ padding: "8px 18px", background: "#1ab8c4", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>🖨️ Imprimir</button>
          <button onClick={() => window.close()} style={{ padding: "8px 16px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, fontWeight: 600, cursor: "pointer" }}>Cerrar</button>
        </div>
      </div>

      {pages.map((pageItems, pageIdx) => (
        <div key={pageIdx} className="qr-page" style={{ width: "210mm", minHeight: "297mm", background: "#fff", boxSizing: "border-box", display: "grid", gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridAutoRows: "min-content", gap: `${config.padding}px`, padding: "12mm" }}>
          {pageItems.map((item: any) => (
            <QrSticker key={item.id} item={item} config={config} showLogo={data.showLogo} companyName={data.companyName} logo={data.logo} />
          ))}
        </div>
      ))}
    </div>
  );
}

function QrSticker({ item, config, showLogo, companyName, logo }: any) {
  const [qrSrc, setQrSrc] = useState<string>("");

  useEffect(() => {
    // Generar QR usando api.qrserver.com (no requiere lib)
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${config.qrSize * 3}x${config.qrSize * 3}&data=${encodeURIComponent(item.qrUrl)}&margin=0`;
    setQrSrc(url);
  }, [item.qrUrl, config.qrSize]);

  return (
    <div style={{
      border: "1px solid #cbd5e1", borderRadius: 8,
      padding: config.padding, display: "flex", flexDirection: "column",
      alignItems: "center", gap: 4, breakInside: "avoid",
      background: "#fff",
    }}>
      {showLogo && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: config.fontSize - 1, fontWeight: 700, color: "#1ab8c4", marginBottom: 2 }}>
          {logo ? <img src={logo} style={{ width: 12, height: 12, borderRadius: 3 }} /> : <span>🔧</span>}
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{companyName}</span>
        </div>
      )}
      {qrSrc && <img src={qrSrc} style={{ width: config.qrSize, height: config.qrSize, display: "block" }} alt={item.name} />}
      <div style={{ fontSize: config.fontSize, fontWeight: 700, textAlign: "center", lineHeight: 1.2, maxWidth: "100%", wordBreak: "break-word" }}>
        {item.name}
      </div>
      {item.code && <div style={{ fontSize: config.fontSize - 2, fontFamily: "monospace", color: "#1ab8c4", fontWeight: 700 }}>{item.code}</div>}
      {item.price !== undefined && item.price > 0 && (
        <div style={{ fontSize: config.fontSize, fontWeight: 800, color: "#10b981" }}>Bs. {item.price}</div>
      )}
    </div>
  );
}
