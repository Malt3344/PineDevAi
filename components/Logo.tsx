import Image from "next/image";
import { cn } from "@/lib/utils";

/** The PineDev mark (public/logo.png, cropped from public/PineDevLogo.png). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      priority
      className={cn("shrink-0 rounded-md", className)}
    />
  );
}

/** Mark plus name, for headers. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5 text-sm font-semibold tracking-tight", className)}>
      <LogoMark size={size} />
      PineDev
    </span>
  );
}
