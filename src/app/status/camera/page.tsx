'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Video, Zap, RefreshCw, X, Image as ImageIcon, Send, Clock, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function CameraPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [statusDuration, setStatusDuration] = useState('48h');

  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };
    getCameraPermission();
     return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleCapture = () => {
    if (mode === 'photo') {
        const canvas = document.createElement('canvas');
        if (videoRef.current) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                 context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                 setCapturedMedia(canvas.toDataURL('image/jpeg'));
            }
        }
    } else {
        // Handle video recording logic
        setIsRecording(!isRecording);
        toast({ title: isRecording ? "Video recording stopped (simulated)" : "Video recording started (simulated)"});
        // Simulate capture after a short recording
        if (!isRecording) {
           setTimeout(() => {
                setCapturedMedia('https://picsum.photos/seed/vid1/540/960');
                setIsRecording(false);
           }, 2000);
        }
    }
  };
  
  const handlePostStatus = () => {
    setShowDurationDialog(false);
    toast({
        title: "Status Posted!",
        description: `Your status will be visible for ${statusDuration === '48h' ? '48 hours' : 'forever'}.`
    });
    router.push('/status');
  }


  if (capturedMedia) {
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="absolute top-4 right-4 z-10">
                <Button variant="ghost" size="icon" onClick={() => setCapturedMedia(null)}>
                    <X className="w-6 h-6 text-white" />
                </Button>
            </div>
            <div className="flex-1 flex items-center justify-center">
                 <Image src={capturedMedia} layout="fill" objectFit="contain" alt="Captured media" data-ai-hint="captured media"/>
            </div>
            <div className="flex items-center justify-between p-4 bg-black/50">
                 <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => toast({title: "Saved to device (simulated)"})}>
                        <Download className="w-6 h-6 text-white" />
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => { setCapturedMedia(null); toast({title: "Discarded"});}}>
                        <Trash2 className="w-6 h-6 text-destructive" />
                    </Button>
                </div>

                <Button className="bg-primary hover:bg-primary/90" onClick={() => toast({title: "Sent to chat (simulated)"})}>
                    Send <Send className="w-4 h-4 ml-2" />
                </Button>
                 <Button className="bg-accent text-accent-foreground" onClick={() => setShowDurationDialog(true)}>
                    Post to Status <Clock className="w-4 h-4 ml-2" />
                </Button>
            </div>
            <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Status Duration</DialogTitle>
                        <DialogDescription>Choose how long your status will be visible.</DialogDescription>
                    </DialogHeader>
                    <RadioGroup defaultValue="48h" className="my-4 space-y-2" onValueChange={setStatusDuration}>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="48h" id="r1" />
                        <Label htmlFor="r1">⏰ Auto-delete after 48 hours</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="forever" id="r2" />
                        <Label htmlFor="r2">♾️ Keep forever (in your profile archive)</Label>
                        </div>
                    </RadioGroup>
                    <DialogFooter>
                        <Button onClick={handlePostStatus} className="w-full bg-primary hover:bg-primary/90">Post Status</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <X className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Zap className="w-6 h-6" />
          </Button>
           <Button variant="ghost" size="icon">
            <RefreshCw className="w-6 h-6" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center relative">
        {hasCameraPermission === null && <p>Requesting camera permission...</p>}
        {hasCameraPermission === false && <p className="text-destructive">Camera access denied. Please enable it in your browser settings.</p>}
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
      </main>

      <footer className="p-4 flex flex-col items-center gap-4">
        <div className="flex items-center gap-8">
            <button onClick={() => setMode('photo')} className={mode === 'photo' ? 'font-bold text-primary' : 'text-neutral-400'}>Photo</button>
            <button onClick={() => setMode('video')} className={mode === 'video' ? 'font-bold text-primary' : 'text-neutral-400'}>Video</button>
        </div>
        <div className="w-full flex items-center justify-between">
            <Button variant="ghost" size="icon">
                <ImageIcon className="w-7 h-7" />
            </Button>
            <button
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center"
            >
                <div className={isRecording ? "w-8 h-8 bg-red-500 rounded-md" : "w-16 h-16 bg-primary rounded-full"}></div>
            </button>
            <div className="w-10 h-10"></div>
        </div>
      </footer>
    </div>
  );
}
