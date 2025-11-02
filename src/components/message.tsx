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

type MessageProps = {
  message: MessageType;
};

export default function Message({ message }: MessageProps) {
  const isCurrentUser = message.senderId === currentUser.id;

  const StatusIcon = ({ status }: { status: MessageType['status']}) => {
    switch (status) {
      case 'sent': return <Check className="h-4 w-4" />;
      case 'delivered': return <CheckCheck className="h-4 w-4" />;
      case 'read': return <CheckCheck className="h-4 w-4 text-accent" />;
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
