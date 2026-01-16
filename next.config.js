/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
      },
      {
        protocol: 'https',
        hostname: 'media.istockphoto.com',
      },
      {
        protocol: 'https',
        hostname: 'www.lanacion.com.ar',
      },
      {
        protocol: 'https',
        hostname: 'foodit.lanacion.com.ar',
      },
      {
        protocol: 'https',
        hostname: 'www.infobae.com',
      },
    ],
  },
};

module.exports = nextConfig;
