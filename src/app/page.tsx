'use client';

import {
  Card,
  CardContent,
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
      icon: <Goal className="h-8 w-8 text-primary" />,
      path: '/reservations',
    },
    {
      title: 'Menú del Buffet',
      description: 'Recarga energías con nuestras deliciosas opciones.',
      icon: <Utensils className="h-8 w-8 text-primary" />,
      path: '/buffet',
    },
    {
      title: 'Ver Torneos',
      description: 'Compite por la gloria y siéntete un campeón.',
      icon: <Trophy className="h-8 w-8 text-primary" />,
      path: '/tournaments',
    },
  ];

  return (
    <LayoutWrapper showBackButton={false}>
      <div className="flex flex-1 flex-col items-center justify-center p-4">
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
              className="bg-card/60 hover:bg-card/90 cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
              onClick={() => router.push(option.path)}
            >
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                    {option.icon}
                </div>
                <div className="flex flex-col">
                  <CardTitle>{option.title}</CardTitle>
                  <CardDescription className="text-left">{option.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </LayoutWrapper>
  );
}
