// app/layout.tsx
import "./globals.css";
import { Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Bingo — Tout ce qui se passe à Lomé",
  description: "...",
  verification: {
    google: "ONwy21cJztQyx3hVZpXnO94t4pAryV0Swtw-49nMk4o", // ← le code donné par Google
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${outfit.className} bg-black text-white`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}