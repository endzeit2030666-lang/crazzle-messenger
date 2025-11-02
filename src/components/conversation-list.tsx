
"use client";

import { useState, useMemo } from "react";
import { Search, Archive, Bell, MoreVertical, XCircle, CameraIcon } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { currentUser } from "@/lib/data";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";


type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onMuteToggle: (id: string) => void;
  onBlockContact: (contactId: string) => void;
  onUnblockContact: (contactId: string) => void;
  blockedUsers: Set<string>;
  onNavigateToSettings: () => void;
};

export default function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onMuteToggle,
  onBlockContact,
  onUnblockContact,
  blockedUsers,
  onNavigateToSettings
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const router = useRouter();


  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => {
      const contact = convo.participants.find(p => p.id !== currentUser.id);
      return contact?.name.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => (a.id > b.id ? -1 : 1));
  }, [conversations, searchTerm]);

  const ConversationItem = ({ convo }: { convo: Conversation }) => {
    const contact = convo.participants.find(p => p.id !== currentUser.id);

    if (!contact) return null;
    
    const isBlocked = blockedUsers.has(contact.id);
    const lastMessage = convo.messages[convo.messages.length - 1];
    const lastMessageSender = (lastMessage?.senderId === currentUser.id ? 'Du' : undefined);

    const handleBlockToggle = () => {
      if (isBlocked) {
        onUnblockContact(contact.id);
      } else {
        onBlockContact(contact.id);
      }
    }

    return (
      <div className="relative group/item">
        <div
          onClick={() => onConversationSelect(convo.id)}
          className={cn(
            "w-full flex items-start p-3 rounded-lg text-left transition-colors cursor-pointer",
            selectedConversationId === convo.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted",
             isBlocked && !selectedConversationId ? "opacity-50" : "",
             isBlocked && selectedConversationId === convo.id ? "opacity-100 bg-destructive/20" : "",
          )}
        >
          <Avatar className="w-10 h-10 mr-3">
            <AvatarImage asChild>
              <Image src={contact.avatar} alt={contact.name} width={40} height={40} data-ai-hint="person portrait" />
            </AvatarImage>
            <AvatarFallback className={cn("text-primary", selectedConversationId === convo.id ? "text-primary-foreground bg-primary/80" : "text-primary")}>{contact.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden pr-5">
            <div className="flex items-center justify-between">
              <h3 className={cn("font-semibold truncate", selectedConversationId === convo.id ? "" : "text-primary")}>{contact.name}</h3>
              <div className="flex items-center gap-2 pr-5">
                  {convo.isMuted && <Bell className={cn("w-3.5 h-3.5", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-white/70")} />}
                  <p className={cn("text-xs shrink-0", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-white/70")}>{lastMessage?.timestamp}</p>
              </div>
            </div>
            <p className={cn("text-sm truncate", selectedConversationId === convo.id ? "text-primary-foreground/90" : "text-white")}>
              { isBlocked ? "Dieser Kontakt ist blockiert" : (
                <>
                  {lastMessageSender && `${lastMessageSender}: `}
                  {lastMessage?.content}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 z-10">
                      <MoreVertical className="w-4 h-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuItem onClick={() => onMuteToggle(convo.id)}>
                  {convo.isMuted ? <Bell className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
                  <span>{convo.isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: 'Archivieren noch nicht implementiert' })}>
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archivieren</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleBlockToggle} className={cn(isBlocked && "text-green-500 focus:text-green-500")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>{isBlocked ? 'Blockierung aufheben' : 'Kontakt blockieren'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => toast({ title: 'Löschen noch nicht implementiert' })}>
                  <XCircle className="mr-2 h-4 w-4" />
                  <span>Löschen</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
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
          <div className="flex items-center gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/status')}>
                            <CameraIcon className="w-5 h-5 text-white" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Status-Updates</p>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Kontakte suchen..."
            className="pl-9 bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground"
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

    