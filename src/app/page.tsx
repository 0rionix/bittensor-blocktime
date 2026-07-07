import BlockTimeConverter from "@/components/BlockTimeConverter";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center gap-8 px-6 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Bittensor Block ⇄ Time Converter
          </h1>
          <p className="max-w-md text-sm text-black/60 dark:text-white/50">
            Estimate when a Finney mainnet block landed, or which block was
            live at a given moment.
          </p>
        </div>
        <BlockTimeConverter />
      </main>
    </div>
  );
}
