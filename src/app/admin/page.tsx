'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const userRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [user, firestore]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) {
                router.push('/login');
            } else if (userProfile && !userProfile.isAdmin) {
                router.push('/');
            }
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    if (isUserLoading || isProfileLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Verificando acceso...</p>
            </div>
          );
    }
  
  return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-6 w-6 text-primary" />
                Panel de Administración
            </CardTitle>
            <CardDescription>
                Aquí podrás gestionar los precios, torneos y otras configuraciones del complejo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Próximamente: herramientas para administrar el sitio.</p>
          </CardContent>
        </Card>
      </div>
  );
}
