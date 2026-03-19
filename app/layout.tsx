import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Movie Clerk",
  description: "AI-powered movie recommendations based on your ratings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel:wght@900&family=Special+Elite&family=Oswald:ital,wght@1,700&family=Alfa+Slab+One&family=Permanent+Marker&family=IM+Fell+English+SC:ital@1&family=Libre+Baskerville:ital,wght@1,700&family=Orbitron:wght@900&family=Rubik+Dirt&family=Monoton&family=Boogaloo&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
