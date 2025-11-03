import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import Image from "next/image";
import { Copy, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

type ContactVerificationDialogProps = {
  contact: User;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function ContactVerificationDialog({
  contact,
  children,
  open,
  onOpenChange,
}: ContactVerificationDialogProps) {
  const { toast } = useToast();
  const [inviteLink, setInviteLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (open && typeof window !== 'undefined') {
      const link = `${window.location.origin}/profile?userId=${contact.id}`;
      setInviteLink(link);
      setIsCopied(false); // Reset copied state when dialog opens
    }
  }, [open, contact.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setIsCopied(true);
    toast({
      title: "Link kopiert!",
      description: "Du kannst diesen Link jetzt mit anderen teilen.",
    });
    setTimeout(() => setIsCopied(false), 2000); // Reset icon after 2 seconds
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-center text-2xl">Kontakt einladen</DialogTitle>
          <DialogDescription className="text-center">
            Teile diesen Link, um {contact.name} zu einer Konversation einzuladen oder damit andere dich als Kontakt hinzufügen können.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-6">
          <Avatar className="w-24 h-24 border-2 border-primary">
            <AvatarImage asChild>
               <Image src={contact.avatar} alt={contact.name} width={96} height={96} data-ai-hint="person portrait" />
            </AvatarImage>
            <AvatarFallback className="text-3xl">{contact.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h3 className="text-xl font-semibold font-headline">{contact.name}</h3>
        </div>
         <div className="flex flex-col gap-2">
            <label htmlFor="invite-link" className="text-sm font-medium text-muted-foreground">Dein persönlicher Einladungslink</label>
            <div className="flex gap-2">
                 <Input id="invite-link" value={inviteLink} readOnly className="bg-muted border-border" />
                 <Button size="icon" onClick={handleCopy}>
                    {isCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                 </Button>
            </div>
        </div>
        <DialogFooter className="mt-4">
            <p className="text-xs text-muted-foreground text-center w-full">Jeder mit diesem Link kann dein Profil sehen und dich als Kontakt hinzufügen.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
