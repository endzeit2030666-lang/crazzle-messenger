export type User = {
  id: string;
  name: string;
  avatar: string;
  onlineStatus: 'online' | 'offline' | 'away';
  publicKey: string;
};

export type Message = {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  isSelfDestructing?: boolean;
};

export type Conversation = {
  id:string;
  participants: User[];
  messages: Message[];
};
