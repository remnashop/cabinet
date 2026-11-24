const files = import.meta.glob<string>("./gateway-logos/*.{png,svg}", { eager: true, import: "default" });

// keyed by gateway type: ./gateway-logos/YOOKASSA.png -> YOOKASSA
export const GATEWAY_LOGOS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.slice("./gateway-logos/".length).replace(/\.\w+$/, ""), url]),
);
