'use client';

import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, X, Loader2, Crown } from 'lucide-react';
import Image from 'next/image';
import type { Conversation, User as UserType } from '@/lib/types';
import type { User as AuthUser } from 'firebase/auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import AddGroupMembersDialog from './add-group-members-dialog';

interface GroupInfoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  currentUser: AuthUser;
  isAdmin: boolean;
}

export default function GroupInfoSheet({
  open,
  onOpenChange,
  conversation,
  currentUser,
  isAdmin,
}: GroupInfoSheetProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [userToRemove, setUserToRemove] = useState<UserType | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isAddMembersDialogOpen, setAddMembersDialogOpen] = useState(false);

  const usersRef = useMemo(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<UserType>(usersRef);
  
  const otherParticipants = useMemo(() => {
    return conversation.participants.filter(p => p.id !== currentUser.uid);
  }, [conversation.participants, currentUser.uid]);

  const handleRemoveMember = async () => {
    if (!userToRemove || !firestore) return;
    setIsRemoving(true);
    
    const conversationRef = doc(firestore, 'conversations', conversation.id);
    try {
      await updateDoc(conversationRef, {
        participantIds: arrayRemove(userToRemove.id)
      });
      toast({
        title: 'Mitglied entfernt',
        description: `${userToRemove.name} wurde aus der Gruppe entfernt.`,
      });
      setUserToRemove(null);
    } catch (error) {
      console.error("Fehler beim Entfernen des Mitglieds:", error);
      toast({
        variant: 'destructive',
        title: 'Fehler',
        description: 'Das Mitglied konnte nicht entfernt werden.',
      });
    } finally {
      setIsRemoving(false);
    }
  };

  const addMembers = async (memberIds: string[]) => {
    if (!firestore || memberIds.length === 0) return;
    const conversationRef = doc(firestore, 'conversations', conversation.id);
    try {
      await updateDoc(conversationRef, {
        participantIds: arrayUnion(...memberIds)
      });
      toast({
        title: 'Mitglieder hinzugefügt',
        description: `${memberIds.length} neue(s) Mitglied(er) wurde(n) zur Gruppe hinzugefügt.`
      });
      setAddMembersDialogOpen(false);
    } catch (error) {
        console.error("Fehler beim Hinzufügen von Mitgliedern:", error);
        toast({ variant: 'destructive', title: 'Fehler', description: 'Mitglieder konnten nicht hinzugefügt werden.' });
    }
  }

  const availableUsersToAdd = useMemo(() => {
    if (!allUsers) return [];
    const participantIds = new Set(conversation.participantIds);
    return allUsers.filter(user => !participantIds.has(user.id));
  }, [allUsers, conversation.participantIds]);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="text-center">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-2 border-primary">
              <AvatarImage asChild>
                <Image src={conversation.avatar!} alt={conversation.name!} width={96} height={96} data-ai-hint="group photo" />
              </AvatarImage>
              <AvatarFallback className="text-3xl">{conversation.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <SheetTitle className="text-2xl">{conversation.name}</SheetTitle>
            <SheetDescription>
              Gruppe · {conversation.participants.length} Mitglieder
            </SheetDescription>
          </div>
        </SheetHeader>
        
        {isAdmin && (
            <div className="p-4">
                <Button className="w-full" onClick={() => setAddMembersDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Mitglieder hinzufügen
                </Button>
            </div>
        )}

        <p className="px-4 text-sm font-semibold text-muted-foreground">{conversation.participants.length} MITGLIEDER</p>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-1">
             {/* Current User */}
            <div className="flex items-center gap-4 p-2 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || "You"} />
                <AvatarFallback>{currentUser.displayName?.charAt(0) || 'Y'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-primary">Du</p>
                {conversation.admins?.includes(currentUser.uid) && (
                   <p className="text-xs text-yellow-500 flex items-center gap-1"><Crown className="w-3 h-3" /> Admin</p>
                )}
              </div>
            </div>

            {/* Other Participants */}
            {otherParticipants.map(participant => (
              <div key={participant.id} className="flex items-center gap-4 p-2 rounded-lg group">
                <Avatar className="h-10 w-10">
                  <AvatarImage asChild src={participant.avatar}>
                      <Image src={participant.avatar} alt={participant.name} width={40} height={40} data-ai-hint="person" />
                  </AvatarImage>
                  <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold text-white">{participant.name}</p>
                    {conversation.admins?.includes(participant.id) && (
                        <p className="text-xs text-yellow-500 flex items-center gap-1"><Crown className="w-3 h-3" /> Admin</p>
                    )}
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => setUserToRemove(participant)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
    
    <AddGroupMembersDialog
        open={isAddMembersDialogOpen}
        onOpenChange={setAddMembersDialogOpen}
        users={availableUsersToAdd}
        isLoading={isLoadingUsers}
        onAddMembers={addMembers}
    />
    
    <AlertDialog open={!!userToRemove} onOpenChange={(isOpen) => !isOpen && setUserToRemove(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
                Möchtest du {userToRemove?.name} wirklich aus der Gruppe "{conversation.name}" entfernen?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} disabled={isRemoving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isRemoving && <Loader2 className="w-4 h-4 animate-spin mr-2"/>}
                Entfernen
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
