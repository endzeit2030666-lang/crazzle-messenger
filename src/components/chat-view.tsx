"use client";

import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Circle, Phone, Video, MoreVertical, BellOff, ArrowLeft, X, XCircle, Trash2, Pencil } from "lucide-react";
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
import { collection, onSnapshot, orderBy, query, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { User } from "firebase/auth";


type ChatViewProps = {
  conversation: Conversation;
  contact?: UserType;
  onSendMessage: (content: string, type?: 'text' | 'audio', duration?: number, selfDestructDuration?: number) => void;
  onClearConversation: (conversationId: string) => void;
  onBack: () => void;
  isBlocked: boolean;
  currentUser: User;
};

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
    const q = query(messagesRef, orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(), // Convert Firestore Timestamp to JS Date
        } as MessageType;
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [firestore, conversation.id]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
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

  const onDeleteMessage = async (messageId: string, forEveryone: boolean) => {
    if(!firestore) return;
    // For now, we only support deleting for the current user (forEveryone=false equivalent)
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
  
  const handleSendMessageSubmit = (content: string, type: 'text' | 'audio' = 'text', duration?: number, selfDestructDuration?: number) => {
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

      <div ref={scrollAreaRef} className="flex-1 p-6 overflow-y-auto space-y-6">
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onDelete={onDeleteMessage}
            onReact={onReact}
            onMessageRead={onMessageRead}
            sender={conversation.participants.find(p => p.id === message.senderId)}
            currentUser={currentUser}
          />
        ))}
      </div>

      <footer className="p-4 border-t border-border mt-auto">
        <MessageInput 
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
