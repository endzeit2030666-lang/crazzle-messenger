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
  Trash2,
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
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { EmojiPicker } from './emoji-picker';

type MessageInputProps = {
  onSendMessage: (content: string, type?: 'text' | 'audio', duration?: number, selfDestructDuration?: number) => void;
  quotedMessage?: Message['quotedMessage'];
  onClearQuote: () => void;
  isEditing: boolean;
  editingMessage: Message | null;
  onStopEditing: () => void;
  disabled?: boolean;
};

export default function MessageInput({
  onSendMessage,
  quotedMessage,
  onClearQuote,
  isEditing,
  editingMessage,
  onStopEditing,
  disabled = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [debouncedText, setDebouncedText] = useState('');
  const [analysis, setAnalysis] =
    useState<AnalyzeCommunicationOutput | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEmojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [selfDestructDuration, setSelfDestructDuration] = useState<number | undefined>(undefined);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setRecordingTime(0);

      mediaRecorderRef.current = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onSendMessage(audioUrl, 'audio', recordingTime, selfDestructDuration);
        setSelfDestructDuration(undefined);

        // Stop all media tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Fehler beim Zugriff auf das Mikrofon:", err);
      toast({
        variant: 'destructive',
        title: 'Mikrofonzugriff verweigert',
        description: 'Bitte aktivieren Sie die Mikrofonberechtigungen in Ihren Browsereinstellungen.',
      });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setIsRecording(false);
  };
  
  const cancelRecording = () => {
      if (mediaRecorderRef.current) {
        // Stop without triggering onstop event
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setIsRecording(false);
      setRecordingTime(0);
  }

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
      onSendMessage(text.trim(), 'text', undefined, selfDestructDuration);
      setText('');
      setAnalysis(null);
      setSelfDestructDuration(undefined);
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
  
  const handleSetSelfDestruct = (duration: number | undefined) => {
    setSelfDestructDuration(duration);
    if (duration) {
        toast({
            title: `Selbstzerstörende Nachrichten aktiviert`,
            description: `Nachricht wird ${duration/3600}h nach dem Lesen gelöscht.`,
        })
    } else {
        toast({
            title: `Selbstzerstörende Nachrichten deaktiviert`,
        })
    }
  }

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
  
  const selfDestructOptions = [
    { label: 'Aus', duration: undefined },
    { label: 'In 1 Stunde', duration: 3600 },
    { label: 'In 8 Stunden', duration: 28800 },
    { label: 'In 24 Stunden', duration: 86400 },
  ];

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
          {isRecording ? (
            <div className="flex-1 flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={cancelRecording}
                className="shrink-0 text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <div className="flex-1 bg-muted rounded-full h-10 flex items-center px-4">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  <span className="font-mono text-sm text-muted-foreground">{formatTime(recordingTime)}</span>
              </div>
               <Button
                type="button"
                size="icon"
                onClick={stopRecording}
                className="shrink-0 bg-primary hover:bg-primary/90"
              >
                <Send className="h-5 w-5" />
                <span className="sr-only">Sprachnachricht senden</span>
              </Button>
            </div>
          ) : (
            <>
               <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => router.push('/status/camera')}
                className="shrink-0"
                disabled={disabled}
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
                    disabled={disabled}
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
                disabled={disabled}
              >
                <Smile className="h-5 w-5" />
                <span className="sr-only">Emoji-Picker öffnen</span>
              </Button>

              <Textarea
                ref={textareaRef}
                value={text}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={disabled ? "Kontakt blockiert" : "Verschlüsselte Nachricht tippen..."}
                className="flex-1 resize-none bg-muted border-0 focus-visible:ring-0 max-h-40 overflow-y-auto"
                rows={1}
                disabled={disabled}
              />

              {text ? (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!text.trim() || disabled}
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
                        onMouseDown={startRecording}
                        onMouseUp={stopRecording}
                        onTouchStart={startRecording}
                        onTouchEnd={stopRecording}
                        className="shrink-0"
                        disabled={disabled}
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

              <Popover>
                <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className={cn("shrink-0", selfDestructDuration && "text-primary bg-primary/20")}
                      disabled={disabled}
                    >
                      <Clock className="h-5 w-5" />
                      <span className="sr-only">Selbstzerstörende Nachricht</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2 mb-2">
                    <div className="grid gap-1">
                        <p className="font-medium text-sm px-2 py-1.5 text-black dark:text-black">Nachricht löschen nach...</p>
                        {selfDestructOptions.map(option => (
                           <Button
                            key={option.label}
                            variant="ghost"
                            className={cn("w-full justify-start", selfDestructDuration === option.duration && "bg-accent")}
                            onClick={() => handleSetSelfDestruct(option.duration)}
                           >
                            {option.label}
                           </Button> 
                        ))}
                    </div>
                </PopoverContent>
              </Popover>
            </>
          )}
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
