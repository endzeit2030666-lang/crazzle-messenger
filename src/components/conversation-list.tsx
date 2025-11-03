"use client";

import { useState, useMemo } from "react";
import { Search, MoreVertical, Users, CameraIcon, BookUser } from "lucide-react";
import type { Conversation, User as UserType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "firebase/auth";


type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string, type: 'private' | 'group') => void;
  onNavigateToSettings: () => void;
  onNavigateToContacts: () => void;
  onNavigateToStatus: () => void;
  currentUser: User;
};

export default function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onNavigateToSettings,
  onNavigateToContacts,
  onNavigateToStatus,
  currentUser
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredConversations = useMemo(() => {
    return conversations
      .filter(convo => {
        if (convo.type === 'group') {
          return convo.name?.toLowerCase().includes(searchTerm.toLowerCase());
        }
        const contact = convo.participants.find(p => p.id !== currentUser.uid);
        return contact?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const timeA = a.lastMessage?.date?.toMillis() || a.createdAt?.toMillis() || 0;
        const timeB = b.lastMessage?.date?.toMillis() || b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });
  }, [conversations, searchTerm, currentUser.uid]);
  

  const ConversationItem = ({ convo }: { convo: Conversation }) => {
    const isGroup = convo.type === 'group';
    const contact = isGroup ? null : convo.participants.find(p => p.id !== currentUser.uid);

    if (!isGroup && !contact) return null;
    
    const lastMessage = convo.lastMessage;
    const lastMessageSenderName = lastMessage?.senderId === currentUser.uid 
      ? 'Du' 
      : convo.participants.find(p => p.id === lastMessage?.senderId)?.name?.split(' ')[0];

    const handleSelect = () => {
      onConversationSelect(convo.id, convo.type);
    }
    
    const displayName = isGroup ? convo.name : contact?.name;
    const displayAvatar = isGroup ? convo.avatar || `https://picsum.photos/seed/${convo.id}/100` : contact?.avatar;


    return (
      <div className="relative group/item">
        <div
          onClick={handleSelect}
          className={cn(
            "w-full flex items-start p-3 rounded-lg text-left transition-colors cursor-pointer",
            selectedConversationId === convo.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          )}
        >
          <Avatar className="w-10 h-10 mr-3">
            <AvatarImage asChild>
              <Image src={displayAvatar!} alt={displayName!} width={40} height={40} data-ai-hint="person portrait" />
            </AvatarImage>
            <AvatarFallback className={cn("text-primary", selectedConversationId === convo.id ? "text-primary-foreground bg-primary/80" : "text-primary")}>
              {isGroup ? <Users className="w-5 h-5"/> : displayName?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden pr-5">
            <div className="flex items-center justify-between">
              <h3 className={cn("font-semibold truncate", selectedConversationId === convo.id ? "" : "text-primary")}>{displayName}</h3>
              <p className={cn("text-xs shrink-0", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-white/70")}>{lastMessage?.timestamp}</p>
            </div>
            <p className={cn("text-sm truncate", selectedConversationId === convo.id ? "text-primary-foreground/90" : "text-white")}>
                <>
                  {lastMessageSenderName && `${lastMessageSenderName}: `}
                  {lastMessage?.content || (lastMessage?.type !== 'text' ? `${lastMessage?.type} gesendet` : 'Noch keine Nachrichten')}
                </>
            </p>
          </div>
        </div>
      </div>
    );
  };


  return (
    <aside className="w-full h-full flex flex-col border-r border-border bg-muted/30 md:w-96">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <h1 className="font-headline text-2xl font-bold text-primary">Crazzle</h1>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateToStatus}>
                            <CameraIcon className="w-5 h-5 text-white" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Status</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateToContacts}>
                            <BookUser className="w-5 h-5 text-white" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Telefonbuch</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNavigateToSettings}>
                            <MoreVertical className="w-5 h-5 text-white" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Einstellungen</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
          <Input
            type="search"
            placeholder="Chats suchen..."
            className="pl-9 bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          <h3 className="px-3 text-xs font-semibold text-white tracking-wider uppercase">Alle Chats</h3>
          {filteredConversations.map(convo => <ConversationItem key={convo.id} convo={convo} />)}
        </nav>
      </div>
    </aside>
  );
}
