import Link from "next/link";

export function Nav() {
  return (
    <header className="flex items-center justify-between border-b-2 border-black bg-white px-8 py-4">
      <Link href="/" className="text-2xl font-black text-black">
        PRYCE
      </Link>
      <Link
        href="/history"
        className="text-sm font-bold tracking-widest text-black transition-colors hover:text-[#FF4D00]"
      >
        HISTORY
      </Link>
    </header>
  );
}
