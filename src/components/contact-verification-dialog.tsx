import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import { Lock } from "lucide-react";

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
  const qrCodeImage = PlaceHolderImages.find(img => img.id === 'qrCode');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-center text-2xl">Verify Identity</DialogTitle>
          <DialogDescription className="text-center">
            You can verify this contact's identity to ensure you are communicating with the right person.
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

          {qrCodeImage && (
             <div className="p-2 bg-white rounded-lg">
                <Image
                    src={qrCodeImage.imageUrl}
                    alt="QR Code"
                    width={200}
                    height={200}
                    data-ai-hint={qrCodeImage.imageHint}
                />
             </div>
          )}
          
          <div className="w-full p-4 bg-muted rounded-lg text-center break-all">
            <p className="text-xs text-muted-foreground mb-2">Public Key Fingerprint</p>
            <p className="font-mono text-sm tracking-tighter">{contact.publicKey}</p>
          </div>
        </div>
         <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Lock className="w-4 h-4 mr-2" />
            Your communication is end-to-end encrypted.
        </div>
      </DialogContent>
    </Dialog>
  );
}
