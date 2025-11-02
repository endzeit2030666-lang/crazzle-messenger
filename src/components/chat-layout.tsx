"use client";

import { useState, useEffect } from "react";
import type { Conversation, User, Message, Group } from "@/lib/types";
import { conversations as initialConversations, currentUser } from "@/lib/data";
import ConversationList from "@/components/conversation-list";
import ChatView from "@/components/chat-view";
import { cn } from "@/lib/utils";

export default function ChatLayout() {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const contact = selectedConversation?.participants.find(p => p.id !== currentUser.id);

  const handleSendMessage = (content: string, quotedMessage?: Message['quotedMessage']) => {
    if (!selectedConversationId) return;

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      senderId: currentUser.id,
      content: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent' as const,
      reactions: [],
      quotedMessage: quotedMessage,
    };

    setConversations(prev =>
      prev.map(convo =>
        convo.id === selectedConversationId
          ? { ...convo, messages: [...convo.messages, newMessage] }
          : convo
      )
    );
  };
  
  const handleEditMessage = (messageId: string, newContent: string) => {
    setConversations(prev =>
      prev.map(convo => {
        if (convo.id === selectedConversationId) {
          return {
            ...convo,
            messages: convo.messages.map(msg => 
              msg.id === messageId 
                ? { ...msg, content: newContent, isEdited: true } 
                : msg
            ),
          };
        }
        return convo;
      })
    );
  };

  const handleDeleteMessage = (messageId: string, forEveryone: boolean) => {
    setConversations(prev =>
      prev.map(convo => {
        if (convo.id === selectedConversationId) {
          return {
            ...convo,
            messages: forEveryone 
              ? convo.messages.map(msg => msg.id === messageId ? { ...msg, content: "This message was deleted" } : msg)
              : convo.messages.filter(msg => msg.id !== messageId),
          };
        }
        return convo;
      })
    );
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setConversations(prev =>
      prev.map(convo => {
        if (convo.id === selectedConversationId) {
          return {
            ...convo,
            messages: convo.messages.map(msg => {
              if (msg.id === messageId) {
                const existingReaction = msg.reactions.find(r => r.userId === currentUser.id);
                if (existingReaction) {
                  // If it's the same emoji, remove reaction. Otherwise, update it.
                  if (existingReaction.emoji === emoji) {
                    return { ...msg, reactions: msg.reactions.filter(r => r.userId !== currentUser.id) };
                  } else {
                    return { ...msg, reactions: msg.reactions.map(r => r.userId === currentUser.id ? { ...r, emoji: emoji } : r) };
                  }
                } else {
                  // Add new reaction
                  return { ...msg, reactions: [...msg.reactions, { emoji, userId: currentUser.id, username: currentUser.name }] };
                }
              }
              return msg;
            }),
          };
        }
        return convo;
      })
    );
  };


  const togglePinConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(convo =>
        convo.id === conversationId
          ? { ...convo, isPinned: !convo.isPinned }
          : convo
      )
    );
  };
  
  const toggleMuteConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(convo =>
        convo.id === conversationId
          ? { ...convo, isMuted: !convo.isMuted }
          : convo
      )
    );
  }

  const handleBack = () => {
    setSelectedConversationId(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background md:grid md:grid-cols-[384px_1fr]">
      <div
        className={cn(
          "w-full flex-col md:flex",
          selectedConversationId && "hidden"
        )}
      >
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onConversationSelect={setSelectedConversationId}
          onPinToggle={togglePinConversation}
          onMuteToggle={toggleMuteConversation}
        />
      </div>
      <div
        className={cn(
          "flex-1 flex-col",
          !selectedConversationId ? "hidden md:flex" : "flex"
        )}
      >
        {selectedConversation ? (
          <ChatView
            key={selectedConversation.id}
            conversation={selectedConversation}
            onBack={handleBack}
            contact={selectedConversation.type === 'private' ? selectedConversation.participants.find(p => p.id !== currentUser.id) : undefined}
            group={selectedConversation.type === 'group' ? selectedConversation.groupDetails : undefined}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReact={handleReaction}
          />
        ) : (
          <div className="flex-1 items-center justify-center text-muted-foreground bg-muted/20 hidden md:flex">
            Select a conversation to start messaging.
          </div>
        )}
      </div>
    </div>
  );
}