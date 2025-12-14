'use client';

import { useDoc, useFirestore, useUser } from "@/firebase";
import { useMemoFirebase } from "@/firebase/provider";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Reservation } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ReservationVideoPage({ params }: { params: { reservationId: string } }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { reservationId } = params;
    const router = useRouter();

    const reservationRef = useMemoFirebase(
        () => (reservationId ? doc(firestore, 'reservations', reservationId) : null),
        [firestore, reservationId]
    );
    const { data: reservation, isLoading: isReservationLoading } = useDoc<Reservation>(reservationRef);

    if (isUserLoading || isReservationLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                <p className="text-white">Cargando video...</p>
            </div>
        );
    }
    
    // Security check: ensure the user owns this reservation or is an admin
    if (reservation && user && reservation.userId !== user.uid) {
         // Add admin check later if needed
         router.push('/my-matches');
         return null;
    }
    
    if (!reservation) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                 <Button variant="ghost" onClick={() => router.back()} className="absolute top-4 left-4 text-white z-20">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <p className="text-white">Reserva no encontrada.</p>
            </div>
        );
    }
    
    if (!reservation.videoUrl) {
         return (
            <div className="flex min-h-screen items-center justify-center bg-black">
                 <Button variant="ghost" onClick={() => router.back()} className="absolute top-4 left-4 text-white z-20">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <p className="text-white">Este partido no tiene una grabación disponible.</p>
            </div>
        );
    }


    return (
        <div className="relative w-full h-screen bg-black flex items-center justify-center">
             <Button variant="ghost" onClick={() => router.back()} className="absolute top-4 left-4 bg-black/50 hover:bg-black/75 text-white z-20">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            <video
                controls
                autoPlay
                className="w-full h-full object-contain"
                src={reservation.videoUrl}
            >
                Tu navegador no soporta el tag de video.
            </video>
        </div>
    )

}
