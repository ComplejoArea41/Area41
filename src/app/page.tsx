'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Goal, Sparkles, X, Megaphone } from 'lucide-react';
import { DynamicLogo } from '@/components/dynamic-logo';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Advertisement } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

export default function WelcomePage() {
  const router = useRouter();
  const firestore = useFirestore();
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('hideMigrationNotice');
    if (!dismissed) setShowMigrationNotice(true);
  }, []);

  const dismissNotice = () => {
    localStorage.setItem('hideMigrationNotice', 'true');
    setShowMigrationNotice(false);
  };

  const adsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'advertisements'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: ads } = useCollection<Advertisement>(adsQuery);

  return (
      <div className="relative flex flex-1 flex-col items-center justify-start p-4 pt-12">
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl">
            
            {showMigrationNotice && (
              <Alert className="mb-8 bg-primary/20 border-primary text-foreground relative max-w-lg">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="font-bold text-primary">¡Nueva Versión!</AlertTitle>
                <AlertDescription className="text-xs opacity-90 pr-6">
                  Si tenías el ícono viejo, <strong>bórralo y vuelve a instalar la App</strong> desde el menú de arriba para activar las nuevas notificaciones.
                </AlertDescription>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={dismissNotice}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Alert>
            )}

            <div className="text-center mb-12">
                <DynamicLogo />
            </div>

            <div className="flex w-full max-w-md flex-col gap-6 mb-16">
                <Button
                  className="h-auto w-full p-0 bg-card/80 hover:bg-card/95 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary/20 rounded-lg ring-1 ring-white/10"
                  onClick={() => router.push('/reservations')}
                >
                  <div className="flex flex-row items-center gap-4 p-4 w-full">
                    <div className="p-4 bg-primary rounded-full">
                        <Goal className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <div className="flex flex-col text-left">
                      <h3 className="text-xl font-semibold text-card-foreground">Reservar Cancha</h3>
                      <p className="text-sm text-muted-foreground">Asegura tu lugar para el partido.</p>
                    </div>
                  </div>
                </Button>
                <p className="text-lg text-primary text-center font-bold tracking-widest uppercase">
                    Complejo Deportivo Area41
                </p>
            </div>

            {/* Sección de Publicidades */}
            {ads && ads.length > 0 && (
                <div className="w-full space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-primary pl-4">
                        <Megaphone className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold tracking-tight">Nuestras Promociones</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ads.map((ad) => (
                            <Card key={ad.id} className="bg-card/40 backdrop-blur-sm border-white/5 overflow-hidden hover:border-primary/30 transition-colors">
                                <CardContent className="p-0">
                                    <div className="relative aspect-[4/3] w-full">
                                        <Image 
                                            src={ad.imageUrl} 
                                            alt={ad.title} 
                                            fill 
                                            className="object-cover" 
                                        />
                                    </div>
                                    <div className="p-4 bg-background/60">
                                        <p className="text-center font-semibold text-primary uppercase tracking-wider">{ad.title}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
  );
}