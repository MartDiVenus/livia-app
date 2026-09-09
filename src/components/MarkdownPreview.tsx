import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-y-auto p-6 bg-white dark:bg-[#0D0F12] border-l border-gray-200 dark:border-zinc-800 custom-scrollbar">
      <div className="markdown-body prose dark:prose-invert max-w-none text-sm text-gray-800 dark:text-zinc-200">
        <Markdown remarkPlugins={[remarkGfm]}>
          {content}
        </Markdown>
      </div>
    </div>
  );
}
