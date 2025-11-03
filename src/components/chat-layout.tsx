"use client";

import { useState, useEffect } from "react";
import type { Conversation, User as UserType, Message } from "@/lib/types";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, onSnapshot, orderBy, writeBatch } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import ConversationList from "@/components/conversation-list";
import ChatView from "@/components/chat-view";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { encryptMessage } from "@/lib/crypto";

interface ChatLayoutProps {
  currentUser: User;
}

export default function ChatLayout({ currentUser }: ChatLayoutProps) {
  const firestore = useFirestore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!firestore || !currentUser) return;

    // Fetch all users to act as a contact list
    const usersRef = collection(firestore, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const usersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as UserType))
          .filter(u => u.id !== currentUser.uid);
        setAllUsers(usersData);
    });

    // Fetch conversations for the current user
    const convosRef = collection(firestore, "conversations");
    const userConvosQuery = query(convosRef, where("participantIds", "array-contains", currentUser.uid));
    
    const unsubscribeConversations = onSnapshot(userConvosQuery, async (snapshot) => {
        const convosData: Conversation[] = await Promise.all(snapshot.docs.map(async (doc) => {
            const convoData = doc.data();
            const otherParticipantId = convoData.participantIds.find((pId: string) => pId !== currentUser.uid);
            
            let otherParticipant: UserType | undefined = allUsers.find(u => u.id === otherParticipantId);
            if (!otherParticipant) {
              const userDoc = await getDocs(query(usersRef, where("id", "==", otherParticipantId)));
              if (!userDoc.empty){
                otherParticipant = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() } as UserType;
              }
            }

            const participants: UserType[] = [
                { id: currentUser.uid, name: currentUser.displayName || "You", avatar: currentUser.photoURL || '', onlineStatus: 'online', publicKey: '' },
            ];
            if(otherParticipant) participants.push(otherParticipant);

            return {
                id: doc.id,
                ...convoData,
                participants,
            } as Conversation;
        }));
        
        // Sort conversations by the most recent message
        convosData.sort((a, b) => {
            const timeA = a.lastMessage?.date?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.lastMessage?.date?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });

        setConversations(convosData);
    });

    return () => {
        unsubscribeUsers();
        unsubscribeConversations();
    };
}, [firestore, currentUser, allUsers]);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const isContactBlocked = selectedConversation?.participants.some(p => p.id !== currentUser.uid && blockedUsers.has(p.id));

  const handleSendMessage = async (content: string, type: Message['type'] = 'text', duration?: number, selfDestructDuration?: number) => {
    if (!selectedConversationId || !firestore || !selectedConversation) return;

     if (isContactBlocked) {
      toast({
        variant: "destructive",
        title: "Kontakt blockiert",
        description: "Du kannst keine Nachrichten an einen blockierten Kontakt senden.",
      });
      return;
    }

    const contact = selectedConversation.participants.find(p => p.id !== currentUser.uid);
    if (!contact || !contact.publicKey) {
      toast({ variant: "destructive", title: "Fehler", description: "Der öffentliche Schlüssel des Kontakts wurde nicht gefunden." });
      return;
    }

    let encryptedContent = content;
    if (type === 'text') {
      const encrypted = await encryptMessage(contact.publicKey, content);
      if (!encrypted) {
          toast({ variant: "destructive", title: "Verschlüsselungsfehler", description: "Nachricht konnte nicht verschlüsselt werden." });
          return;
      }
      encryptedContent = encrypted;
    }
    
    const messagesRef = collection(firestore, "conversations", selectedConversationId, "messages");
    
    const newMessage: Omit<Message, 'id'> = {
      senderId: currentUser.uid,
      content: type === 'text' ? encryptedContent : '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: serverTimestamp() as any, // Firestore will handle this
      status: 'sent',
      reactions: [],
      type: type,
      readAt: null,
    };
    
    switch (type) {
      case 'audio':
        newMessage.audioUrl = content;
        newMessage.audioDuration = duration;
        break;
      case 'image':
        newMessage.imageUrl = content;
        break;
      case 'video':
        newMessage.videoUrl = content;
        break;
    }

    if (selfDestructDuration) {
      newMessage.selfDestructDuration = selfDestructDuration;
    }

    try {
        await addDoc(messagesRef, newMessage);
    } catch(e) {
        console.error("Error sending message: ", e);
        toast({
            variant: "destructive",
            title: "Fehler beim Senden",
            description: "Nachricht konnte nicht gesendet werden."
        })
    }
  };

  const handleClearConversation = async (conversationId: string) => {
    if (!firestore) return;
    const messagesRef = collection(firestore, "conversations", conversationId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    const batch = writeBatch(firestore);
    messagesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    toast({
        title: "Chat geleert",
        description: "Alle Nachrichten in diesem Chat wurden gelöscht.",
    });
  };
  
  const handleBack = () => {
    setSelectedConversationId(null);
  };
  
  const navigateToSettings = () => {
    // sessionStorage.setItem('allUsers', JSON.stringify(allUsers));
    // sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(blockedUsers)));
    router.push('/settings');
  }

  const handleConversationSelect = async (contact: UserType) => {
    if (!firestore || !currentUser) return;
    const conversationsRef = collection(firestore, "conversations");
    const q = query(
      conversationsRef,
      where("participantIds", "array-contains", currentUser.uid)
    );
    const querySnapshot = await getDocs(q);
    let existingConvo = null;
    querySnapshot.forEach(doc => {
      const data = doc.data();
      if (data.participantIds.includes(contact.id)) {
        existingConvo = { id: doc.id, ...data };
      }
    });

    if (existingConvo) {
      setSelectedConversationId(existingConvo.id);
    } else {
      // Create a new conversation
      const newConvo = await addDoc(conversationsRef, {
        participantIds: [currentUser.uid, contact.id],
        createdAt: serverTimestamp()
      });
      setSelectedConversationId(newConvo.id);
    }
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
          onNavigateToSettings={navigateToSettings}
          allUsers={allUsers}
          onContactSelect={handleConversationSelect}
          currentUser={currentUser}
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
            contact={selectedConversation.participants.find(p => p.id !== currentUser.uid)}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            onBack={handleBack}
            isBlocked={isContactBlocked ?? false}
            currentUser={currentUser}
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
