
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, PhoneOff, User, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

function CallPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(searchParams.get('type') === 'audio');

  const contactName = searchParams.get('contactName') || 'Unbekannter Kontakt';
  const contactAvatar = searchParams.get('contactAvatar') || '';

  useEffect(() => {
    const getMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }
        if (searchParams.get('type') === 'audio') {
            mediaStream.getVideoTracks().forEach(track => track.enabled = false);
        }
      } catch (error) {
        console.error("Fehler beim Zugriff auf Kamera/Mikrofon:", error);
        toast({
          variant: 'destructive',
          title: "Zugriff verweigert",
          description: "Kamera- und Mikrofonzugriff sind für Anrufe erforderlich.",
        });
        router.back();
      }
    };

    getMedia();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = () => {
    stream?.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      setIsMicMuted(!track.enabled);
    });
  };

  const toggleCamera = () => {
    stream?.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
      setIsCameraOff(!track.enabled);
    });
  };

  const endCall = () => {
    stream?.getTracks().forEach(track => track.stop());
    router.back();
  };

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col relative">
      {/* Remote Video / Avatar */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {/* This is a placeholder for the remote user's video */}
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-32 h-32 border-4 border-primary">
             <AvatarImage asChild>
                <Image src={contactAvatar} alt={contactName} width={128} height={128} data-ai-hint="person portrait"/>
             </AvatarImage>
            <AvatarFallback className="text-5xl">
              <User className="w-16 h-16" />
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold text-white">{contactName}</h1>
          <p className="text-lg text-muted-foreground animate-pulse">Verbinde...</p>
        </div>
      </div>

      {/* Local Video Preview */}
      <video
        ref={localVideoRef}
        autoPlay
        muted
        className={cn(
          "absolute top-4 right-4 w-48 h-auto rounded-lg shadow-lg border-2 border-primary z-10 transition-opacity",
          isCameraOff ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
        <div className="flex justify-center items-center gap-6 bg-black/50 backdrop-blur-md p-4 rounded-full max-w-sm mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMic}
            className={cn("w-14 h-14 rounded-full text-white", isMicMuted ? "bg-destructive" : "bg-white/20 hover:bg-white/30")}
          >
            {isMicMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCamera}
            className={cn("w-14 h-14 rounded-full text-white", isCameraOff ? "bg-destructive" : "bg-white/20 hover:bg-white/30")}
          >
            {isCameraOff ? <VideoOff /> : <Video />}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={endCall}
            className="w-16 h-16 rounded-full"
          >
            <PhoneOff />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CallPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CallPageContent />
        </Suspense>
    )
}
