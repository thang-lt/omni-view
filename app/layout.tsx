import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol = incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Đa Chiều — Multi-Agent Research Desk",
    description: "Research Desk đa nguồn dùng Gemini Search grounding, cảnh báo bias có evidence và Claim Ledger được kiểm tra trước khi viết báo cáo.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Đa Chiều — Multi-Agent Research Desk",
      description: "Nguồn chính thống, phản chứng, cảnh báo bias có evidence và Claim Ledger truy nguyên được.",
      type: "website",
      url: origin,
      images: [{ url: `${origin}/og.png`, width: 1536, height: 1024, alt: "Đa Chiều — Multi-Agent Research Desk" }],
    },
    twitter: { card: "summary_large_image", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
