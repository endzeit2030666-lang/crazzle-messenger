"use client";

import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Circle, Phone, Video, MoreVertical, BellOff, ArrowLeft, X, XCircle, Trash2, Pencil, Loader2 } from "lucide-react";
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
import { collection, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import type { User } from "firebase/auth";


type ChatViewProps = {
  conversation: Conversation;
  contact?: UserType;
  onSendMessage: (content: string, type?: MessageType['type'], duration?: number, selfDestructDuration?: number) => void;
  onClearConversation: (conversationId: string) => void;
  onBack: () => void;
  isBlocked: boolean;
  currentUser: User;
};

const MESSAGES_PER_PAGE = 30;

export default function ChatView({ 
    conversation, 
    contact, 
    onSendMessage,
    onClearConversation,
    onBack,
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


  useEffect(() => {
    if (!firestore || !conversation.id) return;
    const messagesRef = collection(firestore, 'conversations', conversation.id, 'messages');
    const q = query(messagesRef, orderBy('date', 'desc'), limit(MESSAGES_PER_PAGE));

    const unsubscribe = onSnapshot(q, (snapshot) => {
       const newMessagesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate(),
          } as MessageType;
       });

       if (isInitialLoading) {
            setMessages(newMessagesData.reverse());
            setIsInitialLoading(false);
       } else {
            // This handles real-time updates. We check for new messages and append them.
             snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newMessage = {
                        id: change.doc.id,
                        ...change.doc.data(),
                        date: change.doc.data().date?.toDate()
                    } as MessageType;
                    // Only add if it's not already in the list to avoid duplicates
                    if (!messages.some(m => m.id === newMessage.id)) {
                         setMessages(prev => [...prev, newMessage]);
                    }
                }
                if (change.type === "modified") {
                    const modifiedMessage = {
                        id: change.doc.id,
                        ...change.doc.data(),
                        date: change.doc.data().date?.toDate()
                    } as MessageType;
                     setMessages(prev => prev.map(m => m.id === modifiedMessage.id ? modifiedMessage : m));
                }
                 if (change.type === "removed") {
                    setMessages(prev => prev.filter(m => m.id !== change.doc.id));
                }
            });
       }
        
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);

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
        // We scroll to the bottom only when new messages are added, not when loading more
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages.length, isLoadingMore]);


  const loadMoreMessages = async () => {
    if (!firestore || !lastDoc || !hasMoreMessages || isLoadingMore) return;

    setIsLoadingMore(true);
    const messagesRef = collection(firestore, 'conversations', conversation.id, 'messages');
    const q = query(messagesRef, orderBy('date', 'desc'), startAfter(lastDoc), limit(MESSAGES_PER_PAGE));
    
    const prevScrollHeight = scrollAreaRef.current?.scrollHeight || 0;

    const snapshot = await getDocs(q);
    const oldMessages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
    } as MessageType)).reverse();

    setMessages(prev => [...oldMessages, ...prev]);
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
    
    if (scrollAreaRef.current) {
        // A small delay to allow React to render the new messages before adjusting scroll
        setTimeout(() => {
            if (scrollAreaRef.current) {
                const newScrollHeight = scrollAreaRef.current.scrollHeight;
                scrollAreaRef.current.scrollTop = newScrollHeight - prevScrollHeight;
            }
        }, 50);
    }
    
    setIsLoadingMore(false);
  };
  
  const handleCall = (type: 'audio' | 'video') => {
    if (isBlocked || !contact) {
        toast({
            variant: "destructive",
            title: "Aktion nicht möglich",
            description: "Du kannst einen blockierten Kontakt nicht anrufen.",
        });
        return;
    }
    const params = new URLSearchParams({
        type: type,
        contactId: contact.id,
        contactName: contact.name,
        contactAvatar: contact.avatar,
    });
    router.push(`/call?${params.toString()}`);
  }

  const handleBlockContact = () => {
    // This logic should be lifted up to ChatLayout
    // onBlockContact(contact.id);
    setShowBlockDialog(false);
  }
  
  const handleClearChat = () => {
    onClearConversation(conversation.id);
    setShowClearDialog(false);
  }

  const handleUnblockContact = () => {
    // This logic should be lifted up to ChatLayout
    // if (contact) {
    //   onUnblockContact(contact.id);
    // }
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
      // User has reacted before
      if (newReactions[existingReactionIndex].emoji === emoji) {
        // Same emoji, remove reaction
        newReactions.splice(existingReactionIndex, 1);
      } else {
        // Different emoji, update reaction
        newReactions[existingReactionIndex] = { emoji, userId: currentUser.uid, username: currentUser.displayName || "You" };
      }
    } else {
      // New reaction
      newReactions.push({ emoji, userId: currentUser.uid, username: currentUser.displayName || "You" });
    }
  
    await updateDoc(messageRef, { reactions: newReactions });
  };
  
  const onMessageRead = async (messageId: string) => {
      if(!firestore || !currentUser) return;
      const messageRef = doc(firestore, "conversations", conversation.id, "messages", messageId);
      const messageToUpdate = messages.find(m => m.id === messageId);
      // Only mark as read if it's not from the current user and not already read
      if (messageToUpdate && messageToUpdate.senderId !== currentUser.uid && !messageToUpdate.readAt) {
          await updateDoc(messageRef, { readAt: serverTimestamp() });
      }
  };
  
  const handleSendMessageSubmit = (content: string, type: MessageType['type'] = 'text', duration?: number, selfDestructDuration?: number) => {
    if (editingMessage) {
      onEditMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
        onSendMessage(content, type, duration, selfDestructDuration);
        setQuotedMessage(undefined);
    }
  };

  const headerDetails = {
      name: contact?.name || "Unbekannt",
      avatar: contact?.avatar || "",
      info: contact?.onlineStatus || "offline"
  };

  if (isInitialLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!contact) {
      return (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
            Wähle eine Konversation, um mit dem Chatten zu beginnen.
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
           <div className="flex items-center text-sm text-white">
             <Circle className={cn("w-2.5 h-2.5 mr-2 fill-current", contact.onlineStatus === 'online' ? 'text-green-500' : 'text-red-500')} /> {contact.onlineStatus}
          </div>
        </div>
        <div className="flex items-center gap-2">
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleCall('audio')}>
                            <Phone className="w-5 h-5 text-white" />
                            <span className="sr-only">Sprachanruf</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Sprachanruf</p></TooltipContent>
                 </Tooltip>
             </TooltipProvider>
              <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleCall('video')}>
                            <Video className="w-5 h-5 text-white" />
                            <span className="sr-only">Videoanruf</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Videoanruf</p></TooltipContent>
                 </Tooltip>
             </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-100">
                  <MoreVertical className="w-5 h-5 text-white" />
                  <span className="sr-only">Weitere Optionen</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setVerificationDialogOpen(true)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>Kontakt verifizieren</span>
                  </DropdownMenuItem>
                 <DropdownMenuItem>
                  <BellOff className="mr-2 h-4 w-4" />
                  <span>Benachrichtigungen stummschalten</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowClearDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Chat leeren</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowBlockDialog(true)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    <span>Kontakt blockieren</span>
                  </DropdownMenuItem>
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

      <div ref={scrollAreaRef} className="flex-1 p-6 overflow-y-auto space-y-2">
        {hasMoreMessages && (
          <div className="text-center mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreMessages}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Ältere Nachrichten laden
            </Button>
          </div>
        )}
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onDelete={onDeleteMessage}
            onReact={onReact}
            onMessageRead={onMessageRead}
            sender={contact}
            currentUser={currentUser}
          />
        ))}
      </div>

      <footer className="p-4 border-t border-border mt-auto">
        <MessageInput
          chatId={conversation.id}
          onSendMessage={handleSendMessageSubmit}
          quotedMessage={quotedMessage}
          onClearQuote={() => setQuotedMessage(undefined)}
          isEditing={!!editingMessage}
          editingMessage={editingMessage}
          onStopEditing={() => setEditingMessage(null)}
          disabled={isBlocked}
        />
      </footer>

      <ContactVerificationDialog
        open={isVerificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        contact={contact}
        >
          <span className='hidden'></span>
      </ContactVerificationDialog>

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
