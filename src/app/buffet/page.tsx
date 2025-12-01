
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { placeholderImages } from '@/lib/placeholder-images.json';
import Image from "next/image";
import { useState, useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { MenuItem } from "@/lib/types";

export default function BuffetPage() {
  const [filter, setFilter] = useState<'Comida' | 'Bebida'>('Comida');
  const firestore = useFirestore();

  const menuItemsRef = useMemoFirebase(() => collection(firestore, 'menu_items'), [firestore]);
  const { data: menuItems, isLoading } = useCollection<MenuItem>(menuItemsRef);

  const formatPrice = (price: number) => {
    return `$${price.toLocaleString('es-AR')}`;
  };

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    return menuItems.filter(item => item.type === filter);
  }, [filter, menuItems]);

  return (
      <div className="flex flex-1 flex-col items-center justify-start gap-4 p-4 md:gap-8 md:p-8">
        <div className="w-full max-w-6xl">
          <div className="grid gap-2 mb-8 text-center">
              <CardTitle className="text-4xl">Nuestro Menú del Buffet</CardTitle>
              <CardDescription className="text-lg text-muted-foreground">
                  Recarga energías con nuestras opciones. ¡Tenemos lo que necesitas para seguir jugando!
              </CardDescription>
          </div>

            <div className="flex justify-center gap-4 mb-8">
                <Button 
                    variant={filter === 'Comida' ? 'default' : 'outline'} 
                    onClick={() => setFilter('Comida')}
                    className="text-lg py-6 px-12"
                >
                    Comida
                </Button>
                <Button 
                    variant={filter === 'Bebida' ? 'default' : 'outline'} 
                    onClick={() => setFilter('Bebida')}
                    className="text-lg py-6 px-12"
                >
                    Bebidas
                </Button>
            </div>


            {isLoading ? (
                <div className="text-center text-muted-foreground">Cargando menú...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredItems.map((item) => {
                    const image = placeholderImages.find(p => p.id === item.imageId);
                    return (
                        <Card key={item.id} className="bg-card/80 backdrop-blur-sm flex flex-col overflow-hidden">
                            <CardHeader className="p-0">
                                {image && (
                                    <div className="aspect-video relative">
                                        <Image
                                            src={image.imageUrl}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                            data-ai-hint={image.imageHint}
                                        />
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-4 flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <CardTitle className="text-xl leading-tight">{item.name}</CardTitle>
                                    <Badge variant={item.type === "Comida" ? "secondary" : "outline"}>
                                        {item.type}
                                    </Badge>
                                </div>
                                <CardDescription>{item.description}</CardDescription>
                            </CardContent>
                            <CardFooter className="p-4 pt-0">
                                <p className="text-2xl font-bold text-primary w-full text-right">{formatPrice(item.price)}</p>
                            </CardFooter>
                        </Card>
                    );
                })}
              </div>
            )}
        </div>
      </div>
  );
}
