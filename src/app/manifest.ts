import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paisa — Personal Finance",
    short_name: "Paisa",
    description: "Private income & expense tracker.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0f17",
    theme_color: "#4f46e5",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Add transaction",
        short_name: "Add",
        url: "/add",
        description: "Quick add income or expense",
      },
      {
        name: "Transfer",
        short_name: "Transfer",
        url: "/transfer",
      },
      {
        name: "Budgets",
        short_name: "Budgets",
        url: "/budgets",
      },
    ],
  };
}
