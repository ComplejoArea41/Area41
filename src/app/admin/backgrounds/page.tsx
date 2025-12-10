
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
import { collection, doc, writeBatch, getDocs, Firestore, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BackgroundImage } from "@/lib/types";
import { Trash2, Edit, PlusCircle, Image as ImageIcon } from "lucide-react";
import NextImage from "next/image";

type FormData = Omit<BackgroundImage, 'id' | 'isActive'>;

const initialImageData: Omit<BackgroundImage, 'id'> = {
    name: "Campo de Juego",
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1935&auto=format&fit=crop",
    isActive: true,
};


async function seedInitialBackground(firestore: Firestore) {
    const bgCollectionRef = collection(firestore, 'background_images');
    const snapshot = await getDocs(bgCollectionRef);
    if (snapshot.empty) {
        console.log("No background images found, seeding initial data...");
        try {
             await addDoc(bgCollectionRef, initialImageData);
             console.log("Initial background seeded successfully.");
        } catch (error) {
            console.error("Error seeding initial background:", error);
        }
    }
}


export default function AdminBackgroundsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const backgroundsCollectionRef = useMemoFirebase(() => collection(firestore, 'background_images'), [firestore]);
    const { data: backgroundImages, isLoading: areBgsLoading, error: bgsError } = useCollection<BackgroundImage>(backgroundsCollectionRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<BackgroundImage | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: '', imageUrl: '' });

    useEffect(() => {
        if (firestore) {
            seedInitialBackground(firestore).catch(console.error);
        }
    }, [firestore]);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const openDialogForNew = () => {
        setEditingImage(null);
        setFormData({ name: '', imageUrl: '' });
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (image: BackgroundImage) => {
        setEditingImage(image);
        setFormData({ name: image.name, imageUrl: image.imageUrl });
        setIsDialogOpen(true);
    };

    const handleDeleteImage = async (imageId: string) => {
        if (!firestore) return;
        const imageRef = doc(firestore, 'background_images', imageId);
        deleteDocumentNonBlocking(imageRef);
        toast({ title: "¡Imagen eliminada!", description: "La imagen de fondo ha sido eliminada." });
    };

    const handleSetActive = async (activeImage: BackgroundImage) => {
        if (!firestore || !backgroundImages) return;
        const batch = writeBatch(firestore);
        backgroundImages.forEach(img => {
            const docRef = doc(firestore, 'background_images', img.id);
            if (img.id === activeImage.id) {
                batch.update(docRef, { isActive: !img.isActive });
            } else if (img.isActive) {
                batch.update(docRef, { isActive: false });
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'Fondo actualizado',
                description: `Se ha establecido un nuevo fondo de pantalla.`,
            });
        } catch (error) {
            console.error('Error setting active background: ', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar la imagen de fondo activa.',
                variant: 'destructive',
            });
        }
    };
    
    const handleSaveChanges = async () => {
        if (!firestore) return;
        setIsSaving(true);

        const isFormValid = formData.name.trim() !== '' && formData.imageUrl.trim() !== '';
        if (!isFormValid) {
            toast({ variant: "destructive", title: "Error", description: "El nombre y la URL de la imagen no pueden estar vacíos." });
            setIsSaving(false);
            return;
        }

        try {
            if (editingImage) {
                const imageRef = doc(firestore, 'background_images', editingImage.id);
                setDocumentNonBlocking(imageRef, formData, { merge: true });
                toast({ title: "¡Imagen actualizada!", description: "Los cambios se han guardado." });
            } else {
                const collectionRef = collection(firestore, 'background_images');
                await addDocumentNonBlocking(collectionRef, { ...formData, isActive: false });
                toast({ title: "¡Imagen agregada!", description: "La nueva imagen ya está disponible." });
            }
            setIsDialogOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || isProfileLoading || areBgsLoading;
    
    if (isLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando gestión de imágenes...</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-5xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Imágenes de Fondo</CardTitle>
                        <CardDescription>
                            Añade, edita o elimina imágenes de fondo para la aplicación. Activa una para mostrarla.
                        </CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nueva Imagen
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {backgroundImages?.map((image) => (
                            <Card key={image.id} className="bg-card/60 overflow-hidden">
                                <div className="relative aspect-video">
                                     <NextImage src={image.imageUrl} alt={image.name} layout="fill" objectFit="cover" />
                                </div>
                                <CardHeader>
                                    <CardTitle className="truncate">{image.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id={`active-switch-${image.id}`}
                                            checked={image.isActive}
                                            onCheckedChange={() => handleSetActive(image)}
                                        />
                                        <Label htmlFor={`active-switch-${image.id}`}>Activa</Label>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                    <Button variant="outline" size="icon" onClick={() => openDialogForEdit(image)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(image.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                     </div>
                      {(!backgroundImages || backgroundImages.length === 0) && !areBgsLoading && (
                        <div className="text-center py-16 text-muted-foreground col-span-full">
                            <ImageIcon className="mx-auto h-12 w-12" />
                            <p className="mt-4">No hay imágenes de fondo. ¡Añade la primera!</p>
                        </div>
                    )}
                    {bgsError && (
                        <div className="text-center py-16 text-destructive col-span-full">
                             <p className="mt-4">Error al cargar las imágenes: {bgsError.message}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingImage ? 'Editar Imagen' : 'Nueva Imagen'}</DialogTitle>
                        <DialogDescription>
                            {editingImage ? 'Modifica los detalles de la imagen.' : 'Añade una nueva imagen de fondo.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nombre</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="imageUrl" className="text-right">URL de Imagen</Label>
                            <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
