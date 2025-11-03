
'use client';
import React, 'useState', useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Shield,
  Bell,
  BellOff,
  UserX,
  Loader2,
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
import { useFirestore, useUser } from '@/firebase';
import { doc, updateDoc, arrayRemove, getDoc, collection, query, where, getDocs } from 'firebase/firestore';


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
  const firestore = useFirestore();
  const { user: currentUser, isUserLoading } = useUser();
  
  const [readReceipts, setReadReceipts] = useState(true);
  const [notificationsMuted, setNotificationsMuted] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !firestore) return;
    
    setIsLoading(true);
    const fetchBlockedUsers = async () => {
        try {
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const blockedIds = userData.blockedUsers || [];
                
                if (blockedIds.length > 0) {
                    const usersQuery = query(collection(firestore, 'users'), where('id', 'in', blockedIds));
                    const usersSnapshot = await getDocs(usersQuery);
                    const blockedUsersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                    setBlockedUsers(blockedUsersData);
                } else {
                    setBlockedUsers([]);
                }
            }
        } catch (error) {
            console.error("Failed to fetch blocked users", error);
            toast({variant: "destructive", title: "Fehler beim Laden der blockierten Benutzer"});
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchBlockedUsers();
  }, [currentUser, firestore, toast]);

  const unblockContact = async (contactId: string) => {
    if (!currentUser || !firestore) return;

    const userDocRef = doc(firestore, 'users', currentUser.uid);

    try {
        await updateDoc(userDocRef, {
            blockedUsers: arrayRemove(contactId)
        });
        
        const unblockedUser = blockedUsers.find(u => u.id === contactId);
        setBlockedUsers(prev => prev.filter(u => u.id !== contactId));
        
        if (unblockedUser) {
            toast({
                title: "Blockierung aufgehoben",
                description: `${unblockedUser.name} ist nicht mehr blockiert.`
            });
        }
    } catch (error) {
        console.error("Fehler beim Aufheben der Blockierung:", error);
        toast({variant: 'destructive', title: 'Fehler', description: 'Blockierung konnte nicht aufgehoben werden.'});
    }
  }
  
  const handleGoBack = () => {
    router.push('/');
  }

  if (isLoading || isUserLoading) {
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
                  <span className="text-white mr-2">{blockedUsers.length}</span>
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
            <div className="space-y-2 py-4 max-h-60 overflow-y-auto">
                {blockedUsers.length > 0 ? blockedUsers.map(contact => (
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
                )) : (
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
