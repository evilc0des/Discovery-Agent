import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-gray-50 dark:bg-zinc-950 font-sans">
      <main className="flex flex-col items-center gap-8 text-center max-w-lg mx-auto px-6 py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg">
          <Image src="/appato-logo.png" alt="Discovery Agent Icon" className="w-8 h-8" width={32} height={32} />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-zinc-50">
            Discovery Agent
          </h1>
          <p className="text-lg leading-relaxed text-gray-500 dark:text-zinc-400">
            AI-powered client requirement intake. A structured discovery session
            that captures your project&apos;s product context, functional needs,
            and aesthetic direction — then generates a comprehensive brief.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Link
            href="/session"
            className="flex-1 rounded-xl bg-gray-900 px-6 py-3 text-white font-medium text-sm hover:bg-gray-800 transition-colors text-center"
          >
            Start a Discovery Session
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mt-4">
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 text-left">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">1</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Product Context</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Problem statement, audience, goals</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 text-left">
            <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
              <span className="text-green-600 dark:text-green-400 text-sm font-bold">2</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Functional</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Features, workflows, integrations</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 text-left">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
              <span className="text-purple-600 dark:text-purple-400 text-sm font-bold">3</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Aesthetics</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Visual style, tone, interactions</p>
          </div>
        </div>
      </main>
    </div>
  );
}
