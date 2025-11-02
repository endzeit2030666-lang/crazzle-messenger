'use client';
import React from 'react';
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
import { Label } from '@/components/ui/label';

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
        <h1 className="font-headline text-xl font-bold ml-4">Einstellungen</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        <SettingsItem icon={User} label="Konto" onClick={() => toast({ title: 'Konto-Einstellungen nicht implementiert' })} />
        <SettingsItem icon={Lock} label="Sicherheit & Datenschutz" onClick={() => setScreen('security')} />
        <SettingsItem icon={Bell} label="Benachrichtigungen" onClick={() => toast({ title: 'Benachrichtigungs-Einstellungen nicht implementiert' })} />
        <SettingsItem icon={Palette} label="Darstellung" onClick={() => toast({ title: 'Darstellungs-Einstellungen nicht implementiert' })} />
        <SettingsItem icon={PieChart} label="Speicher" onClick={() => toast({ title: 'Speicher-Einstellungen nicht implementiert' })} />
        <SettingsItem icon={HelpCircle} label="Hilfe & Support" onClick={() => toast({ title: 'Hilfe & Support nicht implementiert' })} />
        <div className="pt-4">
            <Button variant="destructive" className="w-full" onClick={() => toast({ title: 'Abgemeldet' })}>
                <LogOut className="w-5 h-5 mr-2" />
                Abmelden
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
        <h1 className="font-headline text-xl font-bold ml-4">Sicherheit & Datenschutz</h1>
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="font-semibold px-2 mb-2">App-Sperre</h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="app-lock">App-Sperre aktivieren</Label>
              <Switch id="app-lock" checked={appLockEnabled} onCheckedChange={setAppLockEnabled} />
            </div>
            {appLockEnabled && (
                <>
                <div className="border-t border-border my-2"></div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="biometrics">Face ID / Fingerabdruck nutzen</Label>
                    <Switch id="biometrics" checked={useBiometrics} onCheckedChange={setUseBiometrics} />
                </div>
                 <div className="flex items-center justify-between">
                    <Label htmlFor="lock-immediately">Sofort sperren</Label>
                    <Switch id="lock-immediately" checked={lockImmediately} onCheckedChange={setLockImmediately} />
                </div>
                <Button variant="link" className="p-0 h-auto" onClick={() => toast({ title: 'PIN ändern nicht implementiert' })}>PIN ändern</Button>
                </>
            )}
          </div>
           <p className="text-xs text-muted-foreground mt-2 px-2">
              Wenn aktiviert, musst du deine PIN, deinen Fingerabdruck oder Face ID verwenden, um Crazzle zu entsperren.
          </p>
        </div>
        
        <div>
          <h3 className="font-semibold px-2 mb-2">Datenschutz</h3>
           <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
              <Label htmlFor="read-receipts">Lesebestätigungen</Label>
              <Switch id="read-receipts" checked={readReceipts} onCheckedChange={setReadReceipts} />
            </div>
             <p className="text-xs text-muted-foreground mt-2">
                Wenn du dies ausschaltest, kannst du keine Lesebestätigungen von anderen Personen sehen. Lesebestätigungen werden in Gruppenchats immer gesendet.
            </p>
            <div className="border-t border-border my-2"></div>
            <button onClick={() => setShowBlockDialog(true)} className="w-full flex items-center justify-between text-left">
                <Label>Blockierte Kontakte</Label>
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
            <AlertDialogTitle>Blockierte Kontakte</AlertDialogTitle>
            <AlertDialogDescription>
              Sie erhalten keine Nachrichten oder Anrufe von diesen Kontakten.
            </AlertDialogDescription>
          </AlertDialogHeader>
            <div className="space-y-2 py-4">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <span>Alice</span>
                    <Button variant="outline" size="sm">Entsperren</Button>
                </div>
                 <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <span>Bob</span>
                    <Button variant="outline" size="sm">Entsperren</Button>
                </div>
            </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Schließen</AlertDialogCancel>
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
