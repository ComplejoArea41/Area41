
'use client';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      {/* Contenedor principal que aplica tanto la imagen de fondo como el gradiente */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "linear-gradient(to top, hsl(var(--background)) 20%, rgba(0,0,0,0.5) 80%), url('https://storage.googleapis.com/aif-public-images/messi-maradona-bg.jpg')",
          backgroundBlendMode: 'darken',
          opacity: 0.5,
        }}
        data-ai-hint="soccer legends"
      ></div>

      {/* Contenido de la aplicación que va por encima del fondo */}
      <div className="relative z-10 flex flex-1 flex-col">
        {children}
        <footer className="w-full p-4 text-center text-xs text-muted-foreground">
            © 2024 Complejo Deportivo Area41. Todos los derechos reservados.
        </footer>
      </div>
    </div>
  );
}
