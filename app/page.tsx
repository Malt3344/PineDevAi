import Link from "next/link";
import { EnquiryForm } from "@/components/EnquiryForm";
import { LogoMark } from "@/components/Logo";

/**
 * The public face of PineDev: deliberately almost nothing. One statement
 * of what we do, and a way to ask. No pricing, no feature lists.
 */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <LogoMark size={64} className="rounded-xl" />
        <p className="mt-8 text-xs font-medium tracking-[0.35em] text-muted-foreground uppercase">PineDev</p>
        <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Systematic strategies, built and deployed for a select few.
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-balance text-muted-foreground">
          We work privately with funds and professional traders on strategy development and the
          infrastructure to trade it.
        </p>
        <div className="mt-10 flex w-full justify-center">
          <EnquiryForm />
        </div>
      </main>

      <footer className="flex items-center justify-between px-6 py-6 text-xs text-muted-foreground">
        <span>
          &copy; {new Date().getFullYear()} PineDev · CVR 43549723
        </span>
        <Link href="/login" className="hover:text-foreground">
          Client login
        </Link>
      </footer>
    </div>
  );
}
