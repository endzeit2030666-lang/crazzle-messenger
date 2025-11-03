'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Phone, Video, Search, BookUser, Users } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

type Contact = {
  id: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string;
  name: string; 
};


export default function ContactsPage() {
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser || !firestore) return;

    const contactsQuery = query(collection(firestore, 'users', currentUser.uid, 'contacts'));
    const unsubscribe = onSnapshot(contactsQuery, async (snapshot) => {
      setIsLoadingContacts(true);
      const contactsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const enrichedContacts = await Promise.all(
        contactsData.map(async (contact) => {
          const userQuery = query(collection(firestore, 'users'), where('__name__', '==', contact.id));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            return {
              ...contact,
              id: contact.id,
              name: userData.name,
              avatar: userData.avatar,
              phoneNumber: userData.phoneNumber,
              displayName: userData.name,
            } as Contact;
          }
          return null;
        })
      );
      
      setContacts(enrichedContacts.filter(Boolean) as Contact[]);
      setIsLoadingContacts(false);
    });

    return () => unsubscribe();
  }, [currentUser, firestore]);

  const handleGoBack = () => {
    router.push('/');
  };
  
  const handleStartChat = (contactId: string) => {
     router.push(`/?contactId=${contactId}`);
  }
  
  const handleCall = (contact: Contact, type: 'audio' | 'video') => {
    const params = new URLSearchParams({
        type: type,
        contactId: contact.id,
        contactName: contact.name,
        contactAvatar: contact.avatar || '',
    });
    router.push(`/call?${params.toString()}`);
  }

  const filteredContacts = contacts.filter(contact => 
    contact.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber?.includes(searchTerm)
  );

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4 text-primary">Telefonbuch</h1>
      </header>

      <div className="p-4 border-b border-border">
         <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
          <Input
            type="search"
            placeholder="Kontakte oder Nummern suchen..."
            className="pl-9 bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto">
        {isLoadingContacts ? (
           <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="space-y-1 p-2">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="w-12 h-12 mr-4">
                  <AvatarImage asChild>
                    <Image src={contact.avatar || ''} alt={contact.displayName} width={48} height={48} data-ai-hint="person portrait" />
                  </AvatarImage>
                  <AvatarFallback className="text-primary bg-muted-foreground/20">{contact.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg text-primary">{contact.displayName}</h2>
                  <p className="text-sm text-muted-foreground">{contact.phoneNumber || "Keine Nummer"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleStartChat(contact.id)}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </Button>
                   <Button variant="ghost" size="icon" onClick={() => handleCall(contact, 'audio')}>
                    <Phone className="w-5 h-5 text-white" />
                  </Button>
                   <Button variant="ghost" size="icon" onClick={() => handleCall(contact, 'video')}>
                    <Video className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <BookUser className="w-16 h-16 mb-4 text-primary" />
            <h2 className="text-xl font-bold text-white">Dein Telefonbuch ist leer</h2>
            <p>Starte einen neuen Chat, um Kontakte hinzuzufügen.</p>
          </div>
        )}
      </main>
    </div>
  );
}
