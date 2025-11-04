'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';
import ChatLayout from '@/components/chat-layout';
import { Loader2 } from 'lucide-react';
import type { Message } from '@/lib/types';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Use a ref to ensure the effect only runs once for a given media URL
  const processedMediaUrlRef = useRef<string | null>(null);
  
  // This is a bit of a hack to get the sendMessage function from the layout
  const sendMessageRef = useRef<(content: string, type?: Message['type'], duration?: number, selfDestructDuration?: number, fileName?: string) => void>();


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const mediaUrl = searchParams.get('mediaUrl');
    const mediaType = searchParams.get('mediaType');
    const chatId = searchParams.get('chatId');

    // Ensure we have all params, a user, the send function, and haven't processed this URL before
    if (mediaUrl && mediaType && chatId && user && sendMessageRef.current && mediaUrl !== processedMediaUrlRef.current) {
        processedMediaUrlRef.current = mediaUrl; // Mark as processed
      
        // Send the message using the function from ChatLayout
        sendMessageRef.current(mediaUrl, mediaType as Message['type']);

        // Clean up URL params after sending
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('mediaUrl');
        newParams.delete('mediaType');
        const newUrl = `${window.location.pathname}?${newParams.toString()}`;
        router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, user, router]);


  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <ChatLayout 
        currentUser={user}
        setSendMessage={(fn) => { sendMessageRef.current = fn; }} 
      />
    </main>
  );
}
