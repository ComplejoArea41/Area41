'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { RecordedMatch } from '@/lib/types';
import { VideoPlayer } from '@/components/video-player';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Video,
  Clock,
  Download,
  Share2,
  Play,
  Film,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sunset,
  CheckCircle2,
  Hourglass,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// 4 cameras in total: 2 for Cancha 1, 2 for Cancha 2
const CAMERAS_BY_COURT: Record<
  string,
  { id: string; name: string; shortName: string }[]
> = {
  'cancha-1': [
    { id: 'cam-1', name: 'Cancha 1 - Cámara 1', shortName: 'Cámara 1' },
    { id: 'cam-2', name: 'Cancha 1 - Cámara 2', shortName: 'Cámara 2' },
  ],
  'cancha-2': [
    { id: 'cam-1', name: 'Cancha 2 - Cámara 1', shortName: 'Cámara 1' },
    { id: 'cam-2', name: 'Cancha 2 - Cámara 2', shortName: 'Cámara 2' },
  ],
};

// Generate all 24 hours of the day (00:00 to 24:00)
const HOURS_24 = Array.from({ length: 24 }, (_, i) => {
  const start = i.toString().padStart(2, '0');
  const end = ((i + 1) % 24).toString().padStart(2, '0');
  return {
    hour: i,
    label: `${start}:00 a ${end}:00 hs`,
    startStr: `${start}:00`,
  };
});

// Demo fallback videos
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

