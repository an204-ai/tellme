import type { Config } from "tailwindcss";
import { tellmeTailwindPreset } from "@tellme/ui/tailwind.preset";

const config: Config = {
  presets: [tellmeTailwindPreset as any],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"
  ]
};

export default config;
