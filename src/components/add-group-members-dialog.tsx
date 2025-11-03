'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Plus, Loader2, Search } from 'lucide-react';
import type { User as UserType } from '@/lib/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AddGroupMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserType[];
  isLoading: boolean;
  onAddMembers: (memberIds: string[]) => Promise<void>;
}

export default function AddGroupMembersDialog({
  open,
  onOpenChange,
  users,
  isLoading,
  onAddMembers,
}: AddGroupMembersDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

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

  const handleAdd = async () => {
    setIsAdding(true);
    await onAddMembers(Array.from(selectedMembers));
    setIsAdding(false);
    onOpenChange(false); // Close dialog after adding
  };
  
  // Reset state when dialog is closed
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        setSearchTerm('');
        setSelectedMembers(new Set());
        setIsAdding(false);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Mitglieder hinzufügen</DialogTitle>
           <DialogDescription>Wähle Benutzer aus, die du zur Gruppe hinzufügen möchtest.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Personen suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                />
            </div>
        </div>
        
        <ScrollArea className="h-72 border-t border-b border-border">
          <div className="p-6 space-y-2">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            ) : filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
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
            ))
            ) : (
                <p className="text-center text-sm text-muted-foreground py-10">Keine weiteren Benutzer zum Hinzufügen gefunden.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-6">
            <Button onClick={handleAdd} disabled={isAdding || selectedMembers.size === 0} className="w-full">
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Plus className="w-4 h-4 mr-2" />}
              {selectedMembers.size > 0 ? `${selectedMembers.size} Mitglied(er) hinzufügen` : 'Hinzufügen'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
