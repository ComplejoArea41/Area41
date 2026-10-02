'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { CourtCamera, RecordedMatch, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Video, PlusCircle, Trash2, Save, Info, Tv, Calendar, Clock, Download, ExternalLink } from 'lucide-react';

export default function AdminCamerasPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

  const camerasRef = useMemoFirebase(() => (firestore ? collection(firestore, 'court_cameras') : null), [firestore]);
  const { data: dbCameras, isLoading: areCamerasLoading } = useCollection<CourtCamera>(camerasRef);

  const matchesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'recorded_matches') : null), [firestore]);
  const { data: dbMatches, isLoading: areMatchesLoading } = useCollection<RecordedMatch>(matchesRef);

  // State for adding a new recorded match
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [newMatch, setNewMatch] = useState<Partial<RecordedMatch>>({
    courtId: 'cancha-1',
    courtName: 'Cancha 1',
    cameraId: 'cam-1',
    cameraName: 'Cámara 1',
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '20:00 - 21:00 hs',
    videoUrl: '',
    durationMinutes: 60,
  });

  // Local state for DVR cameras configuration (secondary)
  const [camera1, setCamera1] = useState<Partial<CourtCamera>>({
    id: 'cancha-7-1',
    courtId: 'cancha-7-1',
    courtName: 'Cancha de 7 (Cancha 1)',
    streamUrl: '',
    isLive: false,
  });

  const [camera2, setCamera2] = useState<Partial<CourtCamera>>({
    id: 'cancha-7-2',
    courtId: 'cancha-7-2',
    courtName: 'Cancha de 7 (Cancha 2)',
    streamUrl: '',
    isLive: false,
  });

  // Sync state with DB cameras if available
  useEffect(() => {
    if (dbCameras && dbCameras.length > 0) {
      const c1 = dbCameras.find((c) => c.courtId === 'cancha-1' || c.id === 'cancha-1');
      if (c1) setCamera1(c1);

      const c2 = dbCameras.find((c) => c.courtId === 'cancha-2' || c.id === 'cancha-2');
      if (c2) setCamera2(c2);
    }
  }, [dbCameras]);

  // Auth protection
  useEffect(() => {
    if (isUserLoading || isProfileLoading) return;
    if (!user) {
      router.push('/login');
    } else if (userProfile && !userProfile.isAdmin) {
      router.push('/');
    }
  }, [user, userProfile, isUserLoading, isProfileLoading, router]);

  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newMatch.title || !newMatch.videoUrl) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa el título y la URL del video.',
      });
      return;
    }

    const matchesCollection = collection(firestore, 'recorded_matches');
    addDocumentNonBlocking(matchesCollection, {
      ...newMatch,
      downloadUrl: newMatch.videoUrl,
      createdAt: new Date(),
    });

    setIsAddMatchOpen(false);
    setNewMatch({
      courtId: 'cancha-1',
      courtName: 'Cancha 1',
      cameraId: 'cam-1',
      cameraName: 'Cámara 1',
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '20:00 - 21:00 hs',
      videoUrl: '',
      durationMinutes: 60,
    });

    toast({
      title: 'Partido agregado',
      description: 'El partido grabado ya está disponible en la sección de Partidos.',
    });
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!firestore) return;
    const matchDoc = doc(firestore, 'recorded_matches', matchId);
    deleteDocumentNonBlocking(matchDoc);

    toast({
      title: 'Partido eliminado',
      description: 'La grabación fue eliminada correctamente.',
    });
  };

  const handleSaveCamera = (camData: Partial<CourtCamera>, docId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'court_cameras', docId);
    setDocumentNonBlocking(
      docRef,
      {
        ...camData,
        id: docId,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    toast({
      title: 'Cámara guardada',
      description: `Los datos de ${camData.courtName} se actualizaron correctamente.`,
    });
  };

  if (isUserLoading || isProfileLoading || areMatchesLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Cargando gestión de partidos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Video className="h-7 w-7 text-primary" />
            Gestión de Partidos Grabados
          </h1>
          <p className="text-muted-foreground text-sm">
            Administra los partidos grabados por el DVR para que los jugadores revivan sus turnos en la app.
          </p>
        </div>

        <Button onClick={() => router.push('/matches')} variant="outline" className="gap-2 font-bold">
          <Tv className="h-4 w-4" />
          Ver Pantalla de Clientes
        </Button>
      </div>

      {/* Workflow Explanation Banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">
              Flujo de grabación por turnos (Zero consumo en vivo):
            </p>
            <p className="text-muted-foreground text-xs sm:text-sm">
              1. El DVR graba todo el partido localmente en su disco rígido (sin consumir internet del complejo).
              <br />
              2. Al terminar el turno o al finalizar el día, se exporta el video de la hora jugada (o se sube a Google Drive / YouTube en oculto / Cloud) y se pega el enlace aquí.
              <br />
              3. Los jugadores entran a <strong>Reviví tu Partido</strong>, buscan su turno, lo miran y descargan sus mejores jugadas.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Section: Recorded Matches List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              Partidos Grabados Disponibles
            </h2>
            <p className="text-xs text-muted-foreground">
              Turnos cargados en la base de datos para los usuarios.
            </p>
          </div>

          <Dialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-bold shadow-md shadow-primary/20">
                <PlusCircle className="h-4 w-4" />
                Cargar Nuevo Partido
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateMatch}>
                <DialogHeader>
                  <DialogTitle>Cargar Partido Grabado</DialogTitle>
                  <DialogDescription>
                    Asocia el video grabado al día, cancha y horario correspondiente.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="match-title">Título del Turno / Equipos</Label>
                    <Input
                      id="match-title"
                      required
                      placeholder="Ej: Turno 20:00 hs - Cancha 1"
                      value={newMatch.title || ''}
                      onChange={(e) => setNewMatch({ ...newMatch, title: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="match-court">Cancha</Label>
                      <Select
                        value={newMatch.courtId}
                        onValueChange={(val) =>
                          setNewMatch({
                            ...newMatch,
                            courtId: val,
                            courtName: val === 'cancha-1' ? 'Cancha 1' : 'Cancha 2',
                          })
                        }
                      >
                        <SelectTrigger id="match-court">
                          <SelectValue placeholder="Seleccionar cancha" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cancha-1">Cancha 1</SelectItem>
                          <SelectItem value="cancha-2">Cancha 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="match-camera">Cámara</Label>
                      <Select
                        value={newMatch.cameraId || 'cam-1'}
                        onValueChange={(val) =>
                          setNewMatch({
                            ...newMatch,
                            cameraId: val,
                            cameraName: val === 'cam-1' ? 'Cámara 1' : 'Cámara 2',
                          })
                        }
                      >
                        <SelectTrigger id="match-camera">
                          <SelectValue placeholder="Seleccionar cámara" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cam-1">Cámara 1</SelectItem>
                          <SelectItem value="cam-2">Cámara 2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="match-date">Fecha</Label>
                      <Input
                        id="match-date"
                        type="date"
                        value={newMatch.date || ''}
                        onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="match-time">Horario</Label>
                      <Input
                        id="match-time"
                        placeholder="Ej: 20:00 - 21:00 hs"
                        value={newMatch.time || ''}
                        onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="match-video">Enlace del Video (MP4 o link directo)</Label>
                    <Input
                      id="match-video"
                      required
                      placeholder="https://.../video.mp4"
                      value={newMatch.videoUrl || ''}
                      onChange={(e) => setNewMatch({ ...newMatch, videoUrl: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddMatchOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="font-bold">
                    Guardar Partido
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Matches Grid */}
        {(!dbMatches || dbMatches.length === 0) ? (
          <Card className="bg-card/40 border-dashed border-white/10 p-8 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              Aún no cargaste partidos grabados en la base de datos.
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Mientras tanto, la app muestra partidos de ejemplo para que puedas probar el reproductor y las descargas. Hacé clic en "Cargar Nuevo Partido" para agregar el primero.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dbMatches.map((m) => (
              <Card key={m.id} className="p-4 border-white/10 bg-card/60 backdrop-blur-md flex flex-col justify-between">
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {m.courtName}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {m.time}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-foreground line-clamp-2">{m.title}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {m.date}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <a
                    href={m.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 truncate max-w-[170px]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    Probar video
                  </a>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteMatch(m.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8 w-8"
                    title="Eliminar partido"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Secondary Optional Section: DVR Configuration */}
      <div className="pt-6 border-t space-y-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Configuración de Canales DVR (Opcional)</h3>
          <p className="text-xs text-muted-foreground">
            Si en algún momento deseas conectar una señal directa para pruebas o monitoreo interno.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Cancha 1 */}
          <Card className="border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Cancha 1 (Fútbol 5)</span>
              <Badge variant="secondary" className="text-xs">Canal 1</Badge>
            </div>
            <Input
              value={camera1.streamUrl || ''}
              onChange={(e) => setCamera1({ ...camera1, streamUrl: e.target.value })}
              placeholder="Enlace de stream o carpeta de grabaciones..."
              className="text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveCamera(camera1, 'cancha-1')}
              className="w-full gap-2 font-semibold text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Canal 1
            </Button>
          </Card>

          {/* Cancha 2 */}
          <Card className="border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Cancha 2 (Fútbol 7)</span>
              <Badge variant="secondary" className="text-xs">Canal 2</Badge>
            </div>
            <Input
              value={camera2.streamUrl || ''}
              onChange={(e) => setCamera2({ ...camera2, streamUrl: e.target.value })}
              placeholder="Enlace de stream o carpeta de grabaciones..."
              className="text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveCamera(camera2, 'cancha-2')}
              className="w-full gap-2 font-semibold text-xs"
            >
              <Save className="h-3.5 w-3.5" /> Guardar Canal 2
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
