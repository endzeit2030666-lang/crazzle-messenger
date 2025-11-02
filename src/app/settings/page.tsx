
'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  Bell,
  BellOff,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
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
import { Label } from '@/components/ui/label';
import type { User } from '@/lib/types';


const SettingsToggleItem = ({ icon, label, checked, onCheckedChange }: { icon: React.ElementType; label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
    <div className="w-full flex items-center p-4 rounded-lg">
      <div className="p-2 bg-muted rounded-full mr-4">
        {React.createElement(icon, { className: "w-5 h-5 text-primary" })}
      </div>
      <Label htmlFor={`toggle-${label}`} className="flex-1 text-left font-medium cursor-pointer">{label}</Label>
      <Switch id={`toggle-${label}`} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
);


export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [readReceipts, setReadReceipts] = useState(true);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  
  // These will now be populated from sessionStorage, which is set by ChatLayout
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const usersJson = sessionStorage.getItem('allUsers');
      const blockedJson = sessionStorage.getItem('blockedUsers');

      if (usersJson) {
        setAllUsers(JSON.parse(usersJson));
      } else {
        toast({variant: "destructive", title: "Fehler", description: "Benutzerdaten nicht gefunden."});
        router.push('/');
        return;
      }
      if (blockedJson) {
        setBlockedUserIds(new Set(JSON.parse(blockedJson)));
      }
    } catch (error) {
        console.error("Failed to parse data from sessionStorage", error);
        toast({variant: "destructive", title: "Fehler beim Laden der Daten"});
        router.push('/');
    }
  }, [router, toast]);

  const blockedContacts = allUsers.filter(user => blockedUserIds.has(user.id));

  const unblockContact = (contactId: string) => {
    const newBlockedIds = new Set(blockedUserIds);
    newBlockedIds.delete(contactId);
    setBlockedUserIds(newBlockedIds); // Update local state immediately for UI responsiveness
    
    // Persist the change to sessionStorage so it can be picked up on the main page
    sessionStorage.setItem('blockedUsers', JSON.stringify(Array.from(newBlockedIds)));
    
    const contact = allUsers.find(u => u.id === contactId);
    if (contact) {
        toast({
            title: "Blockierung aufgehoben",
            description: `${contact.name} ist nicht mehr blockiert.`
        });
    }
  }
  
  const handleGoBack = () => {
    // Navigate back to the home page. The home page will re-read sessionStorage.
    router.push('/');
  }


  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
       <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4">Einstellungen</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        
        <div className="bg-muted/50 rounded-lg">
          <SettingsToggleItem 
            icon={Shield} 
            label="Lesebestätigungen"
            checked={readReceipts}
            onCheckedChange={setReadReceipts}
          />
          <div className="border-t border-border mx-4"></div>
           <button onClick={() => setShowBlockDialog(true)} className="w-full flex items-center p-4 rounded-lg hover:bg-muted transition-colors">
              <div className="p-2 bg-muted rounded-full mr-4">
                <UserX className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 text-left font-medium">Blockierte Kontakte</span>
              <div className="flex items-center">
                  <span className="text-white mr-2">{blockedContacts.length}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
          </button>
          <div className="border-t border-border mx-4"></div>
           <SettingsToggleItem 
            icon={notificationsMuted ? BellOff : Bell} 
            label="Benachrichtigungen stummschalten"
            checked={notificationsMuted}
            onCheckedChange={setNotificationsMuted}
          />
        </div>
        
      </main>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Blockierte Kontakte</AlertDialogTitle>
            <AlertDialogDescription className="text-white">
              Sie erhalten keine Nachrichten oder Anrufe von diesen Kontakten.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <div className="space-y-2 py-4">
                {blockedContacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                        <span className="text-red-500 font-medium">{contact.name}</span>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-500 border-green-500 hover:bg-green-500/10 hover:text-green-500"
                            onClick={() => unblockContact(contact.id)}
                        >
                            Entsperren
                        </Button>
                    </div>
                ))}
                {blockedContacts.length === 0 && (
                    <p className="text-center text-muted-foreground">Keine Kontakte blockiert.</p>
                )}
            </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
