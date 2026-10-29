/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The agent pipeline streams for up to ~3 minutes; keep the route alive.
    serverActions: { bodySizeLimit: "1mb" }
  }
};
export default nextConfig;
