"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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

  const handleSendMessage = useCallback(async (content: string, type: Message['type'] = 'text', duration?: number, selfDestructDuration?: number) => {
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
    let linkPreview = null;
    
    // Link detection
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex);
    if (type === 'text' && urls && urls.length > 0) {
        linkPreview = {
            url: urls[0],
            title: `Vorschau für ${urls[0]}`,
            description: "Dies ist eine automatisch generierte Vorschau für den geteilten Link.",
            image: `https://picsum.photos/seed/${urls[0]}/400/225`
        }
    }

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
    
    const newMessage: Omit<Message, 'id' | 'date'> = {
      senderId: currentUser.uid,
      content: encryptedContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      reactions: [],
      type: type,
      readAt: null,
      linkPreview: linkPreview,
    };
    
    if(type !== 'text') {
        newMessage.content = ''; 
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
        await addDoc(messagesRef, { ...newMessage, date: serverTimestamp() });
        const convoRef = doc(firestore, "conversations", selectedConversationId);
        
        let lastMessageText = "Neue Nachricht";
        switch(type) {
            case 'text': lastMessageText = content; break;
            case 'image': lastMessageText = "📷 Bild gesendet"; break;
            case 'video': lastMessageText = "📹 Video gesendet"; break;
            case 'audio': lastMessageText = "🎤 Sprachnachricht"; break;
            default: lastMessageText = "Neue Nachricht";
        }
        
        await updateDoc(convoRef, {
            lastMessage: {
                content: lastMessageText,
                date: serverTimestamp(),
                senderId: currentUser.uid,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: type,
            }
        });
    } catch (e) {
        console.error("Failed to send message:", e);
        toast({ variant: "destructive", title: "Fehler beim Senden", description: "Nachricht konnte nicht gesendet werden." });
    }
  }, [selectedConversationId, firestore, selectedConversation, currentUser, toast, isContactBlocked]);

   useEffect(() => {
    setSendMessage(handleSendMessage);
  }, [handleSendMessage, setSendMessage]);


   useEffect(() => {
    if (!currentUser.uid || !firestore) return;

    const userDocRef = doc(firestore, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if(doc.exists()) {
            setCurrentUserData(doc.data() as UserType);
        }
    });

    const usersQuery = query(collection(firestore, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType));
      setAllUsers(usersData);
    });

    return () => {
      unsubscribeUser();
      unsubscribeUsers();
    };
  }, [currentUser.uid, firestore]);
  

  useEffect(() => {
    if (!currentUser.uid || !firestore || allUsers.length === 0) return;

    const conversationsQuery = query(
      collection(firestore, 'conversations'),
      where('participantIds', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(conversationsQuery, (snapshot) => {
      const convos = snapshot.docs.map(docData => {
        const data = docData.data();
        const participants = data.participantIds
          .map((id: string) => allUsers.find(u => u.id === id))
          .filter((p: UserType | undefined): p is UserType => p !== undefined);

        return {
          id: docData.id,
          ...data,
          participants,
        } as Conversation;
      });
      setConversations(convos);
    });

    return () => unsubscribe();
  }, [currentUser.uid, firestore, allUsers]);
  
  
   const handleClearConversation = useCallback(async (conversationId: string) => {
    if (!firestore) return;
    const messagesRef = collection(firestore, "conversations", conversationId, "messages");
    const messagesSnapshot = await getDocs(messagesRef);
    
    if (messagesSnapshot.empty) {
        toast({ title: "Chat ist bereits leer" });
        return;
    }
    
    const batch = writeBatch(firestore);
    messagesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();

    const convoRef = doc(firestore, "conversations", conversationId);
    await updateDoc(convoRef, {
        lastMessage: null
    });
    
    toast({ title: "Chatverlauf gelöscht" });
  }, [firestore, toast]);
  
  const handleBlockContact = useCallback(async (contactId: string) => {
    if (!currentUser.uid || !firestore) return;
    const userDocRef = doc(firestore, "users", currentUser.uid);
    try {
        await updateDoc(userDocRef, {
            blockedUsers: arrayUnion(contactId)
        });
        toast({ title: "Kontakt blockiert", description: "Sie erhalten keine Nachrichten oder Anrufe mehr von diesem Kontakt."});
    } catch(e) {
        toast({ variant: "destructive", title: "Fehler beim Blockieren" });
    }
  }, [currentUser.uid, firestore, toast]);

  const handleUnblockContact = useCallback(async (contactId: string) => {
    if (!currentUser.uid || !firestore) return;
    const userDocRef = doc(firestore, "users", currentUser.uid);
     try {
        await updateDoc(userDocRef, {
            blockedUsers: arrayRemove(contactId)
        });
        toast({ title: "Blockierung aufgehoben"});
    } catch(e) {
        toast({ variant: "destructive", title: "Fehler beim Aufheben der Blockierung" });
    }
  }, [currentUser.uid, firestore, toast]);

  const handleConversationSelect = useCallback((id: string) => {
    setSelectedConversationId(id);
    if (window.innerWidth < 768) {
      router.push(`/?chatId=${id}`);
    }
  }, [router]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    if (chatId) {
      setSelectedConversationId(chatId);
    }
  }, []);

  const navigateToSettings = () => router.push('/settings');
  const navigateToContacts = () => router.push('/contacts');
  const navigateToStatus = () => router.push('/status');
  const navigateToProfile = () => router.push('/profile');

  return (
    <div className="flex h-screen w-full">
      <div className={cn("w-full md:w-96 flex-col md:flex", selectedConversationId ? "hidden" : "flex")}>
        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onConversationSelect={handleConversationSelect}
          onNavigateToSettings={navigateToSettings}
          onNavigateToContacts={navigateToContacts}
          onNavigateToStatus={navigateToStatus}
          onNavigateToProfile={navigateToProfile}
          currentUser={currentUser}
          allUsers={allUsers}
        />
      </div>
      <div className={cn("flex-1 flex-col", selectedConversationId ? "flex" : "hidden md:flex")}>
        {selectedConversation ? (
          <ChatView
            key={selectedConversation.id}
            conversation={selectedConversation}
            onSendMessage={handleSendMessage}
            onClearConversation={handleClearConversation}
            onBlockContact={handleBlockContact}
            onUnblockContact={handleUnblockContact}
            onBack={() => {
              setSelectedConversationId(null);
              router.push('/');
            }}
            isBlocked={isContactBlocked}
            currentUser={currentUser}
          />
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20 p-8">
            <h2 className="text-2xl font-bold font-headline text-primary mb-2">Willkommen bei Crazzle</h2>
            <p className="max-w-sm">Wähle eine Konversation aus der Liste, um mit dem Chatten zu beginnen, oder erstelle einen neuen Chat, um mit deinen Freunden in Kontakt zu treten.</p>
          </div>
        )}
      </div>
    </div>
  );
}
