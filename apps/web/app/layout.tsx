import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/theme-toggle";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rail",
  description: "Rail — real-time monitoring platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={sans.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem scriptProps={{ suppressHydrationWarning: true }}>
          <ThemeToggle />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
