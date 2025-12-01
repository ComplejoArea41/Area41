
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
    { name: "Sándwich de Hamburguesa", description: "Carne, queso, lechuga, tomate, jamón y huevo", price: 8500, type: "Comida", imageUrl: "https://images.unsplash.com/photo-1551992445-d3a95da43f57?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxoYW1idXJnZXIlMjBzYW5kd2ljaHxlbnwwfHx8fDE3NjQ2MjM3MjN8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Pizza Muzzarella", description: "Salsa de tomate, muzzarella y aceitunas", price: 12000, type: "Comida", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxtb3p6YXJlbGxhJTIwcGl6emF8ZW58MHx8fHwxNzY0NjIzNzIzfDA&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Sándwich de bondiola", description: "Sándwich de bondiola de cerdo a la parrilla con chimichurri", price: 9500, type: "Comida", imageUrl: "https://www.lanacion.com.ar/resizer/v2/sanguchito-de-bondiola-con-tomates-confitados-y-MTR4F5HIWFFLTMEOHMPBMTOQVA.jpg?auth=55efa35d6b0f787395440ecfd8b8e0fcc87bd1f19cf0d8985d7a587afc4ee9ae&width=880&height=586&quality=70&smart=true" },
    { name: "Papas fritas en cono", description: "Porción de papas fritas en cono", price: 4000, type: "Comida", imageUrl: "https://foodit.lanacion.com.ar/resizer/v2/-OOYKN3HEDJFQXF3SOECAICFQWQ.jpg?auth=0f40a359db815154c30b0a689942817b35c4526464fff89970d39e1a625914d9&width=880&height=586&quality=70&smart=true" },
    { name: "Gaseosa 500ml", description: "Línea Coca-Cola o Pepsi", price: 2500, type: "Bebida", imageUrl: "https://images.unsplash.com/photo-1696739696228-eee49592ff07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxzb2RhJTIwY2FufGVufDB8fHx8MTc2NDQ1MDc0M3ww&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Agua Mineral 500ml", description: "Agua sin gas o gasificada", price: 2000, type: "Bebida", imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHx3YXRlciUyMGJvdHRsZXxlbnwwfHx8fDE3NjQ0OTQ5NDd8MA&ixlib=rb-4.1.0&q=80&w=1080" },
    { name: "Cerveza en lata", description: "Quilmes, Stella Artois, Andes", price: 3500, type: "Bebida", imageUrl: "https://images.unsplash.com/photo-1559019736-dcf2caefe954?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxiZWVyJTIwY2FufGVufDB8fHx8MTc2NDU1NDQxOHww&ixlib