/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Cloudflare R2 public bucket — set R2_PUBLIC_URL host here when known.
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
};

export default nextConfig;
