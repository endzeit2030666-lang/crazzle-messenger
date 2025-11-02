
'use client';

import { useState } from "react";
import ChatLayout from "@/components/chat-layout";
import type { User } from "@/lib/types";

export default function Home() {
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set(['user2', 'user3']));
  const users: User[] = [
      { id: 'user1', name: 'Alice', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjIwNzc3MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080', onlineStatus: 'online', publicKey: '' },
      { id: 'user2', name: 'Bob', avatar: 'https://images.unsplash.com/photo-1535643302794-19c3804b874b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxMHx8cGVyc29uJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzYyMDc3NzEyfDA&ixlib=rb-4.1.0&q=80&w=1080', onlineStatus: 'offline', publicKey: '' },
      { id: 'user3', name: 'Charlie', avatar: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxwZXJzb24lMjBwb3J0cmFpdHxlbnwwfHx8fDE3NjIwNzc3MTJ8MA&ixlib=rb-4.1.0&q=80&w=1080', onlineStatus: 'away', publicKey: '' }
  ];

  const allUsers = [...users, { id: 'user4', name: 'David', avatar: '...', onlineStatus: 'online', publicKey: '' }];
  const blockedContacts = allUsers.filter(user => blockedUsers.has(user.id));
  
  return (
    <main>
      <ChatLayout 
        blockedUsers={blockedUsers} 
        setBlockedUsers={setBlockedUsers} 
        blockedContacts={blockedContacts}
        allUsers={allUsers}
      />
    </main>
  );
}
