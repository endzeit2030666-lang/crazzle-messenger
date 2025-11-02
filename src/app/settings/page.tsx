'use client';
import { useState } from 'react';
import {
  ArrowLeft,
  User,
  Lock,
  Bell,
  Palette,
  HelpCircle,
  LogOut,
  ChevronRight,
  Shield,
  KeyRound,
  Fingerprint,
  Smartphone,
  Trash2,
  PieChart
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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
} from "@/components/ui/alert-dialog"

type Screen = 'main' | 'account' | 'security' | 'notifications';

const SettingsItem = ({ icon, label, onClick }: { icon: React.ElementType; label: string; onClick?: () => void }) => (
  <button onClick={onClick} className="w-full flex items-center p-4 rounded-lg hover:bg-muted transition-colors">
    <div className="p-2 bg-muted rounded-full mr-4">
      {React.createElement(icon, { className: "w-5 h-5 text-primary" })}
    </div>
    <span className="flex-1 text-left font-medium">{label}</span>
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </button>
);

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [screen, setScreen] = useState<Screen>('main');
  
  // Security settings state
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [useBiometrics, setUseBiometrics] = useState(true);
  const [lockImmediately, setLockImmediately] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [showBlockDialog, setShowBlockDialog] = useState(false);


  const renderMainScreen = () => (
    <>
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4">Settings</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        <SettingsItem icon={User} label="Account" onClick={() => setScreen('account')} />
        <SettingsItem icon={Lock} label="Security & Privacy" onClick={() => setScreen('security')} />
        <SettingsItem icon={Bell} label="Notifications" onClick={() => setScreen('notifications')} />
        <SettingsItem icon={Palette} label="Appearance" onClick={() => toast({ title: 'Not Implemented' })} />
        <SettingsItem icon={PieChart} label="Storage" onClick={() => toast({ title: 'Not Implemented' })} />
        <SettingsItem icon={HelpCircle} label="Help & Support" onClick={() => toast({ title: 'Not Implemented' })} />
        <div className="pt-4">
            <Button variant="destructive" className="w-full" onClick={() => toast({ title: 'Logged Out' })}>
                <LogOut className="w-5 h-5 mr-2" />
                Log Out
            </Button>
        </div>
      </main>
    </>
  );

  const renderSecurityScreen = () => (
     <>
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={() => setScreen('main')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4">Security & Privacy</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="font-semibold px-2 mb-2">App Lock</h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="app-lock">Enable App Lock</Label>
              <Switch id="app-lock" checked={appLockEnabled} onCheckedChange={setAppLockEnabled} />
            </div>
            {appLockEnabled && (
                <>
                <div className="border-t border-border my-2"></div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="biometrics">Use Face ID / Fingerprint</Label>
                    <Switch id="biometrics" checked={useBiometrics} onCheckedChange={setUseBiometrics} />
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="lock-immediately">Lock Immediately</Label>
                    <Switch id="lock-immediately" checked={lockImmediately} onCheckedChange={setLockImmediately} />
                </div>
                <Button variant="link" className="p-0 h-auto">Change PIN</Button>
                </>
            )}
          </div>
           <p className="text-xs text-muted-foreground mt-2 px-2">
              When enabled, you'll need to use your PIN, fingerprint or Face ID to unlock Crazzle.
          </p>
        </div>
        
        <div>
          <h3 className="font-semibold px-2 mb-2">Privacy</h3>
           <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
              <Label htmlFor="read-receipts">Read Receipts</Label>
              <Switch id="read-receipts" checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                If you turn this off, you won't be able to see read receipts from other people. Read receipts are always sent for group chats.
            </p>
            <div className="border-t border-border my-2"></div>
            <button onClick={() => setShowBlockDialog(true)} className="w-full flex items-center justify-between text-left">
                <Label>Blocked Contacts</Label>
                <div className="flex items-center">
                    <span className="text-muted-foreground mr-2">3</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
             </button>
           </div>
        </div>

      </main>
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Blocked Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              You will not receive messages or calls from these contacts.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <div className="space-y-2 py-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <span>Alice</span>
                    <Button variant="outline" size="sm">Unblock</Button>
                </div>
                 <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <span>Bob</span>
                    <Button variant="outline" size="sm">Unblock</Button>
                </div>
            </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
     </>
  );

  const renderScreen = () => {
    switch(screen) {
        case 'security': return renderSecurityScreen();
        // Add other screens here
        default: return renderMainScreen();
    }
  }

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
        {renderScreen()}
    </div>
  );
}
