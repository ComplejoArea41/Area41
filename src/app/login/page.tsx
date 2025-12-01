'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth, useUser } from '@/firebase';
import {
  initiateEmailSignIn,
  initiateEmailSignUp,
} from '@/firebase/non-blocking-login';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuthAction = () => {
    if (isSigningUp) {
      initiateEmailSignUp(auth, email, password);
    } else {
      initiateEmailSignIn(auth, email, password);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark bg-background">
        <p className="text-primary-foreground">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background dark p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Bienvenidos a Area 41
          </CardTitle>
          <CardDescription>
            {isSigningUp
              ? 'Ingresa tu email y contraseña para registrarte.'
              : 'Ingresa para continuar.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleAuthAction}>
            {isSigningUp ? 'Registrarse' : 'Ingresar'}
          </Button>
          <Button
            variant="link"
            className="w-full"
            onClick={() => setIsSigningUp(!isSigningUp)}
          >
            {isSigningUp
              ? '¿Ya tienes una cuenta? Inicia sesión'
              : '¿No tienes una cuenta? Regístrate'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
