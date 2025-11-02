
"use client";

import { useState, useEffect } from "react";
import type { Conversation, User, Message } from "@/lib/types";
import { conversations as initialConversations, currentUser } from "@/lib/data";
import ConversationList from "@/components/conversation-list";
import ChatView from "@/components/chat-view";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';


interface ChatLayoutProps {
  blockedUsers: Set<string>;
  setBlockedUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
  blockedContacts: User[];
  allUsers: User[];
}


export default function ChatLayout({ blockedUsers, setBlockedUsers, blockedContacts, allUsers }: ChatLayoutProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations.map(c => ({
      ...c,
      messages: c.messages.map(m => ({ ...m, type: m.type || 'text' }))
  })));
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Effect to re-read sessionStorage when the component might be re-rendered
  // e.g., after navigating back from settings.
  useEffect(() => {
    const blockedJson = sessionStorage.getItem('blockedUsers');
    if (blockedJson) {
      try {
        const newBlockedSet = new Set<string>(JSON.parse(blockedJson));
        setBlockedUsers(newBlockedSet);
      } catch (e) {
        console.error("Failed to parse blocked users from sessionStorage", e);
        // Initialize with default if parsing fails
        sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(new Set(['user2', 'user3']))));
      }
    } else {
        // Initialize sessionStorage if it's not set
        sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(new Set(['user2', 'user3']))));
    }
  }, [setBlockedUsers]);


  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const isContactBlocked = selectedConversation?.participants.some(p => p.id !== currentUser.id && blockedUsers.has(p.id));
  
  const handleSendMessage = (content: string, type: 'text' | 'audio' = 'text', duration?: number, quotedMessage?: Message['quotedMessage']) => {
    if (!selectedConversationId) return;

     if (isContactBlocked) {
      toast({
        variant: "destructive",
        title: "Kontakt blockiert",
        description: "Du kannst keine Nachrichten an einen blockierten Kontakt senden.",
      });
      return;
    }

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      senderId: currentUser.id,
      content: content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent' as const,
      reactions: [],
      quotedMessage: quotedMessage,
      type: type,
      audioUrl: type === 'audio' ? content : undefined,
      audioDuration: duration,
    };
    
    if (type === 'audio') {
      newMessage.content = ''; // No text content for audio messages
    }


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
              ? convo.messages.map(msg => msg.id === messageId ? { ...msg, content: "Diese Nachricht wurde gelöscht", type: 'text', audioUrl: undefined } : msg)
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

  const blockContact = (contactId: string) => {
    setBlockedUsers(prev => {
      const newBlocked = new Set(prev);
      newBlocked.add(contactId);
       // Persist this to sessionStorage for the settings page
      sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(newBlocked)));
      return newBlocked;
    });
     toast({
      title: "Kontakt blockiert",
      description: "Du wirst keine Nachrichten oder Anrufe mehr von diesem Kontakt erhalten.",
    });
  }

  const unblockContact = (contactId: string) => {
    setBlockedUsers(prev => {
        const newBlocked = new Set(prev);
        newBlocked.delete(contactId);
        // Persist this to sessionStorage for the settings page
        sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(newBlocked)));
        return newBlocked;
    });
    toast({
        title: "Blockierung aufgehoben",
        description: "Du kannst diesem Kontakt wieder Nachrichten senden.",
    });
  }

  const handleBack = () => {
    setSelectedConversationId(null);
  };
  
  const navigateToSettings = () => {
    // Ensure the latest data is in sessionStorage before navigating
    sessionStorage.setItem('allUsers', JSON.stringify(allUsers));
    sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(blockedUsers)));
    router.push('/settings');
  }

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
          onBlockContact={blockContact}
          blockedUsers={blockedUsers}
          onNavigateToSettings={navigateToSettings}
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
            contact={selectedConversation.participants.find(p => p.id !== currentUser.id)}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReact={handleReaction}
            onBack={handleBack}
            isBlocked={isContactBlocked ?? false}
            onBlockContact={blockContact}
            onUnblockContact={unblockContact}
          />
        ) : (
          <div className="flex-1 items-center justify-center text-muted-foreground bg-muted/20 hidden md:flex">
            Wähle eine Konversation, um mit dem Chatten zu beginnen.
          </div>
        )}
      </div>
    </div>
  );
}
