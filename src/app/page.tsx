'use client';

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import LayoutWrapper from '@/components/layout-wrapper';
import { Goal, Utensils, Trophy } from 'lucide-react';

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
    {
      title: 'Ver Torneos',
      description: 'Compite por la gloria y siéntete un campeón.',
      icon: <Trophy className="h-10 w-10 text-primary-foreground" />,
      path: '/tournaments',
    },
  ];

  return (
    <LayoutWrapper showBackButton={false}>
      <div className="relative flex flex-1 flex-col items-center justify-center p-4">
        {/* Capa de fondo con imagen */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage: "linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('https://storage.googleapis.com/aif-public-images/soccer-ball-on-field.jpg')",
          }}
          data-ai-hint="soccer ball field"
        ></div>
        
        {/* Contenido principal, que se mostrará sobre la imagen */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
                ÁREA 41
              </h1>
              <p className="mt-2 text-lg text-primary">
                TU COMPLEJO DEPORTIVO
              </p>
            </div>

            <div className="flex w-full max-w-md flex-col gap-6">
              {menuOptions.map((option) => (
                <Card
                  key={option.title}
                  className="bg-card/80 hover:bg-card/95 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
                  onClick={() => router.push(option.path)}
                >
                  <CardHeader className="flex flex-row items-center gap-4 p-4">
                    <div className="p-4 bg-primary rounded-full">
                        {option.icon}
                    </div>
                    <div className="flex flex-col">
                      <CardTitle className="text-xl">{option.title}</CardTitle>
                      <CardDescription className="text-left">{option.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
        </div>
      </div>
    </LayoutWrapper>
  );
}
