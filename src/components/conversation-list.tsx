"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, PlusCircle, Pin, BellOff, Trash2, Archive, PinOff, CameraIcon, Bell } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";

type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onPinToggle: (id: string) => void;
  onMuteToggle: (id: string) => void;
};

export default function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onPinToggle,
  onMuteToggle,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateGroup = () => {
      toast({
          title: "Create New Group",
          description: "This feature is for demonstration purposes."
      })
  }

  const { pinned, unpinned } = useMemo(() => {
    const filtered = conversations.filter(convo => {
      if (convo.type === 'group') {
          return convo.groupDetails?.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      const contact = convo.participants.find(p => p.id !== currentUser.id);
      return contact?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const pinned = filtered.filter(c => c.isPinned).sort((a, b) => (a.id > b.id ? -1 : 1));
    const unpinned = filtered.filter(c => !c.isPinned).sort((a, b) => (a.id > b.id ? -1 : 1));
    return { pinned, unpinned };
  }, [conversations, searchTerm]);

  const ConversationItem = ({ convo }: { convo: Conversation }) => {
    let name, avatar;
    if (convo.type === 'group') {
        name = convo.groupDetails?.name;
        avatar = convo.groupDetails?.avatar;
    } else {
        const contact = convo.participants.find(p => p.id !== currentUser.id);
        name = contact?.name;
        avatar = contact?.avatar;
    }

    if (!name || !avatar) return null;
    
    const lastMessage = convo.messages[convo.messages.length - 1];
    const lastMessageSender = convo.type === 'group' && lastMessage ? convo.participants.find(p => p.id === lastMessage.senderId)?.name.split(' ')[0] : (lastMessage?.senderId === currentUser.id ? 'You' : undefined);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={() => onConversationSelect(convo.id)}
            className={cn(
              "w-full flex items-start p-3 rounded-lg text-left transition-colors",
              selectedConversationId === convo.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            <Avatar className="w-10 h-10 mr-3">
              <AvatarImage asChild>
                <Image src={avatar} alt={name} width={40} height={40} data-ai-hint="person portrait" />
              </AvatarImage>
              <AvatarFallback className={cn(selectedConversationId === convo.id ? "text-primary-foreground bg-primary/80" : "text-primary")}>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center justify-between">
                <h3 className={cn("font-semibold truncate", selectedConversationId === convo.id ? "" : "text-primary")}>{name}</h3>
                <div className="flex items-center gap-2">
                    {convo.isPinned && <Pin className={cn("w-3.5 h-3.5", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-muted-foreground")} />}
                    {convo.isMuted && <BellOff className={cn("w-3.5 h-3.5", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-muted-foreground")} />}
                    <p className={cn("text-xs", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-muted-foreground")}>{lastMessage?.timestamp}</p>
                </div>
              </div>
              <p className={cn("text-sm truncate", selectedConversationId === convo.id ? "text-primary-foreground/90" : "text-muted-foreground")}>
                {lastMessageSender && `${lastMessageSender}: `}
                {lastMessage?.content}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" side="top" align="start">
          <DropdownMenuItem onClick={() => onPinToggle(convo.id)}>
            {convo.isPinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
            <span>{convo.isPinned ? 'Unpin' : 'Pin'} Chat</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMuteToggle(convo.id)}>
             {convo.isMuted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
            <span>{convo.isMuted ? 'Unmute' : 'Mute'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Archive className="mr-2 h-4 w-4" />
            <span>Archive</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
                            <CameraIcon className="w-5 h-5 text-accent" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Status Updates</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCreateGroup}>
                            <PlusCircle className="w-5 h-5 text-accent" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>New Group</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts or groups..."
            className="pl-9 bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          {pinned.length > 0 && (
            <div className="mb-2">
              <h3 className="px-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase">Pinned</h3>
              {pinned.map(convo => <ConversationItem key={convo.id} convo={convo} />)}
            </div>
          )}
          <h3 className="px-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase">All Chats</h3>
          {unpinned.map(convo => <ConversationItem key={convo.id} convo={convo} />)}
        </nav>
      </div>
    </aside>
  );
}