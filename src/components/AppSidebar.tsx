"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiFetch, setActiveBranchId } from "@/lib/api";

interface Props { user: any; }
interface Branch { id: string; name: string; }

// SVG Icons — clean, professional
const Icons = {
  // Groups
  reception:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  catalog:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  documents:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  finance:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  print:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  admin:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  // Items
  dashboard:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  assignments: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  scanner:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  services:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  inventory:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  equipment:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
  consoles:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="10" r="1" fill="currentColor"/></svg>,
  software:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  videogames:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 12h4M8 10v4M15 12h2M18 12h-2"/><path d="M17 4a7 7 0 0 1 6.93 6H22a2 2 0 0 1 0 4h-1.07A7 7 0 0 1 4.07 14H3a2 2 0 0 1 0-4h1.07A7 7 0 0 1 17 4z"/></svg>,
  quotations:  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
  certificates:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>,
  clients:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  extracto:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  stats:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  cash:        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  qrBatch:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3z"/></svg>,
  report:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  users:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  branches:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  transfer:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  settings:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  logout:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron:     <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  backup:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  import:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  branch:      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="21"/><path d="M5 21c0-4 3-6 7-6s7 2 7 6"/></svg>,
};

const GROUPS = [
  {
    key: "recepcion", label: "Recepción", groupIcon: Icons.reception,
    color: "#2563eb", accentBg: "rgba(96,165,250,0.06)",
    items: [
      { path: "/dashboard",    label: "Panel Principal",  icon: Icons.dashboard,   adminsOnly: true },
      { path: "/asignaciones", label: "Mis Asignaciones", icon: Icons.assignments, techOnly: true },
      { path: "/scanner",      label: "Escáner QR",       icon: Icons.scanner },
    ],
  },
  {
    key: "catalogo", label: "Catálogo", groupIcon: Icons.catalog,
    color: "#1ab8c4", accentBg: "rgba(26,184,196,0.05)",
    adminsOnly: true,
    items: [
      { path: "/services",    label: "Servicios",   icon: Icons.services },
      { path: "/inventory",   label: "Inventario",  icon: Icons.inventory },
      { path: "/equipment",   label: "Equipos",     icon: Icons.equipment },
      { path: "/consoles",    label: "Consolas",    icon: Icons.consoles },
      { path: "/software",    label: "Programas",   icon: Icons.software },
      { path: "/videogames",  label: "Videojuegos", icon: Icons.videogames },
    ],
  },
  {
    key: "documentos", label: "Documentos", groupIcon: Icons.documents,
    color: "#059669", accentBg: "rgba(52,211,153,0.06)",
    adminsOnly: true,
    items: [
      { path: "/quotations",   label: "Cotizaciones", icon: Icons.quotations },
      { path: "/certificates", label: "Certificados", icon: Icons.certificates },
      { path: "/clients",      label: "Clientes",     icon: Icons.clients },
    ],
  },
  {
    key: "finanzas", label: "Finanzas", groupIcon: Icons.finance,
    color: "#16a34a", accentBg: "rgba(34,197,94,0.06)",
    adminsOnly: true,
    items: [
      { path: "/extracto", label: "Extracto",      icon: Icons.extracto },
      // { path: "/stats",    label: "Estadísticas",  icon: Icons.stats },  // deshabilitado para presentación
      // { path: "/cash",     label: "Caja Chica",    icon: Icons.cash },   // deshabilitado para presentación
    ],
  },
  {
    key: "imprimibles", label: "Imprimibles", groupIcon: Icons.print,
    color: "#7c3aed", accentBg: "rgba(167,139,250,0.06)",
    adminsOnly: true,
    items: [
      { path: "/qr-batch",           label: "QR Múltiples",    icon: Icons.qrBatch },
      { path: "__monthly_report__",  label: "Reporte Mensual", icon: Icons.report },
    ],
  },
  {
    key: "admin", label: "Administración", groupIcon: Icons.admin,
    color: "#fb7185", accentBg: "rgba(251,113,133,0.06)",
    superadminOnly: true,
    items: [
      { path: "/admin/users",     label: "Usuarios",        icon: Icons.users },
      { path: "/admin/branches",  label: "Sucursales",      icon: Icons.branches },
      // { path: "/admin/transfer",  label: "Transferencias",  icon: Icons.transfer },  // deshabilitado para presentación
      { path: "/admin/settings",  label: "Configuración",   icon: Icons.settings },
    ],
  },
];

