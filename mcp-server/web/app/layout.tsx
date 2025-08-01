import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import './insightsClient';
import Navigation from './components/Navigation';
import { FavoritesProvider } from './contexts/FavoritesContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Career Advisor - Find Your Perfect Job",
  description: "Intelligent job search powered by AI, Redis, and real-time analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <FavoritesProvider>
          <Navigation />
          {children}
        </FavoritesProvider>
      </body>
    </html>
  );
}
