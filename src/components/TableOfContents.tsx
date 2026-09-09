import React, { useMemo } from 'react';
import { ListTree } from 'lucide-react';

interface TOCItem {
  id: string;
  text: string;
  level: number;
  line: number;
}

interface TableOfContentsProps {
  content: string;
  onNavigate: (line: number) => void;
  lang: 'it' | 'en';
}

export function TableOfContents({ content, onNavigate, lang }: TableOfContentsProps) {
  const toc = useMemo(() => {
    const lines = content.split('\n');
    const items: TOCItem[] = [];
    
    // Simple markdown regex for headers (e.g. "## Title")
    const headerRegex = /^(#{1,6})\s+(.*)$/;
    
    lines.forEach((line, index) => {
      const match = line.match(headerRegex);
      if (match) {
        items.push({
          id: `heading-${index}`,
          text: match[2].trim(),
          level: match[1].length,
          line: index + 1 // CodeMirror lines are 1-based
        });
      }
    });
    
    return items;
  }, [content]);

  if (toc.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-gray-400 dark:text-zinc-600 space-y-2">
        <ListTree size={24} className="opacity-50" />
        <span className="text-xs text-center">
          {lang === 'it' ? 'Nessun titolo trovato' : 'No headings found'}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
      <h3 className="font-bold text-xs mb-4 text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
        <ListTree size={14} />
        {lang === 'it' ? 'Indice' : 'Outline'}
      </h3>
      <ul className="space-y-1.5">
        {toc.map(item => (
          <li 
            key={item.id} 
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
            className="text-[11px] text-gray-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-1 px-1.5 rounded cursor-pointer truncate transition-colors"
            onClick={() => {
              onNavigate(item.line);
              const el = document.getElementById(item.id);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            title={item.text}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
