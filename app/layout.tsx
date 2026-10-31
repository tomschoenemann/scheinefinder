import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./aligned-ui.css";
import "./map-detail.css";
import "./bank-logo.css";
import "./sidebar-controls.css";
import "./mobile-ui.css";

export const metadata: Metadata = {
  title: "scheinefinder.de – Geldautomaten in deiner Nähe",
  description: "Finde schnell den nächsten Geldautomaten auf der Karte.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
