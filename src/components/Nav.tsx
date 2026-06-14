import Link from "next/link";

export function Nav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-zinc-900 transition-colors hover:text-zinc-600"
        >
          Pryce
        </Link>
        <Link
          href="/history"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          History
        </Link>
      </div>
    </header>
  );
}
