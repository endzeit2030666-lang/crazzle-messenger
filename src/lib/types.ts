export type User = {
  id: string;
  name: string;
  avatar: string;
  onlineStatus: 'online' | 'offline' | 'away';
  publicKey: string;
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
  linkPreview?: LinkPreviewData;
  reactions: Reaction[];
  quotedMessage?: {
      id: string;
      content: string;
      senderName: string;
  }
};

export type Group = {
    id: string;
    name: string;
    avatar: string;
    participants: User[];
}

export type Conversation = {
  id:string;
  type: 'private' | 'group';
  participants: User[];
  messages: Message[];
  groupDetails?: Group;
};
