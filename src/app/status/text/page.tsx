'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Send, Palette, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/components/emoji-picker';

const backgroundColors = [
  'bg-gradient-to-br from-purple-500 to-blue-500',
  'bg-gradient-to-br from-green-400 to-cyan-500',
  'bg-gradient-to-br from-yellow-400 to-orange-500',
  'bg-gradient-to-br from-pink-500 to-rose-500',
  'bg-gradient-to-br from-indigo-500 to-purple-600',
  'bg-slate-800',
];

export default function TextStatusPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(backgroundColors[0]);
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const changeBackgroundColor = () => {
    const currentIndex = backgroundColors.indexOf(bgColor);
    const nextIndex = (currentIndex + 1) % backgroundColors.length;
    setBgColor(backgroundColors[nextIndex]);
  };

  const handlePostStatus = () => {
    if (!text.trim()) {
        toast({
            variant: "destructive",
            title: "Leerer Status",
            description: "Bitte gib einen Text für deinen Status ein.",
        });
        return;
    }
    toast({
      title: 'Status gepostet!',
      description: 'Dein Text-Status ist jetzt sichtbar.',
    });
    router.push('/status');
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const newText = text.slice(0, cursorPosition) + emoji + text.slice(cursorPosition);
    setText(newText);
    
    setTimeout(() => {
        textareaRef.current?.focus();
        if (textareaRef.current) {
            textareaRef.current.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
        }
    }, 0);
  };


  return (
    <div className={cn('w-full h-screen text-white flex flex-col transition-all duration-500', bgColor)}>
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setEmojiPickerOpen(true)}>
            <Smile className="w-6 h-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={changeBackgroundColor}>
            <Palette className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Status verfassen..."
          className="bg-transparent border-0 text-3xl md:text-5xl font-bold text-center resize-none shadow-none focus-visible:ring-0 h-auto text-white placeholder:text-white/70"
        />
      </main>

       {isEmojiPickerOpen && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setEmojiPickerOpen(false)}
          />
        </div>
      )}

      <footer className="p-8">
        <Button
          onClick={handlePostStatus}
          size="lg"
          className="w-full bg-black/30 hover:bg-black/50 backdrop-blur-sm"
        >
          <Send className="w-5 h-5 mr-2" />
          Posten
        </Button>
      </footer>
    </div>
  );
}
