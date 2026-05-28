"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PortalTracker } from "@/components/PortalTracker";

interface Certificate {
  id: string; code: string; clientName: string; computerName: string | null;
  windowsEdition: string | null; windowsSerial: string | null;
  officeEdition: string | null; officeSerial: string | null;
  date: string; technician: string; notes: string | null;
  createdAt: string; branch?: { id: string; name: string };
}

export default function CertificateViewPage() {
  const params = useParams();
  const code = params.code as string;
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiple, setMultiple] = useState<Certificate[]>([]);
  const [settings, setSettings] = useState<{ companyName: string; slogan: string; logo: string | null; phone: string | null; address: string | null; website: string | null }>({ companyName: "RepairTrackQR", slogan: "Servicio Técnico Especializado", logo: null, phone: null, address: null, website: null });

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings(d).catch(() => {}); }).catch(() => {});
    if (!code) return;
    const branchId = new URLSearchParams(window.location.search).get("branchId");
    const url = branchId ? `/api/certificates?code=${code}&branchId=${branchId}` : `/api/certificates?code=${code}`;
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.multiple) { setMultiple(d.certificates); }
        else if (d && d.id) { setCert(d); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  const handlePrint = () => window.print();

  if (loading) return <div style={{ padding: 60, textAlign: "center", fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 16, color: "#1e3a5f" }}>Cargando certificado...</div>;

  // Branch picker when multiple matches
  if (multiple.length > 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', Arial, sans-serif", background: "#f0f4f8", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 500, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e3a5f", marginBottom: 8 }}>{code}</h2>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Este certificado existe en varias sucursales. Selecciona cuál deseas ver:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(multiple || []).map(c => (
              <a key={c.id} href={`/certificate-view/${code}?branchId=${c.branch?.id}`} style={{ padding: "14px 20px", background: "#f0f4ff", border: "2px solid #fde68a", borderRadius: 12, textDecoration: "none", color: "#1e3a5f", fontWeight: 600, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}
                onMouseOver={(e) => { (e.target as any).style.background = "#e0e7ff"; }}
                onMouseOut={(e) => { (e.target as any).style.background = "#f0f4ff"; }}>
                <span>🏢 {c.branch?.name || "Sucursal"}</span>
                <span style={{ fontSize: 12, color: "#1ab8c4" }}>{c.clientName} →</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cert) return <div style={{ padding: 60, textAlign: "center", fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 16, color: "#e44" }}>Certificado no encontrado: {code}</div>;

  const dateStr = new Date(cert.date + "T12:00:00").toLocaleDateString("es-BO", { year: "numeric", month: "long", day: "numeric" });
  const contactInfo = [settings.phone, settings.website, settings.address].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "#f0f4f8", minHeight: "100vh", padding: "20px 16px" }}>
      <PortalTracker />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap');
        @media print { .no-print { display: none !important; } body { background: #fff !important; } .cert-wrapper { padding: 0 !important; } }
        @media (max-width: 768px) {
          .cert-wrapper { padding: 16px 12px !important; }
          .cert-wrapper > div { padding: 20px 16px !important; }
          .cert-actions { flex-direction: column !important; }
          .cert-actions button { width: 100% !important; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print cert-actions" style={{ maxWidth: "7.5in", margin: "0 auto 16px", display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <button onClick={handlePrint} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #1ab8c4, #149aa5)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(26,184,196,0.14)" }}>🖨️ Imprimir</button>
        <button onClick={() => window.close()} style={{ padding: "10px 22px", borderRadius: 10, border: "2px solid #cbd5e1", background: "#fff", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✕ Cerrar</button>
      </div>

      {/* Certificate */}
      <div className="cert-wrapper" style={{ maxWidth: "7.5in", margin: "0 auto", padding: "40px 38px", border: "3px solid #1e3a5f", position: "relative", background: "#fff", borderRadius: 4, fontFamily: "'Source Sans 3', 'Segoe UI', sans-serif", color: "#1a1a2e" }}>
        <div style={{ position: "absolute", inset: 6, border: "1px solid #b0c4de", pointerEvents: "none", borderRadius: 2 }} />
        <div style={{ position: "absolute", top: 14, left: 14, width: 32, height: 32, borderTop: "2px solid #1e3a5f", borderLeft: "2px solid #1e3a5f" }} />
        <div style={{ position: "absolute", top: 14, right: 14, width: 32, height: 32, borderTop: "2px solid #1e3a5f", borderRight: "2px solid #1e3a5f" }} />
        <div style={{ position: "absolute", bottom: 14, left: 14, width: 32, height: 32, borderBottom: "2px solid #1e3a5f", borderLeft: "2px solid #1e3a5f" }} />
        <div style={{ position: "absolute", bottom: 14, right: 14, width: 32, height: 32, borderBottom: "2px solid #1e3a5f", borderRight: "2px solid #1e3a5f" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-30deg)", fontFamily: "'Playfair Display', serif", fontSize: 100, fontWeight: 700, color: "rgba(30,58,95,0.03)", pointerEvents: "none", whiteSpace: "nowrap", letterSpacing: 10 }}>AUTÉNTICO</div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 22, paddingBottom: 18, borderBottom: "2px solid #e2e8f0" }}>
          {settings.logo && <img src={settings.logo} alt="Logo" style={{ height: 40, objectFit: "contain", marginBottom: 6 }} />}
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1e3a5f" }}>{settings.companyName}</div>
          {settings.slogan && <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 2, marginBottom: 4 }}>{settings.slogan}</div>}
          <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 8px" }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 4L6 12v12c0 11.1 7.68 21.48 18 24 10.32-2.52 18-12.9 18-24V12L24 4z" fill="url(#sg2)" stroke="#1e3a5f" strokeWidth="1.5"/><path d="M20 24l4 4 8-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><defs><linearGradient id="sg2" x1="6" y1="4" x2="42" y2="40"><stop offset="0%" stopColor="#1e3a5f"/><stop offset="100%" stopColor="#2563eb"/></linearGradient></defs></svg>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#1e3a5f", letterSpacing: 3, textTransform: "uppercase", margin: "4px 0" }}>Certificado de Autenticidad</h1>
          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "#1e3a5f", background: "#e8f0fe", border: "1px solid #b0c4de", borderRadius: 6, padding: "3px 12px", letterSpacing: 1.5, marginTop: 4 }}>{cert.code}</div>
          {cert.branch && <div style={{ fontSize: 10, color: "#1ab8c4", marginTop: 4, fontWeight: 600 }}>🏢 {cert.branch.name}</div>}
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>{contactInfo}</div>
        </div>

        {/* Client Info */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>Información del Equipo</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
            <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Cliente</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{cert.clientName}</div></div>
            {cert.computerName && <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Equipo</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{cert.computerName}</div></div>}
            <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Fecha de Emisión</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{dateStr}</div></div>
            {cert.technician && <div style={{ padding: "5px 0" }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Técnico Responsable</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{cert.technician}</div></div>}
          </div>
        </div>

        {/* Windows */}
        {cert.windowsSerial && <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="2" y="2" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="15" y="2" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="2" y="15" width="11" height="11" rx="1.5" fill="#0078D4"/><rect x="15" y="15" width="11" height="11" rx="1.5" fill="#0078D4"/></svg>
            Licencia de Windows</h3>
          <div style={{ padding: "5px 0", marginBottom: 6 }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Edición</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{cert.windowsEdition}</div></div>
          <div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Clave de Producto</div><div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "#1e3a5f", textAlign: "center", marginTop: 4 }}>{cert.windowsSerial}</div></div>
        </div>}

        {/* Office */}
        {cert.officeSerial && <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 28 28" fill="none"><rect x="3" y="3" width="22" height="22" rx="4" fill="#D83B01"/><text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="serif">O</text></svg>
            Licencia de Microsoft Office</h3>
          <div style={{ padding: "5px 0", marginBottom: 6 }}><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Edición</div><div style={{ fontSize: 14, fontWeight: 500, marginTop: 1 }}>{cert.officeEdition}</div></div>
          <div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8", fontWeight: 500 }}>Clave de Producto</div><div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 6, padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 16, fontWeight: 600, letterSpacing: 2, color: "#1e3a5f", textAlign: "center", marginTop: 4 }}>{cert.officeSerial}</div></div>
        </div>}

        {/* Notes */}
        {cert.notes && <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" }}>Observaciones</h3>
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px", fontSize: 13, color: "#475569" }}>{cert.notes}</div>
        </div>}

        {/* Footer */}
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: "2px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ textAlign: "center", width: 220 }}><div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 4 }} /><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8" }}>Firma del Técnico</div></div>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "conic-gradient(from 180deg, #00bfff, #149aa5, #ec4899, #f59e0b, #10b981, #00bfff)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}><div style={{ width: 60, height: 60, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display', serif", fontSize: 10, fontWeight: 700, color: "#1e3a5f", textAlign: "center", lineHeight: 1.2 }}>SELLO DE<br/>GARANTÍA</div></div>
          <div style={{ textAlign: "center", width: 220 }}><div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 4 }} /><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: "#94a3b8" }}>Firma del Cliente</div></div>
        </div>
        <p style={{ textAlign: "center", fontSize: 9, color: "#94a3b8", marginTop: 14, lineHeight: 1.5 }}>Este certificado garantiza que las licencias de software indicadas son productos originales y legítimos.<br/>El uso de las claves de producto está sujeto a los términos y condiciones de Microsoft Corporation.</p>
      </div>
    </div>
  );
}
