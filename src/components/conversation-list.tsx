"use client";

import { useState, useMemo } from "react";
import { Search, Lock } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { currentUser } from "@/lib/data";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ConversationListProps = {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onConversationSelect: (id: string) => void;
};

export default function ConversationList({
  conversations,
  selectedConversationId,
  onConversationSelect,
}: ConversationListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversations = useMemo(() => {
    return conversations.filter(convo => {
      const contact = convo.participants.find(p => p.id !== currentUser.id);
      return contact?.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [conversations, searchTerm]);

  return (
    <aside className="w-full max-w-xs h-full flex flex-col border-r border-border bg-muted/30">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-headline text-2xl font-bold text-primary">CipherCom</h1>
          <Lock className="w-5 h-5 text-accent" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-9 bg-background border-0 focus-visible:ring-1 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          {filteredConversations.map(convo => {
            const contact = convo.participants.find(p => p.id !== currentUser.id);
            if (!contact) return null;
            const lastMessage = convo.messages[convo.messages.length - 1];

            return (
              <button
                key={convo.id}
                onClick={() => onConversationSelect(convo.id)}
                className={cn(
                  "w-full flex items-start p-3 rounded-lg text-left transition-colors",
                  selectedConversationId === convo.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                <Avatar className="w-10 h-10 mr-3">
                  <AvatarImage asChild>
                    <Image src={contact.avatar} alt={contact.name} width={40} height={40} data-ai-hint="person portrait" />
                  </AvatarImage>
                  <AvatarFallback>{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{contact.name}</h3>
                    <p className="text-xs text-muted-foreground">{lastMessage?.timestamp}</p>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{lastMessage?.content}</p>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
