import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { menuItems } from "@/lib/data";

export default function BuffetPage() {
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
        <Card className="bg-card/80 backdrop-blur-sm w-full max-w-4xl">
          <CardHeader>
              <div className="grid gap-2">
                  <CardTitle>Nuestro Menú del Buffet</CardTitle>
                  <CardDescription>
                      Recarga energías con nuestras opciones. Desde snacks rápidos hasta platos completos, ¡tenemos lo que necesitas para seguir jugando!
                  </CardDescription>
              </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Badge variant={item.type === "Comida" ? "secondary" : "outline"}>
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(item.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
}
