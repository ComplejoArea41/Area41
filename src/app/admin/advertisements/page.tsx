'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Advertisement, User } from "@/lib/types";
import { Trash2, Edit, PlusCircle, Megaphone } from "lucide-react";
import Image from "next/image";

type FormData = Omit<Advertisement, 'id'>;

export default function AdminAdvertisementsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<User>(userRef);

    const adsCollectionRef = useMemoFirebase(() => collection(firestore, 'advertisements'), [firestore]);
    const { data: ads, isLoading: areAdsLoading } = useCollection<Advertisement>(adsCollectionRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
    const [formData, setFormData] = useState<FormData>({ title: '', imageUrl: '', isActive: true });

    useEffect(() => {
        if (isUserLoading || isProfileLoading) return;
        if (!user) {
            router.push('/login');
        } else if (userProfile && !userProfile.isAdmin) {
            router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const openDialogForNew = () => {
        setEditingAd(null);
        setFormData({ title: '', imageUrl: '', isActive: true });
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (ad: Advertisement) => {
        setEditingAd(ad);
        setFormData({ title: ad.title, imageUrl: ad.imageUrl, isActive: ad.isActive });
        setIsDialogOpen(true);
    };

    const handleDeleteAd = async (adId: string) => {
        if (!firestore) return;
        const adRef = doc(firestore, 'advertisements', adId);
        try {
            await deleteDocumentNonBlocking(adRef);
            toast({ title: "¡Publicidad eliminada!" });
        } catch (error) {
            console.error(error);
        }
    };

    const handleToggleActive = (ad: Advertisement) => {
        if(!firestore) return;
        const adRef = doc(firestore, 'advertisements', ad.id);
        setDocumentNonBlocking(adRef, { isActive: !ad.isActive }, { merge: true });
    };
    
    const handleSaveChanges = async () => {
        if (!firestore) return;
        if (!formData.title || !formData.imageUrl) {
            toast({ variant: "destructive", title: "Campos incompletos" });
            return;
        }
        
        setIsSaving(true);
        try {
            if (editingAd) {
                const adRef = doc(firestore, 'advertisements', editingAd.id);
                setDocumentNonBlocking(adRef, formData, { merge: true });
                toast({ title: "¡Actualizada!" });
            } else {
                const collectionRef = collection(firestore, 'advertisements');
                await addDocumentNonBlocking(collectionRef, formData);
                toast({ title: "¡Agregada!" });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserLoading || isProfileLoading || areAdsLoading) {
        return <div className="p-8 text-center">Cargando publicidad...</div>;
    }
    
    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-5xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Publicidades</CardTitle>
                        <CardDescription>Añade imágenes de ofertas o sponsors para la página de inicio.</CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Publi
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ads?.map((ad) => (
                            <Card key={ad.id} className="bg-card/60 overflow-hidden">
                                <div className="relative aspect-video">
                                     <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                                </div>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base truncate">{ad.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={ad.isActive}
                                            onCheckedChange={() => handleToggleActive(ad)}
                                        />
                                        <Label className="text-xs">Visible</Label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openDialogForEdit(ad)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteAd(ad.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                     </div>
                      {(!ads || ads.length === 0) && (
                        <div className="text-center py-16 text-muted-foreground col-span-full">
                            <Megaphone className="mx-auto h-12 w-12 opacity-20" />
                            <p className="mt-4">No hay publicidades creadas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAd ? 'Editar' : 'Nueva'} Publicidad</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Título / Referencia</Label>
                            <Input name="title" value={formData.title} onChange={handleInputChange} placeholder="Ej: Promo Fernet" />
                        </div>
                        <div className="grid gap-2">
                            <Label>URL de la Imagen</Label>
                            <Input name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}