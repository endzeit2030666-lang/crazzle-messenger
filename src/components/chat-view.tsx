"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { ShieldCheck, MoreVertical, BellOff, ArrowLeft, XCircle, Trash2, Loader2, Info, Users, MessageSquare, Bell } from "lucide-react";
import type { Conversation, User as UserType, Message as MessageType } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Message from "@/components/message";
import MessageInput from "@/components/message-input";
import ContactVerificationDialog from "@/components/contact-verification-dialog";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useFirestore } from "@/firebase";
import { collection, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData, arrayUnion } from "firebase/firestore";
import type { User } from "firebase/auth";


type ChatViewProps = {
  conversation: Conversation;
  onSendMessage: (content: string, type?: MessageType['type'], duration?: number, selfDestructDuration?: number, fileName?: string) => void;
  onClearConversation: (conversationId: string) => void;
  onBlockContact: (contactId: string) => void;
  onUnblockContact: (contactId: string) => void;
  onToggleMute: (conversationId: string, isMuted: boolean) => void;
  onBack: () => void;
  onSetTyping: (isTyping: boolean) => void;
  isBlocked: boolean;
  currentUser: User;
};

const MESSAGES_PER_PAGE = 30;

export default function ChatView({ 
    conversation, 
    onSendMessage,
    onClearConversation,
    onBlockContact,
    onUnblockContact,
    onToggleMute,
    onBack,
    onSetTyping,
    isBlocked,
    currentUser,
}: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [isVerificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<MessageType['quotedMessage'] | undefined>(undefined);
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);

  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const isGroup = useMemo(() => conversation.type === 'group', [conversation.type]);
  
  const contact = useMemo(() => 
    !isGroup ? conversation.participants.find(p => p.id !== currentUser.uid) : undefined,
    [conversation.participants, currentUser.uid, isGroup]
  );
  
  const typingUsers = useMemo(() => {
    if (!conversation.typing) return [];
    return conversation.participants.filter(p => conversation.typing.includes(p.id) && p.id !== currentUser.uid);
  }, [conversation.typing, conversation.participants, currentUser.uid]);


  const headerDetails = useMemo(() => {
    if (isGroup) {
      return {
        name: conversation.name || 'Gruppenchat',
        avatar: conversation.avatar || `https://picsum.photos/seed/${conversation.id}/100`,
        info: `${conversation.participants.length} Mitglieder`
      }
    }
    return {
      name: contact?.name || "Unbekannt",
      avatar: contact?.avatar || "",
      info: contact?.onlineStatus || "offline"
    };
  }, [conversation, contact, isGroup]);
  
  const getHeaderInfo = () => {
    if (typingUsers.length > 0) {
        if (typingUsers.length === 1) {
            return `${typingUsers[0].name.split(' ')[0]} tippt...`;
        }
        return `mehrere tippen...`;
    }
     if (isGroup) {
      return (
        <div className="flex items-center text-sm text-white">
            <Users className="w-4 h-4 mr-2 text-primary" />
            {headerDetails.info}
        </div>
      )
    }
    return (
       <div className="flex items-center text-sm text-white">
            <div className={cn("w-2.5 h-2.5 mr-2 rounded-full", contact?.onlineStatus === 'online' ? 'bg-green-500' : 'bg-red-500')} />
            {headerDetails.info}
        </div>
    )
  }


  const processMessages = (docs: QueryDocumentSnapshot<DocumentData>[]) => {
    return docs.map(doc => {
      const data = doc.data();
      const sender = conversation.participants.find(p => p.id === data.senderId);
      return {
        id: doc.id,
        ...data,
        senderName: sender?.name || 'Unbekannt',
        date: data.date?.toDate(),
      } as MessageType;
    });
  };

  // Initial fetch and real-time updates for new messages
  useEffect(() => {
    if (!firestore || !conversation.id) return;
    setIsInitialLoading(true);

    const messagesRef = collection(firestore, 'conversations', conversation.id, 'messages');
    const q = query(messagesRef, orderBy('date', 'desc'), limit(MESSAGES_PER_PAGE));

    const unsubscribe = onSnapshot(q, (snapshot) => {
       const newMessagesData = processMessages(snapshot.docs).reverse();
       
       if (isInitialLoading) {
         setMessages(newMessagesData);
         setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
         setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
         setIsInitialLoading(false);
       } else {
          // This handles real-time updates after initial load
          setMessages(currentMessages => {
            const messageMap = new Map(currentMessages.map(m => [m.id, m]));
            newMessagesData.forEach(m => messageMap.set(m.id, m));
            const sortedMessages = Array.from(messageMap.values()).sort((a,b) => (a.date as any) - (b.date as any));
            
            // Mark new incoming messages as read
            const batch = writeBatch(firestore);
            let hasUpdates = false;
            sortedMessages.forEach(msg => {
                if (msg.senderId !== currentUser.uid && msg.status !== 'read') {
                    const msgRef = doc(firestore, 'conversations', conversation.id, 'messages', msg.id);
                    batch.update(msgRef, { status: 'read', readAt: serverTimestamp() });
                    hasUpdates = true;
                }
            });
            if(hasUpdates) {
                batch.commit().catch(e => console.error("Error marking messages as read", e));
            }

            return sortedMessages;
          });
       }
    }, (error) => {
        console.error("Error fetching messages:", error);
        toast({ variant: 'destructive', title: 'Fehler beim Laden der Nachrichten' });
        setIsInitialLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, conversation.id]);

  useEffect(() => {
    if (scrollAreaRef.current && !isLoadingMore) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages.length, isLoadingMore, isInitialLoading]);


  const loadMoreMessages = useCallback(async () => {
    if (!firestore || !lastDoc || !hasMoreMessages || isLoadingMore) return;

    setIsLoadingMore(true);
    const messagesRef = collection(firestore, 'conversations', conversation.id, 'messages');
    const q = query(messagesRef, orderBy('date', 'desc'), startAfter(lastDoc), limit(MESSAGES_PER_PAGE));
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      setHasMoreMessages(false);
      setIsLoadingMore(false);
      return;
    }

    const oldMessages = processMessages(snapshot.docs).reverse();
    
    const firstOldMessageId = oldMessages[0]?.id;

    setMessages(prev => [...oldMessages, ...prev]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
    
    // Maintain scroll position
    setTimeout(() => {
       const el = document.getElementById(`message-${firstOldMessageId}`);
       el?.scrollIntoView({ block: 'start', behavior: 'auto' });
       setIsLoadingMore(false);
    }, 100);

  }, [firestore, conversation.id, hasMoreMessages, isLoadingMore, lastDoc]);
  
  const handleBlockContact = () => {
    if (!contact) return;
    onBlockContact(contact.id);
    setShowBlockDialog(false);
  }
  
  const handleClearChat = () => {
    onClearConversation(conversation.id);
    setShowClearDialog(false);
  }

  const handleUnblockContact = () => {
    if (!contact) return;
    onUnblockContact(contact.id);
  }
  
  const handleQuote = (message: MessageType) => {
    const sender = conversation.participants.find(p => p.id === message.senderId);
    setQuotedMessage({
        id: message.id,
        content: message.content,
        senderName: sender?.name || 'Unbekannt'
    });
    setEditingMessage(null);
  };

  const handleEdit = (message: MessageType) => {
    setEditingMessage(message);
    setQuotedMessage(undefined);
  };

  const onEditMessage = async (messageId: string, newContent: string) => {
    if(!firestore) return;
    const messageRef = doc(firestore, "conversations", conversation.id, "messages", messageId);
    await updateDoc(messageRef, {
      content: newContent,
      isEdited: true,
    });
  };

  const onDeleteMessage = async (messageId: string) => {
    if(!firestore) return;
    const messageRef = doc(firestore, "conversations", conversation.id, "messages", messageId);
    await deleteDoc(messageRef);
  };

  const onReact = async (messageId: string, emoji: string) => {
    if(!firestore || !currentUser) return;
    const messageRef = doc(firestore, "conversations", conversation.id, "messages", messageId);
    const messageToUpdate = messages.find(m => m.id === messageId);
    if (!messageToUpdate) return;
  
    const existingReactionIndex = messageToUpdate.reactions.findIndex(r => r.userId === currentUser.uid);
    let newReactions = [...messageToUpdate.reactions];
  
    if (existingReactionIndex > -1) {
      if (newReactions[existingReactionIndex].emoji === emoji) {
        newReactions.splice(existingReactionIndex, 1);
      } else {
        newReactions[existingReactionIndex] = { emoji, userId: currentUser.uid, username: currentUser.displayName || "You" };
      }
    } else {
      newReactions.push({ emoji, userId: currentUser.uid, username: currentUser.displayName || "You" });
    }
  
    await updateDoc(messageRef, { reactions: newReactions });
  };
  
  const handleSendMessageSubmit = (content: string, type: MessageType['type'] = 'text', duration?: number, selfDestructDuration?: number, fileName?: string) => {
    if (editingMessage) {
      onEditMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
        onSendMessage(content, type, duration, selfDestructDuration, fileName);
        setQuotedMessage(undefined);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10">
        <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="w-10 h-10 mr-4">
          <AvatarImage asChild>
             <Image src={headerDetails.avatar} alt={headerDetails.name} width={40} height={40} data-ai-hint="person portrait" />
          </AvatarImage>
          <AvatarFallback className="text-primary">{headerDetails.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-headline text-lg font-semibold text-primary">{headerDetails.name}</h2>
          {getHeaderInfo()}
        </div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5 text-white" />
                  <span className="sr-only">Weitere Optionen</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  {isGroup ? (
                      <DropdownMenuItem>
                        <Info className="mr-2 h-4 w-4" />
                        <span>Gruppeninfo</span>
                      </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => contact && setVerificationDialogOpen(true)}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      <span>Kontakt verifizieren</span>
                    </DropdownMenuItem>
                  )}
                 <DropdownMenuItem onClick={() => onToggleMute(conversation.id, !conversation.isMuted)}>
                    {conversation.isMuted ? <Bell className="mr-2 h-4 w-4" /> : <BellOff className="mr-2 h-4 w-4" />}
                    <span>{conversation.isMuted ? 'Stummschaltung aufheben' : 'Stummschalten'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowClearDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Chat leeren</span>
                  </DropdownMenuItem>
                  {!isGroup && (
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowBlockDialog(true)}>
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>Kontakt blockieren</span>
                    </DropdownMenuItem>
                  )}
                  {isGroup && (
                     <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <XCircle className="mr-2 h-4 w-4" />
                        <span>Gruppe verlassen</span>
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      {isBlocked && (
         <div className="p-4 bg-destructive/10 text-center text-sm text-destructive-foreground">
            <p>Dieser Kontakt ist blockiert.</p>
            <Button variant="link" className="text-destructive-foreground h-auto p-0" onClick={handleUnblockContact}>Blockierung aufheben</Button>
        </div>
      )}

      <div ref={scrollAreaRef} onScroll={(e) => e.currentTarget.scrollTop === 0 && loadMoreMessages()} className="flex-1 p-6 overflow-y-auto space-y-2">
        {isLoadingMore && (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {messages.length === 0 && !isInitialLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mb-4 text-primary" />
                <h3 className="text-xl font-bold text-white">Keine Nachrichten</h3>
                <p>Beginne die Konversation, indem du eine Nachricht sendest.</p>
            </div>
        ) : (
             messages.map((message, index) => (
               <div key={message.id || index} id={`message-${message.id}`}>
                <Message
                    message={message}
                    onQuote={handleQuote}
                    onEdit={handleEdit}
                    onDelete={onDeleteMessage}
                    onReact={onReact}
                    currentUserData={conversation.participants.find(p => p.id === currentUser.uid)}
                    sender={isGroup ? conversation.participants.find(p => p.id === message.senderId) : contact}
                    currentUser={currentUser}
                    isGroup={isGroup}
                />
               </div>
            ))
        )}
      </div>

      <footer className="p-4 border-t border-border mt-auto">
        <MessageInput
          chatId={conversation.id}
          onSendMessage={handleSendMessageSubmit}
          onSetTyping={onSetTyping}
          quotedMessage={quotedMessage}
          onClearQuote={() => setQuotedMessage(undefined)}
          isEditing={!!editingMessage}
          editingMessage={editingMessage}
          onStopEditing={() => setEditingMessage(null)}
          disabled={!isGroup && isBlocked}
        />
      </footer>

      {contact && <ContactVerificationDialog
        open={isVerificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        contact={contact}
        >
          <span className='hidden'></span>
      </ContactVerificationDialog>}

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{headerDetails.name} blockieren?</AlertDialogTitle>
            <AlertDialogDescription>
              Blockierte Kontakte können dich nicht mehr anrufen oder dir Nachrichten senden. Dieser Kontakt wird nicht benachrichtigt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Blockieren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chatverlauf leeren?</AlertDialogTitle>
            <AlertDialogDescription>
              Dadurch werden alle Nachrichten in diesem Chat endgültig von diesem Gerät gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Leeren</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
