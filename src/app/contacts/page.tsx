import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { staffList } from "@/lib/data";
import { placeholderImages } from "@/lib/placeholder-images.json";
import { Mail, Phone } from "lucide-react";

export default function ContactsPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <h1 className="font-semibold text-lg md:text-2xl">Meet Our Team</h1>
      </div>
      <p className="text-muted-foreground max-w-2xl">
        Our dedicated team of professionals is here to help you achieve your fitness goals. Get in touch with us!
      </p>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {staffList.map((staff) => {
          const staffImage = placeholderImages.find((p) => p.id === staff.avatarId);
          return (
            <Card key={staff.id}>
              <CardHeader className="flex flex-row items-center gap-4">
                {staffImage && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={staffImage.imageUrl}
                      alt={staff.name}
                      data-ai-hint={staffImage.imageHint}
                      width={64}
                      height={64}
                    />
                    <AvatarFallback>{staff.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                )}
                <div className="grid gap-1">
                  <CardTitle>{staff.name}</CardTitle>
                  <CardDescription>{staff.role}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${staff.email}`} className="hover:text-primary">{staff.email}</a>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{staff.phone}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full">
                  Send Message
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
