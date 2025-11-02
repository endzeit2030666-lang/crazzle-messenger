import type { User, Conversation } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const currentUser: User = {
  id: 'user0',
  name: 'You',
  avatar: findImage('avatar1'),
  onlineStatus: 'online',
  publicKey: '04:5A:CF:3B:4E:8C:9D:0F:1A:2B:3C:4D:5E:6F:7A:8B:9C:0D:1E:2F',
};

export const users: User[] = [
  {
    id: 'user1',
    name: 'Alice',
    avatar: findImage('avatar2'),
    onlineStatus: 'online',
    publicKey: '1A:2B:3C:4D:5E:6F:7A:8B:9C:0D:1E:2F:04:5A:CF:3B:4E:8C:9D:0F',
  },
  {
    id: 'user2',
    name: 'Bob',
    avatar: findImage('avatar3'),
    onlineStatus: 'offline',
    publicKey: 'F0:E1:D2:C3:B4:A5:96:87:78:69:5A:4B:3C:2D:1E:0F:A9:B8:C7:D6',
  },
  {
    id: 'user3',
    name: 'Charlie',
    avatar: findImage('avatar4'),
    onlineStatus: 'away',
    publicKey: '9C:8D:7E:6F:5A:4B:3C:2D:1E:0F:A9:B8:C7:D6:E5:F4:A3:B2:C1:D0',
  },
  {
    id: 'user4',
    name: 'David',
    avatar: findImage('avatar5'),
    onlineStatus: 'online',
    publicKey: 'DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34',
  },
];

export const conversations: Conversation[] = [
  {
    id: 'conv1',
    participants: [currentUser, users[0]],
    messages: [
      { id: 'msg1', senderId: 'user1', content: 'Hey, how is it going?', timestamp: '10:30 AM', status: 'read' },
      { id: 'msg2', senderId: 'user0', content: 'Pretty good! Working on the new secure messenger. You?', timestamp: '10:31 AM', status: 'read' },
      { id: 'msg3', senderId: 'user1', content: 'Awesome! I\'m testing it out now. The E2E encryption feels solid. How do I verify your key?', timestamp: '10:32 AM', status: 'read' },
      { id: 'msg4', senderId: 'user0', content: 'Click on my name at the top of the chat. You\'ll see an option to verify my identity.', timestamp: '10:33 AM', status: 'delivered' },
    ],
  },
  {
    id: 'conv2',
    participants: [currentUser, users[1]],
    messages: [
      { id: 'msg5', senderId: 'user2', content: 'Can you send me the project files?', timestamp: 'Yesterday', status: 'read' },
      { id: 'msg6', senderId: 'user0', content: 'Sure, sending them now. They are encrypted of course.', timestamp: 'Yesterday', status: 'read' },
    ],
  },
  {
    id: 'conv3',
    participants: [currentUser, users[2]],
    messages: [
      { id: 'msg7', senderId: 'user2', content: 'Let\'s try the self-destructing message feature.', timestamp: 'Yesterday', status: 'read', isSelfDestructing: true },
      { id: 'msg8', senderId: 'user0', content: 'Okay, this message will self-destruct in 5 minutes.', timestamp: 'Yesterday', status: 'read', isSelfDestructing: true },
    ],
  },
  {
    id: 'conv4',
    participants: [currentUser, users[3]],
    messages: [
        { id: 'msg9', senderId: 'user4', content: 'Are you available for a quick call?', timestamp: '2 days ago', status: 'read' },
    ],
  },
];
