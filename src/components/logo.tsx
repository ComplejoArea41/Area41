
export function Logo({ className = "h-32 w-32" }: { className?: string }) {
  const logoUrl = "/logo-escudo.jpg";
  const logoDescription = "Escudo Oficial Área 41";

  return (
    <img 
        src={logoUrl}
        alt={logoDescription}
        className={`${className} rounded-xl object-cover ring-1 ring-primary/50 shadow-lg`}
    />
  );
}
