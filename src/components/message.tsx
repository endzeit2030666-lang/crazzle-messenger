"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, Copy, CornerUpRight, MoreHorizontal, Pencil, Shield, Trash2, Smile, Play, Pause, Loader2, Users, File, Download } from "lucide-react";
import type { Message as MessageType, User as UserType } from "@/lib/types";
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
import type { User } from 'firebase/auth';
import { decryptMessage } from '@/lib/crypto';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { EmojiPicker } from './emoji-picker';


const useDecryptedMessage = (message: MessageType, sender: UserType | undefined, isCurrentUser: boolean, isGroup: boolean, currentUserId: string) => {
  const [decryptedContent, setDecryptedContent] = useState<string | null>(message.content);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // No decryption needed for non-text, group chats, own messages, or if content is empty
    if (message.type !== 'text' || isGroup || isCurrentUser || !message.content) {
      setDecryptedContent(message.content);
      setIsLoading(false);
      return;
    }
    
    // Public key is not available for old messages before the feature was added or for missing sender
    if (!sender?.publicKey) {
        setIsLoading(false);
        setDecryptedContent("🔒 Nachricht kann nicht entschlüsselt werden (fehlender Schlüssel).");
        return;
    }

    const decrypt = async () => {
      setIsLoading(true);
      const decrypted = await decryptMessage(sender.publicKey!, message.content, currentUserId);
      setDecryptedContent(decrypted);
      setIsLoading(false);
    };

    decrypt();
  }, [message.content, message.type, sender?.publicKey, isCurrentUser, isGroup, currentUserId]);

  return { isLoading, decryptedContent };
};


const AudioMessage = ({ message, currentUser }: { message: MessageType, currentUser: User }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
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
    if (audioRef.current && audioRef.current.duration) {
        const newTime = (value[0] / 100) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
        setProgress(value[0]);
    }
  };

  const isCurrentUser = message.senderId === currentUser.uid;

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
          className={cn(isCurrentUser ? "[&>div>span]:bg-white" : "[&>div>span]:bg-primary")}
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
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  currentUserData?: UserType | null;
  sender?: UserType;
  currentUser: User;
  isGroup: boolean;
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

const MediaMessage = ({ message }: { message: MessageType }) => {
    if (message.type === 'image' && message.imageUrl) {
        return <Image src={message.imageUrl} alt="Gesendetes Bild" width={300} height={300} className="rounded-lg mt-1 max-w-full h-auto" data-ai-hint="user generated" unoptimized/>;
    }
    if (message.type === 'video' && message.videoUrl) {
        return <video src={message.videoUrl} controls className="rounded-lg mt-1 w-full max-w-sm" />;
    }
    if (message.type === 'document' && message.fileUrl) {
        return (
            <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-black/10 rounded-lg hover:bg-black/20 transition-colors">
                <File className="w-8 h-8 text-primary" />
                <div className="flex-1">
                    <p className="font-semibold text-sm break-all">{message.fileName || 'Dokument'}</p>
                    <p className="text-xs text-muted-foreground">Tippen zum Öffnen</p>
                </div>
                <Download className="w-5 h-5 text-muted-foreground" />
            </a>
        )
    }
    return null;
};


