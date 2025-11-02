"use client";

import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Circle, Phone, Video, MoreVertical, MessageSquareQuote, Trash2, Pencil, Copy, PinOff, BellOff, ArrowLeft, Smile, Plus, Camera, Send as SendIcon } from "lucide-react";
import type { Conversation, User, Group, Message as MessageType } from "@/lib/types";
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
import { currentUser } from "@/lib/data";

type ChatViewProps = {
  conversation: Conversation;
  contact?: User;
  group?: Group;
  onSendMessage: (content: string, quotedMessage?: MessageType['quotedMessage']) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string, forEveryone: boolean) => void;
  onReact: (messageId: string, emoji: string) => void;
  onBack: () => void;
};

export default function ChatView({ conversation, contact, group, onSendMessage, onEditMessage, onDeleteMessage, onReact, onBack }: ChatViewProps) {
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

  const onlineStatusColors = {
    online: 'text-green-400',
    offline: 'text-slate-400',
    away: 'text-amber-400',
  }
  
  const handleCall = (type: 'audio' | 'video') => {
    toast({
        title: `Starting ${type} call...`,
        description: "This feature is for demonstration purposes."
    })
  }

  const handleBlockContact = () => {
    setShowBlockDialog(false);
    toast({
      title: `${headerDetails.name} has been blocked.`,
      description: `You will no longer receive messages or calls from them.`
    })
  }
  
  const handleQuote = (message: MessageType) => {
    const sender = conversation.participants.find(p => p.id === message.senderId);
    setQuotedMessage({
        id: message.id,
        content: message.content,
        senderName: sender?.name || 'Unknown'
    });
    setEditingMessage(null);
  };

  const handleEdit = (message: MessageType) => {
    setEditingMessage(message);
    setQuotedMessage(undefined);
  };
  
  const handleSendMessageSubmit = (content: string, quotedMsg?: MessageType['quotedMessage']) => {
    if (editingMessage) {
      onEditMessage(editingMessage.id, content);
      setEditingMessage(null);
    } else {
      onSendMessage(content, quotedMsg);
      setQuotedMessage(undefined);
    }
  };

  const headerDetails = group ? {
      name: group.name,
      avatar: group.avatar,
      info: `${group.participants.length} participants`
  } : {
      name: contact?.name || "Unknown",
      avatar: contact?.avatar || "",
      info: contact?.onlineStatus || "offline"
  };

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
             {contact && <><Circle className={cn("w-2.5 h-2.5 mr-2 fill-current", contact.onlineStatus === 'online' ? 'text-primary' : onlineStatusColors[contact.onlineStatus])} /> {contact.onlineStatus}</>}
             {group && <p>{group.participants.length} members</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
            <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleCall('audio')}>
                            <Phone className="w-5 h-5 text-accent" />
                            <span className="sr-only">Voice Call</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Voice Call</p></TooltipContent>
                 </Tooltip>
             </TooltipProvider>
              <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleCall('video')}>
                            <Video className="w-5 h-5 text-accent" />
                            <span className="sr-only">Video Call</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Video Call</p></TooltipContent>
                 </Tooltip>
             </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5 text-accent" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {contact && (
                  <DropdownMenuItem onClick={() => setVerificationDialogOpen(true)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    <span>Verify Contact</span>
                  </DropdownMenuItem>
                )}
                 <DropdownMenuItem>
                  <BellOff className="mr-2 h-4 w-4" />
                  <span>Mute Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast({title: "Read Receipts toggled for this chat."})}>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  <span>Toggle Read Receipts</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {contact && (
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setShowBlockDialog(true)}>
                    <Circle className="mr-2 h-4 w-4 fill-current" />
                    <span>Block Contact</span>
                  </DropdownMenuItem>
                )}
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

      {contact && (
        <ContactVerificationDialog
        open={isVerificationDialogOpen}
        onOpenChange={setVerificationDialogOpen}
        contact={contact}
        />
      )}

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {headerDetails.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked contacts will no longer be able to call you or send you messages. This contact will not be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockContact} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Block</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
