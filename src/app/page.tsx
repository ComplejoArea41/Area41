'use client';
import LayoutWrapper from '@/components/layout-wrapper';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';

export default function WelcomePage() {
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
        <p className="text-primary-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <LayoutWrapper showBackButton={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
            <p className="text-primary-foreground text-2xl">colocar imagen</p>
        </div>
    </LayoutWrapper>
  );
}
