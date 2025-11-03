'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Plus, Loader2, Users, User as UserIcon, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp, getDocs, query, where, writeBatch, doc } from 'firebase/firestore';
import type { User as AuthUser } from 'firebase/auth';
import type { User as UserType, Conversation } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: AuthUser;
  allUsers: UserType[];
  existingConversations: Conversation[];
  onConversationSelected: (conversationId: string) => void;
}

export default function NewChatDialog({
  open,
  onOpenChange,
  currentUser,
  allUsers,
  existingConversations,
  onConversationSelected,
}: NewChatDialogProps) {
  const [activeTab, setActiveTab] = useState('private');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set([currentUser.uid]));
  const [isCreating, setIsCreating] = useState(false);

  const { toast } = useToast();
  const firestore = useFirestore();

  const filteredUsers = useMemo(() => {
    const otherUsers = allUsers.filter(u => u.id !== currentUser.uid);
    if (!searchTerm) return otherUsers;
    return otherUsers.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allUsers, currentUser.uid, searchTerm]);

  const handleUserClick = async (user: UserType) => {
    // Check if a private conversation already exists
    const existingConvo = existingConversations.find(c =>
      c.type === 'private' && c.participantIds.length === 2 && c.participantIds.includes(user.id) && c.participantIds.includes(currentUser.uid)
    );

    if (existingConvo) {
      onConversationSelected(existingConvo.id);
      return;
    }

    // Create a new private conversation
    if (!firestore) return;
    setIsCreating(true);
    try {
      const convoRef = await addDoc(collection(firestore, 'conversations'), {
        type: 'private',
        participantIds: [currentUser.uid, user.id],
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      });
      onConversationSelected(convoRef.id);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Fehler beim Erstellen des Chats' });
    } finally {
        setIsCreating(false);
    }
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({ variant: 'destructive', title: 'Gruppenname erforderlich' });
      return;
    }
    if (selectedMembers.size < 2) {
      toast({ variant: 'destructive', title: 'Mindestens 2 Mitglieder erforderlich' });
      return;
    }
    if (!firestore) return;

    setIsCreating(true);
    try {
      const convoRef = await addDoc(collection(firestore, 'conversations'), {
        type: 'group',
        name: groupName.trim(),
        participantIds: Array.from(selectedMembers),
        admins: [currentUser.uid],
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        avatar: `https://picsum.photos/seed/${Math.random()}/200`,
      });
      onConversationSelected(convoRef.id);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Fehler beim Erstellen der Gruppe' });
    } finally {
        setIsCreating(false);
    }
  };
  
  const resetState = () => {
    setSearchTerm('');
    setGroupName('');
    setSelectedMembers(new Set([currentUser.uid]));
    setIsCreating(false);
    setActiveTab('private');
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
    }}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Neuer Chat</DialogTitle>
          <DialogDescription>Starte einen privaten Chat oder erstelle eine neue Gruppe.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full p-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private"><UserIcon className="w-4 h-4 mr-2"/>Privat</TabsTrigger>
            <TabsTrigger value="group"><Users className="w-4 h-4 mr-2"/>Gruppe</TabsTrigger>
          </TabsList>
          <div className="relative mt-4">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
                placeholder="Personen suchen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
            />
          </div>

          <TabsContent value="private" className="mt-4">
            <ScrollArea className="h-72">
              <div className="pr-4 space-y-2">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage asChild src={user.avatar}><Image src={user.avatar} alt={user.name} width={40} height={40} data-ai-hint="person" /></AvatarImage>
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{user.name}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="group" className="mt-4 space-y-4">
            <Input
              placeholder="Gruppenname..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground px-1">Mitglieder auswählen:</p>
            <ScrollArea className="h-56">
              <div className="pr-4 space-y-2">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleToggleMember(user.id)}
                    className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted"
                  >
                    <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", selectedMembers.has(user.id) ? "bg-primary border-primary" : "border-muted-foreground")}>
                        {selectedMembers.has(user.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <Avatar className="h-10 w-10">
                       <AvatarImage asChild src={user.avatar}><Image src={user.avatar} alt={user.name} width={40} height={40} data-ai-hint="person" /></AvatarImage>
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold">{user.name}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button onClick={handleCreateGroup} disabled={isCreating} className="w-full">
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2" />}
              Gruppe erstellen ({selectedMembers.size > 1 ? `${selectedMembers.size - 1} Mitglieder` : '0 Mitglieder'})
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

    