import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Site-wide 404 — always offers a way back to the landing page. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-lg font-medium">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
        Back to PineDev
      </Button>
    </main>
  );
}
