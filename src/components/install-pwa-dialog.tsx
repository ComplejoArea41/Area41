'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  Share,
  PlusSquare,
  Sparkles,
  CheckCircle2,
  BellRing,
  Zap,
  Smartphone,
} from 'lucide-react';

export function InstallPwaDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Detectar si ya está en modo standalone (App instalada y abierta como PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Detectar si es dispositivo iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 3. Capturar evento de instalación de PWA (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsOpen(false);
      setDeferredPrompt(null);
    };

    // 4. Escuchar evento manual para abrir el cartel desde cualquier lugar (ej: Header)
    const handleOpenManual = () => {
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-install-pwa', handleOpenManual);

    // 5. Mostrar el cartel al ingresar si no está instalada y no se cerró en esta sesión
    const isDismissedThisSession = sessionStorage.getItem('area41_install_dismissed');
    if (!isDismissedThisSession) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200); // 1.2s de retraso suave al cargar
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        window.removeEventListener('open-install-pwa', handleOpenManual);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-install-pwa', handleOpenManual);
    };
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('area41_install_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          sessionStorage.setItem('area41_install_dismissed', 'true');
          setIsOpen(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Error al solicitar instalación:', err);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Navegador que no disparó beforeinstallprompt aún
      setShowIOSGuide(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDismiss();
      else setIsOpen(true);
    }}>
      <DialogContent className="max-w-md border-primary/30 bg-background/95 backdrop-blur-xl shadow-2xl p-6 sm:rounded-2xl text-center">
        <DialogHeader className="flex flex-col items-center gap-3">
          {/* Escudo Área 41 */}
          <div className="relative group mx-auto mt-2">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-emerald-400 opacity-60 blur group-hover:opacity-100 transition duration-500 animate-pulse" />
            <img
              src="/logo-escudo.jpg"
              alt="Escudo Oficial Área 41"
              className="relative h-28 w-28 rounded-2xl object-cover ring-2 ring-primary/70 shadow-xl"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30">
            <Sparkles className="h-3.5 w-3.5" />
            App Oficial Área 41
          </div>

          <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
            ¡Instala la App de Área 41!
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
            Accede más rápido a tus reservas, revisa el buffet y entérate primero de todas las novedades desde tu pantalla de inicio.
          </DialogDescription>
        </DialogHeader>

        {/* Beneficios */}
        <div className="grid grid-cols-1 gap-2.5 my-2 text-left bg-card/60 border border-white/10 rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-foreground">Reservas en 1 clic:</span> Sin abrir el navegador ni escribir la dirección web.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-foreground">Avisos instantáneos:</span> Notificaciones sobre tus turnos de fútbol.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold text-foreground">Ultra liviana:</span> No ocupa memoria ni gasta almacenamiento.
            </div>
          </div>
        </div>

        {/* Guía de instalación para iOS Safari o navegadores manuales */}
        {showIOSGuide && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-left animate-in fade-in-50 duration-300">
            <h4 className="text-sm font-bold text-primary mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Instrucciones para instalar:
            </h4>
            {isIOS ? (
              <ol className="text-xs space-y-2 text-foreground/90">
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">1</span>
                  <span>Toca el botón <strong>Compartir</strong> <Share className="inline h-3.5 w-3.5 mx-1 text-primary" /> en la barra inferior de Safari.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">2</span>
                  <span>Baja y selecciona <strong>"Agregar a pantalla de inicio"</strong> <PlusSquare className="inline h-3.5 w-3.5 mx-1 text-primary" />.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">3</span>
                  <span>Toca <strong>"Agregar"</strong> arriba a la derecha. ¡Listo!</span>
                </li>
              </ol>
            ) : (
              <p className="text-xs text-foreground/90">
                Abre el menú de opciones del navegador (los <strong>tres puntos ⋮</strong> en la esquina superior) y elige <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla principal"</strong>.
              </p>
            )}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col gap-2.5 mt-2">
          {!showIOSGuide ? (
            <Button
              onClick={handleInstallClick}
              size="lg"
              className="w-full font-bold shadow-lg shadow-primary/25 text-base py-6 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
            >
              <Download className="h-5 w-5 mr-2" />
              Instalar App Ahora
            </Button>
          ) : (
            <Button
              onClick={handleDismiss}
              size="lg"
              className="w-full font-bold bg-primary hover:bg-primary/90"
            >
              ¡Entendido!
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs text-muted-foreground hover:text-foreground h-9"
          >
            Continuar en el navegador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