export default function Message({ message, onQuote, onEdit, onDelete, onReact, currentUserData, sender, currentUser, isGroup }: MessageProps) {
  const messageRef = useRef<HTMLDivElement>(null);
  const isCurrentUser = message.senderId === currentUser.uid;
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const { toast } = useToast();
  
  const { isLoading: isDecrypting, decryptedContent } = useDecryptedMessage(message, sender, isCurrentUser, isGroup, currentUser.uid);
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (message.selfDestructDuration && message.readAt) {
      const readAtTime = (message.readAt as any).toMillis ? (message.readAt as any).toMillis() : new Date(message.readAt as any).getTime();
      const destructTime = readAtTime + (message.selfDestructDuration * 1000);
      const remainingTime = destructTime - Date.now();

      if (remainingTime > 0) {
        timer = setTimeout(() => {
          onDelete(message.id);
        }, remainingTime);
      } else {
        onDelete(message.id);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message, onDelete]);


  const handleCopy = () => {
    if (decryptedContent) {
      navigator.clipboard.writeText(decryptedContent);
      toast({ title: 'Nachricht kopiert!' });
    }
  };
  
  const handleDelete = () => {
      onDelete(message.id);
  }

  const getStatusIcon = () => {
    if (!isCurrentUser) return null;
    if (currentUserData?.readReceiptsEnabled === false) {
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
    }
    switch (message.status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-green-400" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
      case 'sent':
      default:
        return <Check className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleReaction = (emoji: string) => {
    onReact(message.id, emoji);
    setShowReactionPicker(false);
    setShowFullEmojiPicker(false);
  }
  
  const handleSwipe = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touch.clientX - (e.currentTarget.getBoundingClientRect().left) > 75) {
       onQuote(message);
    }
  };

  const editableMessage = useMemo(() => ({
    ...message,
    content: decryptedContent || message.content,
  }), [message, decryptedContent])

  const hasContent = message.audioUrl || message.imageUrl || message.videoUrl || message.fileUrl || (decryptedContent && decryptedContent.trim() !== '');
  if (!hasContent) {
    return null;
  }


  return (
    <div ref={messageRef} className={cn("group flex items-start gap-3", isCurrentUser ? "justify-end" : "justify-start")} onTouchEnd={handleSwipe}>
       {isGroup && !isCurrentUser && sender && (
         <Avatar className="w-8 h-8">
            <AvatarImage src={sender.avatar} />
            <AvatarFallback>{sender.name?.charAt(0)}</AvatarFallback>
         </Avatar>
       )}
       <div className={cn("flex items-end gap-2", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
       <div className={cn("relative transition-opacity", isCurrentUser ? "order-1" : "")}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                <DropdownMenuItem onClick={() => onQuote(editableMessage)}>
                    <CornerUpRight className="mr-2 h-4 w-4" />
                    <span>Antworten</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReactionPicker(true)}>
                    <Smile className="mr-2 h-4 w-4" />
                    <span>Reagieren</span>
                </DropdownMenuItem>
                {message.type === 'text' && decryptedContent && (
                    <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>Kopieren</span>
                    </DropdownMenuItem>
                )}
                {isCurrentUser && message.type === 'text' && (
                    <DropdownMenuItem onClick={() => onEdit(editableMessage)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Bearbeiten</span>
                    </DropdownMenuItem>
                )}
                 {isCurrentUser && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Löschen</span>
                    </DropdownMenuItem>
                 )}
            </DropdownMenuContent>
        </DropdownMenu>
       </div>
      <div
        className={cn(
          "relative max-w-md lg:max-w-xl p-3 px-4 rounded-2xl shadow-sm",
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-secondary text-secondary-foreground rounded-bl-none",
          (message.type === 'image' || message.type === 'video' || message.type === 'document') && "p-1 bg-transparent"
        )}
      >
        {isGroup && !isCurrentUser && <p className="text-xs font-bold mb-1 text-primary">{sender?.name}</p>}
        {message.quotedMessage && (
           <a href={`#message-${message.quotedMessage.id}`} className="block bg-black/10 p-2 rounded-md mb-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
                <p className="font-semibold text-xs">{message.quotedMessage.senderName}</p>
                <p className="truncate">{message.quotedMessage.content}</p>
            </a>
        )}
        
        {message.type === 'audio' ? (
          <AudioMessage message={message} currentUser={currentUser} />
        ) : message.type === 'image' || message.type === 'video' || message.type === 'document' ? (
          <MediaMessage message={message} />
        ) : (
          isDecrypting ? (
            <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entschlüssle...</span>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{decryptedContent}</p>
          )
        )}
        
        {message.linkPreview && (
          <LinkPreview {...message.linkPreview} />
        )}
        <div className={cn("flex items-center gap-2.5 text-xs", (message.type === 'image' || message.type === 'video') ? 'absolute bottom-2 right-2 bg-black/50 p-1 rounded' : 'mt-2')}>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger>
                 {isGroup ? <Users className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
              </TooltipTrigger>
              <TooltipContent>
                <p>{isGroup ? 'Unverschlüsselte Gruppennachricht' : 'Ende-zu-Ende-verschlüsselt'}</p>
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

          {message.isEdited && <span className={cn("italic", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>Bearbeitet</span>}

          <span className={cn(isCurrentUser ? "text-primary-foreground/70" : "text-white")}>
            {message.timestamp}
          </span>
          {getStatusIcon()}
        </div>
        {showReactionPicker && (
            <div className="absolute bottom-full mb-2 z-10">
                <ReactionPicker 
                  onSelect={handleReaction} 
                  onPlusClick={() => {
                    setShowReactionPicker(false);
                    setShowFullEmojiPicker(true);
                  }}
                />
            </div>
        )}
         {showFullEmojiPicker && (
            <div className="absolute bottom-full mb-2 z-10" style={{width: '350px'}}>
              <EmojiPicker
                onEmojiSelect={handleReaction}
                onClose={() => setShowFullEmojiPicker(false)}
              />
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
    </div>
  );
}
