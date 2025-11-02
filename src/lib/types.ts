export type User = {
  id: string;
  name: string;
  avatar: string;
  onlineStatus: 'online' | 'offline' | 'away';
  publicKey: string;
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
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isSelfDestructing?: boolean;
  selfDestructTimer?: number;
  readAt?: number; // Timestamp when the message was read
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
  id:string;
  type: 'private';
  participants: User[];
  messages: Message[];
  isPinned?: boolean;
  isMuted?: boolean;
};
