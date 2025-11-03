'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';
import ChatLayout from '@/components/chat-layout';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const mediaUrl = searchParams.get('mediaUrl');
    const mediaType = searchParams.get('mediaType');
    const chatId = searchParams.get('chatId');

    if (mediaUrl && mediaType && chatId && user) {
      // This is a navigation from the camera page.
      // We'll let ChatLayout handle the sending.
      // For now, we just need to ensure the correct chat is selected.
    }
  }, [searchParams, user]);


  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main>
      <ChatLayout currentUser={user} />
    </main>
  );
}
