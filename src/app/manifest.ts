
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Area 41 Complejo Deportivo',
    short_name: 'Area41',
    description: 'Reserva de canchas y menú de buffet del Complejo Area 41',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0d14',
    theme_color: '#82c91e',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