export default function MatchesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const matchesQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'recorded_matches'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: dbMatches } = useCollection<RecordedMatch>(matchesQuery);

  // 1. Cancha Selection ('cancha-1' or 'cancha-2')
  const [selectedCourtId, setSelectedCourtId] = useState<'cancha-1' | 'cancha-2'>('cancha-1');

  // 2. Cámara Selection ('cam-1' or 'cam-2')
  const [selectedCameraId, setSelectedCameraId] = useState<'cam-1' | 'cam-2'>('cam-1');

  // 3. Date Selection (Defaults to Today's date YYYY-MM-DD in local time)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Current local date & hour calculation
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());

  // Keep hour updated every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = selectedDate === todayStr;
  const isFutureDate = selectedDate > todayStr;

  // Active playing match modal
  const [activePlayingSlot, setActivePlayingSlot] = useState<{
    timeLabel: string;
    videoUrl: string;
    downloadUrl?: string;
  } | null>(null);

  // Available cameras for current court
  const currentCameras = useMemo(() => {
    return CAMERAS_BY_COURT[selectedCourtId] || CAMERAS_BY_COURT['cancha-1'];
  }, [selectedCourtId]);

  const activeCameraInfo = useMemo(() => {
    return currentCameras.find((c) => c.id === selectedCameraId) || currentCameras[0];
  }, [currentCameras, selectedCameraId]);

  // Navigate date backwards/forwards by 1 day
  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Format date display for header
  const formattedDateTitle = useMemo(() => {
    try {
      const parts = selectedDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const [localServerMatches, setLocalServerMatches] = useState<RecordedMatch[]>([]);
  const [serverBaseUrl, setServerBaseUrl] = useState<string>('');
  const [preparingSlot, setPreparingSlot] = useState<{
    courtId: string;
    cameraId: string;
    date: string;
    hour: number;
    label: string;
    message: string;
  } | null>(null);

  // Sincronizar partidos online vía túnel público de Cloudflare y base de datos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadMatches = async () => {
        try {
          // 1. Obtener la URL pública del túnel Cloudflare desde Supabase
          const { data: tunnelRow } = await supabase
            .from('background_images')
            .select('image_url')
            .eq('id', 'recording_server_tunnel')
            .single();

          const publicTunnel = tunnelRow?.image_url;

          // 2. Intentar túnel público primero (para ver online desde cualquier casa o celular)
          const candidates: string[] = [];
          if (publicTunnel) candidates.push(`${publicTunnel}/api/matches`);
          candidates.push('http://localhost:4141/api/matches');
          candidates.push('http://192.168.1.212:4141/api/matches');

          for (const url of candidates) {
            try {
              const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
              const data = await res.json();
              if (data && Array.isArray(data.matches)) {
                // Determinar el host base público para los links de video y descarga
                let base = '';
                if (publicTunnel) {
                  base = publicTunnel;
                } else if (url.startsWith('http')) {
                  base = new URL(url).origin;
                }
                setServerBaseUrl(base);

                const mapped: RecordedMatch[] = data.matches.map((m: any) => {
                  let vUrl = m.videoUrl || '';
                  let dUrl = m.downloadUrl || m.videoUrl || '';
                  if (!vUrl.startsWith('http')) {
                    vUrl = `${base}${vUrl}`;
                  }
                  if (!dUrl.startsWith('http')) {
                    dUrl = `${base}${dUrl}`;
                  }
                  return {
                    id: m.id,
                    courtId: m.courtId,
                    courtName: m.courtName,
                    cameraId: m.cameraId,
                    cameraName: m.cameraName,
                    date: m.date,
                    time: m.time,
                    title: `Partido ${m.time}`,
                    videoUrl: vUrl,
                    downloadUrl: dUrl,
                    durationMinutes: 60,
                    createdAt: m.detectedAt || new Date().toISOString(),
                  };
                });
                setLocalServerMatches(mapped);
                break;
              }
            } catch (_) {}
          }
        } catch (e) {
          console.error('Error cargando partidos online:', e);
        }
      };

      loadMatches();
      const interval = setInterval(loadMatches, 15000);
      return () => clearInterval(interval);
    }
  }, []);

  // Polling para preparación a demanda si el usuario tocó un turno que se está procesando
  useEffect(() => {
    if (!preparingSlot || !serverBaseUrl) return;

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const queryUrl = `${serverBaseUrl}/api/prepare-match?courtId=${preparingSlot.courtId}&cameraId=${preparingSlot.cameraId}&date=${preparingSlot.date}&hour=${preparingSlot.hour}`;
        const res = await fetch(queryUrl);
        const data = await res.json();

        if (!isMounted) return;

        if (data.ready && data.match) {
          let vUrl = data.match.videoUrl;
          let dUrl = data.match.downloadUrl || vUrl;
          if (!vUrl.startsWith('http')) vUrl = `${serverBaseUrl}${vUrl}`;
          if (!dUrl.startsWith('http')) dUrl = `${serverBaseUrl}${dUrl}`;

          toast({
            title: '¡Video preparado!',
            description: `El partido de ${preparingSlot.label} ya está listo para reproducir.`,
          });

          setActivePlayingSlot({
            timeLabel: preparingSlot.label,
            videoUrl: vUrl,
            downloadUrl: dUrl,
          });
          setPreparingSlot(null);
        } else if (data.message) {
          setPreparingSlot((prev) => (prev ? { ...prev, message: data.message } : null));
        }
      } catch (err) {
        // Reintentando
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [preparingSlot, serverBaseUrl, toast]);

  const allMatches = useMemo(() => {
    return [...(dbMatches || []), ...localServerMatches];
  }, [dbMatches, localServerMatches]);

  // Handle clicking a specific 1-hour slot
  const handleSelectSlot = (slotLabel: string, hourIndex: number) => {
    if (isFutureDate) {
      toast({
        title: 'Fecha futura',
        description: 'Esta fecha aún no ha transcurrido. Las grabaciones quedan disponibles luego de disputarse cada partido.',
      });
      return;
    }

    if (isToday && hourIndex > currentHour) {
      toast({
        title: 'Horario aún no jugado',
        description: 'Este turno aún no se disputó. Podrás revivirlo luego de finalizado el partido.',
      });
      return;
    }

    if (isToday && hourIndex === currentHour) {
      toast({
        title: 'Turno en juego',
        description: 'El partido de este horario se está jugando o finalizando. La grabación estará lista para ver al término de la hora.',
      });
      return;
    }

    // Buscar si ya está el video disponible para esta cancha, cámara, fecha y turno
    const matchedInDb = allMatches.find((m) => {
      const matchCourt = m.courtId === selectedCourtId;
      const matchCam = (m.cameraId || 'cam-1') === selectedCameraId;
      const matchDate = m.date === selectedDate || (isToday && m.date?.toLowerCase() === 'hoy');
      const matchTime = m.time?.includes(slotLabel) || m.time?.includes(slotLabel.split(' ')[0]);
      return matchCourt && matchCam && matchDate && matchTime;
    });

    if (matchedInDb && matchedInDb.videoUrl) {
      setActivePlayingSlot({
        timeLabel: slotLabel,
        videoUrl: matchedInDb.videoUrl,
        downloadUrl: matchedInDb.downloadUrl || matchedInDb.videoUrl,
      });
      return;
    }

    // Si aún no está en cache, iniciar preparación a demanda desde el DVR
    if (serverBaseUrl) {
      setPreparingSlot({
        courtId: selectedCourtId,
        cameraId: selectedCameraId,
        date: selectedDate,
        hour: hourIndex,
        label: slotLabel,
        message: 'Descargando grabación en alta resolución desde el DVR Dahua...',
      });

      fetch(
        `${serverBaseUrl}/api/prepare-match?courtId=${selectedCourtId}&cameraId=${selectedCameraId}&date=${selectedDate}&hour=${hourIndex}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.ready && data.match) {
            let vUrl = data.match.videoUrl;
            let dUrl = data.match.downloadUrl || vUrl;
            if (!vUrl.startsWith('http')) vUrl = `${serverBaseUrl}${vUrl}`;
            if (!dUrl.startsWith('http')) dUrl = `${serverBaseUrl}${dUrl}`;
            setPreparingSlot(null);
            setActivePlayingSlot({
              timeLabel: slotLabel,
              videoUrl: vUrl,
              downloadUrl: dUrl,
            });
          }
        })
        .catch(() => {});
    } else {
      toast({
        title: 'Grabación en procesamiento',
        description: `El video de ${slotLabel} se está descargando del DVR. Conectando con el servidor...`,
      });
    }
  };

  const handleShare = (timeLabel: string) => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      if (navigator.share) {
        navigator
          .share({
            title: `Partido grabado Área 41 - ${timeLabel}`,
            text: `¡Mirá el partido grabado en Área 41 del ${selectedDate} (${timeLabel})!`,
            url,
          })
          .catch(() => {});
      } else {
        navigator.clipboard.writeText(url);
        toast({
          title: 'Enlace copiado',
          description: 'El link para ver el partido fue copiado al portapapeles.',
        });
      }
    }
  };

  const handleDownload = (videoUrl: string, timeLabel: string) => {
    const a = document.createElement('a');
    a.href = videoUrl;
    a.target = '_blank';
    a.download = `Partido_${selectedCourtId}_${selectedDate}_${timeLabel.replace(/\s+/g, '_')}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: 'Iniciando descarga',
      description: 'El video se está descargando en tu dispositivo.',
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-start gap-6 p-4 md:gap-8 md:p-8 max-w-4xl mx-auto w-full">
      {/* Title */}
      <div className="text-center space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Reviví tu <span className="text-primary">Partido</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Mirá el video completo de tu turno grabado por las cámaras. Disponible 1 hora después de finalizar cada partido.
        </p>
      </div>

      {/* 1. SELECCIÓN DE CANCHA (CANCHA 1 | CANCHA 2) */}
      <div className="w-full space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          1. Elegí la Cancha
        </span>

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={selectedCourtId === 'cancha-1' ? 'default' : 'outline'}
            onClick={() => {
              setSelectedCourtId('cancha-1');
              setSelectedCameraId('cam-1');
            }}
            className={`h-auto py-3.5 px-4 rounded-xl text-lg font-black transition-all ${
              selectedCourtId === 'cancha-1'
                ? 'shadow-lg shadow-primary/20 scale-[1.01] ring-2 ring-primary'
                : 'border-white/10 hover:bg-card/80'
            }`}
          >
            Cancha 1
          </Button>

          <Button
            type="button"
            variant={selectedCourtId === 'cancha-2' ? 'default' : 'outline'}
            onClick={() => {
              setSelectedCourtId('cancha-2');
              setSelectedCameraId('cam-1');
            }}
            className={`h-auto py-3.5 px-4 rounded-xl text-lg font-black transition-all ${
              selectedCourtId === 'cancha-2'
                ? 'shadow-lg shadow-primary/20 scale-[1.01] ring-2 ring-primary'
                : 'border-white/10 hover:bg-card/80'
            }`}
          >
            Cancha 2
          </Button>
        </div>
      </div>

      {/* 2. SELECCIÓN DE CÁMARA (2 CÁMARAS POR CANCHA) */}
      <div className="w-full space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          2. Ángulo de Cámara ({selectedCourtId === 'cancha-1' ? 'Cancha 1' : 'Cancha 2'})
        </span>

        <div className="grid grid-cols-2 gap-3">
          {currentCameras.map((camera) => {
            const isSelected = selectedCameraId === camera.id;
            return (
              <Button
                key={camera.id}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => setSelectedCameraId(camera.id as 'cam-1' | 'cam-2')}
                className={`h-auto py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'shadow-md shadow-primary/20 ring-2 ring-primary'
                    : 'border-white/10 hover:bg-card/80'
                }`}
              >
                <Video className="h-4 w-4" />
                {camera.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* 3. CALENDARIO / SELECTOR DE FECHA */}
      <div className="w-full space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          3. Fecha del Partido
        </span>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/70 border border-white/10">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <Button
              size="icon"
              variant="outline"
              onClick={() => changeDateByDays(-1)}
              className="h-9 w-9 border-white/10"
              title="Día anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-center px-3">
              <span className="capitalize text-sm sm:text-base font-bold text-foreground block">
                {formattedDateTitle}
              </span>
              {isToday && (
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary font-bold">
                  Hoy
                </Badge>
              )}
            </div>

            <Button
              size="icon"
              variant="outline"
              onClick={() => changeDateByDays(1)}
              className="h-9 w-9 border-white/10"
              title="Día siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative flex items-center">
              <CalendarIcon className="absolute left-3 h-4 w-4 text-primary pointer-events-none" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="pl-9 h-9 text-xs bg-zinc-900 border-white/15 w-40 cursor-pointer"
              />
            </div>

            {!isToday && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setSelectedDate(todayStr)}
                className="text-xs font-bold h-9"
              >
                Ir a Hoy
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4. TURNOS DE JUEGO (HORARIOS DISPONIBLES) */}
      <div className="w-full space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary" />
            4. Turno de Juego
          </span>
          <span className="text-xs text-muted-foreground">
            Tocá el turno para ver tu partido
          </span>
        </div>

        {/* 24 Hours Clean Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {HOURS_24.map((slot) => {
            // Determine real video availability from all matches (local server + db)
            const matchForSlot = allMatches.find((m) => {
              const matchCourt = m.courtId === selectedCourtId;
              const matchCam = (m.cameraId || 'cam-1') === selectedCameraId;
              const matchDate = m.date === selectedDate || (isToday && m.date?.toLowerCase() === 'hoy');
              const matchTime = m.time?.includes(slot.label) || m.time?.includes(slot.startStr);
              return matchCourt && matchCam && matchDate && matchTime;
            });
            const hasVideo = !!matchForSlot && !!matchForSlot.videoUrl;
            const isBeingPrepared =
              preparingSlot &&
              preparingSlot.courtId === selectedCourtId &&
              preparingSlot.cameraId === selectedCameraId &&
              preparingSlot.date === selectedDate &&
              preparingSlot.hour === slot.hour;

            const isCompleted = !isFutureDate && (!isToday || slot.hour < currentHour);
            const isCurrent = isToday && slot.hour === currentHour;
            const isUpcoming = isFutureDate || (isToday && slot.hour > currentHour);

            return (
              <button
                key={slot.hour}
                type="button"
                onClick={() => handleSelectSlot(slot.label, slot.hour)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group cursor-pointer select-none ${
                  hasVideo
                    ? 'bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-950/30 shadow-md shadow-emerald-950/20 hover:scale-[1.02]'
                    : isBeingPrepared
                    ? 'bg-amber-950/30 border-amber-500/60 shadow-md animate-pulse'
                    : isCompleted
                    ? 'bg-card/70 border-white/10 hover:border-primary/50 hover:bg-card shadow-sm hover:scale-[1.01]'
                    : isCurrent
                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400/80 hover:bg-amber-950/30'
                    : 'bg-zinc-900/40 border-white/5 opacity-55 hover:opacity-80'
                }`}
              >
                <div className="space-y-1">
                  <div className={`text-xs sm:text-sm font-bold transition-colors ${
                    hasVideo
                      ? 'text-white group-hover:text-emerald-300'
                      : isBeingPrepared
                      ? 'text-amber-300'
                      : isCompleted
                      ? 'text-foreground group-hover:text-primary'
                      : isCurrent
                      ? 'text-amber-300'
                      : 'text-zinc-400'
                  }`}>
                    {slot.label}
                  </div>

                  <div className="text-[10px] flex items-center gap-1">
                    {hasVideo ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Listo para ver (HD)
                      </span>
                    ) : isBeingPrepared ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Hourglass className="h-3.5 w-3.5 animate-spin text-amber-400" />
                        Descargando del DVR...
                      </span>
                    ) : isCompleted ? (
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Play className="h-3 w-3 fill-primary text-primary" />
                        Ver partido (Optimizar HD)
                      </span>
                    ) : isCurrent ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Hourglass className="h-3 w-3 animate-pulse" />
                        En juego / Finalizando
                      </span>
                    ) : (
                      <span className="text-zinc-500">
                        Próximo turno
                      </span>
                    )}
                  </div>
                </div>

                <div className={`p-1.5 rounded-lg transition-all ${
                  hasVideo
                    ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black shadow-sm'
                    : isBeingPrepared
                    ? 'bg-amber-500/20 text-amber-400'
                    : isCompleted
                    ? 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
                    : isCurrent
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  <Play className="h-3.5 w-3.5 fill-current" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* POPUP / MODAL: EXTRACCIÓN Y OPTIMIZACIÓN A DEMANDA */}
      <Dialog
        open={!!preparingSlot}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPreparingSlot(null);
        }}
      >
        <DialogContent className="max-w-md w-[92vw] p-6 bg-zinc-950 border-white/15 text-foreground text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/30">
            <Hourglass className="h-7 w-7 animate-spin" />
          </div>

          <div className="space-y-1.5">
            <DialogTitle className="text-lg sm:text-xl font-black text-white">
              Optimizando Grabación HD
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Turno {preparingSlot?.label} • {selectedCourtId === 'cancha-1' ? 'Cancha 1' : 'Cancha 2'}
            </DialogDescription>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-300 leading-relaxed">
            {preparingSlot?.message || 'Extrayendo el video desde el DVR Dahua y adaptándolo para streaming online.'}
          </div>

          <p className="text-[11px] text-zinc-500">
            Podés esperar aquí o cerrar esta ventana; el video comenzará automáticamente cuando esté listo.
          </p>

          <div className="flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreparingSlot(null)}
              className="text-xs border-white/15 hover:bg-white/10"
            >
              Continuar en segundo plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* POPUP / MODAL: REPRODUCTOR DEL PARTIDO */}
      <Dialog
        open={!!activePlayingSlot}
        onOpenChange={(isOpen) => {
          if (!isOpen) setActivePlayingSlot(null);
        }}
      >
        <DialogContent className="max-w-4xl w-[95vw] p-3 sm:p-5 bg-zinc-950 border-white/15 text-foreground">
          {activePlayingSlot && (
            <div className="space-y-3">
              <DialogHeader className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold">
                    {activeCameraInfo.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    Fecha: {selectedDate}
                  </span>
                </div>
                <DialogTitle className="text-xl sm:text-2xl font-black text-white">
                  Turno: {activePlayingSlot.timeLabel}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {selectedCourtId === 'cancha-1' ? 'Cancha 1' : 'Cancha 2'} • {activeCameraInfo.name}
                </DialogDescription>
              </DialogHeader>

              {/* Video Player */}
              <div className="rounded-xl overflow-hidden shadow-2xl bg-black">
                <VideoPlayer
                  src={activePlayingSlot.videoUrl}
                  isLive={false}
                  courtName={activeCameraInfo.name}
                  title={`Turno: ${activePlayingSlot.timeLabel} (${selectedDate})`}
                  autoPlay={true}
                />
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-zinc-400 font-mono">
                  Grabación completa en alta definición
                </div>

                <div className="flex items-center gap-2">
                  {activePlayingSlot.downloadUrl && (
                    <Button
                      size="sm"
                      onClick={() =>
                        handleDownload(activePlayingSlot.downloadUrl!, activePlayingSlot.timeLabel)
                      }
                      className="gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Download className="h-4 w-4" />
                      Descargar
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShare(activePlayingSlot.timeLabel)}
                    className="gap-2 border-white/10 hover:bg-white/10"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartir
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setActivePlayingSlot(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
