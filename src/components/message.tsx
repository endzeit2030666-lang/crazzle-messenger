"use client";

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Clock, Copy, CornerUpRight, MoreHorizontal, Pencil, Shield, Trash2, Smile } from "lucide-react";
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


type MessageProps = {
  message: MessageType;
  onQuote: (message: MessageType) => void;
  onEdit: (message: MessageType) => void;
  onDelete: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
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

export default function Message({ message, onQuote, onEdit, onDelete, onReact, sender }: MessageProps) {
  const isCurrentUser = message.senderId === currentUser.id;
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({ title: 'Message copied!' });
  };
  
  const handleDelete = (forEveryone: boolean) => {
      onDelete(message.id, forEveryone);
  }

  const StatusIcon = ({ status }: { status: MessageType['status']}) => {
    switch (status) {
      case 'sent': return <Check className="h-4 w-4" />;
      case 'delivered': return <CheckCheck className="h-4 w-4" />;
      case 'read': return <CheckCheck className="h-4 w-4 text-primary" />;
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

  if (message.content === "This message was deleted") {
     return (
       <div className={cn("flex items-center gap-2 my-4", isCurrentUser ? "justify-end" : "justify-start")}>
        <div className="flex items-center gap-2 text-xs italic text-muted-foreground bg-secondary/30 px-3 py-1.5 rounded-lg">
           <Trash2 className="h-3.5 w-3.5" />
           <span>This message was deleted</span>
        </div>
      </div>
     )
  }

  return (
    <div className={cn("group flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")} onTouchEnd={handleSwipe}>
       <div className={cn("relative", isCurrentUser ? "order-1" : "")}>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                <DropdownMenuItem onClick={() => onQuote(message)}>
                    <CornerUpRight className="mr-2 h-4 w-4" />
                    <span>Reply</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowReactionPicker(true)}>
                    <Smile className="mr-2 h-4 w-4" />
                    <span>React</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy</span>
                </DropdownMenuItem>
                {isCurrentUser && (
                    <DropdownMenuItem onClick={() => onEdit(message)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                    </DropdownMenuItem>
                )}
                 {isCurrentUser && (
                    <DropdownMenuItem onClick={() => handleDelete(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete for everyone</span>
                    </DropdownMenuItem>
                )}
                 <DropdownMenuItem onClick={() => handleDelete(false)} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete for me</span>
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
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                <p>End-to-end encrypted</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {message.isSelfDestructing && (
             <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-3 w-3 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Self-destructing message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {message.isEdited && <span className={cn("italic", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/70")}>Edited</span>}

          <span className={cn("text-primary", isCurrentUser ? "text-primary-foreground/70" : "text-primary")}>
            {message.timestamp}
          </span>
          {isCurrentUser && <StatusIcon status={message.status} />}
        </div>
        {showReactionPicker && (
            <div className="absolute bottom-full mb-2 z-10">
                <ReactionPicker onSelect={handleReaction} onPlusClick={() => toast({title: "Full emoji picker not implemented"})}/>
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
                                <p key={r.userId}>{r.username} reacted with {r.emoji}</p>
                           ))}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span className="pr-1 text-muted-foreground">{message.reactions.length}</span>
            </div>
        )}
      </div>
    </div>
  );
}