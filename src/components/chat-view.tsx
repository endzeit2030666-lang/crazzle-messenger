"use client";

import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Circle, Phone, Video, MoreVertical, BellOff, ArrowLeft, X } from "lucide-react";
import type { Conversation, User, Message as MessageType } from "@/lib/types";
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
} from "@/components/ui/alert-dialog"

type ChatViewProps = {
  conversation: Conversation;
  contact?: User;
  onSendMessage: (content: string, quotedMessage?: MessageType['quotedMessage']) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onBack: () => void;
};

export default function ChatView({ conversation, contact, onSendMessage, onEditMessage, onDeleteMessage, onReact, onBack }: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isVerificationDialogOpen, setVerificationDialogOpen] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [quotedMessage, setQuotedMessage] = useState<MessageType['quotedMessage'] | undefined>(undefined);
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation.messages]);
  
  const handleCall = (type: 'audio' | 'video') => {
    toast({
        title: `${type === 'audio' ? 'Sprachanruf' : 'Videoanruf'} wird gestartet...`,
        description: "Diese Funktion dient zu Demonstrationszwecken."
    })
  }

  const handleBlockContact = () => {
    setShowBlockDialog(false);
    toast({
      title: `${contact?.name || 'Kontakt'} wurde blockiert.`,
      description: `Du wirst keine Nachrichten oder Anrufe mehr von diesem Kontakt erhalten.`
    })
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
  
  const handleSendMessageSubmit = (content: string) => {
    if (editingMessage) {
      onEditMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      onSendMessage(content, quotedMessage);
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
           <div className="flex items-center text-sm text-foreground">
             <Circle className={cn("w-2.5 h-2.5 mr-2 fill-current", contact.onlineStatus === 'online' ? 'text-green-500' : 'text-red-500')} /> {contact.onlineStatus}
          </div>
        </div>
        <div className="flex items-center gap-2">
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleCall('audio')}>
                            <Phone className="w-5 h-5 text-accent" />
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
                            <Video className="w-5 h-5 text-accent" />
                            <span className="sr-only">Videoanruf</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Videoanruf</p></TooltipContent>
                 </Tooltip>
             </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5 text-accent" />
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
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowBlockDialog(true)}>
                    <X className="mr-2 h-4 w-4" />
                    <span>Kontakt blockieren</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <div ref={scrollAreaRef} className="flex-1 p-6 overflow-y-auto space-y-6">
        {conversation.messages.map((message) => (
          <Message 
            key={message.id} 
            message={message}
            onQuote={handleQuote}
            onEdit={handleEdit}
            onDelete={onDeleteMessage}
            onReact={onReact}
            sender={conversation.participants.find(p => p.id === message.senderId)}
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
        />
      </footer>

      <ContactVerificationDialog
        open={isVerificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        contact={contact}
        >
          {/* This is a dummy child to satisfy TypeScript. The dialog is triggered from the dropdown menu. */}
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

    </div>
  );
}
