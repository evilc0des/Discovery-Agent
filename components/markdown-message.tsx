'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownMessageProps {
  content: string;
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <div className="prose prose-sm prose-gray max-w-none
      prose-headings:text-gray-900 prose-headings:font-semibold
      prose-h1:text-lg prose-h2:text-base
      prose-p:text-gray-800 prose-p:my-2 prose-p:leading-relaxed
      prose-ul:my-2 prose-ul:pl-5 prose-li:text-gray-800 prose-li:my-1 prose-li:marker:text-gray-400
      prose-ol:my-2 prose-ol:pl-5 prose-li:text-gray-800 prose-li:my-1 prose-li:marker:text-gray-400
      prose-strong:text-gray-900 prose-strong:font-semibold
      prose-em:text-gray-700 prose-em:italic
      prose-blockquote:border-l-4 prose-blockquote:border-blue-300 prose-blockquote:bg-blue-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:my-3 prose-blockquote:not-italic prose-blockquote:text-gray-700
      prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal
      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 prose-pre:my-3
      [&>p:first-child]:mt-0 [&>p:last-child]:mb-0
    ">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
