
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "X Automation Dashboard",
  description: "Autonomous X Agent Control Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black text-white min-h-screen`}>
        <div className="container mx-auto p-4">
          <header className="border-b border-white pb-4 mb-8">
            <h1 className="text-2xl font-bold uppercase tracking-widest">X Automator // v1.0</h1>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
