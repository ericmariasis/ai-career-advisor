import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import './insightsClient';
import Navigation from './components/Navigation';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ResumeProvider } from './contexts/ResumeContext';
import { ToastContainer } from './components/Toast';
import ClientLayout from './components/ClientLayout';

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
          <ResumeProvider>
            <ClientLayout>
              <Navigation />
              {children}
              <ToastContainer />
            </ClientLayout>
          </ResumeProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
