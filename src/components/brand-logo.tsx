import Image from "next/image";

import { cn } from "@/lib/utils";

const variantClassName = {
  header: "h-16 w-auto sm:h-20 md:h-24",
  footer: "h-20 w-auto sm:h-24",
  auth: "h-20 w-auto sm:h-24",
  dashboard: "h-14 w-auto sm:h-16",
} as const;

export function BrandLogo({
  variant = "header",
  className,
  priority,
}: {
  variant?: keyof typeof variantClassName;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/lessonova-logo.png"
      alt="Lessonova"
      width={640}
      height={160}
      className={cn(variantClassName[variant], className)}
      priority={priority ?? variant === "header"}
    />
  );
}
