
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

const initialMenuItems: Omit<MenuItem, 'id'>[] = [
    { name: "Hamburguesa Clásica", description: "Carne, queso, lechuga, tomate", price: 8500, type: "Comida", imageId: "menu-burger" },
    { name: "Pizza Muzzarella", description: "Salsa de tomate, muzzarella, aceitunas", price: 12000, type: "Comida", imageId: "menu-pizza" },
    { name: "Gaseosa", description: "Línea Coca-Cola 500ml", price: 2500, type: "Bebida", imageId: "menu-soda" },
    { name: "Agua Mineral", description: "Con o sin gas 500ml", price: 2000, type: "Bebida", imageId: "menu-water" },
    { name: "Cerveza", description: "Lata 473ml (Quilmes, Stella)", price: 3500, type: "Bebida", imageId: "menu-beer" },
];

async function seedInitialMenu(firestore: Firestore) {
    const menuCollectionRef = collection(firestore, 'menu_items');
    const snapshot = await getDocs(menuCollectionRef);
    if (snapshot.empty) {
        console.log("No menu items found, seeding initial data...");
        const batch = writeBatch(firestore);
        initialMenuItems.forEach(itemData => {
            const docRef = doc(menuCollectionRef);
            batch.set(docRef, itemData);
        });
        await batch.commit();
        console.log("Initial menu items seeded successfully.");
    }
}

const MenuItemDialog = ({
    firestore,
    item,
    onClose,
  }: {
    firestore: Firestore;
    item?: MenuItem;
    onClose: () => void;
  }) => {
    const { toast } = useToast();
    const [name, setName] = useState(item?.name || "");
    const [description, setDescription] = useState(item?.description || "");
    const [price, setPrice] = useState(item?.price.toString() || "");
    const [type, setType] = useState<"Comida" | "Bebida" | undefined>(item?.type);
    const [imageId, setImageId] = useState(item?.imageId || "");
    const [isSaving, setIsSaving] = useState(false);
  
    const menuImages = useMemo(() => placeholderImages.filter(p => p.id.startsWith("menu-")), []);
  
    const handleSubmit = async () => {
      if (!name || !description || !price || !type || !imageId) {
        toast({ variant: "destructive", title: "Error", description: "Por favor, completa todos los campos." });
        return;
      }
      setIsSaving(true);
      const priceNumber = parseFloat(price);
      if (isNaN(priceNumber)) {
        toast({ variant: "destructive", title: "Error", description: "El precio debe ser un número." });
        setIsSaving(false);
        return;
      }
  
      const itemData: Omit<MenuItem, 'id'> = { name, description, price: priceNumber, type, imageId };
  
      try {
        if (item) {
          // Update existing item
          const itemRef = doc(firestore, "menu_items", item.id);
          await setDocumentNonBlocking(itemRef, itemData, { merge: true });
          toast({ title: "¡Éxito!", description: "Artículo actualizado correctamente." });
        } else {
          // Create new item
          const collectionRef = collection(firestore, "menu_items");
          await addDocumentNonBlocking(collectionRef, itemData);
          toast({ title: "¡Éxito!", description: "Artículo creado correctamente." });
        }
        onClose();
      } catch (error) {
        console.error("Error saving menu item:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el artículo." });
      } finally {
        setIsSaving(false);
      }
    };
  
    return (
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Artículo" : "Agregar Nuevo Artículo"}</DialogTitle>
          <DialogDescription>
            {item ? "Modifica los detalles del artículo." : "Completa los detalles del nuevo artículo para el menú."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nombre</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Descripción</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">Precio</Label>
            <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Tipo</Label>
            <Select onValueChange={(value: "Comida" | "Bebida") => setType(value)} defaultValue={type}>
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
            <Label htmlFor="imageId" className="text-right">Imagen</Label>
            <Select onValueChange={setImageId} defaultValue={imageId}>
                <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una imagen" />
                </SelectTrigger>
                <SelectContent>
                    {menuImages.map(img => (
                         <SelectItem key={img.id} value={img.id}>{img.description}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  };
  

export default function AdminBuffetPage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItem | undefined>(undefined);


    const userRef = useMemoFirebase(
        () => (user ? doc(firestore, 'users', user.uid) : null),
        [user, firestore]
    );
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userRef);

    const menuCollectionRef = useMemoFirebase(() => collection(firestore, 'menu_items'), [firestore]);
    const { data: menuItems, isLoading: areItemsLoading } = useCollection<MenuItem>(menuCollectionRef);

     useEffect(() => {
        if (firestore) {
          seedInitialMenu(firestore).catch(console.error);
        }
      }, [firestore]);

    useEffect(() => {
        if (!isUserLoading && !isProfileLoading) {
            if (!user) router.push('/login');
            else if (userProfile && !userProfile.isAdmin) router.push('/');
        }
    }, [user, userProfile, isUserLoading, isProfileLoading, router]);

    const handleOpenDialog = (item?: MenuItem) => {
        setSelectedItem(item);
        setIsDialogOpen(true);
    }
    
    const handleCloseDialog = () => {
        setSelectedItem(undefined);
        setIsDialogOpen(false);
    }

    const handleDeleteItem = async (itemId: string) => {
        if (!firestore) return;
        const itemRef = doc(firestore, 'menu_items', itemId);
        try {
            await deleteDoc(itemRef);
            toast({
                title: "¡Artículo eliminado!",
                description: "El artículo ha sido eliminado correctamente del menú.",
            });
        } catch (error) {
            console.error("Error deleting menu item: ", error);
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: "No se pudo eliminar el artículo. Verifica los permisos e inténtalo de nuevo.",
            });
        }
    };


    const isLoading = isUserLoading || isProfileLoading || areItemsLoading;

    if (isLoading || !userProfile || !userProfile.isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center dark bg-background">
              <p className="text-primary-foreground">Cargando gestión del buffet...</p>
            </div>
        );
    }

    const foodItems = menuItems?.filter(c => c.type === 'Comida') || [];
    const drinkItems = menuItems?.filter(c => c.type === 'Bebida') || [];

    const renderItem = (item: MenuItem) => (
        <Card key={item.id} className="bg-card/90">
            <CardHeader>
                <CardTitle className="truncate">{item.name}</CardTitle>
                <CardDescription>${item.price.toLocaleString('es-AR')}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground h-10 overflow-hidden">{item.description}</p>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                 <Button variant="outline" size="icon" onClick={() => handleOpenDialog(item)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => handleDeleteItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );

    return (
        <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
            <Card className="bg-card/80 backdrop-blur-sm w-full max-w-5xl">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestionar Menú del Buffet</CardTitle>
                        <CardDescription>
                            Añade, edita o elimina artículos del menú.
                        </CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Agregar Artículo
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold mb-4">Comidas</h3>
                            {foodItems.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {foodItems.map(renderItem)}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No hay comidas para mostrar.</p>
                            )}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold mb-4">Bebidas</h3>
                            {drinkItems.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {drinkItems.map(renderItem)}
                                </div>
                            ) : (
                                <p className="text-muted-foreground">No hay bebidas para mostrar.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                {isDialogOpen && <MenuItemDialog firestore={firestore!} item={selectedItem} onClose={handleCloseDialog} />}
            </Dialog>
        </div>
    );
}
