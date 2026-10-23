import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404 inside the app shell (sidebar still visible), for an old or deleted
 * study link, so the user is never dropped outside the app.
 */
export default function AppNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-lg font-medium">Study not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This study doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/studies">Back to your studies</Link>
      </Button>
    </main>
  );
}
