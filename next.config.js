/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'storage.googleapis.com' },
        { protocol: 'https', hostname: 'images.unsplash.com' },
        { protocol: 'https', hostname: 'img.freepik.com' },
        { protocol: 'https', hostname: 'media.istockphoto.com' },
        { protocol: 'https', hostname: 'www.lanacion.com.ar' },
        { protocol: 'https', hostname: 'foodit.lanacion.com.ar' },
        { protocol: 'https', hostname: 'www.infobae.com' },
        { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
        { protocol: 'https', hostname: 'images.pexels.com' },
        { protocol: 'https', hostname: 'www.delabahia.com.ar' },
        { protocol: 'https', hostname: 'i.pinimg.com' },
        { protocol: 'https', hostname: 'i.ibb.co' },
        { protocol: 'https', hostname: 'as2.ftcdn.net' },
        { protocol: 'https', hostname: 'www.shutterstock.com' },
        { protocol: 'https', hostname: 'cdn.pedix.app' },
      ],
    },
  };
  
  module.exports = nextConfig;
