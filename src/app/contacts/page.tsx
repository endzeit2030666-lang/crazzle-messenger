'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Search, BookUser } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query, getDocs, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { User as UserType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type Contact = UserType;


export default function ContactsPage() {
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser || !firestore) return;

    setIsLoading(true);
    // This is a placeholder for a real contacts collection.
    // In a real app, you would likely store contact relationships.
    // For now, we list all users except the current one.
    const usersQuery = query(collection(firestore, 'users'), where('id', '!=', currentUser.uid));
    
    const unsubscribe = onSnapshot(usersQuery, async (usersSnapshot) => {
        const usersData = usersSnapshot.docs.map(doc => doc.data() as Contact);
        setContacts(usersData);
        setIsLoading(false);
    }, (error) => {
        console.error("Fehler beim Laden der Benutzer:", error);
        toast({ variant: 'destructive', title: "Fehler beim Laden der Benutzer" });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, firestore, toast]);

  const handleGoBack = () => {
    router.push('/');
  };
  
  const handleStartChat = (contactId: string) => {
     router.push(`/?chatId=${contactId}`);
  }

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber?.includes(searchTerm)
  );

  if (isUserLoading || isLoading) {
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
        {filteredContacts.length > 0 ? (
          <div className="space-y-1 p-2">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="w-12 h-12 mr-4">
                  <AvatarImage asChild>
                    <Image src={contact.avatar || ''} alt={contact.name} width={48} height={48} data-ai-hint="person portrait" />
                  </AvatarImage>
                  <AvatarFallback className="text-primary bg-muted-foreground/20">{contact.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg text-primary">{contact.name}</h2>
                  <p className="text-sm text-muted-foreground">{contact.phoneNumber || "Keine Nummer"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleStartChat(contact.id)}>
                    <MessageSquare className="w-5 h-5 text-white" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <BookUser className="w-16 h-16 mb-4 text-primary" />
            <h2 className="text-xl font-bold text-white">Dein Telefonbuch ist leer</h2>
            <p>Es wurden keine anderen Benutzer gefunden.</p>
          </div>
        )}
      </main>
    </div>
  );
}
