'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Camera, Type, FileImage, Loader2, Play } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import { useUser, useFirestore } from '@/firebase';
import type { User } from '@/lib/types';
import { collection, getDocs, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';


type Story = { 
  type: 'image' | 'video' | 'text';
  content: string; // URL for image/video, text for text status
  timestamp: string;
  bgColor?: string; // For text status
};

type Status = {
  userId: string;
  stories: Story[];
  viewed: boolean;
};

// This is a mock data generator. Replace with real status logic later.
const generateInitialStatusUpdates = (currentUserId: string, allUsers: User[]): Status[] => {
    const otherUsers = allUsers.filter(u => u.id !== currentUserId);
    
    let statuses: Status[] = [];

    // Don't create a default status for the current user
    // statuses.push({
    //      userId: currentUserId,
    //      stories: [{ type: 'image', content: 'https://picsum.photos/seed/91/540/960', timestamp: 'Gerade eben' }],
    //      viewed: true,
    // });

    if (otherUsers.length > 0) {
      statuses.push({
        userId: otherUsers[0].id,
        stories: [
            { type: 'image', content: 'https://picsum.photos/seed/92/540/960', timestamp: 'Vor 2 Stunden' },
            { type: 'image', content: 'https://picsum.photos/seed/93/540/960', timestamp: 'Vor 1 Stunde' }
        ],
        viewed: false,
      });
    }

    if (otherUsers.length > 1) {
      statuses.push({
        userId: otherUsers[1].id,
        stories: [{ type: 'image', content: 'https://picsum.photos/seed/94/540/960', timestamp: 'Vor 8 Stunden' }],
        viewed: true,
      });
    }
    
    return statuses;
};


export default function StatusPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser, isUserLoading } = useUser();
  const firestore = useFirestore();
  
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [viewingStatus, setViewingStatus] = useState<Status | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserData = allUsers.find(u => u.id === currentUser?.uid);

  useEffect(() => {
    if (isUserLoading) return;
    if (!currentUser) {
        router.push('/login');
        return;
    }
    if (!firestore) return;

    const fetchUsersAndStatuses = async () => {
        setIsLoading(true);
        try {
            const usersQuery = query(collection(firestore, 'users'));
            const querySnapshot = await getDocs(usersQuery);
            const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers(usersData);
            
            let initialStatuses = generateInitialStatusUpdates(currentUser.uid, usersData);

            const newStoryJSON = sessionStorage.getItem('newStatusStory');
            if (newStoryJSON) {
                const newStory = JSON.parse(newStoryJSON);
                const myStatusIndex = initialStatuses.findIndex(s => s.userId === currentUser.uid);

                if (myStatusIndex !== -1) {
                    initialStatuses[myStatusIndex].stories.push(newStory);
                } else {
                     initialStatuses.unshift({
                        userId: currentUser.uid,
                        stories: [newStory],
                        viewed: true
                     });
                }
                sessionStorage.removeItem('newStatusStory');
            }

            setStatuses(initialStatuses);
        } catch (error) {
            console.error("Fehler beim Laden der Benutzerdaten aus Firestore", error);
            toast({ variant: 'destructive', title: "Fehler", description: "Konnte Benutzerdaten nicht laden." });
        } finally {
            setIsLoading(false);
        }
    };
    fetchUsersAndStatuses();
  }, [currentUser, isUserLoading, router, toast, firestore]);

  const myStatus = statuses.find(s => s.userId === currentUser?.uid);
  const recentUpdates = statuses.filter(s => s.userId !== currentUser?.uid && !s.viewed);
  const viewedUpdates = statuses.filter(s => s.userId !== currentUser?.uid && s.viewed);

  const getUserById = (id: string): User | undefined => {
    return allUsers.find(u => u.id === id);
  };
  
  const handleViewStatus = (status: Status) => {
    setViewingStatus(status);
    setCurrentStoryIndex(0);
    if (status.userId !== currentUser?.uid) {
      setStatuses(currentStatuses => currentStatuses.map(s => s.userId === status.userId ? { ...s, viewed: true } : s))
    }
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
    router.push('/status/camera?from=gallery');
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
            <div className="absolute right-0 top-0 h-full w-2/3 z-20" onClick={(e) => { e.stopPropagation(); nextStory(); }}></div>
             {story.type === 'text' ? (
                <div className={cn("w-full h-full flex items-center justify-center p-8", story.bgColor)}>
                    <p className="text-white text-4xl font-bold text-center">{story.content}</p>
                </div>
             ) : story.type === 'video' ? (
                <video src={story.content} autoPlay onEnded={nextStory} className="w-full h-full object-contain" />
             ) : (
                <Image src={story.content} layout="fill" objectFit="contain" alt="Status" data-ai-hint="story image" />
             )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center p-4 border-b border-border shadow-sm z-10 sticky top-0 bg-background">
        <Button variant="ghost" size="icon" onClick={handleGoBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-headline text-xl font-bold ml-4 text-primary">Status</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => myStatus ? handleViewStatus(myStatus) : setIsSheetOpen(true)}
            >
            <div className="relative">
                <Avatar className="w-14 h-14">
                {currentUserData && <AvatarImage src={currentUserData.avatar} alt={currentUserData.name} />}
                {currentUserData && <AvatarFallback>{currentUserData.name.charAt(0)}</AvatarFallback>}
                </Avatar>
                {(!myStatus) && (
                    <div className="absolute bottom-0 right-0 bg-primary rounded-full p-0.5 border-2 border-background">
                        <Plus className="w-4 h-4 text-primary-foreground" />
                    </div>
                )}
            </div>
            <div>
                <h2 className="font-semibold text-lg text-primary">Mein Status</h2>
                <p className="text-sm text-white">{myStatus ? "Meinen Status ansehen" : "Tippen, um Status hinzuzufügen"}</p>
            </div>
            </div>
            <SheetTrigger asChild>
                <button className="hidden">Öffnen</button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-lg">
              <SheetHeader>
                <SheetTitle className="text-center text-primary">Status erstellen</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <Button variant="outline" className="w-full justify-start h-14 text-white" onClick={() => { setIsSheetOpen(false); router.push('/status/camera'); }}>
                  <Camera className="w-6 h-6 mr-4" />
                  <span className="text-lg">Foto oder Video</span>
                </Button>
                <Button variant="outline" className="w-full justify-start h-14 text-white" onClick={() => { setIsSheetOpen(false); router.push('/status/text'); }}>
                  <Type className="w-6 h-6 mr-4" />
                  <span className="text-lg">Text-Status</span>
                </Button>
                <Button variant="outline" className="w-full justify-start h-14 text-white" onClick={handleFileUpload}>
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
