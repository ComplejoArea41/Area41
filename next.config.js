/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'storage.googleapis.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'img.freepik.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'media.istockphoto.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'www.lanacion.com.ar',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'foodit.lanacion.com.ar',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'www.infobae.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'images.pexels.com',
                port: '',
                pathname: '**',
            },
            {
                protocol: 'https',
                hostname: 'www.delabahia.com.ar',
                port: '',
                pathname: '**',
            },
        ],
    },
};

module.exports = nextConfig;
