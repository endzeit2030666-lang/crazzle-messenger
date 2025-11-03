'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Camera, Video, Zap, RefreshCw, X, FileImage, Send, Clock, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { uploadMedia } from '@/firebase/storage';
import { useUser } from '@/firebase';

export default function CameraPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(null);
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  
  const [showDurationDialog, setShowDurationDialog] = useState(false);
  const [statusDuration, setStatusDuration] = useState('48h');
  const [isUploading, setIsUploading] = useState(false);


  const { toast } = useToast();
  const { user } = useUser();
  const chatId = searchParams.get('chatId');
  const fromGallery = searchParams.get('from') === 'gallery';


  useEffect(() => {
    if (fromGallery) {
      fileInputRef.current?.click();
      return; 
    }

    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'video/webm' });
        mediaRecorder.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.current.push(event.data);
          }
        };
        mediaRecorder.current.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
          setMediaBlob(blob);
          setCapturedMedia(URL.createObjectURL(blob));
          setMediaType('video');
          recordedChunks.current = [];
        };

      } catch (error) {
        console.error('Fehler beim Kamerazugriff:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Kamerazugriff verweigert',
          description: 'Bitte aktiviere die Kameraberechtigungen in deinen Browsereinstellungen.',
        });
      }
    };
    getCameraPermission();
     return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [toast, fromGallery]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const url = URL.createObjectURL(file);
        setCapturedMedia(url);
        setMediaBlob(file);
        if (file.type.startsWith('video')) {
            setMediaType('video');
        } else {
            setMediaType('photo');
        }
    } else {
        router.back();
    }
  };

  const takePhoto = () => {
    const canvas = document.createElement('canvas');
    if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
             context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
             const dataUrl = canvas.toDataURL('image/jpeg');
             setCapturedMedia(dataUrl);
             canvas.toBlob((blob) => {
                setMediaBlob(blob);
             }, 'image/jpeg');
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
  
  const handlePostStatus = async () => {
    if (!mediaBlob || !user) return;

    setShowDurationDialog(false);
    setIsUploading(true);

    try {
        const path = `status/${user.uid}/${Date.now()}`;
        const downloadURL = await uploadMedia(mediaBlob, path);

        const newStatusStory = {
            type: mediaType,
            content: downloadURL,
            bgColor: '', // Not used for media
            timestamp: new Date().toISOString(),
        };
        sessionStorage.setItem('newStatusStory', JSON.stringify(newStatusStory));

        toast({
            title: "Status gepostet!",
            description: `Dein Status ist jetzt sichtbar.`
        });
        router.push('/status');

    } catch(e) {
        console.error(e);
        toast({variant: 'destructive', title: 'Fehler beim Hochladen'});
    } finally {
        setIsUploading(false);
    }
  }

  const handleSendToChat = useCallback(async () => {
    if (!mediaBlob || !chatId || !user) {
      toast({
        variant: "destructive",
        title: "Senden fehlgeschlagen",
        description: "Es wurde kein Medium aufgenommen oder es wurde kein Chat ausgewählt.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const downloadURL = await uploadMedia(mediaBlob, `chats/${chatId}/${user.uid}_${Date.now()}`);
      
      const params = new URLSearchParams();
      params.set('mediaUrl', downloadURL);
      params.set('mediaType', mediaType);
      params.set('chatId', chatId);
      
      router.push(`/?${params.toString()}`);

    } catch (error) {
      console.error("Upload fehlgeschlagen:", error);
      toast({
        variant: "destructive",
        title: "Upload fehlgeschlagen",
        description: "Die Mediendatei konnte nicht hochgeladen werden.",
      });
    } finally {
      setIsUploading(false);
    }
  }, [mediaBlob, chatId, user, toast, router, mediaType]);


  const resetCapture = () => {
    setCapturedMedia(null);
    setMediaBlob(null);
    setCaption('');
     if (fromGallery) {
      router.back();
    }
  }

  if (isUploading) {
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center text-white gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg">Wird verarbeitet...</p>
        </div>
    )
  }

  if (capturedMedia) {
    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
                 <Button variant="ghost" size="icon" onClick={() => toast({title: "Filter nicht implementiert"})}>
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
                        placeholder="Bildunterschrift hinzufügen..."
                        className="flex-1 resize-none bg-black/50 border-white/30 text-white placeholder:text-white/70 focus-visible:ring-primary"
                        rows={1}
                    />
                </div>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex gap-2">
                        <Button variant="ghost" className="text-white" onClick={() => toast({title: "Auf dem Gerät gespeichert (simuliert)"})}>
                            <Download className="w-5 h-5 mr-2" />
                            Speichern
                        </Button>
                    </div>

                    <div className="flex gap-2">
                         <Button className="bg-accent text-accent-foreground" onClick={() => setShowDurationDialog(true)}>
                            Als Status posten <Clock className="w-4 h-4 ml-2" />
                        </Button>
                        {chatId && <Button className="bg-primary hover:bg-primary/90" size="icon" onClick={handleSendToChat}>
                            <Send className="w-5 h-5" />
                        </Button>}
                    </div>
                </div>
            </footer>

            <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Status-Dauer</DialogTitle>
                        <DialogDescription>Wähle, wie lange dein Status sichtbar sein soll.</DialogDescription>
                    </DialogHeader>
                    <RadioGroup defaultValue="48h" className="my-4 space-y-2" onValueChange={setStatusDuration}>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="48h" id="r1" />
                        <Label htmlFor="r1">⏰ Nach 48 Stunden automatisch löschen</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                        <RadioGroupItem value="forever" id="r2" />
                        <Label htmlFor="r2">♾️ Für immer behalten (in deinem Profilarchiv)</Label>
                        </div>
                    </RadioGroup>
                    <DialogFooter>
                        <Button onClick={handlePostStatus} className="w-full bg-primary hover:bg-primary/90">Status posten</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*"
      />
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <X className="w-6 h-6" />
        </Button>
         {!fromGallery && (
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon">
                    <Zap className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon">
                    <RefreshCw className="w-6 h-6" />
                </Button>
            </div>
         )}
      </header>

      <main className="flex-1 flex items-center justify-center relative">
        {hasCameraPermission === false && !fromGallery && <p className="text-destructive text-center p-4">Kamerazugriff verweigert. Bitte aktiviere ihn in deinen Browsereinstellungen.</p>}
        {hasCameraPermission !== false && fromGallery && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <FileImage className="w-16 h-16" />
                <p>Öffne Galerie...</p>
            </div>
        )}
        <video ref={videoRef} className={cn("w-full h-full object-cover", fromGallery || hasCameraPermission === false ? "hidden" : "")} autoPlay muted playsInline />
      </main>

      {!fromGallery && hasCameraPermission && (
         <footer className="p-4 flex flex-col items-center gap-4">
            <div className="flex items-center gap-8">
                <button onClick={() => setMode('photo')} className={cn('py-1 transition-colors', mode === 'photo' ? 'font-bold text-primary border-b-2 border-primary' : 'text-neutral-400')}>Foto</button>
                <button onClick={() => setMode('video')} className={cn('py-1 transition-colors', mode === 'video' ? 'font-bold text-primary border-b-2 border-primary' : 'text-neutral-400')}>Video</button>
            </div>
            <div className="w-full flex items-center justify-around">
                <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                    <FileImage className="w-7 h-7" />
                </Button>
                <button
                    onClick={handleCapture}
                    className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all"
                    aria-label={isRecording ? "Aufnahme stoppen" : (mode === 'photo' ? 'Foto aufnehmen' : 'Aufnahme starten')}
                >
                    {mode === 'photo' ? (
                        <div className="w-16 h-16 bg-primary rounded-full"></div>
                    ) : (
                        <div className={cn("transition-all", isRecording ? "w-8 h-8 bg-red-500 rounded-md" : "w-16 h-16 bg-primary rounded-full")}></div>
                    )}
                </button>
                <div className="w-12 h-12" /> {/* Placeholder to balance the flex layout */}
            </div>
        </footer>
      )}
    </div>
  );
}
