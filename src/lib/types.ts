import type { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  avatar: string;
  onlineStatus: 'online' | 'offline' | 'away';
  publicKey?: string;
  bio?: string;
  readReceiptsEnabled?: boolean;
  blockedUsers?: string[];
};

export type LinkPreviewData = {
  url: string;
  image: string;
  title: string;
  description: string;
}

export type Reaction = {
  emoji: string;
  userId: string;
  username: string;
}

export type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string; // Keep for display
  date: Timestamp | Date; // For sorting
  status: 'sent' | 'delivered' | 'read';
  selfDestructDuration?: number; // Duration in seconds
  readAt: Timestamp | number | null; // Timestamp when the message was read
  linkPreview?: LinkPreviewData;
  reactions: Reaction[];
  quotedMessage?: {
      id: string;
      content: string;
      senderName: string;
  };
  isEdited?: boolean;
  type: 'text' | 'audio';
  audioUrl?: string;
  audioDuration?: number;
};

export type Conversation = {
  id: string;
  type: 'private';
  participantIds: string[];
  participants: User[]; // This will be populated client-side
  messages: Message[]; // This will be a subcollection
  lastMessage?: Message;
  isMuted?: boolean;
  createdAt?: Timestamp;
};
