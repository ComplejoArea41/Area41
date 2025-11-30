import Image from "next/image";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full dark">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1551958214-2d5b54a43621?q=80&w=2070&auto=format&fit=crop"
          alt="Cancha de futbol"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-20"
          data-ai-hint="soccer field"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
