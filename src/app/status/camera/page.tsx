'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Video, Zap, RefreshCw, X, FileImage, Send, Clock, Download, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function CameraPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  
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

        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.current.push(event.data);
          }
        };
        mediaRecorder.current.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          setCapturedMedia(URL.createObjectURL(blob));
          setMediaType('video');
          recordedChunks.current = [];
        };

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

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
             context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
             setCapturedMedia(canvas.toDataURL('image/jpeg'));
             setMediaType('photo');
        }
    }
  };

  const startRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'inactive') {
      recordedChunks.current = [];
      mediaRecorder.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };
  
  const handleCapture = () => {
    if (mode === 'photo') {
      takePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };
  
  const handlePostStatus = () => {
    setShowDurationDialog(false);
    toast({
        title: "Status Posted!",
        description: `Your status will be visible for ${statusDuration === '48h' ? '48 hours' : 'forever'}. Caption: "${caption}"`
    });
    router.push('/status');
  }

  const handleSendToChat = () => {
    toast({
      title: "Media Sent!",
      description: `Your ${mediaType} has been sent to the chat. Caption: "${caption}"`,
    });
    // This assumes the camera was opened from a chat context, which we can get from URL params
    const chatId = searchParams.get('chatId');
    if (chatId) {
      router.push(`/?chatId=${chatId}`);
    } else {
      router.push('/');
    }
  }

  const resetCapture = () => {
    setCapturedMedia(null);
    setCaption('');
  }

  if (capturedMedia) {
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
                 <Button variant="ghost" size="icon" onClick={() => toast({title: "Filters not implemented"})}>
                    <Zap className="w-6 h-6 text-white" />
                </Button>
                <Button variant="ghost" size="icon" onClick={resetCapture}>
                    <X className="w-6 h-6 text-white" />
                </Button>
            </header>
            
            <div className="flex-1 flex items-center justify-center">
                 {mediaType === 'photo' ? (
                     <Image src={capturedMedia} layout="fill" objectFit="contain" alt="Captured media" data-ai-hint="captured media"/>
                 ) : (
                    <video src={capturedMedia} className="w-full h-full object-contain" autoPlay loop controls />
                 )}
            </div>

            <footer className="p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
                <div className="flex items-center gap-2">
                    <Textarea 
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="flex-1 resize-none bg-black/50 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-primary"
                        rows={1}
                    />
                </div>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-2">
                        <Button variant="ghost" className="text-white" onClick={() => toast({title: "Saved to device (simulated)"})}>
                            <Download className="w-5 h-5 mr-2" />
                            Save
                        </Button>
                    </div>

                    <div className="flex gap-2">
                         <Button className="bg-accent text-accent-foreground" onClick={() => setShowDurationDialog(true)}>
                            Post to Status <Clock className="w-4 h-4 ml-2" />
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90" size="icon" onClick={handleSendToChat}>
                            <Send className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </footer>

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
            <button onClick={() => setMode('photo')} className={cn('py-1 transition-colors', mode === 'photo' ? 'font-bold text-primary border-b-2 border-primary' : 'text-neutral-400')}>Photo</button>
            <button onClick={() => setMode('video')} className={cn('py-1 transition-colors', mode === 'video' ? 'font-bold text-primary border-b-2 border-primary' : 'text-neutral-400')}>Video</button>
        </div>
        <div className="w-full flex items-center justify-around">
            <Button variant="ghost" size="icon">
                <FileImage className="w-7 h-7" />
            </Button>
            <button
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all"
                aria-label={isRecording ? "Stop recording" : (mode === 'photo' ? 'Take photo' : 'Start recording')}
            >
                {mode === 'photo' ? (
                     <div className="w-16 h-16 bg-primary rounded-full"></div>
                ) : (
                    <div className={cn("transition-all", isRecording ? "w-8 h-8 bg-red-500 rounded-md" : "w-16 h-16 bg-primary rounded-full")}></div>
                )}
            </button>
            <button onClick={stopRecording} disabled={!isRecording} className={cn("transition-opacity", isRecording ? "opacity-100" : "opacity-0")}>
               <Check className="w-8 h-8 text-white bg-green-500 rounded-full p-1" />
            </button>
        </div>
      </footer>
    </div>
  );
}
