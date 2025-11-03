"use client";

import { useState, useEffect, useMemo } from "react";
import type { Conversation, User as UserType, Message } from "@/lib/types";
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, onSnapshot, orderBy, writeBatch, updateDoc, arrayUnion, arrayRemove, setDoc } from "firebase/firestore";
import { useFirestore, useMemoFirebase } from "@/firebase";
import ConversationList from "@/components/conversation-list";
import ChatView from "@/components/chat-view";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { encryptMessage } from "@/lib/crypto";

interface ChatLayoutProps {
  currentUser: User;
  setSendMessage: (fn: (content: string, type?: Message['type'], duration?: number, selfDestructDuration?: number) => void) => void;
}

export default function ChatLayout({ currentUser, setSendMessage }: ChatLayoutProps) {
  const firestore = useFirestore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentUserData, setCurrentUserData] = useState<UserType | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const selectedConversation = useMemo(() => 
    conversations.find(c => c.id === selectedConversationId),
    [conversations, selectedConversationId]
  );
  
  const contactInSelectedConversation = useMemo(() => 
    selectedConversation?.type === 'private'
    ? selectedConversation?.participants.find(p => p.id !== currentUser.uid)
    : undefined,
    [selectedConversation, currentUser.uid]
  );
  
  const blockedUserIds = useMemo(() => new Set(currentUserData?.blockedUsers || []), [currentUserData]);
  const isContactBlocked = contactInSelectedConversation ? blockedUserIds.has(contactInSelectedConversation.id) : false;

  const handleSendMessage = async (content: string, type: Message['type'] = 'text', duration?: number, selfDestructDuration?: number) => {
    if (!selectedConversationId || !firestore || !selectedConversation) return;

     if (selectedConversation.type === 'private' && isContactBlocked) {
      toast({
        variant: "destructive",
        title: "Kontakt blockiert",
        description: "Du kannst keine Nachrichten an einen blockierten Kontakt senden.",
      });
      return;
    }

    let encryptedContent = content;
    if (type === 'text' && selectedConversation.type === 'private') {
      const contact = selectedConversation.participants.find(p => p.id !== currentUser.uid);
      if (!contact || !contact.publicKey) {
        toast({ variant: "destructive", title: "Fehler", description: "Der öffentliche Schlüssel des Kontakts wurde nicht gefunden." });
        return;
      }
      try {
        const encrypted = await encryptMessage(contact.publicKey, content);
        if (!encrypted) throw new Error("Encryption returned null");
        encryptedContent = encrypted;
      } catch (e) {
          console.error("Encryption failed:", e);
          toast({ variant: "destructive", title: "Verschlüsselungsfehler", description: "Nachricht konnte nicht verschlüsselt werden." });
          return;
      }
    }
    
    const messagesRef = collection(firestore, "conversations", selectedConversationId, "messages");
    
    const newMessage: Omit<Message, 'id'> = {
      senderId: currentUser.uid,
      content: encryptedContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: serverTimestamp() as any, // Firestore will handle this
      status: 'sent',
      reactions: [],
      type: type,
      readAt: null,
    };
    
    if(type !== 'text') {
        newMessage.content = ''; // Do not store URL in content for non-text messages
    }
    
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
        // Also update the lastMessage on the conversation
        const convoRef = doc(firestore, "conversations", selectedConversationId);
        await updateDoc(convoRef, {
            lastMessage: {
                ...newMessage,
                date: new Date(), // Use client time for immediate UI update
            }
        });

    } catch(e) {
        console.error("Error sending message: ", e);
        toast({
            variant: "destructive",
            title: "Fehler beim Senden",
            description: "Nachricht konnte nicht gesendet werden."
        })
    }
  };
  
  useEffect(() => {
    setSendMessage(handleSendMessage);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversationId, firestore, isContactBlocked, currentUser.uid, selectedConversation]);

  const userConvosQuery = useMemoFirebase(() => {
    if (!firestore || !currentUser) return null;
    return query(collection(firestore, "conversations"), where("participantIds", "array-contains", currentUser.uid));
  }, [firestore, currentUser]);

  useEffect(() => {
    if (!firestore || !currentUser) return;

    const userDocRef = doc(firestore, "users", currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            setCurrentUserData({ id: doc.id, ...doc.data() } as UserType);
        }
    });

    const usersRef = collection(firestore, "users");
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType));
        setAllUsers(usersData);
    });

    if (!userConvosQuery) return;
    
    const unsubscribeConversations = onSnapshot(userConvosQuery, async (snapshot) => {
        const convosDataPromises = snapshot.docs.map(async (doc) => {
            const convoData = doc.data();
            const participantIds = convoData.participantIds || [];
            
            // This is inefficient, but necessary for now without a proper user cache
            const participantsSnap = await getDocs(query(collection(firestore, "users"), where("id", 'in', participantIds)));
            const participants = participantsSnap.docs.map(d => ({id: d.id, ...d.data()}) as UserType);

            return {
                id: doc.id,
                ...convoData,
                participants,
            } as Conversation;
        });
        
        const convosData = await Promise.all(convosDataPromises);
        
        convosData.sort((a, b) => {
            const timeA = a.lastMessage?.date?.toMillis ? a.lastMessage.date.toMillis() : (a.lastMessage?.date ? new Date(a.lastMessage.date as any).getTime() : a.createdAt?.toMillis() || 0);
            const timeB = b.lastMessage?.date?.toMillis ? b.lastMessage.date.toMillis() : (b.lastMessage?.date ? new Date(b.lastMessage.date as any).getTime() : b.createdAt?.toMillis() || 0);
            return timeB - timeA;
        });

        setConversations(convosData);
    });

    return () => {
        unsubscribeUser();
        unsubscribeUsers();
        if (unsubscribeConversations) unsubscribeConversations();
    };
}, [firestore, currentUser, userConvosQuery]);

  const handleClearConversation = async (conversationId: string) => {
    if (!firestore) return;
    const messagesRef = collection(firestore, "conversations", conversationId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    const batch = writeBatch(firestore);
    messagesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    // Also clear the last message on the conversation doc
    const convoRef = doc(firestore, "conversations", conversationId);
    batch.update(convoRef, { lastMessage: null });
    await batch.commit();
    toast({
        title: "Chat geleert",
        description: "Alle Nachrichten in diesem Chat wurden gelöscht.",
    });
  };

  const handleBlockContact = async (contactId: string) => {
      if (!firestore || !currentUser) return;
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      try {
          await updateDoc(userDocRef, {
              blockedUsers: arrayUnion(contactId)
          });
          toast({ title: 'Kontakt blockiert', description: 'Du wirst keine Nachrichten mehr von diesem Kontakt erhalten.' });
      } catch (error) {
          console.error("Fehler beim Blockieren des Kontakts:", error);
          toast({ variant: 'destructive', title: 'Fehler', description: 'Kontakt konnte nicht blockiert werden.' });
      }
  };

  const handleUnblockContact = async (contactId: string) => {
      if (!firestore || !currentUser) return;
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      try {
          await updateDoc(userDocRef, {
              blockedUsers: arrayRemove(contactId)
          });
          toast({ title: 'Blockierung aufgehoben' });
      } catch (error) {
          console.error("Fehler beim Aufheben der Blockierung:", error);
          toast({ variant: 'destructive', title: 'Fehler', description: 'Blockierung konnte nicht aufgehoben werden.' });
      }
  };
  
  const handleBack = () => {
    setSelectedConversationId(null);
  };
  
  const navigateToSettings = () => router.push('/settings');
  const navigateToContacts = () => router.push('/contacts');
  const navigateToStatus = () => router.push('/status');


  const handleConversationSelect = async (id: string, type: 'private' | 'group') => {
    setSelectedConversationId(id);
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
          onConversationSelect={handleConversationSelect}
          onNavigateToSettings={navigateToSettings}
          onNavigateToContacts={navigateToContacts}
          onNavigateToStatus={navigateToStatus}
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
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            onBlockContact={handleBlockContact}
            onUnblockContact={handleUnblockContact}
            onBack={handleBack}
            isBlocked={isContactBlocked}
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
