'use client';

import { useState, useEffect } from 'react';
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
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('smileys');

  useEffect(() => {
    const storedRecent = localStorage.getItem('recentlyUsedEmojis');
    if (storedRecent) {
      const parsedRecent = JSON.parse(storedRecent);
      setRecentlyUsed(parsedRecent);
      if (parsedRecent.length > 0) {
        setActiveCategory('recent');
      }
    }
  }, []);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    const newRecent = [emoji, ...recentlyUsed.filter((r) => r !== emoji)].slice(0, 48);
    setRecentlyUsed(newRecent);
    localStorage.setItem('recentlyUsedEmojis', JSON.stringify(newRecent));
  };
  
  const allCategories =
    recentlyUsed.length > 0
      ? [{ id: 'recent', name: 'Zuletzt verwendet', icon: '🕒', emojis: recentlyUsed }, ...EMOJI_CATEGORIES]
      : EMOJI_CATEGORIES;

  const activeEmojis = allCategories.find((c) => c.id === activeCategory)?.emojis || [];

  return (
    <div className={cn("h-[45vh] bg-muted/80 backdrop-blur-sm border-t border-border rounded-t-lg flex flex-col", className)}>
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto">
          {allCategories.map((category) => (
              <TooltipProvider key={category.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={activeCategory === category.id ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {category.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{category.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-8 gap-1">
        {activeEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            onClick={() => handleSelect(emoji)}
            className="text-2xl hover:bg-black/20 rounded-md transition-colors aspect-square flex items-center justify-center"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
