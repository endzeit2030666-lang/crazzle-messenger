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

export type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isSelfDestructing?: boolean;
  linkPreview?: LinkPreviewData;
};

export type Conversation = {
  id:string;
  participants: User[];
  messages: Message[];
};
