/** @type {import('next').NextConfig} */
const nextConfig = {
  // Surface type and lint errors during `next build` instead of silently
  // shipping them. CI runs typecheck and lint separately as well.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // Basic browser protections on every page:
  // - no other site can show our pages inside a frame (stops click-jacking
  //   on the sign-in and password pages);
  // - browsers don't guess file types;
  // - set-password and reset-password links carry a secret in the address,
  //   so other sites we link to (WhatsApp, Terms) only ever see our domain.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
