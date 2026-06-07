/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iaccessibility.net"
      },
      {
        protocol: "https",
        hostname: "techopolis-storage.nyc3.digitaloceanspaces.com"
      }
    ]
  }
};

export default nextConfig;
