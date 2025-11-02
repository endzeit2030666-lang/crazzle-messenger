"use client";

import { useState } from "react";
import type { Conversation, User, Message } from "@/lib/types";
import { conversations as initialConversations, currentUser } from "@/lib/data";
import ConversationList from "@/components/conversation-list";
import ChatView from "@/components/chat-view";

export default function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversations[0]?.id || null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const contact = selectedConversation?.participants.find(p => p.id !== currentUser.id);

  const handleSendMessage = (messageContent: string) => {
    if (!selectedConversationId) return;

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      senderId: currentUser.id,
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent' as const,
    };

    setConversations(prev =>
      prev.map(convo =>
        convo.id === selectedConversationId
          ? { ...convo, messages: [...convo.messages, newMessage] }
          : convo
      )
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onConversationSelect={setSelectedConversationId}
      />
      <div className="flex-1 flex flex-col">
        {selectedConversation && contact ? (
          <ChatView
            key={selectedConversation.id}
            conversation={selectedConversation}
            contact={contact}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground bg-muted/20">
            Select a conversation to start messaging.
          </div>
        )}
      </div>
    </div>
  );
}
