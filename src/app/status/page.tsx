'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Camera, Type, FileImage } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { currentUser, users } from '@/lib/data';
import Image from 'next/image';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useToast } from '@/hooks/use-toast';


type Status = {
  userId: string;
  stories: { imageUrl: string; timestamp: string }[];
  viewed: boolean;
};

const initialStatusUpdates: Status[] = [
  {
    userId: currentUser.id,
    stories: [{ imageUrl: 'https://picsum.photos/seed/91/540/960', timestamp: 'Gerade eben' }],
    viewed: true,
  },
  {
    userId: users[0].id,
    stories: [
        { imageUrl: 'https://picsum.photos/seed/92/540/960', timestamp: 'Vor 2 Stunden' },
        { imageUrl: 'https://picsum.photos/seed/93/540/960', timestamp: 'Vor 1 Stunde' }
    ],
    viewed: false,
  },
  {
    userId: users[2].id,
    stories: [{ imageUrl: 'https://picsum.photos/seed/94/540/960', timestamp: 'Vor 8 Stunden' }],
    viewed: true,
  },
];


export default function StatusPage() {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatusUpdates);
  const [viewingStatus, setViewingStatus] = useState<Status | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();

  const myStatus = statuses.find(s => s.userId === currentUser.id);
  const recentUpdates = statuses.filter(s => s.userId !== currentUser.id && !s.viewed);
  const viewedUpdates = statuses.filter(s => s.userId !== currentUser.id && s.viewed);

  const getUserById = (id: string) => {
    if (id === currentUser.id) return currentUser;
    return users.find(u => u.id === id);
  };
  
  const handleViewStatus = (status: Status) => {
    setViewingStatus(status);
    setCurrentStoryIndex(0);
    // Mark as viewed
    setStatuses(currentStatuses => currentStatuses.map(s => s.userId === status.userId ? { ...s, viewed: true } : s))
  }
  
  const handleCloseViewer = () => {
    setViewingStatus(null);
    setCurrentStoryIndex(0);
  }
  
  const nextStory = () => {
    if (viewingStatus && currentStoryIndex < viewingStatus.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else {
      handleCloseViewer();
    }
  }

  const prevStory = () => {
      if (currentStoryIndex > 0) {
          setCurrentStoryIndex(prev => prev - 1);
      }
  }

  const handleFileUpload = () => {
    setIsSheetOpen(false);
    toast({
        title: "Nicht implementiert",
        description: "Das Hochladen aus der Galerie ist für Demozwecke nicht implementiert."
    });
  }


  if (viewingStatus) {
    const user = getUserById(viewingStatus.userId);
    const story = viewingStatus.stories[currentStoryIndex];
    if (!user || !story) {
        handleCloseViewer();
        return null;
    }

    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={handleCloseViewer}>
        <div className="w-full flex gap-1 p-2 absolute top-0 left-0 z-10">
            {viewingStatus.stories.map((_, index) => (
                 <Progress key={index} value={index < currentStoryIndex ? 100 : (index === currentStoryIndex ? 50 : 0)} className="w-full h-1 bg-white/20 [&>div]:bg-white" />
            ))}
        </div>
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
             <Avatar className="h-9 w-9">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <p className="font-semibold text-white">{user.name}</p>
                <p className="text-xs text-neutral-300">{story.timestamp}</p>
            </div>
        </div>
        <div className="flex-1 flex items-center justify-center relative">
            <div className="absolute left-0 top-0 h-full w-1/3 z-20" onClick={(e) => { e.stopPropagation(); prevStory(); }}></div>
            <div className="absolute right-0 top-0 h-full w-1/3 z-20" onClick={(e) => { e.stopPropagation(); nextStory(); }}></div>
            <Image src={story.imageUrl} layout="fill" objectFit="contain" alt="Status" data-ai-hint="story image" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4 text-primary">Status</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <div
              className="flex items-center gap-4 cursor-pointer"
            >
              <div className="relative">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-primary rounded-full p-0.5 border-2 border-background">
                  <Plus className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-lg text-primary">Mein Status</h2>
                <p className="text-sm text-white">Tippen, um Status hinzuzufügen</p>
              </div>
            </div>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-lg">
            <SheetHeader>
              <SheetTitle className="text-center text-primary">Status erstellen</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Button variant="outline" className="w-full justify-start h-14 text-primary" onClick={() => { setIsSheetOpen(false); router.push('/status/camera'); }}>
                <Camera className="w-6 h-6 mr-4" />
                <span className="text-lg">Foto oder Video</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-14 text-primary" onClick={() => { setIsSheetOpen(false); router.push('/status/text'); }}>
                <Type className="w-6 h-6 mr-4" />
                <span className="text-lg">Text-Status</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-14 text-primary" onClick={handleFileUpload}>
                <FileImage className="w-6 h-6 mr-4" />
                <span className="text-lg">Bild oder Video aus Galerie</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {recentUpdates.length > 0 && (
            <div>
                <h3 className="text-sm font-semibold text-primary mb-2 px-2">NEUE MELDUNGEN</h3>
                <div className="space-y-1">
                    {recentUpdates.map(status => {
                        const user = getUserById(status.userId);
                        if (!user) return null;
                        return (
                            <div key={status.userId} className="flex items-center gap-4 p-2 rounded-lg cursor-pointer hover:bg-muted" onClick={() => handleViewStatus(status)}>
                                <div className="relative p-0.5 border-2 border-primary rounded-full">
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div>
                                    <h2 className="font-semibold text-primary">{user.name}</h2>
                                    <p className="text-sm text-white">{status.stories[status.stories.length - 1].timestamp}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}

        {viewedUpdates.length > 0 && (
            <div>
                <h3 className="text-sm font-semibold text-primary mb-2 px-2">ANGESEHEN</h3>
                <div className="space-y-1">
                    {viewedUpdates.map(status => {
                        const user = getUserById(status.userId);
                        if (!user) return null;
                        return (
                            <div key={status.userId} className="flex items-center gap-4 p-2 rounded-lg cursor-pointer hover:bg-muted" onClick={() => handleViewStatus(status)}>
                                <div className="relative p-0.5 border-2 border-green-500 rounded-full">
                                     <Avatar className="w-12 h-12">
                                        <AvatarImage src={user.avatar} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div>
                                    <h2 className="font-semibold text-primary">{user.name}</h2>
                                    <p className="text-sm text-white">{status.stories[status.stories.length - 1].timestamp}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
