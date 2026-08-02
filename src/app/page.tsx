
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Goal, Utensils, Sparkles, X } from 'lucide-react';
import { DynamicLogo } from '@/components/dynamic-logo';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function WelcomePage() {
  const router = useRouter();
  const [showMigrationNotice, setShowMigrationNotice] = useState(false);

  useEffect(() => {
    // Solo mostramos el aviso si no lo han cerrado antes
    const dismissed = localStorage.getItem('hideMigrationNotice');
    if (!dismissed) {
      setShowMigrationNotice(true);
    }
  }, []);

  const dismissNotice = () => {
    localStorage.setItem('hideMigrationNotice', 'true');
    setShowMigrationNotice(false);
  };

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

  return (
      <div className="relative flex flex-1 flex-col items-center justify-center p-4">
        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-lg">
            
            {showMigrationNotice && (
              <Alert className="mb-8 bg-primary/20 border-primary text-foreground relative animate-in fade-in slide-in-from-top-4 duration-500">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertTitle className="font-bold text-primary">¡Bienvenidos a la nueva versión!</AlertTitle>
                <AlertDescription className="text-xs opacity-90 pr-6">
                  Hemos actualizado nuestra aplicación para brindarte un mejor servicio. 
                  Si tenías el ícono en tu pantalla de inicio, <strong>bórralo y vuelve a agregarlo</strong> (opción "Instalar" o "Agregar a inicio") para activar las nuevas notificaciones.
                </AlertDescription>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={dismissNotice}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Alert>
            )}

            <div className="text-center mb-12">
                <DynamicLogo />
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
                <p className="mt-2 text-lg text-primary text-center font-bold tracking-widest">
                    TU COMPLEJO DEPORTIVO
                </p>
            </div>
        </div>
      </div>
  );
}
