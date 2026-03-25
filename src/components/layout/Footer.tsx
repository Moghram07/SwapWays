import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#1a365d] py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/swapways-logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-auto brightness-0 invert"
              style={{ height: "auto" }}
            />
            <span className="text-lg font-semibold text-white">Swap Ways</span>
          </Link>
          <div className="flex gap-8 text-sm text-white/60">
            <Link href="#" className="transition-colors hover:text-white/90">
              Privacy
            </Link>
            <Link href="#" className="transition-colors hover:text-white/90">
              Terms
            </Link>
            <Link href="#" className="transition-colors hover:text-white/90">
              Support
            </Link>
            <Link href="#" className="transition-colors hover:text-white/90">
              Contact
            </Link>
          </div>
          <p className="text-sm text-white/50">
            © 2026 Swap Ways. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
