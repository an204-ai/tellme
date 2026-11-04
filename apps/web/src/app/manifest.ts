import type { MetadataRoute } from "next";
import { BRAND_DESCRIPTION } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tellme",
    short_name: "Tellme",
    description: BRAND_DESCRIPTION,
    lang: "vi",
    start_url: "/community/today",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#07327f",
    icons: [
      { src: "/brand/app-icons/tellme-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/app-icons/tellme-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/app-icons/tellme-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
