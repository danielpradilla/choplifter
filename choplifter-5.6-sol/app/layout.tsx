import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = new URL("/og.png", `${protocol}://${host}`).toString();
  const title = "Lifeline ’82 — Browser Rescue Game";
  const description =
    "Pilot a combat helicopter, free 64 captives, and bring them home in this original browser tribute to a 1982 rescue classic.";

  return {
    title,
    description,
    openGraph: {
      title: "Lifeline ’82",
      description: "Four barracks. Sixty-four captives. Three helicopters.",
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Lifeline 82 rescue helicopter mission" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Lifeline ’82",
      description: "Bring every one home.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
