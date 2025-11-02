'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { EMOJI_CATEGORIES } from '@/data/emojis';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';


interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

export function EmojiPicker({ onEmojiSelect, onClose, className }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    // Add to recently used, ensuring no duplicates and maintaining order
    const newRecent = [emoji, ...recentlyUsed.filter((r) => r !== emoji)].slice(0, 16);
    setRecentlyUsed(newRecent);
  };
  
  const activeEmojis = EMOJI_CATEGORIES.find((c) => c.id === activeCategory)?.emojis || [];
  const filteredEmojis = search ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.toLowerCase().includes(search.toLowerCase())) : activeEmojis;


  return (
    <div className={cn("h-[45vh] bg-muted/80 backdrop-blur-sm border-t border-border rounded-t-lg flex flex-col", className)}>
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto">
          {EMOJI_CATEGORIES.map((category) => (
            <TooltipProvider key={category.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={activeCategory === category.id && !search ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                        setSearch('');
                        setActiveCategory(category.id);
                    }}
                  >
                    {category.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{category.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-2">
        <input
          type="text"
          placeholder="Emoji suchen..."
          className="w-full bg-background/50 border border-border rounded-md px-3 py-1.5 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-1">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            onClick={() => handleSelect(emoji)}
            className="text-2xl hover:bg-black/20 rounded-md transition-colors aspect-square flex items-center justify-center"
          >
            {emoji}
          </button>
        ))}
      </div>
      {recentlyUsed.length > 0 && !search && (
        <div className="p-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Zuletzt verwendet</p>
          <div className="flex flex-wrap gap-1">
            {recentlyUsed.map((emoji, index) => (
              <button
                key={`recent-${emoji}-${index}`}
                onClick={() => handleSelect(emoji)}
                className="text-2xl hover:bg-black/20 rounded-md transition-colors p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
