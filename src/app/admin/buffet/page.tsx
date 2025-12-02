
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
    DialogTrigger,
  } from "@/components/ui/dialog"
import { useUser, useDoc, useFirestore, useMemoFirebase, useCollection, addDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch, getDocs, Firestore, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { MenuItem } from "@/lib/types";
import { Trash2, Edit, PlusCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { placeholderImages } from "@/lib/placeholder-images.json";
import Image from "next/image";

const initialMenuItems: Omit<MenuItem, 'id'>[] = [
    { name: "Sándwich de Hamburguesa", description: "Carne, queso, lechuga, tomate, jamón y huevo", price: 8500, type: "Comida", imageUrl: "https://images.unsplash.com/photo-1551992445-d3a95da43f57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxoYW1idXJnZXIlMjBzYW5kd2ljaHxlbnwwfHx8fDE3NjQ2MjM3MjN8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Pizza Muzzarella", description: "Salsa de tomate, muzzarella y aceitunas", price: 12000, type: "Comida", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxtb3p6YXJlbGxhJTIwcGl6emF8ZW58MHx8fHwxNzY0NjIzNzIzfDA&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Sándwich de bondiola", description: "Sándwich de bondiola de cerdo a la parrilla con chimichurri", price: 9500, type: "Comida", imageUrl: "https://www.lanacion.com.ar/resizer/v2/sanguchito-de-bondiola-con-tomates-confitados-y-MTR4F5HIWFFLTMEOHMPBMTOQVA.jpg?auth=55efa35d6b0f787395440ecfd8b8e0fcc87bd1f19cf0d8985d7a587afc4ee9ae&width=880&height=586&quality=70&smart=true" },
    { name: "Papas fritas en cono", description: "Porción de papas fritas en cono", price: 4000, type: "Comida", imageUrl: "https://foodit.lanacion.com.ar/resizer/v2/-OOYKN3HEDJFQXF3SOECAICFQWQ.jpg?auth=0f40a359db815154c30b0a689942817b35c4526464fff89970d39e1a625914d9&width=880&height=586&quality=70&smart=true" },
    { name: "Gaseosa 500ml", description: "Línea Coca-Cola o Pepsi", price: 2500, type: "Bebida", imageUrl: "https://images.unsplash.com/photo-1696739696228-eee49592ff07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxzb2RhJTIwY2FufGVufDB8fHx8MTc2NDQ1MDc0M3ww&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Agua Mineral 500ml", description: "Agua sin gas o gasificada", price: 2000, type: "Bebida", imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHx3YXRlciUyMGJvdHRsZXxlbnwwfHx8fDE3NjQ0OTQ5NDd8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Cerveza en lata", description: "Quilmes, Stella Artois, Andes", price: 3500, type: "Bebida", imageUrl: "https://images.unsplash.com/photo-1559019736-dcf2caefe954?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxiZWVyJTIwY2FufGVufDB8fHx8MTc2NDU1NDQxOHww&ixlib=rb-4.1.0&q=80&w=1080" },
];

async function seedInitialMenuItems(firestore: Firestore) {
    const menuItemsCollectionRef = collection(firestore, 'menu_items');
    const snapshot = await getDocs(menuItemsCollectionRef);
    if (snapshot.empty) {
        console.log("No menu items found, seeding initial data...");
        const batch = writeBatch(firestore);
        initialMenuItems.forEach(item => {
            const docRef = doc(menuItemsCollectionRef); // Create a new doc with a generated ID
            batch.set(docRef, item);
        });
        await batch.commit();
        console.log("Initial menu items seeded successfully.");
    }
}


type FormData = Omit<MenuItem, 'id'>;

export default function AdminBuffetPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const userRef = useMemoFirebase(() => (user ? doc(firestore, 'users', user.uid) : null), [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const menuItemsCollectionRef = useMemoFirebase(() => collection(firestore, 'menu_items'), [firestore]);
    const { data: menuItems, isLoading: areMenuItemsLoading } = useCollection<MenuItem>(menuItemsCollectionRef);

    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<FormData>({ name: '', description: '', price: 0, type: 'Comida', imageUrl: '' });


    useEffect(() => {
        if (firestore) {
            seedInitialMenuItems(firestore).catch(console.error);
        }
    }, [firestore]);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

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
            await deleteDoc(itemRef);
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
            if (editingItem) { // Update existing item
                const itemRef = doc(firestore, 'menu_items', editingItem.id);
                setDocumentNonBlocking(itemRef, formData, { merge: true });
                toast({ title: "¡Artículo actualizado!", description: "Los cambios se han guardado." });
            } else { // Add new item
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
    

    const isLoading = isUserLoading || isProfileLoading || areMenuItemsLoading;
    
    if (isLoading || !userProfile || !userProfile.isAdmin) {
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
                            {foodItems.map(renderMenuItem)}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold mb-4">Bebidas</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {drinkItems.map(renderMenuItem)}
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
