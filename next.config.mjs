/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // DigitalOcean Spaces (podcast audio/artwork, re-hosted media)
      { protocol: "https", hostname: "techopolis-storage.nyc3.digitaloceanspaces.com" },
      { protocol: "https", hostname: "techopolis-storage.nyc3.cdn.digitaloceanspaces.com" },
      // iTunes app artwork for the directory
      { protocol: "https", hostname: "*.mzstatic.com" },
    ],
  },
};

export default nextConfig;
