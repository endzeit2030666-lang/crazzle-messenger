
"use client";

import { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, Copy, CornerUpRight, MoreHorizontal, Pencil, Shield, Trash2, Smile, Play, Pause } from "lucide-react";
import type { Message as MessageType, User } from "@/lib/types";
import { currentUser } from "@/lib/data";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Slider } from './ui/slider';


const AudioMessage = ({ message }: { message: MessageType }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
        const newTime = (value[0] / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setProgress(value[0]);
    }
  };

  const isCurrentUser = message.senderId === currentUser.id;

  return (
    <div className="flex items-center gap-3 w-64">
      <audio ref={audioRef} src={message.audioUrl} preload="metadata" />
      <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-full", isCurrentUser ? "bg-white/20 hover:bg-white/30" : "bg-primary/20 hover:bg-primary/30")} onClick={togglePlay}>
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </Button>
      <div className="flex-1 flex flex-col gap-1">
        <Slider
          value={[progress]}
          onValueChange={handleSliderChange}
          max={100}
          step={1}
          className={cn("[&>div>span]:bg-white", isCurrentUser ? "[&>div>span]:bg-white" : "[&>div>span]:bg-primary")}
        />
        <div className="text-xs flex justify-between">
           <span>{formatTime(currentTime)}</span>
           <span>{formatTime(message.audioDuration || 0)}</span>
        </div>
      </div>
    </div>
  );
};


type MessageProps = {
  message: MessageType;
  onQuote: (message: MessageType) => void;
  onEdit: (message: MessageType) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onMessageRead: (messageId: string) => void;
  sender?: User;
};


const LinkPreview = ({ url, title, description, image }: { url: string, title: string, description: string, image: string }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block bg-secondary/50 rounded-lg overflow-hidden">
        <Image src={image} alt={title} width={400} height={225} className="w-full h-auto object-cover" data-ai-hint="youtube thumbnail" />
        <div className="p-3">
            <h4 className="font-semibold text-sm text-foreground/90">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    </a>
)

const ReactionPicker = ({ onSelect, onPlusClick }: { onSelect: (emoji: string) => void, onPlusClick: () => void }) => {
  const quickReactions = ['❤️', '😂', '👍', '😮', '😢', '🔥'];
  return (
    <div className="flex items-center gap-2 bg-background p-1.5 rounded-full shadow-lg border border-border">
      {quickReactions.map(emoji => (
        <button key={emoji} onClick={() => onSelect(emoji)} className="text-2xl hover:scale-125 transition-transform">
          {emoji}
        </button>
      ))}
      <button onClick={onPlusClick} className="text-xl text-muted-foreground hover:bg-muted rounded-full p-1">+</button>
    </div>
  )
}