export function AppSidebar({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<string>("");
  const [settings, setSettings] = useState<{ companyName: string; logo: string | null }>({ companyName: "RepairTrackQR", logo: null });

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    for (const g of GROUPS) {
      if (g.items.some(i => i.path !== "__monthly_report__" && (pathname === i.path || pathname?.startsWith(i.path + "/")))) {
        initial[g.key] = true;
      }
    }
    setOpenMenus(initial);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => { if (d) setSettings({ companyName: d.companyName, logo: d.logo }); }).catch(() => {});
    if (user?.role === "superadmin") {
      apiFetch("/api/branches").then(r => r.json()).then(b => {
        if (Array.isArray(b)) {
          setBranches(b);
          const ab = sessionStorage.getItem("activeBranchId");
          if (ab) setActiveBranch(ab);
          else if (b.length) { setActiveBranch(b[0].id); setActiveBranchId(b[0].id); }
        }
      }).catch(() => {});
    } else { setActiveBranch(user?.branchId || ""); }
  }, [user]);

  const toggleMenu = (k: string) => setOpenMenus(p => ({ ...p, [k]: !p[k] }));
  const handleItemClick = (path: string) => {
    setMenuOpen(false);
    if (path === "__monthly_report__") {
      const d = new Date();
      const ab = activeBranch ? `?branchId=${activeBranch}` : "";
      window.open(`/reports/monthly/${d.getFullYear()}/${d.getMonth() + 1}${ab}`, "_blank");
      return;
    }
    router.push(path);
  };
  const isActive = (path: string) => path !== "__monthly_report__" && (pathname === path || pathname?.startsWith(path + "/"));

  const roleLabel = user?.role === "superadmin" ? "Super Admin" : user?.role === "tech" ? "Técnico" : "Admin";
  const roleColor = user?.role === "superadmin" ? { bg: "rgba(26,184,196,0.20)", color: "#67e8f9" } : user?.role === "tech" ? { bg: "rgba(167,139,250,0.1)", color: "#7c3aed" } : { bg: "rgba(96,165,250,0.1)", color: "#2563eb" };
  const initials = user?.name ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase() : "?";

  const sidebarBg = "#1e2a3a";
  const borderCol = "rgba(255,255,255,0.08)";

  return (
    <>
      {/* Mobile header */}
      <div className="mobile-header" style={{ display: "none", position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "rgba(30,42,58,0.98)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${borderCol}`, alignItems: "center", padding: "0 16px", zIndex: 50, gap: 12 }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {menuOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {settings.logo
            ? <img src={settings.logo} alt="" style={{ width: 26, height: 26, borderRadius: 7, objectFit: "contain" }} />
            : <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg,#149aa5,#1ab8c4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
          }
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.3px" }}>{settings.companyName}</span>
        </div>
      </div>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} style={{ display: "none", position: "fixed", inset: 0, background: "rgba(26,29,46,0.45)", backdropFilter: "blur(4px)", zIndex: 44 }} />}

      <aside className={`sidebar-desktop${menuOpen ? " open" : ""}`} style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 210, transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)", background: sidebarBg, backdropFilter: "blur(24px)", borderRight: `1px solid ${borderCol}`, display: "flex", flexDirection: "column", zIndex: 45, padding: "0 10px" }}>

        {/* Logo */}
        <div style={{ padding: "14px 10px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            {settings.logo
              ? <img src={settings.logo} alt="" style={{ width: 32, height: 32, borderRadius: 9, objectFit: "contain" }} />
              : <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#149aa5,#2dd4df)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(212,168,67,0.2)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
            }
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "-0.3px", color: "rgba(255,255,255,0.92)", lineHeight: 1.2 }}>{settings.companyName}</div>
              <div style={{ fontSize: 9, color: "#1ab8c4", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>Sistema de gestión</div>
            </div>
          </div>
        </div>

        {/* Branch selector (superadmin) */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, overflow: "auto", padding: "4px 0" }}>
          {user?.role === "superadmin" && branches.length > 0 && (
            <div style={{ padding: "0 4px 10px", borderBottom: `1px solid ${borderCol}`, marginBottom: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                {Icons.branch} Sucursal activa
              </div>
              <div style={{ position: "relative" }}>
                <select
                  value={activeBranch}
                  onChange={(e) => { setActiveBranch(e.target.value); setActiveBranchId(e.target.value); window.location.reload(); }}
                  style={{ width: "100%", padding: "8px 28px 8px 11px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderLeft: "2px solid #1ab8c4", borderRadius: "0 8px 8px 0", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, cursor: "pointer", outline: "none", appearance: "none" }}
                >
                  {branches.map(b => <option key={b.id} value={b.id} style={{ background: "#ffffff", color: "#1e2a3a" }}>{b.name}</option>)}
                </select>
                <span style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#1ab8c4", pointerEvents: "none" }}>{Icons.chevron}</span>
              </div>
            </div>
          )}

          {GROUPS.filter(g => {
            if ((g as any).superadminOnly) return user?.role === "superadmin";
            if ((g as any).adminsOnly) return user?.role === "admin" || user?.role === "superadmin";
            return true;
          }).map(g => {
            const isOpen = !!openMenus[g.key];
            return (
              <div key={g.key}>
                <button
                  className={`sidebar-group-btn${isOpen ? " open" : ""}`}
                  onClick={() => toggleMenu(g.key)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: isOpen ? g.color : undefined }}>
                    <span style={{ color: g.color, opacity: isOpen ? 1 : 0.6 }}>{g.groupIcon}</span>
                    {g.label}
                  </span>
                  <span className="group-arrow" style={{ color: isOpen ? g.color : "rgba(255,255,255,0.35)" }}>{Icons.chevron}</span>
                </button>

                <div className={`sidebar-sub-list${isOpen ? " open" : ""}`}>
                  {g.items.filter((item: any) => {
                    if (item.techOnly) return user?.role === "tech";
                    if (item.adminsOnly) return user?.role === "admin" || user?.role === "superadmin";
                    return true;
                  }).map(item => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        className={`sidebar-btn sidebar-sub${active ? " active" : ""}`}
                        onClick={() => handleItemClick(item.path)}
                      >
                        <div className="sidebar-icon">{item.icon}</div>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User + Actions */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 6px 8px" }}>
          {/* User card — redesigned */}
          <div style={{ marginBottom: 8, background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.09)", overflow: "hidden" }}>
            {/* Top accent line */}
            <div style={{ height: 2, background: "linear-gradient(90deg, #1ab8c4, rgba(26,184,196,0.2))" }} />
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              {/* Avatar */}
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#149aa5,#1ab8c4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#ffffff", flexShrink: 0, overflow: "hidden", boxShadow: "0 2px 8px rgba(26,184,196,0.3)" }}>
                {user?.image ? <img src={user.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 10 }} /> : initials}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.2px" }}>{user?.name?.split(" ")[0]} {user?.name?.split(" ")[1] || ""}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                  <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 99, background: roleColor.bg, color: roleColor.color, fontWeight: 700, letterSpacing: "0.3px", textTransform: "uppercase" }}>{roleLabel}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Backup buttons (superadmin) */}
          {user?.role === "superadmin" && (
            <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
              <button
                onClick={async () => {
                  try {
                    const { token } = JSON.parse(JSON.stringify({ token: sessionStorage.getItem("token") }));
                    const res = await fetch("/api/backup", { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) { alert("Error al exportar backup"); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch { alert("Error de red"); }
                }}
                style={{ flex: 1, padding: "8px 6px", background: "rgba(26,184,196,0.15)", border: "1px solid rgba(26,184,196,0.30)", borderRadius: 7, color: "#2dd4df", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                {Icons.backup} Exportar
              </button>
              <label style={{ flex: 1, padding: "8px 6px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, color: "var(--blue)", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                {Icons.import} Importar
                <input
                  type="file" accept=".json" style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (!confirm("⚠️ Importar sobrescribirá los datos actuales. ¿Continuar?")) { e.target.value = ""; return; }
                    try {
                      const text = await file.text();
                      const token = sessionStorage.getItem("token");
                      const res = await fetch("/api/backup/import", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: text });
                      if (res.ok) { alert("✅ Backup importado correctamente"); window.location.reload(); }
                      else { const err = await res.json().catch(() => ({})); alert("Error: " + (err.error || "No se pudo importar")); }
                    } catch { alert("Error al leer archivo"); }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => { sessionStorage.clear(); router.push("/"); }}
            style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, color: "var(--red)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            {Icons.logout} Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}