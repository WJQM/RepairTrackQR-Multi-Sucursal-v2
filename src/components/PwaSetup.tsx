"use client";
import { useEffect, useState } from "react";

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
}

/**
 * Registra el service worker y muestra un botón flotante "Instalar app"
 * cuando el navegador ofrece la instalación PWA.
 * Incluido en layout raíz → disponible en toda la app.
 */
export function PwaSetup() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Registrar SW solo en producción/https y no en iframes
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Detectar si ya está instalada
    if (window.matchMedia?.("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setInstalled(true);
      return;
    }

    // Si el usuario ya rechazó, no mostrar más
    if (sessionStorage.getItem("pwaInstallDismissed") === "1") return;

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || installed || !installPrompt) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 1000,
      background: "linear-gradient(135deg, #1ab8c4, #149aa5)",
      color: "#fff", padding: "14px 16px", borderRadius: 14,
      boxShadow: "0 10px 30px rgba(26,184,196,0.25)", maxWidth: 320,
      display: "flex", alignItems: "center", gap: 12, fontSize: 13,
    }}>
      <span style={{ fontSize: 28 }}>📱</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, marginBottom: 2 }}>Instalar RepairTrack</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>Acceso rápido como app nativa</div>
      </div>
      <button
        onClick={async () => {
          try {
            await installPrompt.prompt();
            const choice = await installPrompt.userChoice;
            if (choice.outcome === "accepted") setInstalled(true);
          } catch {}
          setVisible(false);
        }}
        style={{ padding: "7px 14px", background: "#fff", color: "#1ab8c4", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
      >
        Instalar
      </button>
      <button
        onClick={() => { sessionStorage.setItem("pwaInstallDismissed", "1"); setVisible(false); }}
        style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        title="Cerrar"
      >
        ✕
      </button>
    </div>
  );
}
