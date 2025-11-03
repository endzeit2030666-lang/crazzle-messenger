'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Search, BookUser, Plus } from 'lucide-react';
import { useUser, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, onSnapshot, query, addDoc, where, getDocs, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { User as UserType, Conversation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';

type Contact = UserType;

export default function ContactsPage() {
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddContactOpen, setAddContactOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  useEffect(() => {
    if (!currentUser || !firestore) return;

    setIsLoading(true);
    const contactsQuery = collection(firestore, 'users', currentUser.uid, 'contacts');
    const unsubscribe = onSnapshot(contactsQuery, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => doc.data() as Contact);
      setContacts(contactsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Fehler beim Laden der Kontakte:", error);
      toast({ variant: 'destructive', title: "Fehler beim Laden der Kontakte" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, firestore, toast]);

  const handleGoBack = () => {
    router.push('/');
  };

  const handleStartChat = (contact: Contact) => {
    if (!currentUser || !firestore) return;

    const participantIds = [currentUser.uid, contact.id].sort();
    const conversationId = participantIds.join('-');

    const conversationRef = doc(firestore, 'conversations', conversationId);
    
    const newConversationData = {
      type: 'private' as const,
      participantIds: participantIds,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
      lastMessage: null,
      typing: [],
      isMuted: false,
    };

    // Wichtig: setDoc nicht mit `await` blockieren, sondern .catch() für die Fehlerbehandlung verwenden
    setDoc(conversationRef, newConversationData, { merge: true })
      .then(() => {
        router.push(`/?chatId=${conversationId}`);
      })
      .catch((serverError) => {
        // Dies ist die korrekte Fehlerbehandlungsarchitektur.
        // Sie erstellt einen detaillierten, kontextbezogenen Fehler und gibt ihn global aus.
        const permissionError = new FirestorePermissionError({
          path: conversationRef.path,
          operation: 'create',
          requestResourceData: newConversationData,
        });

        // Den Fehler mit dem globalen Error Emitter ausgeben.
        // KEINEN Toast hier anzeigen, da dies den wahren Fehler verbergen würde.
        errorEmitter.emit('permission-error', permissionError);
      });
  }
  
  const handleSaveContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast({ variant: 'destructive', title: 'Fehler', description: 'Name und Telefonnummer sind erforderlich.' });
      return;
    }
    if (!firestore || !currentUser) return;

    setIsSavingContact(true);
    try {
      const usersQuery = query(collection(firestore, 'users'), where('phoneNumber', '==', newContactPhone.trim()));
      const userSnapshot = await getDocs(usersQuery);

      if (userSnapshot.empty) {
        toast({ variant: 'destructive', title: 'Benutzer nicht gefunden', description: 'Es ist kein Benutzer mit dieser Telefonnummer registriert.' });
        setIsSavingContact(false);
        return;
      }
      
      const foundUser = userSnapshot.docs[0].data() as UserType;
      
      if (foundUser.id === currentUser.uid) {
        toast({ variant: 'destructive', title: 'Fehler', description: 'Du kannst dich nicht selbst als Kontakt hinzufügen.' });
        setIsSavingContact(false);
        return;
      }

      const contactExists = contacts.some(contact => contact.id === foundUser.id);
      if(contactExists){
        toast({ variant: 'destructive', title: 'Kontakt existiert bereits' });
        setIsSavingContact(false);
        return;
      }

      const contactRef = collection(firestore, 'users', currentUser.uid, 'contacts');
      await addDoc(contactRef, {
        id: foundUser.id,
        name: newContactName.trim(),
        avatar: foundUser.avatar,
        phoneNumber: foundUser.phoneNumber,
        publicKey: foundUser.publicKey,
      });
      
      toast({ title: 'Kontakt gespeichert', description: `${newContactName.trim()} wurde zu deinen Kontakten hinzugefügt.` });
      setAddContactOpen(false);
      setNewContactName('');
      setNewContactPhone('');

    } catch (error) {
      console.error("Fehler beim Speichern des Kontakts:", error);
      toast({ variant: 'destructive', title: 'Fehler', description: 'Kontakt konnte nicht gespeichert werden.' });
    } finally {
      setIsSavingContact(false);
    }
  }


  const filteredContacts = contacts.filter(contact =>
    (contact.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
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
      <header className="flex items-center justify-between p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-headline text-xl font-bold ml-4 text-primary">Telefonbuch</h1>
        </div>
        <Dialog open={isAddContactOpen} onOpenChange={setAddContactOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Neuer Kontakt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neuen Kontakt hinzufügen</DialogTitle>
              <DialogDescription>
                Finde einen Benutzer anhand seiner Telefonnummer und füge ihn zu deinem privaten Telefonbuch hinzu.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                disabled={isSavingContact}
              />
              <Input
                type="tel"
                placeholder="Telefonnummer"
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                disabled={isSavingContact}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddContactOpen(false)} disabled={isSavingContact}>Abbrechen</Button>
              <Button onClick={handleSaveContact} disabled={isSavingContact}>
                {isSavingContact && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white" />
          <Input
            type="search"
            placeholder="Kontakte suchen..."
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
              <div key={contact.id} className="flex items-center p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer" onClick={() => handleStartChat(contact)}>
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
                <Button variant="ghost" size="icon">
                  <MessageSquare className="w-5 h-5 text-white" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <BookUser className="w-16 h-16 mb-4 text-primary" />
            <h2 className="text-xl font-bold text-white">Dein Telefonbuch ist leer</h2>
            <p>Füge deinen ersten Kontakt über den "Neuer Kontakt"-Button hinzu.</p>
          </div>
        )}
      </main>
    </div>
  );
}

    