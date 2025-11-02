
'use client';

import { useState } from "react";
import ChatLayout from "@/components/chat-layout";
import type { User } from "@/lib/types";
import { users as allUsersData } from '@/lib/data';

export default function Home() {
  // Central state for blocked users, initialized from a source if available, or empty.
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set(['user2', 'user3']));
  
  const allUsers: User[] = allUsersData; // Assuming all users are needed
  const blockedContacts = allUsers.filter(user => blockedUsers.has(user.id));
  
  return (
    <main>
      <ChatLayout 
        blockedUsers={blockedUsers} 
        setBlockedUsers={setBlockedUsers}
        allUsers={allUsers}
        blockedContacts={blockedContacts}
      />
    </main>
  );
}
