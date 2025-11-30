
'use client';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col dark">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage: "url('https://storage.googleapis.com/aif-public-images/messi-maradona-bg.jpg')",
        }}
        data-ai-hint="soccer legends"
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
      <div className="relative z-10 flex flex-1 flex-col">
        {children}
        <footer className="w-full p-4 text-center text-xs text-muted-foreground">
            © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
