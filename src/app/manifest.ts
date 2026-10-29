import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Orbis",
    short_name: "Orbis",
    description:
      "A home for fan communities, with a feed and a library to track what you’re watching, reading, and playing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1c1d1b",
    theme_color: "#151613",
    icons: [
      { src: "/app-icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
