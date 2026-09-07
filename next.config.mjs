/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
            { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
            { protocol: 'https', hostname: 'photos.fife.usercontent.google.com', pathname: '/**' },
            { protocol: 'https', hostname: 'i.ibb.co', pathname: '/**' },
            { protocol: 'https', hostname: 'ibb.co', pathname: '/**' },
            { protocol: 'https', hostname: 'www.imghippo.com', pathname: '/**' },
            { protocol: 'https', hostname: 'www.instagram.com', pathname: '/**' },
            { protocol: 'https', hostname: 'drive.google.com', pathname: '/**' },
            { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
            { protocol: 'https', hostname: 'i.pinimg.com', pathname: '/**' },
            { protocol: 'https', hostname: 'img.freepik.com', pathname: '/**' },
            { protocol: 'https', hostname: 'media.istockphoto.com', pathname: '/**' },
            { protocol: 'https', hostname: 'www.lanacion.com.ar', pathname: '/**' },
            { protocol: 'https', hostname: 'foodit.lanacion.com.ar', pathname: '/**' },
            { protocol: 'https', hostname: 'www.infobae.com', pathname: '/**' },
            { protocol: 'https', hostname: 'images.pexels.com', pathname: '/**' },
            { protocol: 'https', hostname: 'www.delabahia.com.ar', pathname: '/**' },
            { protocol: 'https', hostname: 'as2.ftcdn.net', pathname: '/**' },
            { protocol: 'https', hostname: 'www.shutterstock.com', pathname: '/**' },
            { protocol: 'https', hostname: 'cdn.pedix.app', pathname: '/**' },
        ],
    },
};

export default nextConfig;
