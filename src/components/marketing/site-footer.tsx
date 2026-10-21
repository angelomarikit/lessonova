import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const footerLinks = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "mailto:hello@lessonova.com", label: "Contact" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/recording-consent", label: "Recording Consent Information" },
];

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-border bg-white/95 py-12", className)}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <BrandLogo variant="footer" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            About Lessonova: an AI-powered ESL teaching assistant for Filipino online teachers and
            language schools — built to reduce admin work after every lesson.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Explore</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {footerLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Lessonova. All rights reserved.
      </div>
    </footer>
  );
}
