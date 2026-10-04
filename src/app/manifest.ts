import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daily Hub",
    short_name: "Daily Hub",
    description: "Food, money and steps in under five seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f2ea",
    theme_color: "#f5f2ea",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
