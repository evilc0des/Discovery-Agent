'use client';

import Image from 'next/image';

interface Coverage {
  productContext: number;
  functional: number;
  aesthetics: number;
}

interface SessionSidebarProps {
  projectName: string;
  clientName: string;
  coverage: Coverage;
  status: string;
}

export function SessionSidebar({ projectName, clientName, coverage, status }: SessionSidebarProps) {
  const displayName = projectName || 'New Project';
  const displayClient = clientName || 'Client';

  const totalPct = Math.round(
    ((coverage.productContext + coverage.functional + coverage.aesthetics) / 3) * 100
  );

  const segments = [
    { label: 'Product Context', value: coverage.productContext, color: 'bg-blue-500' },
    { label: 'Functional', value: coverage.functional, color: 'bg-green-500' },
    { label: 'Aesthetics', value: coverage.aesthetics, color: 'bg-purple-500' },
  ];

  return (
    <aside className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-10 h-10 rounded-lg bg-gray-900 p-1 flex items-center justify-center md:w-12 md:h-12">
            <Image src="/appato-logo.png" alt="Discovery Agent Icon" className="w-8 h-8 md:w-10 md:h-10" width={32} height={32} />
          </div>
          <div className="flex flex-col items-start">
            <h2 className="font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Appato</h2>
            <h2 className="text-xl font-semibold text-gray-900">Discovery Agent</h2>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Hello! I&apos;ll guide you through a structured conversation to define your project requirements across
          product context, functional needs, and aesthetic direction.
          <br/>
          <br/>
          You should expect to spend around 15-20 minutes providing detailed answers. The more thorough you are, the better the final brief will be!
        </p>
      </div>

      <div className="px-5 py-4 border-b border-gray-100">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">Project</div>
        <h3 className="text-base font-semibold text-gray-900 truncate">{displayName}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{displayClient}</p>
      </div>

      <div className="px-5 py-4 border-b border-gray-100">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Discovery Coverage</div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className={`${segment.color} transition-all duration-500`}
              style={{ width: `${Math.max(segment.value * 100, 2)}%` }}
            />
          ))}
        </div>
        <div className="mt-2.5 space-y-1.5">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${segment.color}`} />
                <span className="text-gray-600">{segment.label}</span>
              </div>
              <span className="text-gray-400 tabular-nums">
                {Math.round(segment.value * 100)}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-600">Overall</span>
          <span className="text-sm font-semibold text-gray-900 tabular-nums">{totalPct}%</span>
        </div>
      </div>

      <div className="px-5 py-4 flex-1">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-3">Session Status</div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              status === 'approved'
                ? 'bg-green-500'
                : status === 'brief_ready'
                  ? 'bg-amber-400'
                  : 'bg-blue-400 animate-pulse'
            }`}
          />
          <span className="text-sm text-gray-700 capitalize">
            {status === 'in_discovery'
              ? 'In Discovery'
              : status === 'brief_ready'
                ? 'Brief Ready'
                : 'Approved'}
          </span>
        </div>
      </div>
    </aside>
  );
}
