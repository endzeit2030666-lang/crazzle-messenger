
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { users, currentUser } from '@/lib/data';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([currentUser.id]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleUserSelect = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };
  
  const handleCreateGroup = () => {
    if (groupName.trim().length < 3) {
      toast({
        variant: 'destructive',
        title: 'Gruppenname zu kurz',
        description: 'Der Gruppenname muss mindestens 3 Zeichen lang sein.',
      });
      return;
    }

    if (selectedUsers.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Zu wenige Mitglieder',
        description: 'Eine Gruppe muss mindestens 2 Mitglieder außer dir haben.',
      });
      return;
    }

    toast({
      title: 'Gruppe erstellt!',
      description: `Die Gruppe "${groupName}" wurde erfolgreich erstellt.`,
    });
    router.push('/');
  };

  const handleAvatarUpload = () => {
    toast({
        title: "Funktion nicht implementiert",
        description: "Das Hochladen von Avataren wird in einer späteren Version hinzugefügt."
    })
  }

  const contacts = users.filter(u => u.id !== currentUser.id && u.publicKey !== '');

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4">Neue Gruppe erstellen</h1>
      </header>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <div className="p-6 flex flex-col items-center gap-4 border-b border-border">
            <div className="relative">
                <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarPreview || ''} alt={groupName} />
                    <AvatarFallback className="text-3xl bg-muted">
                        <Users className="w-10 h-10 text-muted-foreground" />
                    </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="icon" className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full h-8 w-8" onClick={handleAvatarUpload}>
                    <Camera className="w-4 h-4" />
                </Button>
            </div>
            <Input
                placeholder="Gruppenname"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="text-center text-lg font-semibold bg-transparent border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-b-primary"
            />
        </div>
        
        <div className="p-4">
             <h2 className="text-primary font-semibold mb-2">Mitglieder auswählen</h2>
             <p className="text-sm text-muted-foreground mb-4">{selectedUsers.length -1} von {contacts.length} ausgewählt</p>
        </div>

        <ScrollArea className="flex-1 px-4">
            <div className="space-y-4">
            {contacts.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                <Avatar className="w-10 h-10">
                    <AvatarImage asChild>
                    <Image src={user.avatar} alt={user.name} width={40} height={40} data-ai-hint="person portrait" />
                    </AvatarImage>
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold">{user.name}</p>
                </div>
                <Checkbox
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => handleUserSelect(user.id)}
                />
                </div>
            ))}
            </div>
        </ScrollArea>
        
        <footer className="p-4 mt-auto border-t border-border">
            <Button className="w-full" size="lg" onClick={handleCreateGroup}>
                Gruppe erstellen
            </Button>
        </footer>
      </main>
    </div>
  );
}

