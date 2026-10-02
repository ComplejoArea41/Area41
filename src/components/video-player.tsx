'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX, Maximize2, Minimize2, RotateCw, Play, Pause, AlertCircle, RotateCcw, FastForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VideoPlayerProps {
  src: string;
  isLive?: boolean;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  courtName?: string;
  onRefresh?: () => void;
}

export function VideoPlayer({
  src,
  isLive = false,
  title,
  poster,
  autoPlay = true,
  courtName,
  onRefresh,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isYouTube = src?.includes('youtube.com') || src?.includes('youtu.be');

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      if (url.includes('/embed/')) return url;
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
      }
      if (url.includes('watch?v=')) {
        const id = url.split('watch?v=')[1]?.split('&')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
      }
      return url;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    if (isYouTube || !src) return;

    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    setHasError(false);
    setIsLoading(true);

    const isHls = src.includes('.m3u8');

    if (isHls) {
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
        });

        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => setIsPlaying(false));
            });
          }
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls?.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls?.recoverMediaError();
                break;
              default:
                hls?.destroy();
                setHasError(true);
                setIsLoading(false);
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
        video.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(() => {
              video.muted = true;
              setIsMuted(true);
              video.play().catch(() => setIsPlaying(false));
            });
          }
        });
        video.addEventListener('error', () => {
          setHasError(true);
          setIsLoading(false);
        });
      } else {
        setHasError(true);
        setIsLoading(false);
      }
    } else {
      const onLoaded = () => {
        setIsLoading(false);
        setHasError(false);
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true;
            setIsMuted(true);
            video.play().catch(() => setIsPlaying(false));
          });
        }
      };

      const onError = () => {
        // Ignorar si fue abortado intencionalmente por cambio de src
        if (video.error && video.error.code === 1) return;
        setHasError(true);
        setIsLoading(false);
      };

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('canplay', onLoaded);
      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('error', onError);

      video.src = src;
      video.load();

      return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('canplay', onLoaded);
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('error', onError);
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, isYouTube, autoPlay]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      if (!isNaN(video.duration)) {
        setDuration(video.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (video) {
      const targetTime = Number(e.target.value);
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const skipSeconds = (seconds: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3500);
  };

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
    const video = videoRef.current;
    if (video) {
      const currentSrc = video.src;
      video.src = '';
      video.src = currentSrc;
      video.load();
    }
    if (onRefresh) onRefresh();
  };

  if (isYouTube) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl border border-white/10">
        <iframe
          src={getYouTubeEmbedUrl(src)}
          title={title || 'Partido'}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-950 shadow-2xl border border-white/10 select-none group"
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-cover cursor-pointer"
        onClick={togglePlay}
      />

      {/* Top Header Overlay: Live/Replay Badge & Court Name */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-20 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {isLive ? (
            <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-wider px-2.5 py-0.5 text-xs sm:text-sm flex items-center gap-1.5 shadow-lg shadow-red-600/40 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-white inline-block animate-ping" />
              EN VIVO
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-primary/20 text-primary border border-primary/30 text-xs sm:text-sm font-semibold">
              PARTIDO GRABADO
            </Badge>
          )}

          {courtName && (
            <span className="text-white font-semibold text-xs sm:text-sm drop-shadow-md bg-black/50 px-2.5 py-1 rounded-md border border-white/10">
              {courtName}
            </span>
          )}
        </div>

        {title && (
          <p className="text-white/90 text-xs sm:text-sm font-medium drop-shadow-md truncate max-w-[200px] sm:max-w-xs hidden sm:block">
            {title}
          </p>
        )}
      </div>

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-white text-xs sm:text-sm font-medium tracking-wide">
            Cargando video del partido...
          </p>
        </div>
      )}

      {/* Error / Offline Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 text-center p-6 z-10">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-3" />
          <h4 className="text-lg font-bold text-white mb-1">Video no disponible</h4>
          <p className="text-sm text-zinc-400 max-w-sm mb-4">
            El video está siendo procesado por el DVR o el enlace no es accesible.
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleReload}
              variant="outline"
              className="border-white/20 hover:bg-white/10 text-white gap-2"
            >
              <RotateCw className="h-4 w-4" /> Reintentar
            </Button>
            {src && (
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-black hover:bg-primary/90 transition-colors"
              >
                Abrir directo
              </a>
            )}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300 z-20 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar for Recorded Videos */}
        {!isLive && duration > 0 && (
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono text-zinc-300 min-w-[38px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:h-2 transition-all"
            />
            <span className="text-[11px] font-mono text-zinc-400 min-w-[38px] text-right">
              {formatTime(duration)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={togglePlay}
              className="text-white hover:bg-white/20 h-9 w-9 rounded-full"
              title={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            </Button>

            {/* Quick Seek -10s / +10s (Highlights seek) */}
            {!isLive && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => skipSeconds(-10)}
                  className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8 rounded-full"
                  title="Retroceder 10 segundos"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => skipSeconds(10)}
                  className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8 rounded-full"
                  title="Adelantar 10 segundos"
                >
                  <FastForward className="h-4 w-4" />
                </Button>
              </>
            )}

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 h-9 w-9 rounded-full"
              title={isMuted ? 'Activar Sonido' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="h-5 w-5 text-red-400" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20 h-9 w-9 rounded-full"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
