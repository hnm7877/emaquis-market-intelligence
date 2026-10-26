import React from 'react';

/** **gras** dans une ligne, rendu en éléments React (jamais de HTML injecté) */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i} className="text-foreground">{part.slice(2, -2)}</strong> : part,
  );
}

/** Markdown minimal et sûr : titres, listes, numérotation, gras, séparateurs */
export function MarkdownLite({ text }: { text: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (/^-{3,}$/.test(line.trim())) return <hr key={i} className="border-border/60 my-2" />;
        const h = /^(#{1,4})\s+(.*)$/.exec(line);
        if (h) {
          const size = h[1].length <= 1 ? 'text-base' : h[1].length === 2 ? 'text-sm' : 'text-[13px]';
          return <p key={i} className={`${size} font-bold text-foreground mt-2`}>{inline(h[2])}</p>;
        }
        const bullet = /^\s*[-•*▸]\s+(.*)$/.exec(line);
        if (bullet) return <p key={i} className="pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-orange-500">{inline(bullet[1])}</p>;
        const num = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
        if (num) return <p key={i} className="pl-5 relative"><span className="absolute left-0 font-semibold text-orange-500">{num[1]}.</span>{inline(num[2])}</p>;
        return <p key={i}>{inline(line)}</p>;
      })}
    </div>
  );
}
