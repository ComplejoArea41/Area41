'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert, ArrowRight, Utensils, Goal, ImageIcon } from "lucide-react";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Verificando acceso...</p>
            </div>
          );
    }
  
  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-4xl">
            <Card className="bg-card/80 backdrop-blur-sm w-full mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                        Panel de Administración
                    </CardTitle>
                    <CardDescription>
                        Aquí podrás gestionar los precios y otras configuraciones del complejo.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Goal />Gestión de Canchas</CardTitle>
                        <CardDescription>
                            Modifica los precios y la disponibilidad de las canchas de Fútbol 5 y Fútbol 7.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/admin/courts')}>
                            Administrar Canchas <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Utensils />Gestión de Buffet</CardTitle>
                        <CardDescription>
                           Añade o modifica los precios y artículos del menú del buffet.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/buffet')}>
                            Administrar Menú <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ImageIcon />Gestión de Fondos</CardTitle>
                        <CardDescription>
                           Añade o modifica la imagen de fondo de la aplicación.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <Button onClick={() => router.push('/admin/backgrounds')}>
                            Administrar Fondos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
      </div>
  );
}
