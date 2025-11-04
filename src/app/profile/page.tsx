'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, FirestorePermissionError, errorEmitter } from '@/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Camera, Edit2, Loader2, MessageSquare, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType } from '@/lib/types';
import Image from 'next/image';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = getStorage();
  const { toast } = useToast();

  const [userData, setUserData] = useState<UserType | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const viewingUserId = searchParams.get('userId');
  const isOwnProfile = !viewingUserId || viewingUserId === currentUser?.uid;

  useEffect(() => {
    if (isUserLoading) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    if (!firestore) return;

    const fetchUserData = async () => {
      setIsLoading(true);
      const userIdToFetch = viewingUserId || currentUser.uid;
      const userDocRef = doc(firestore, 'users', userIdToFetch);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserType;
        setUserData(data);
        setName(data.name);
        setBio(data.bio || '');
        setAvatarPreview(data.avatar);
      } else if(viewingUserId) {
          toast({ variant: 'destructive', title: 'Benutzer nicht gefunden' });
          router.push('/');
      }
      setIsLoading(false);
    };

    fetchUserData();
  }, [currentUser, firestore, isUserLoading, router, viewingUserId, toast]);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!currentUser || !firestore || !isOwnProfile) return;
    setIsSaving(true);
    
    const userDocRef = doc(firestore, 'users', currentUser.uid);
    let newAvatarUrl = userData?.avatar;

    try {
        if (avatarFile) {
            const storageRef = ref(storage, `avatars/${currentUser.uid}/${avatarFile.name}`);
            const snapshot = await uploadBytes(storageRef, avatarFile);
            newAvatarUrl = await getDownloadURL(snapshot.ref);
        }

        await updateDoc(userDocRef, {
            name: name,
            bio: bio,
            avatar: newAvatarUrl,
        });

        toast({
            title: "Profil aktualisiert",
            description: "Deine Änderungen wurden erfolgreich gespeichert.",
        });
        router.push('/');

    } catch (error) {
        console.error("Fehler beim Aktualisieren des Profils:", error);
        toast({
            variant: "destructive",
            title: "Fehler",
            description: "Dein Profil konnte nicht aktualisiert werden.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleStartChat = () => {
    if (!currentUser || !firestore || !userData) return;

    const participantIds = [currentUser.uid, userData.id].sort();
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

    setDoc(conversationRef, newConversationData, { merge: true })
      .then(() => {
        router.push(`/?chatId=${conversationId}`);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: conversationRef.path,
          operation: 'create',
          requestResourceData: newConversationData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  }

  const handleAddContact = async () => {
     if (!firestore || !currentUser || !userData) return;
     
     setIsSaving(true);
     try {
        const contactRef = collection(firestore, 'users', currentUser.uid, 'contacts');
        // Check if contact already exists would be good here
        await addDoc(contactRef, {
            id: userData.id,
            name: userData.name, // Or a custom name input
            avatar: userData.avatar,
            phoneNumber: userData.phoneNumber,
            publicKey: userData.publicKey,
        });
        toast({ title: 'Kontakt hinzugefügt', description: `${userData.name} ist jetzt in deinem Telefonbuch.` });

     } catch(e) {
        console.error(e);
        toast({variant: 'destructive', title: 'Fehler', description: 'Kontakt konnte nicht hinzugefügt werden.'});
     } finally {
         setIsSaving(false);
     }
  }


  if (isLoading || isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!userData) {
      return (
         <div className="flex h-screen w-full items-center justify-center bg-background">
            <p>Benutzer nicht gefunden.</p>
        </div>
      )
  }

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
       <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4">{isOwnProfile ? "Profil bearbeiten" : "Profil ansehen"}</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col items-center">
        <div className="relative">
             <Avatar className="w-32 h-32 border-4 border-primary">
                {avatarPreview && <AvatarImage asChild src={avatarPreview}><Image src={avatarPreview} alt={name} width={128} height={128} data-ai-hint="person" /></AvatarImage>}
                <AvatarFallback className="text-5xl">{name.charAt(0)}</AvatarFallback>
            </Avatar>
            {isOwnProfile && <Button
                variant="outline"
                size="icon"
                className="absolute bottom-1 right-1 rounded-full h-10 w-10 bg-muted/80 backdrop-blur-sm"
                onClick={() => fileInputRef.current?.click()}
            >
                <Camera className="w-5 h-5"/>
            </Button>}
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={!isOwnProfile}
            />
        </div>

        <div className="w-full max-w-md space-y-4">
            <div className="space-y-1">
                <label htmlFor="name" className="text-sm font-medium text-primary">Anzeigename</label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted border-border" disabled={!isOwnProfile} />
            </div>
            <div className="space-y-1">
                <label htmlFor="bio" className="text-sm font-medium text-primary">Info</label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Erzähl etwas über dich..." className="bg-muted border-border resize-none" disabled={!isOwnProfile} />
            </div>
            {userData.phoneNumber && <div className="space-y-1">
                <label htmlFor="phone" className="text-sm font-medium text-primary">Telefonnummer</label>
                <Input id="phone" value={userData.phoneNumber} className="bg-muted border-border" disabled />
            </div>}
        </div>
      </main>
      <footer className="p-4 border-t border-border sticky bottom-0 bg-background">
       {isOwnProfile ? (
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Edit2 className="w-4 h-4 mr-2" />}
                {isSaving ? "Speichern..." : "Änderungen speichern"}
            </Button>
        ) : (
            <div className="flex gap-2">
                <Button onClick={handleStartChat} className="w-full">
                    <MessageSquare className="w-4 h-4 mr-2"/>
                    Nachricht senden
                </Button>
                 <Button onClick={handleAddContact} variant="outline" className="w-full" disabled={isSaving}>
                     {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2" />}
                     Kontakt hinzufügen
                </Button>
            </div>
        )}
      </footer>
    </div>
  );
}
