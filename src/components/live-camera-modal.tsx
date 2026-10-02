'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Maximize, RefreshCw, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourtId: 'cancha-1' | 'cancha-2';
  initialCameraId: 'cam-1' | 'cam-2';
}

export function LiveCameraModal({
  isOpen,
  onClose,
  initialCourtId,
  initialCameraId,
}: LiveCameraModalProps) {
  const [courtId, setCourtId] = useState<'cancha-1' | 'cancha-2'>(initialCourtId);
  const [cameraId, setCameraId] = useState<'cam-1' | 'cam-2'>(initialCameraId);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(Date.now());
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mapear Cancha y Cámara al canal físico del DVR Dahua
  // Cancha 1 Cam 1 = Canal 1
  // Cancha 1 Cam 2 = Canal 2
  // Cancha 2 Cam 1 = Canal 3
  // Cancha 2 Cam 2 = Canal 4
  const channel = courtId === 'cancha-1' ? (cameraId === 'cam-1' ? 1 : 2) : (cameraId === 'cam-1' ? 3 : 4);

  // Sincronizar props cuando se abre
  useEffect(() => {
    if (isOpen) {
      setCourtId(initialCourtId);
      setCameraId(initialCameraId);
      setHasError(false);
    }
  }, [isOpen, initialCourtId, initialCameraId]);

  // Actualizador continuo de cuadros en vivo (1 cuadro cada 800ms para video fluido y sin saturar)
  useEffect(() => {
    if (!isOpen || isLivePaused) return;

    const interval = setInterval(() => {
      setCurrentTimestamp(Date.now());
      setFrameCount((prev) => prev + 1);
    }, 800);

    return () => clearInterval(interval);
  }, [isOpen, isLivePaused]);

  // Pantalla completa
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const courtLabel = courtId === 'cancha-1' ? 'Cancha 1 (Fútbol 7)' : 'Cancha 2 (Fútbol 7)';
  const cameraLabel = cameraId === 'cam-1' ? 'Cámara 1' : 'Cámara 2';

  const liveImageUrl = `/api/dahua-live?channel=${channel}&t=${currentTimestamp}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[96vw] p-4 sm:p-6 bg-zinc-950 border-white/15 text-foreground rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 px-2.5 py-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                TRANSMISIÓN EN VIVO
              </Badge>
              <Badge variant="outline" className="text-zinc-400 border-white/10 text-xs font-mono">
                DVR Dahua • Canal {channel}
              </Badge>
            </div>
            <div className="text-xs text-zinc-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Conectado al DVR (192.168.1.108)</span>
            </div>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-black text-white pt-1">
            {courtLabel} • {cameraLabel}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Vista directa en tiempo real desde el sistema de cámaras de Área 41.
          </DialogDescription>
        </DialogHeader>

        {/* Selector rápido de Cancha y Cámara dentro del modal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 pb-2">
          <Button
            size="sm"
            variant={courtId === 'cancha-1' && cameraId === 'cam-1' ? 'default' : 'outline'}
            onClick={() => { setCourtId('cancha-1'); setCameraId('cam-1'); }}
            className="text-xs font-bold border-white/10 h-8"
          >
            C1 • Cam 1
          </Button>
          <Button
            size="sm"
            variant={courtId === 'cancha-1' && cameraId === 'cam-2' ? 'default' : 'outline'}
            onClick={() => { setCourtId('cancha-1'); setCameraId('cam-2'); }}
            className="text-xs font-bold border-white/10 h-8"
          >
            C1 • Cam 2
          </Button>
          <Button
            size="sm"
            variant={courtId === 'cancha-2' && cameraId === 'cam-1' ? 'default' : 'outline'}
            onClick={() => { setCourtId('cancha-2'); setCameraId('cam-1'); }}
            className="text-xs font-bold border-white/10 h-8"
          >
            C2 • Cam 1
          </Button>
          <Button
            size="sm"
            variant={courtId === 'cancha-2' && cameraId === 'cam-2' ? 'default' : 'outline'}
            onClick={() => { setCourtId('cancha-2'); setCameraId('cam-2'); }}
            className="text-xs font-bold border-white/10 h-8"
          >
            C2 • Cam 2
          </Button>
        </div>

        {/* Contenedor del video en vivo */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-white/10 flex items-center justify-center shadow-inner group"
        >
          {/* Imagen viva alimentada por el DVR */}
          <img
            src={liveImageUrl}
            alt={`Cámara en vivo ${courtLabel}`}
            onError={() => setHasError(true)}
            onLoad={() => setHasError(false)}
            className="w-full h-full object-contain select-none"
          />

          {/* Overlay de cámara estilo DVR profesional */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="bg-black/70 backdrop-blur-sm border border-white/15 px-2.5 py-1 rounded text-[11px] font-mono font-bold text-white flex items-center gap-1.5 shadow">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE • CANAL {channel}
            </span>
          </div>

          <div className="absolute top-3 right-3 pointer-events-none">
            <span className="bg-black/70 backdrop-blur-sm border border-white/15 px-2.5 py-1 rounded text-[11px] font-mono text-zinc-300 shadow">
              {new Date().toLocaleTimeString('es-AR')}
            </span>
          </div>

          {hasError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center">
              <AlertCircle className="h-10 w-10 text-amber-400 mb-2" />
              <p className="text-sm font-bold text-white">Cámara desconectada o en espera</p>
              <p className="text-xs text-zinc-400 mt-1">Verificá que el cable de la cámara esté conectado al canal {channel} del DVR.</p>
            </div>
          )}

          {/* Controles flotantes en la parte inferior */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={toggleFullscreen}
              className="h-8 w-8 bg-black/70 hover:bg-black border border-white/20 text-white rounded-lg"
              title="Pantalla Completa"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-zinc-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sistema DVR Dahua 5M07412PAZ6E02F</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="border-white/10 hover:bg-white/10 text-xs font-bold"
          >
            Cerrar Vista en Vivo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
