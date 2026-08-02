'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Goal, Megaphone } from 'lucide-react';
import { DynamicLogo } from '@/components/dynamic-logo';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Advertisement } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';

export default function WelcomePage() {
  const router = useRouter();
  const firestore = useFirestore();

  const adsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'advertisements'), where('isActive', '==', true)) : null),
    [firestore]
  );
  const { data: ads } = useCollection<Advertisement>(adsQuery);

  return (
      <div className="relative flex flex-1 flex-col items-center justify-start p-4 pt-12">
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl">
            
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

            {/* Sección de Publicidades Minimalista al Final */}
            {ads && ads.length > 0 && (
                <div className="w-full mt-auto pt-8 border-t border-white/10">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
                        <Megaphone className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Auspiciantes</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {ads.map((ad) => (
                            <div key={ad.id} className="group relative">
                                <Card className="bg-card/30 backdrop-blur-sm border-white/5 overflow-hidden w-24 h-24 hover:border-primary/50 transition-all transform hover:scale-110">
                                    <CardContent className="p-0 w-full h-full">
                                        <img 
                                            src={ad.imageUrl} 
                                            alt={ad.title} 
                                            className="w-full h-full object-cover" 
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
  );
}
