import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Adresses de l'API côté serveur uniquement (sans NEXT_PUBLIC) : le navigateur ne voit que
 * /api-proxy et /rt sur le domaine du site, relayés ici vers l'API. Les anciennes variables
 * NEXT_PUBLIC_* sont lues en repli pour ne pas casser un déploiement existant.
 */
const apiUrl = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (isProd ? "https://api.emaquis-api.fyi/api/v1" : "http://localhost:3001/api/v1")
).replace(/\/$/, "");
const realtimeOrigin = (
  process.env.REALTIME_BACKEND_ORIGIN ||
  (process.env.NEXT_PUBLIC_WS_URL ? new URL(process.env.NEXT_PUBLIC_WS_URL).origin : "") ||
  apiUrl.replace(/\/api\/v\d+$/, "")
).replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compiler: {
    // Production : aucun message de diagnostic dans la console du navigateur (les erreurs restent)
    removeConsole: isProd ? { exclude: ["error"] } : false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async rewrites() {
    return {
      // Cartes du code source : jamais servies
      beforeFiles: [{ source: "/:path(.*\\.map)", destination: "/__introuvable" }],
      afterFiles: [
        { source: "/api-proxy/:path*", destination: `${apiUrl}/:path*` },
        // Temps réel (socket.io) relayé par le serveur Next
        { source: "/rt", destination: `${realtimeOrigin}/socket.io/` },
      ],
    };
  },
};

export default nextConfig;
