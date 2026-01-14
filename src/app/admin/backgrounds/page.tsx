
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
import { Progress } from "@/components/ui/progress";
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking, useStorage } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { BackgroundImage } from "@/lib/types";
import { Trash2, Edit, PlusCircle, Image as ImageIcon } from "lucide-react";
import NextImage from "next/image";
import { v4 as uuidv4 } from 'uuid';

type FormData = Omit<BackgroundImage, 'id' | 'isActive' | 'storagePath'>;

export default function AdminBackgroundsPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };
    
    const openDialogForNew = () => {
        setEditingImage(null);
        setFormData({ name: '', imageUrl: '' });
        setSelectedFile(null);
        setUploadProgress(0);
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (image: BackgroundImage) => {
        setEditingImage(image);
        setFormData({ name: image.name, imageUrl: image.imageUrl });
        setSelectedFile(null);
        setUploadProgress(0);
        setIsDialogOpen(true);
    };

    const handleDeleteImage = async (image: BackgroundImage) => {
        if (!firestore || !storage) return;
        
        const imageRef = doc(firestore, 'background_images', image.id);
        deleteDocumentNonBlocking(imageRef);

        if (image.storagePath) {
            const storageRef = ref(storage, image.storagePath);
            try {
                await deleteObject(storageRef);
            } catch (error) {
                console.error("Error deleting from storage (it might not exist or permissions failed):", error);
            }
        }

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
        if (!firestore || !storage) return;

        if (formData.name.trim() === '') {
            toast({ variant: "destructive", title: "Error", description: "El nombre no puede estar vacío." });
            return;
        }

        // If no file and no new URL, and not editing, it's an error.
        if (!selectedFile && !formData.imageUrl.trim() && !editingImage) {
            toast({ variant: "destructive", title: "Error", description: "Debes proporcionar una URL o seleccionar un archivo." });
            return;
        }
        
        setIsSaving(true);
        setUploadProgress(0);

        // --- Priority 1: A file was selected for upload ---
        if (selectedFile) {
            const storagePath = `backgrounds/${uuidv4()}-${selectedFile.name}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Upload failed:", error);
                    toast({ variant: "destructive", title: "Error al subir", description: "No se pudo subir el archivo." });
                    setIsSaving(false);
                },
                async () => {
                    try {
                        const finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        const imageData = {
                            name: formData.name,
                            imageUrl: finalImageUrl,
                            storagePath: storagePath,
                        };

                        if (editingImage) {
                            // If we were editing, and uploaded a new file, delete the old one from storage if it exists
                            if (editingImage.storagePath) {
                                const oldStorageRef = ref(storage, editingImage.storagePath);
                                try { await deleteObject(oldStorageRef); } catch (e) { console.warn("Could not delete old storage object", e); }
                            }
                            const imageRef = doc(firestore, 'background_images', editingImage.id);
                            setDocumentNonBlocking(imageRef, imageData, { merge: true });
                            toast({ title: "¡Imagen actualizada!", description: "La nueva imagen se ha subido y guardado." });
                        } else {
                            const collectionRef = collection(firestore, 'background_images');
                            addDocumentNonBlocking(collectionRef, { ...imageData, isActive: false });
                            toast({ title: "¡Imagen agregada!", description: "La nueva imagen ya está disponible." });
                        }
                        setIsDialogOpen(false);
                    } catch (error) {
                        console.error("Error getting download URL or saving document to Firestore:", error);
                        toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron guardar los datos de la imagen." });
                    } finally {
                        setIsSaving(false);
                    }
                }
            );
        } 
        // --- Priority 2: No file, but a URL is provided or an existing image is being edited ---
        else if (formData.imageUrl.trim() || editingImage) {
            const imageData = {
                name: formData.name,
                imageUrl: formData.imageUrl, // Use the URL from the form
                storagePath: editingImage?.storagePath || null, // Preserve old storage path if only URL is changed
            };
            
            if (editingImage) {
                 // Check if the URL has changed. If so, and if the old image was from storage, delete it.
                if (editingImage.imageUrl !== formData.imageUrl && editingImage.storagePath) {
                     const oldStorageRef = ref(storage, editingImage.storagePath);
                     try { 
                        await deleteObject(oldStorageRef); 
                        imageData.storagePath = null; // Clear storage path as it's now a URL based image
                    } catch (e) { console.warn("Could not delete old storage object", e); }
                }
                const imageRef = doc(firestore, 'background_images', editingImage.id);
                setDocumentNonBlocking(imageRef, imageData, { merge: true });
                toast({ title: "¡Imagen actualizada!", description: "Los cambios se han guardado." });
            } else {
                 const collectionRef = collection(firestore, 'background_images');
                 addDocumentNonBlocking(collectionRef, { ...imageData, isActive: false, storagePath: null });
                 toast({ title: "¡Imagen agregada!", description: "La nueva imagen ya está disponible." });
            }
            setIsDialogOpen(false);
            setIsSaving(false);
        } else {
            // Should not happen due to initial checks, but as a fallback.
            toast({ variant: "destructive", title: "Error", description: "Acción no válida."});
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || isProfileLoading || areBgsLoading;
    
    if (isLoading || (user && !userProfile)) {
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
                                    <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(image)}>
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
                            <Input id="imageUrl" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="col-span-3" placeholder="https://ejemplo.com/imagen.jpg"/>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="picture" className="text-right">O subir archivo</Label>
                            <div className="col-span-3">
                                <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" />
                            </div>
                        </div>
                        {isSaving && (
                            <div className="col-span-4 space-y-2">
                                <Label>Subiendo...</Label>
                                <Progress value={uploadProgress} />
                            </div>
                        )}
                        {selectedFile && <p className="text-sm text-muted-foreground col-span-4 text-center">Archivo seleccionado: {selectedFile.name}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? `Subiendo... ${Math.round(uploadProgress)}%` : 'Guardar Cambios'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

