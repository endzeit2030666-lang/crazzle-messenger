"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, MoreVertical, Users, CameraIcon, BookUser, BellOff, FileArchive, FolderArchive, LogOut, Settings } from "lucide-react";
import type { Conversation, User as UserType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Logo from "@/components/logo";
import type { User } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";


type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNavigateToSettings: () => void;
  onNavigateToContacts: () => void;
  onNavigateToStatus: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
  currentUser: User;
  allUsers: UserType[];
  onArchive: (conversationId: string, archive: boolean) => void;
};

export default function ConversationList({
  conversations: initialConversations,
  selectedConversationId,
  onConversationSelect,
  onNavigateToSettings,
  onNavigateToContacts,
  onNavigateToStatus,
  onNavigateToProfile,
  onLogout,
  currentUser,
  allUsers,
  onArchive,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [conversations, setConversations] = useState(initialConversations);
  const [showArchived, setShowArchived] = useState(false);
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore || !currentUser) return;
    
    const unreadCountsMap = new Map<string, number>();

    const unsubscribes = initialConversations.map(convo => {
        const messagesRef = collection(firestore, 'conversations', convo.id, 'messages');
        const q = query(messagesRef, where('senderId', '!=', currentUser.uid));

        return onSnapshot(q, (snapshot) => {
            const unreadCount = snapshot.docs.filter(doc => doc.data().status !== 'read').length;
            unreadCountsMap.set(convo.id, unreadCount);
            
            setConversations(prevConvos => 
                prevConvos.map(p => 
                    p.id === convo.id ? { ...p, unreadCount } : p
                )
            );
        });
    });

    setConversations(initialConversations);

    return () => {
        unsubscribes.forEach(unsub => unsub());
    };
}, [initialConversations, firestore, currentUser]);


  const { activeConversations, archivedConversations } = useMemo(() => {
    const sorted = conversations
      .filter(convo => {
        if (!searchTerm) return true;
        const lowerCaseSearch = searchTerm.toLowerCase();
        
        // For private chats, we check the participant's name
        if (convo.type === 'private') {
          const contact = convo.participants.find(p => p.id !== currentUser.uid);
          return contact?.name?.toLowerCase().includes(lowerCaseSearch);
        }
        
        // For group chats, we check the conversation name
        return convo.name?.toLowerCase().includes(lowerCaseSearch);
      })
      .sort((a, b) => {
        const timeA = a.lastMessage?.date as any;
        const timeB = b.lastMessage?.date as any;
        return (timeB?.toMillis() || 0) - (timeA?.toMillis() || 0);
      });
      
    const active = sorted.filter(c => !c.archivedBy?.includes(currentUser.uid));
    const archived = sorted.filter(c => c.archivedBy?.includes(currentUser.uid));
      
    return { activeConversations: active, archivedConversations: archived };
  }, [conversations, searchTerm, currentUser.uid]);
  
  const handleConversationSelected = useCallback((conversationId: string) => {
      onConversationSelect(conversationId);
  }, [onConversationSelect]);


  const ConversationItem = ({ convo }: { convo: Conversation }) => {
    const isGroup = convo.type === 'group';
    const contact = isGroup ? null : convo.participants.find(p => p.id !== currentUser.uid);

    if (!isGroup && !contact) return null;
    
    const lastMessage = convo.lastMessage;
    const lastMessageSenderName = lastMessage?.senderId === currentUser.uid 
      ? 'Du' 
      : convo.participants.find(p => p.id === lastMessage?.senderId)?.name?.split(' ')[0];

    const handleSelect = () => {
      onConversationSelect(convo.id);
    }
    
    const displayName = isGroup ? convo.name : contact?.name;
    const displayAvatar = isGroup ? convo.avatar || `https://picsum.photos/seed/${convo.id}/100` : contact?.avatar;

    let lastMessageDisplay = "Noch keine Nachrichten";
    if (lastMessage) {
        switch(lastMessage.type) {
            case 'text':
                lastMessageDisplay = lastMessage.content;
                break;
            case 'image':
                lastMessageDisplay = "📷 Bild";
                break;
            case 'video':
                lastMessageDisplay = "📹 Video";
                break;
            case 'audio':
                lastMessageDisplay = "🎤 Sprachnachricht";
                break;
            case 'document':
                 lastMessageDisplay = `📄 ${lastMessage.fileName || 'Dokument'}`;
                break;
            default:
                lastMessageDisplay = "Neue Nachricht";
        }
    }


    return (
      <div className="relative group/item">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
                    <div className="flex items-center justify-between">
                        <p className={cn("text-sm truncate", selectedConversationId === convo.id ? "text-primary-foreground/90" : "text-white")}>
                            <>
                            {lastMessage && lastMessageSenderName && `${lastMessageSenderName}: `}
                            {lastMessageDisplay}
                            </>
                        </p>
                        <div className="flex items-center gap-2">
                            {convo.isMuted && <BellOff className={cn("w-3.5 h-3.5", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-muted-foreground")} />}
                            {convo.unreadCount && convo.unreadCount > 0 && (
                                <span className={cn("flex items-center justify-center text-xs font-bold rounded-full h-5 min-w-[1.25rem] px-1", selectedConversationId === convo.id ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground")}>
                                    {convo.unreadCount}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onArchive(convo.id, !convo.archivedBy?.includes(currentUser.uid))}>
                   <FolderArchive className="mr-2 h-4 w-4" />
                   <span>{convo.archivedBy?.includes(currentUser.uid) ? 'Archivierung aufheben' : 'Archivieren'}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };


  return (
    <aside className="w-full h-full flex flex-col border-r border-border bg-muted/30 md:w-96">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onNavigateToProfile}>
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-5 h-5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onNavigateToSettings}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Einstellungen</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Abmelden</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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
            {archivedConversations.length > 0 && (
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={() => setShowArchived(!showArchived)}>
                    <FileArchive className="w-5 h-5 text-muted-foreground" />
                    <span className="font-semibold text-primary">Archiviert</span>
                    <span className="ml-auto text-xs font-bold bg-primary text-primary-foreground h-5 min-w-[1.25rem] px-1 rounded-full flex items-center justify-center">
                        {archivedConversations.filter(c => (c.unreadCount || 0) > 0).length}
                    </span>
                </Button>
            )}
            
            {showArchived ? (
                 archivedConversations.map(convo => <ConversationItem key={convo.id} convo={convo} />)
            ) : (
                activeConversations.length > 0 ? (
                activeConversations.map(convo => <ConversationItem key={convo.id} convo={convo} />)
              ) : (
                 <div className="text-center text-muted-foreground p-8">
                    <p>Keine aktiven Chats gefunden.</p>
                </div>
              )
            )}
        </nav>
      </div>
    </aside>
  );
}

    
