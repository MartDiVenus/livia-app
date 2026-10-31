import React, { useMemo, useEffect, useRef } from 'react';
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
  activeLine?: number;
}

export function TableOfContents({ content, onNavigate, lang, activeLine = 1 }: TableOfContentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  const activeItemId = useMemo(() => {
    if (!toc.length || !activeLine) return null;
    let active: TOCItem | null = null;
    for (const item of toc) {
      if (item.line <= activeLine) {
        active = item;
      } else {
        break;
      }
    }
    return active ? active.id : toc[0].id;
  }, [toc, activeLine]);

  useEffect(() => {
    if (!activeItemId || !containerRef.current) return;
    const itemEl = containerRef.current.querySelector(`[data-toc-id="${activeItemId}"]`) as HTMLElement | null;
    if (itemEl) {
      itemEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeItemId]);

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
    <div ref={containerRef} className="h-full overflow-y-auto p-4 custom-scrollbar">
      <h3 className="font-bold text-xs mb-4 text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
        <ListTree size={14} />
        {lang === 'it' ? 'Indice' : 'Outline'}
      </h3>
      <ul className="space-y-1.5">
        {toc.map(item => {
          const isActive = item.id === activeItemId;
          return (
            <li 
              key={item.id}
              data-toc-id={item.id}
              style={{ paddingLeft: `${(item.level - 1) * 12 + 6}px` }}
              className={`text-[11px] py-1 px-1.5 rounded cursor-pointer truncate transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-[#8AB4F8] bg-blue-50 dark:bg-[#8AB4F8]/15 font-bold border-l-2 border-blue-500 dark:border-[#8AB4F8]'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
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
          );
        })}
      </ul>
    </div>
  );
}
