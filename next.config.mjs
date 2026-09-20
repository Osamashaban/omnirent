/** @type {import('next').NextConfig} */
const nextConfig = {
  // Surface type and lint errors during `next build` instead of silently
  // shipping them. CI runs typecheck and lint separately as well.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
