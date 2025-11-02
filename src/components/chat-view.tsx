"use client";

import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Circle, Phone, Video } from "lucide-react";
import type { Conversation, User, Group } from "@/lib/types";
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

type ChatViewProps = {
  conversation: Conversation;
  contact?: User;
  group?: Group;
  onSendMessage: (content: string) => void;
};

export default function ChatView({ conversation, contact, group, onSendMessage }: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isVerificationDialogOpen, setVerificationDialogOpen] = useState(false);
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
        <Avatar className="w-10 h-10 mr-4">
          <AvatarImage asChild>
             <Image src={headerDetails.avatar} alt={headerDetails.name} width={40} height={40} data-ai-hint="person portrait" />
          </AvatarImage>
          <AvatarFallback>{headerDetails.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-headline text-lg font-semibold">{headerDetails.name}</h2>
           <div className="flex items-center text-sm text-muted-foreground">
             {contact && <><Circle className={cn("w-2.5 h-2.5 mr-2 fill-current", onlineStatusColors[contact.onlineStatus] === 'text-green-400' ? 'text-primary' : onlineStatusColors[contact.onlineStatus])} /> {contact.onlineStatus}</>}
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

            {contact && (
            <ContactVerificationDialog
            open={isVerificationDialogOpen}
            onOpenChange={setVerificationDialogOpen}
            contact={contact}
            >
            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setVerificationDialogOpen(true)}>
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <span className="sr-only">Verify Contact</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Verify Contact's Identity</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            </ContactVerificationDialog>
            )}
        </div>
      </header>

      <div ref={scrollAreaRef} className="flex-1 p-6 overflow-y-auto space-y-6">
        {conversation.messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </div>

      <footer className="p-4 border-t border-border mt-auto">
        <MessageInput onSendMessage={onSendMessage} />
      </footer>
    </div>
  );
}
