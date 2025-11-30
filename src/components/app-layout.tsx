"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from "@/components/ui/sheet";
import { placeholderImages } from "@/lib/placeholder-images.json";
import {
  Bell,
  Calendar,
  Contact,
  Home,
  LineChart,
  Menu,
  Package2,
  Search,
  Sparkles,
  Ticket,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const userAvatar = placeholderImages.find((p) => p.id === "user-avatar");

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/reservations", label: "Bookings", icon: Ticket },
    { href: "/recommendations", label: "For You", icon: Sparkles },
    { href: "/profile", label: "Profile", icon: Users },
    { href: "/contacts", label: "Contacts", icon: Contact },
  ];

  const NavLink = ({
    href,
    label,
    icon: Icon,
    isMobile = false,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
    isMobile?: boolean;
  }) => (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        pathname === href && "bg-muted text-primary",
        isMobile && "text-lg"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Logo />
              <span className="">Sport Center Hub</span>
            </Link>
            <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navLinks.map((link) => (
                <NavLink key={link.href} {...link} />
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Card x-chunk="dashboard-02-chunk-0">
              <CardHeader className="p-2 pt-0 md:p-4">
                <CardTitle>Special Offer</CardTitle>
                <CardDescription>
                  Summer pass now available. Get unlimited access.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                <Button size="sm" className="w-full">
                  Upgrade
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold mb-4"
                >
                  <Logo />
                  <span className="sr-only">Sport Center Hub</span>
                </Link>
                {navLinks.map((link) => (
                  <NavLink key={link.href} {...link} isMobile />
                ))}
              </nav>
               <div className="mt-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Special Offer</CardTitle>
                    <CardDescription>
                      Summer pass now available. Get unlimited access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" className="w-full">
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet>

          <div className="w-full flex-1">
            <form>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search activities..."
                  className="w-full appearance-none bg-background pl-8 md:w-2/3 lg:w-1/3"
                />
              </div>
            </form>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                {userAvatar && (
                  <Avatar>
                    <AvatarImage
                      src={userAvatar.imageUrl}
                      alt="User avatar"
                      data-ai-hint={userAvatar.imageHint}
                      width={36}
                      height={36}
                    />
                    <AvatarFallback>AD</AvatarFallback>
                  </Avatar>
                )}
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {children}
      </div>
    </div>
  );
}

// Dummy components for layout structure
function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>{children}</div>;
}
function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>;
}
function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>{children}</h3>;
}
function CardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}
function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6 pt-0", className)}>{children}</div>;
}
