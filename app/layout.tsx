import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PineDev — validate trading strategies the way quants do",
  description:
    "A research protocol for retail traders: pre-register a hypothesis, build it in Pine v6, then put it through deflated Sharpe, Monte Carlo, cost stress and a one-shot out-of-sample test before risking money.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster theme="dark" position="bottom-right" />
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
