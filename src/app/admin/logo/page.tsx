
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
import { collection, doc, writeBatch, getDocs, Firestore, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { LogoImage } from "@/lib/types";
import { Trash2, Edit, PlusCircle, Image as ImageIcon, Upload, Award } from "lucide-react";
import NextImage from "next/image";
import { v4 as uuidv4 } from 'uuid';

type FormData = Omit<LogoImage, 'id' | 'isActive' | 'storagePath'>;

const initialLogoData: Omit<LogoImage, 'id' | 'storagePath'> = {
    name: "Area 41 Logo (Default)",
    imageUrl: "https://storage.googleapis.com/aif-public-images/area-41-logo.png",
    isActive: true,
};


async function seedInitialLogo(firestore: Firestore) {
    const logoCollectionRef = collection(firestore, 'logo_images');
    const snapshot = await getDocs(logoCollectionRef);
    if (snapshot.empty) {
        console.log("No logos found, seeding initial data...");
        try {
             await addDoc(logoCollectionRef, initialLogoData);
             console.log("Initial logo seeded successfully.");
        } catch (error) {
            console.error("Error seeding initial logo:", error);
        }
    }
}


export default function AdminLogoPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const logosCollectionRef = useMemoFirebase(() => collection(firestore, 'logo_images'), [firestore]);
    const { data: logoImages, isLoading: areLogosLoading, error: logosError } = useCollection<LogoImage>(logosCollectionRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<LogoImage | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: '', imageUrl: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (firestore) {
            seedInitialLogo(firestore).catch(console.error);
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

    const openDialogForEdit = (image: LogoImage) => {
        setEditingImage(image);
        setFormData({ name: image.name, imageUrl: image.imageUrl });
        setSelectedFile(null);
        setUploadProgress(0);
        setIsDialogOpen(true);
    };

    const handleDeleteImage = async (image: LogoImage) => {
        if (!firestore || !storage) return;
        
        const imageRef = doc(firestore, 'logo_images', image.id);
        deleteDocumentNonBlocking(imageRef);

        if (image.storagePath) {
            const storageRef = ref(storage, image.storagePath);
            try {
                await deleteObject(storageRef);
            } catch (error) {
                console.error("Error deleting from storage:", error);
            }
        }

        toast({ title: "¡Logo eliminado!", description: "El logo ha sido eliminado." });
    };

    const handleSetActive = async (activeImage: LogoImage) => {
        if (!firestore || !logoImages) return;
        const batch = writeBatch(firestore);
        logoImages.forEach(img => {
            const docRef = doc(firestore, 'logo_images', img.id);
            if (img.id === activeImage.id) {
                 batch.update(docRef, { isActive: !img.isActive });
            } else if (img.isActive) {
                batch.update(docRef, { isActive: false });
            }
        });

        try {
            await batch.commit();
            toast({
                title: 'Logo actualizado',
                description: `Se ha establecido un nuevo logo.`,
            });
        } catch (error) {
            console.error('Error setting active logo: ', error);
            toast({
                title: 'Error',
                description: 'No se pudo actualizar el logo activo.',
                variant: 'destructive',
            });
        }
    };
    
    const handleSaveChanges = () => {
        if (!firestore || !storage) return;

        if (formData.name.trim() === '') {
            toast({ variant: "destructive", title: "Error", description: "El nombre no puede estar vacío." });
            return;
        }

        setIsSaving(true);
        setUploadProgress(0);

        if (selectedFile) {
            const storagePath = `logos/${uuidv4()}-${selectedFile.name}`;
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
                            const imageRef = doc(firestore, 'logo_images', editingImage.id);
                            await setDocumentNonBlocking(imageRef, imageData, { merge: true });
                            toast({ title: "¡Logo actualizado!", description: "Los cambios se han guardado." });
                        } else {
                            const collectionRef = collection(firestore, 'logo_images');
                            await addDocumentNonBlocking(collectionRef, { ...imageData, isActive: false });
                            toast({ title: "¡Logo agregado!", description: "El nuevo logo ya está disponible." });
                        }
                        setIsDialogOpen(false);
                    } catch (error) {
                        console.error("Error saving document to Firestore:", error);
                        toast({ variant: "destructive", title: "Error al guardar", description: "No se pudieron guardar los datos del logo." });
                    } finally {
                        setIsSaving(false);
                    }
                }
            );
        } else if (editingImage) {
             const imageData = {
                name: formData.name,
                imageUrl: formData.imageUrl,
            };
             const imageRef = doc(firestore, 'logo_images', editingImage.id);
            setDocumentNonBlocking(imageRef, imageData, { merge: true });
            toast({ title: "¡Logo actualizado!", description: "Los cambios se han guardado." });
            setIsDialogOpen(false);
            setIsSaving(false);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Debes seleccionar un archivo para un nuevo logo." });
            setIsSaving(false);
        }
    };


    const isLoading = isUserLoading || isProfileLoading || areLogosLoading;
    
    if (isLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando gestión de logos...</p>
            </div>
        );
    }
    
    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-5xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Logo de la Aplicación</CardTitle>
                        <CardDescription>
                            Añade, edita o elimina logos. Activa uno para mostrarlo en la esquina inferior derecha.
                        </CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Logo
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {logoImages?.map((image) => (
                            <Card key={image.id} className="bg-card/60 overflow-hidden">
                                <div className="relative aspect-square p-4 flex items-center justify-center">
                                     <NextImage src={image.imageUrl} alt={image.name} layout="fill" objectFit="contain" />
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
                                        <Label htmlFor={`active-switch-${image.id}`}>Activo</Label>
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
                      {(!logoImages || logoImages.length === 0) && !areLogosLoading && (
                        <div className="text-center py-16 text-muted-foreground col-span-full">
                            <Award className="mx-auto h-12 w-12" />
                            <p className="mt-4">No hay logos. ¡Sube el primero!</p>
                        </div>
                    )}
                    {logosError && (
                        <div className="text-center py-16 text-destructive col-span-full">
                             <p className="mt-4">Error al cargar los logos: {logosError.message}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingImage ? 'Editar Logo' : 'Nuevo Logo'}</DialogTitle>
                        <DialogDescription>
                            {editingImage ? 'Modifica los detalles del logo.' : 'Sube un nuevo logo.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nombre</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                             <Label htmlFor="picture" className="text-right">Archivo</Label>
                            <div className="col-span-3">
                                <Input id="picture" type="file" onChange={handleFileChange} accept="image/png, image/jpeg, image/svg+xml" />
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

    