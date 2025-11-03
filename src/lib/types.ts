import type { Timestamp } from 'firebase/firestore';

export type User = {
  id: string;
  name: string;
  avatar: string;
  onlineStatus: 'online' | 'offline' | 'away';
  lastSeen?: Timestamp | Date;
  publicKey?: string;
  phoneNumber?: string;
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
  senderName?: string; // For group chats
  content: string;
  timestamp: string; // Keep for display
  date: Timestamp | Date; // For sorting
  status: 'sent' | 'delivered' | 'read';
  selfDestructDuration?: number; // Duration in seconds
  readAt: Timestamp | Date | null; // Timestamp when the message was read
  linkPreview?: LinkPreviewData;
  reactions: Reaction[];
  quotedMessage?: {
      id: string;
      content: string;
      senderName: string;
  };
  isEdited?: boolean;
  type: 'text' | 'audio' | 'image' | 'video' | 'document' | 'system';
  audioUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
};

export type Conversation = {
  id: string;
  type: 'private' | 'group';
  participantIds: string[];
  participants: User[]; // This will be populated client-side
  lastMessage?: Message;
  unreadCount?: number; // Added for unread messages badge
  isMuted?: boolean;
  createdAt: Timestamp;
  typing?: string[];
  // Group-specific fields
  name?: string;
  avatar?: string;
  admins?: string[];
  createdBy: string;
};

    