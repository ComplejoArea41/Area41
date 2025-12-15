
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
  } from "@/components/ui/dialog"
import { useUser, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@/lib/types";
import { Trash2, Edit, PlusCircle, Utensils } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

type FormData = Omit<MenuItem, 'id'>;

export default function AdminBuffetPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const menuItemsCollectionRef = useMemoFirebase(() => collection(firestore, 'menu_items'), [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsCollectionRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: '', description: '', price: 0, type: 'Comida', imageUrl: '' });

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    };

    const handleSelectChange = (value: 'Comida' | 'Bebida') => {
        setFormData(prev => ({ ...prev, type: value }));
    };
    
    const openDialogForNew = () => {
        setEditingItem(null);
        setFormData({ name: '', description: '', price: 0, type: 'Comida', imageUrl: '' });
        setIsDialogOpen(true);
    };

    const openDialogForEdit = (item: MenuItem) => {
        setEditingItem(item);
        setFormData({ name: item.name, description: item.description, price: item.price, type: item.type, imageUrl: item.imageUrl || '' });
        setIsDialogOpen(true);
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        const itemRef = doc(firestore, 'menu_items', itemId);
        try {
            await deleteDocumentNonBlocking(itemRef);
            toast({ title: "¡Artículo eliminado!", description: "El artículo ha sido eliminado correctamente." });
        } catch (error) {
            console.error("Error deleting item: ", error);
            toast({ variant: "destructive", title: "Error al eliminar", description: "No se pudo eliminar el artículo." });
        }
    };
    
    const handleSaveChanges = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            if (editingItem) { 
                const itemRef = doc(firestore, 'menu_items', editingItem.id);
                setDocumentNonBlocking(itemRef, formData, { merge: true });
                toast({ title: "¡Artículo actualizado!", description: "Los cambios se han guardado." });
            } else { 
                const collectionRef = collection(firestore, 'menu_items');
                await addDocumentNonBlocking(collectionRef, formData);
                toast({ title: "¡Artículo agregado!", description: "El nuevo artículo ya está en el menú." });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error("Error saving item: ", error);
            toast({ variant: "destructive", title: "Error al guardar", description: "No se pudo guardar el artículo." });
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = isUserLoading || areMenuItemsLoading;
    
    if (isLoading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
                <p className="text-primary-foreground">Cargando gestión del buffet...</p>
            </div>
        );
    }
    
    const foodItems = menuItems?.filter(item => item.type === 'Comida') || [];
    const drinkItems = menuItems?.filter(item => item.type === 'Bebida') || [];

    const renderMenuItem = (item: MenuItem) => (
        <Card key={item.id} className="bg-card/60 flex flex-col overflow-hidden">
             {item.imageUrl && (
                <div className="aspect-video relative">
                    <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                    />
                </div>
            )}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                    <CardTitle className="truncate text-xl">{item.name}</CardTitle>
                    <CardDescription className="truncate text-sm mt-1">{item.description}</CardDescription>
                    <p className="text-lg font-bold mt-2">${item.price.toLocaleString('es-AR')}</p>
                </div>
                <CardFooter className="p-0 pt-4 flex justify-end gap-2">
                    <Button variant="outline" size="icon" onClick={() => openDialogForEdit(item)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </CardFooter>
            </div>
        </Card>
    );

    const renderEmptyState = (category: string) => (
        <div className="text-center py-16 text-muted-foreground col-span-full">
            <Utensils className="mx-auto h-12 w-12" />
            <p className="mt-4">No hay {category} todavía. ¡Añade la primera!</p>
        </div>
    );

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-7xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Menú del Buffet</CardTitle>
                        <CardDescription>
                            Añade, edita o elimina artículos del menú.
                        </CardDescription>
                    </div>
                    <Button onClick={openDialogForNew}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Artículo
                    </Button>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Comidas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {foodItems.length > 0 ? foodItems.map(renderMenuItem) : renderEmptyState('comidas')}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Bebidas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {drinkItems.length > 0 ? drinkItems.map(renderMenuItem) : renderEmptyState('bebidas')}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}</DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Modifica los detalles del artículo.' : 'Añade un nuevo artículo al menú.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nombre</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Descripción</Label>
                            <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Precio</Label>
                            <Input id="price" name="price" type="number" value={formData.price} onChange={handleInputChange} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Tipo</Label>
                            <Select onValueChange={handleSelectChange} value={formData.type}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecciona un tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Comida">Comida</SelectItem>
                                    <SelectItem value="Bebida">Bebida</SelectItem>
                                </SelectContent>
                            </Select>
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
