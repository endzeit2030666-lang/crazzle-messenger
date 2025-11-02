"use client";

import { Check, CheckCheck, Clock, Shield } from "lucide-react";
import type { Message as MessageType } from "@/lib/types";
import { currentUser } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import Image from "next/image";

type MessageProps = {
  message: MessageType;
};

const LinkPreview = ({ url, title, description, image }: { url: string, title: string, description: string, image: string }) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block bg-secondary/50 rounded-lg overflow-hidden">
        <Image src={image} alt={title} width={400} height={225} className="w-full h-auto object-cover" data-ai-hint="youtube thumbnail" />
        <div className="p-3">
            <h4 className="font-semibold text-sm text-foreground/90">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
        </div>
    </a>
)

export default function Message({ message }: MessageProps) {
  const isCurrentUser = message.senderId === currentUser.id;

  const StatusIcon = ({ status }: { status: MessageType['status']}) => {
    switch (status) {
      case 'sent': return <Check className="h-4 w-4" />;
      case 'delivered': return <CheckCheck className="h-4 w-4" />;
      case 'read': return <CheckCheck className="h-4 w-4 text-primary" />;
      default: return null;
    }
  };

  return (
    <div className={cn("flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-md lg:max-w-xl p-3 px-4 rounded-2xl shadow-sm",
          isCurrentUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-secondary text-secondary-foreground rounded-bl-none"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.linkPreview && (
          <LinkPreview {...message.linkPreview} />
        )}
        <div className="flex items-center gap-2.5 mt-2 text-xs">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger>
                <Shield className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p>End-to-end encrypted</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {message.isSelfDestructing && (
             <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-3 w-3 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Self-destructing message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <span className={cn(isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {message.timestamp}
          </span>
          {isCurrentUser && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
