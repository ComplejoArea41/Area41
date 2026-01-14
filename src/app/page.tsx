
'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Goal, Utensils } from 'lucide-react';
import Image from 'next/image';

export default function WelcomePage() {
  const router = useRouter();

  const menuOptions = [
    {
      title: 'Reservar Cancha',
      description: 'Asegura tu lugar y diviértete con amigos.',
      icon: <Goal className="h-10 w-10 text-primary-foreground" />,
      path: '/reservations',
    },
    {
      title: 'Menú del Buffet',
      description: 'Recarga energías con nuestras deliciosas opciones.',
      icon: <Utensils className="h-10 w-10 text-primary-foreground" />,
      path: '/buffet',
    },
  ];

  const logoUrl = "https://storage.googleapis.com/aif-public-images/area-41-banner.png";

  return (
      <div className="relative flex flex-1 flex-col items-center justify-center p-4">
        {/* Contenido principal, que se mostrará sobre la imagen */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full">
            <div className="text-center mb-12">
                <Image
                  src={logoUrl}
                  alt="Area 41 Logo"
                  width={600}
                  height={240}
                  className="object-contain"
                  priority
                />
            </div>

            <div className="flex w-full max-w-md flex-col gap-6">
              {menuOptions.map((option) => (
                <Button
                  key={option.title}
                  variant="ghost"
                  className="h-auto w-full p-0 bg-card/80 hover:bg-card/95 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary/20 rounded-lg ring-1 ring-white/10"
                  onClick={() => router.push(option.path)}
                >
                  <div className="flex flex-row items-center gap-4 p-4 w-full">
                    <div className="p-4 bg-primary rounded-full">
                        {option.icon}
                    </div>
                    <div className="flex flex-col text-left">
                      <h3 className="text-xl font-semibold text-card-foreground">{option.title}</h3>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </div>
                </Button>
              ))}
                <p className="mt-2 text-lg text-primary text-center">
                    TU COMPLEJO DEPORTIVO
                </p>
            </div>
        </div>
      </div>
  );
}
