"use client";

import { useState, useMemo } from "react";
import { Search, Archive, Bell, MoreVertical, XCircle, CameraIcon, UserPlus, Users } from "lucide-react";
import type { Conversation, Message, User as UserType } from "@/lib/types";
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
import type { User } from "firebase/auth";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useFirestore } from "@/firebase";


type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string, type: 'private' | 'group') => void;
  onNavigateToSettings: () => void;
  allUsers: UserType[];
  onContactSelect: (contact: UserType) => void;
  currentUser: User;
};

export default function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
  onNavigateToSettings,
  allUsers,
  onContactSelect,
  currentUser
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddContactOpen, setAddContactOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserType[]>([]);
  const [groupName, setGroupName] = useState("");

  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();


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
  
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0 || !firestore) {
      toast({
        variant: "destructive",
        title: "Fehler bei Gruppenerstellung",
        description: "Bitte gib einen Gruppennamen an und wähle mindestens ein Mitglied aus.",
      });
      return;
    }
    
    const participantIds = [...selectedUsers.map(u => u.id), currentUser.uid];

    try {
      await addDoc(collection(firestore, 'conversations'), {
        name: groupName,
        type: 'group',
        participantIds,
        admins: [currentUser.uid],
        createdAt: serverTimestamp(),
      });
      
      toast({
        title: "Gruppe erstellt!",
        description: `Die Gruppe "${groupName}" wurde erfolgreich erstellt.`,
      });

      setAddContactOpen(false);
      setGroupName("");
      setSelectedUsers([]);

    } catch (error) {
      console.error("Fehler beim Erstellen der Gruppe:", error);
       toast({
        variant: "destructive",
        title: "Fehler",
        description: "Gruppe konnte nicht erstellt werden.",
      });
    }

  };

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
              <div className="flex items-center gap-2">
                  {convo.isMuted && <Bell className={cn("w-3.5 h-3.5", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-white/70")} />}
                  <p className={cn("text-xs shrink-0", selectedConversationId === convo.id ? "text-primary-foreground/70" : "text-white/70")}>{lastMessage?.timestamp}</p>
              </div>
            </div>
            <p className={cn("text-sm truncate", selectedConversationId === convo.id ? "text-primary-foreground/90" : "text-white")}>
                <>
                  {lastMessageSenderName && `${lastMessageSenderName}: `}
                  {lastMessage?.content || (lastMessage?.type !== 'text' ? `${lastMessage?.type} gesendet` : 'Noch keine Nachrichten')}
                </>
            </p>
          </div>
        </div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 z-10 opacity-100">
                      <MoreVertical className="w-4 h-4" />
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                <DropdownMenuItem onClick={() => toast({ title: 'Stummschalten noch nicht implementiert' })}>
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Stummschalten</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({ title: 'Archivieren noch nicht implementiert' })}>
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archivieren</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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

            <Dialog open={isAddContactOpen} onOpenChange={setAddContactOpen}>
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <UserPlus className="w-5 h-5 text-white" />
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Neuer Chat</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Neuen Chat starten</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="private" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="private">Privat</TabsTrigger>
                    <TabsTrigger value="group">Neue Gruppe</TabsTrigger>
                  </TabsList>
                  <TabsContent value="private">
                    <DialogDescription>Wähle einen Kontakt aus, um eine neue Konversation zu beginnen.</DialogDescription>
                     <ScrollArea className="max-h-96 mt-4">
                      <div className="p-2">
                      {allUsers.map(user => (
                        <div key={user.id} onClick={() => {onContactSelect(user); setAddContactOpen(false);}} className="flex items-center gap-4 p-2 rounded-lg cursor-pointer hover:bg-muted">
                           <Avatar className="w-10 h-10">
                             <AvatarImage src={user.avatar} alt={user.name} />
                             <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <p className="font-semibold text-primary">{user.name}</p>
                        </div>
                      ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="group">
                    <div className="space-y-4">
                       <Input 
                        placeholder="Gruppenname"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                       />
                       <p className="text-sm font-medium text-white">Mitglieder auswählen:</p>
                       <ScrollArea className="max-h-60">
                         {allUsers.map(user => (
                           <div key={user.id} className="flex items-center gap-3 p-2">
                              <Checkbox 
                                id={`user-${user.id}`}
                                onCheckedChange={(checked) => {
                                  setSelectedUsers(prev => checked ? [...prev, user] : prev.filter(u => u.id !== user.id))
                                }}
                              />
                              <Label htmlFor={`user-${user.id}`} className="flex items-center gap-3 cursor-pointer">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.name}</span>
                              </Label>
                           </div>
                         ))}
                       </ScrollArea>
                       <Button onClick={handleCreateGroup} className="w-full">Gruppe erstellen</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

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
