"use client";

import { useRef, useEffect, useState } from "react";
import { ShieldCheck, Circle } from "lucide-react";
import type { Conversation, User } from "@/lib/types";
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

type ChatViewProps = {
  conversation: Conversation;
  contact: User;
  onSendMessage: (content: string) => void;
};

export default function ChatView({ conversation, contact, onSendMessage }: ChatViewProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isVerificationDialogOpen, setVerificationDialogOpen] = useState(false);

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

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10">
        <Avatar className="w-10 h-10 mr-4">
          <AvatarImage asChild>
             <Image src={contact.avatar} alt={contact.name} width={40} height={40} data-ai-hint="person portrait" />
          </AvatarImage>
          <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="font-headline text-lg font-semibold">{contact.name}</h2>
          <div className="flex items-center text-sm text-muted-foreground">
             <Circle className={cn("w-2.5 h-2.5 mr-2 fill-current", onlineStatusColors[contact.onlineStatus])} />
            {contact.onlineStatus}
          </div>
        </div>
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
