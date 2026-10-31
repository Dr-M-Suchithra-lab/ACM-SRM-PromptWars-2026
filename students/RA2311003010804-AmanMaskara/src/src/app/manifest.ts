import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FairShift",
    short_name: "FairShift",
    description: "Fair work. Fair pay. Your voice.",
    start_url: "/w",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#0f6b5a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
