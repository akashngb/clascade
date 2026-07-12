import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clascade | Interactive lessons, conducted by teachers",
  description: "Turn lesson material into reviewable, classroom-controlled interactive experiences.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="noise">{children}</body>
    </html>
  );
}
