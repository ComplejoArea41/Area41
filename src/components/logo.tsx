
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function Logo() {
  const logoImage = PlaceHolderImages.find(p => p.id === 'area-41-logo');

  if (!logoImage) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-primary"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 0-4.95 1.83" />
            <path d="M12 2a10 10 0 0 1 4.95 1.83" />
            <path d="m5 5 2.5 10" />
            <path d="m19 5-2.5 10" />
            <path d="m22 12-5.5-2.5" />
            <path d="m2 12 5.5-2.5" />
            <path d="m12 22 2.5-5.5" />
            <path d="m12 22-2.5-5.5" />
        </svg>
    );
  }

  return (
    <Image 
        src={logoImage.imageUrl}
        alt={logoImage.description}
        width={128}
        height={128}
        className="h-32 w-32"
    />
  );
}
