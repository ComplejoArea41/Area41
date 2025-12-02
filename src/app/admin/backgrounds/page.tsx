
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
import { collection, doc, writeBatch } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BackgroundImage } from "@/lib/types";
import { Trash2, Edit, PlusCircle, Image as ImageIcon } from "lucide-react";
import NextImage from "next/image";

type FormData = Omit<BackgroundImage, 'id' | 'isActive'>;

export default function AdminBackgroundsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const backgroundsCollectionRef = useMemoFirebase(() => collection(firestore, 'background_images'), [firestore]);
    const { data: backgroundImages, isLoading: areBgsLoading } = useCollection<BackgroundImage>(backgroundsCollectionRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<BackgroundImage | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: '', imageUrl: '' });

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
        try {
            await deleteDocumentNonBlocking(imageRef);
            toast({ title: "¡Imagen eliminada!", description: "La imagen de fondo ha sido eliminada." });
        } catch (error) {
            console.error("Error deleting image: ", error);
            toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar la imagen." });
        }
    };

    const handleSetActive = async (activeImage: BackgroundImage) => {
        if (!firestore || !backgroundImages) return;

        const batch = writeBatch(firestore);

        // Deactivate all other images
        backgroundImages.forEach(img => {
            if (img.id !== activeImage.id && img.isActive) {
                const docRef = doc(firestore, 'background_images', img.id);
                batch.update(docRef, { isActive: false });
            }
        });
        
        // Activate the selected one
        const activeDocRef = doc(firestore, 'background_images', activeImage.id);
        batch.update(activeDocRef, { isActive: !activeImage.isActive });

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
        } catch (error) {
            console.error("Error saving image: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar la imagen." });
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

    