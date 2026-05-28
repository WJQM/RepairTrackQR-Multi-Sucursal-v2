"use client";
import { usePortalI18n } from "@/lib/use-portal";

/**
 * Selector de idioma flotante del portal (ES/EN).
 * Esquina superior derecha.
 */
export function PortalControls() {
  const { locale, change: changeLocale } = usePortalI18n();

  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 50,
      display: "flex",
      gap: 2,
      alignItems: "center",
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "6px",
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      backdropFilter: "blur(10px)",
    }}>
      <button
        onClick={() => changeLocale("es")}
        title="Español"
        style={{
          padding: "6px 10px", borderRadius: 6,
          background: locale === "es" ? "rgba(26,184,196,0.08)" : "transparent",
          border: "none",
          color: locale === "es" ? "#2dd4df" : "var(--text-muted)",
          fontWeight: 700, fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        🇧🇴 ES
      </button>
      <button
        onClick={() => changeLocale("en")}
        title="English"
        style={{
          padding: "6px 10px", borderRadius: 6,
          background: locale === "en" ? "rgba(26,184,196,0.08)" : "transparent",
          border: "none",
          color: locale === "en" ? "#2dd4df" : "var(--text-muted)",
          fontWeight: 700, fontSize: 11, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        🇺🇸 EN
      </button>
    </div>
  );
}
