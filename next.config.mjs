/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
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
                hostname: 'photos.fife.usercontent.google.com',
            },
            {
                protocol: 'https',
                hostname: 'i.ibb.co',
            },
             {
                protocol: 'https',
                hostname: 'ibb.co',
            },
            {
                protocol: 'https',
                hostname: 'www.imghippo.com',
            },
            {
                protocol: 'https',
                hostname: 'www.instagram.com',
            },
            {
                protocol: 'https',
                hostname: 'drive.google.com',
            }
        ],
    },
};

export default nextConfig;
