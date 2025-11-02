'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Send,
  Clock,
  AlertTriangle,
  Mic,
  Plus,
  FileText,
  ImageIcon,
  Video,
  Music,
  FileArchive,
  FileCode,
  Camera as CameraIcon,
  Smile,
  X,
  MessageSquareQuote,
  Pencil,
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { analyzeTextForSafety } from '@/app/actions';
import type { AnalyzeCommunicationOutput } from '@/ai/flows/context-aware-safety-tool';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { currentUser } from '@/lib/data';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './emoji-picker';

type MessageInputProps = {
  onSendMessage: (content: string) => void;
  quotedMessage?: Message['quotedMessage'];
  onClearQuote: () => void;
  isEditing: boolean;
  editingMessage: Message | null;
  onStopEditing: () => void;
};

export default function MessageInput({
  onSendMessage,
  quotedMessage,
  onClearQuote,
  isEditing,
  editingMessage,
  onStopEditing,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [analysis, setAnalysis] =
    useState<AnalyzeCommunicationOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isEditing && editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    } else {
      setText('');
    }
  }, [isEditing, editingMessage]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedText(text);
    }, 500);

    return () => clearTimeout(handler);
  }, [text]);

  useEffect(() => {
    if (debouncedText.trim() && !isEditing) {
      startTransition(async () => {
        const result = await analyzeTextForSafety(debouncedText);
        if (
          result &&
          (result.isFraudPhishingScamLikely || result.isSensitiveDataDetected)
        ) {
          setAnalysis(result);
        } else {
          setAnalysis(null);
        }
      });
    } else {
      setAnalysis(null);
    }
  }, [debouncedText, isEditing]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      setAnalysis(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      if (isEditing) {
        onStopEditing();
      } else if (quotedMessage) {
        onClearQuote();
      } else if (isEmojiPickerOpen) {
        setEmojiPickerOpen(false);
      }
    }
  };
  

  const handleFeatureNotImplemented = (featureName: string) => {
    toast({
      title: `${featureName}`,
      description: 'Diese Funktion ist noch nicht implementiert.',
    });
  };

  const handleAttachmentClick = (label: string, formats?: string) => {
    toast({
      title: `${label} auswählen`,
      description: `Dies würde den Dateimanager öffnen, um eine Datei auszuwählen. (${formats || 'Alle'})`,
    });
  };

  const handleEmojiSelect = (emoji: string) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const newText = text.slice(0, cursorPosition) + emoji + text.slice(cursorPosition);
    setText(newText);
    
    setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
    }, 0);
  };

  const AttachmentButton = ({
    icon: Icon,
    label,
    formats,
  }: {
    icon: React.ElementType;
    label: string;
    formats?: string;
  }) => (
    <Button
      variant="ghost"
      className="w-full justify-start h-auto py-3"
      onClick={() => handleAttachmentClick(label, formats)}
    >
      <div className="flex items-center gap-4">
        <Icon className="h-6 w-6 text-primary" />
        <div className="text-left">
          <p className="font-semibold">{label}</p>
          {formats && (
            <p className="text-xs text-muted-foreground">{formats}</p>
          )}
        </div>
      </div>
    </Button>
  );

  return (
    <div className="relative">
      {isEditing && editingMessage && (
        <div className="p-2 bg-muted rounded-t-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            <div>
              <p className="font-semibold text-primary">Nachricht bearbeiten</p>
              <p className="text-muted-foreground truncate max-w-xs">{editingMessage.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onStopEditing} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {quotedMessage && (
        <div className="p-2 bg-muted rounded-t-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-primary" />
            <div>
              <p className="font-semibold text-primary">Antwort an {quotedMessage.senderName}</p>
              <p className="text-muted-foreground truncate max-w-xs">{quotedMessage.content}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClearQuote} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2">
        {analysis && (
          <Alert variant="destructive" className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Potenzielles Risiko erkannt</AlertTitle>
            <AlertDescription>{analysis.advice}</AlertDescription>
          </Alert>
        )}
        <div className={cn("flex items-end gap-2 p-2 bg-background", !quotedMessage && !isEditing ? "rounded-lg" : "rounded-b-lg")}>
           <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => router.push('/status/camera')}
            className="shrink-0"
          >
            <CameraIcon className="h-5 w-5" />
            <span className="sr-only">Kamera öffnen</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="shrink-0"
              >
                <Plus className="h-5 w-5" />
                <span className="sr-only">Datei anhängen</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2 mb-2">
              <div className="grid grid-cols-1 gap-1">
                <AttachmentButton
                  icon={ImageIcon}
                  label="Bild aus Galerie"
                />
                <AttachmentButton
                  icon={Video}
                  label="Video aus Galerie"
                />
                <hr className="my-2 border-border" />
                <AttachmentButton
                  icon={FileText}
                  label="Dokument"
                  formats=".pdf, .doc, .xls, .ppt, .txt..."
                />
                <AttachmentButton
                  icon={Music}
                  label="Audio"
                  formats=".mp3, .wav, .aac, .ogg..."
                />
                <AttachmentButton
                  icon={FileArchive}
                  label="Komprimiert"
                  formats=".zip, .rar, .7z"
                />
                <AttachmentButton
                  icon={FileCode}
                  label="Andere"
                  formats=".html, .csv, .apk..."
                />
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setEmojiPickerOpen(!isEmojiPickerOpen)}
            className="shrink-0"
          >
            <Smile className="h-5 w-5" />
            <span className="sr-only">Emoji-Picker öffnen</span>
          </Button>

          <Textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Verschlüsselte Nachricht tippen..."
            className="flex-1 resize-none bg-muted border-0 focus-visible:ring-0 max-h-40 overflow-y-auto"
            rows={1}
          />
          

          {text ? (
            <Button
              type="submit"
              size="icon"
              disabled={!text.trim()}
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
              <span className="sr-only">{isEditing ? 'Änderungen speichern' : 'Nachricht senden'}</span>
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => handleFeatureNotImplemented('Sprachnachrichten')}
                    className="shrink-0"
                  >
                    <Mic className="h-5 w-5 text-primary" />
                    <span className="sr-only">Sprachnachricht aufnehmen</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sprachnachricht aufnehmen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() =>
                    handleFeatureNotImplemented('Selbstzerstörende Nachrichten')
                  }
                  className="shrink-0"
                >
                  <Clock className="h-5 w-5" />
                  <span className="sr-only">Selbstzerstörende Nachricht</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Selbstzerstörende Nachricht</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
       <EmojiPicker
        onEmojiSelect={handleEmojiSelect}
        onClose={() => setEmojiPickerOpen(false)}
        className={cn('absolute bottom-full w-full', isEmojiPickerOpen ? 'flex' : 'hidden')}
      />
    </div>
  );
}
