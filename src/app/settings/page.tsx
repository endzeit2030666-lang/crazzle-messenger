
'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  Bell,
  BellOff,
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
import { useState, useEffect } from 'react';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [readReceipts, setReadReceipts] = useState(true);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  
  const [blockedContacts, setBlockedContacts] = useState<User[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);


  useEffect(() => {
    const userParam = searchParams.get('users');
    const blockedParam = searchParams.get('blocked');

    if (userParam) {
      setAllUsers(JSON.parse(userParam));
    }
    if (blockedParam) {
      const blockedIds = JSON.parse(blockedParam);
      setBlockedUserIds(blockedIds);
    }
  }, [searchParams]);

   useEffect(() => {
    const blocked = allUsers.filter(user => blockedUserIds.includes(user.id));
    setBlockedContacts(blocked);
  }, [blockedUserIds, allUsers]);

  const unblockContact = (contactId: string) => {
    const newBlockedIds = blockedUserIds.filter(id => id !== contactId);

    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('blocked', JSON.stringify(newBlockedIds));
    
    // Using router.replace to avoid adding to history
    router.replace(`${pathname}?${newParams.toString()}`);
    
    const contact = allUsers.find(u => u.id === contactId);
    if(contact) {
        toast({
            title: "Blockierung aufgehoben",
            description: `${contact.name} ist nicht mehr blockiert.`
        });
    }
  }


  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
       <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
           <SettingsToggleItem 
            icon={notificationsMuted ? BellOff : Bell} 
            label="Benachrichtigungen stummschalten"
            checked={notificationsMuted}
            onCheckedChange={setNotificationsMuted}
          />
           <div className="border-t border-border mx-4"></div>
           <button onClick={() => setShowBlockDialog(true)} className="w-full flex items-center p-4 rounded-lg hover:bg-muted transition-colors">
              <div className="p-2 bg-muted rounded-full mr-4">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 text-left font-medium">Blockierte Kontakte</span>
              <div className="flex items-center">
                  <span className="text-white mr-2">{blockedContacts.length}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
          </button>
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
            </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