export default function Message({ message, onQuote, onEdit, onDelete, onReact, onMessageRead, sender }: MessageProps) {
  const isCurrentUser = message.senderId === currentUser.id;
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const { toast } = useToast();
  
  // Self-destruct logic
  useEffect(() => {
    if (message.selfDestructDuration && message.senderId !== currentUser.id && !message.readAt) {
      onMessageRead(message.id);
    }
  }, [message.selfDestructDuration, message.senderId, message.readAt, message.id, onMessageRead]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (message.selfDestructDuration && message.readAt) {
      const destructTime = message.readAt + (message.selfDestructDuration * 1000);
      const remainingTime = destructTime - Date.now();

      if (remainingTime > 0) {
        timer = setTimeout(() => {
          onDelete(message.id, false);
        }, remainingTime);
      } else {
        onDelete(message.id, false);
      }
    }
    return () => clearTimeout(timer);
  }, [message.selfDestructDuration, message.readAt, message.id, onDelete]);


  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast({ title: 'Nachricht kopiert!' });
    }
  };
  
  const handleDelete = (forEveryone: boolean) => {
      onDelete(message.id, forEveryone);
  }

  const StatusIcon = ({ status }: { status: MessageType['status']}) => {
    switch (status) {
      case 'sent': return <Check className="h-4 w-4 text-red-500" />;
      case 'delivered': return <CheckCheck className="h-4 w-4 text-yellow-500" />;
      case 'read': return <CheckCheck className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const handleReaction = (emoji: string) => {
    onReact(message.id, emoji);
    setShowReactionPicker(false);
  }

  const userReaction = message.reactions.find(r => r.userId === currentUser.id);
  
  const handleSwipe = (e: React.TouchEvent) => {
    // A very basic swipe detection
    const touch = e.changedTouches[0];
    if (touch.clientX - (e.currentTarget.getBoundingClientRect().left) > 75) {
       onQuote(message);
    }
  };

  if (!message.content && !message.audioUrl) {
    return null;
  }

  return (
    <div className={cn("group flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")} onTouchEnd={handleSwipe}>
       <div className={cn("relative", isCurrentUser ? "order-1" : "")}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 transition-opacity opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                <DropdownMenuItem onClick={() => onQuote(message)}>
                    <CornerUpRight className="mr-2 h-4 w-4" />
                    <span>Antworten</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReactionPicker(true)}>
                    <Smile className="mr-2 h-4 w-4" />
                    <span>Reagieren</span>
                </DropdownMenuItem>
                {message.type !== 'audio' && <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Kopieren</span>
                </DropdownMenuItem>}
                {isCurrentUser && message.type === 'text' && (
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Bearbeiten</span>
                    </DropdownMenuItem>
                )}
                 {isCurrentUser && (
                    <DropdownMenuItem onClick={() => handleDelete(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Für alle löschen</span>
                    </DropdownMenuItem>
                )}
                 <DropdownMenuItem onClick={() => handleDelete(false)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Für mich löschen</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
       </div>
      <div
        className={cn(
          "relative max-w-md lg:max-w-xl p-3 px-4 rounded-2xl shadow-sm",
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-secondary text-secondary-foreground rounded-bl-none"
        )}
      >
        {message.quotedMessage && (
           <a href={`#message-${message.quotedMessage.id}`} className="block bg-black/10 p-2 rounded-md mb-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
                <p className="font-semibold text-xs">{message.quotedMessage.senderName}</p>
                <p className="truncate">{message.quotedMessage.content}</p>
            </a>
        )}
        
        {message.type === 'audio' ? (
          <AudioMessage message={message} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
        
        {message.linkPreview && (
          <LinkPreview {...message.linkPreview} />
        )}
        <div className="flex items-center gap-2.5 mt-2 text-xs">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger>
                <Shield className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Ende-zu-Ende-verschlüsselt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {message.selfDestructDuration && (
             <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-3 w-3 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Selbstzerstörende Nachricht ({message.selfDestructDuration / 3600}h)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {message.isEdited && <span className={cn("italic", isCurrentUser ? "text-primary-foreground/70" : "text-white")}>Bearbeitet</span>}

          <span className={cn("text-white", isCurrentUser ? "text-primary-foreground/70" : "text-white")}>
            {message.timestamp}
          </span>
          {isCurrentUser && <StatusIcon status={message.status} />}
        </div>
        {showReactionPicker && (
            <div className="absolute bottom-full mb-2 z-10">
                <ReactionPicker onSelect={handleReaction} onPlusClick={() => toast({title: "Vollständiger Emoji-Picker nicht implementiert"})}/>
            </div>
        )}
        {message.reactions.length > 0 && (
            <div className="absolute -bottom-3 right-2 flex items-center gap-1 bg-background border border-border p-0.5 rounded-full text-xs">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="flex">
                            {Array.from(new Set(message.reactions.map(r => r.emoji))).slice(0, 3).map(emoji => (
                                <span key={emoji}>{emoji}</span>
                            ))}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                           {message.reactions.map(r => (
                                <p key={r.userId}>{r.username} reagierte mit {r.emoji}</p>
                           ))}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span className="pr-1 text-white">{message.reactions.length}</span>
            </div>
        )}
      </div>
    </div>
  );
}
