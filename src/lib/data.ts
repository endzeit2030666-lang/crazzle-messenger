import type { User, Conversation } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) => PlaceHolderImages.find(img => img.id === id)?.imageUrl || '';

export const currentUser: User = {
  id: 'user0',
  name: 'Du',
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
    {
    id: 'user5',
    name: 'Familiengruppe',
    avatar: findImage('groupAvatar'),
    onlineStatus: 'online',
    publicKey: '',
  },
];

export const conversations: Conversation[] = [
  {
    id: 'conv1',
    type: 'private',
    participants: [currentUser, users[0]],
    messages: [
      { id: 'msg1', senderId: 'user1', content: 'Hey, wie geht\'s?', timestamp: '10:30', status: 'read', reactions: [] },
      { id: 'msg2', senderId: 'user0', content: 'Ganz gut! Arbeite am neuen sicheren Messenger. Und du?', timestamp: '10:31', status: 'read', reactions: [{ emoji: '👍', userId: 'user1', username: 'Alice' }] },
      { id: 'msg3', senderId: 'user1', content: 'Super! Ich teste ihn gerade. Die E2E-Verschlüsselung fühlt sich solide an. Wie verifiziere ich deinen Schlüssel?', timestamp: '10:32', status: 'read', reactions: [] },
      { id: 'msg4', senderId: 'user0', content: 'Klicke oben im Chat auf meinen Namen. Dort siehst du eine Option, um meine Identität zu verifizieren.', timestamp: '10:33', status: 'delivered', reactions: [] },
    ],
    isPinned: true,
  },
  {
    id: 'conv2',
    type: 'private',
    participants: [currentUser, users[1]],
    messages: [
      { id: 'msg5', senderId: 'user2', content: 'Kannst du mir die Projektdateien schicken?', timestamp: 'Gestern', status: 'read', reactions: [] },
      { id: 'msg6', senderId: 'user0', content: 'Klar, sende sie jetzt. Sie sind natürlich verschlüsselt.', timestamp: 'Gestern', status: 'read', reactions: [] },
      { 
        id: 'msg_yt', 
        senderId: 'user2', 
        content: 'Schau dir diesen neuen Song an: https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
        timestamp: '11:00', 
        status: 'read',
        linkPreview: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          image: findImage('youtubeThumbnail'),
          title: 'Offizielles Musikvideo',
          description: 'youtube.com'
        },
        reactions: [],
      },
    ],
  },
  {
    id: 'conv3',
    type: 'private',
    participants: [currentUser, users[2]],
    messages: [
      { id: 'msg7', senderId: 'user2', content: 'Lass uns die selbstzerstörende Nachrichtenfunktion ausprobieren.', timestamp: 'Gestern', status: 'read', isSelfDestructing: true, reactions: [] },
      { id: 'msg8', senderId: 'user0', content: 'Okay, diese Nachricht wird sich in 5 Minuten selbst zerstören.', timestamp: 'Gestern', status: 'read', isSelfDestructing: true, reactions: [] },
    ],
    isMuted: true,
  },
  {
    id: 'conv4',
    type: 'private',
    participants: [currentUser, users[3]],
    messages: [
        { id: 'msg9', senderId: 'user4', content: 'Bist du für einen kurzen Anruf verfügbar?', timestamp: 'Vorgestern', status: 'read', reactions: [] },
    ],
  },
  {
    id: 'conv5',
    type: 'group',
    participants: [currentUser, users[0], users[1], users[2]],
    groupDetails: {
      id: 'group1',
      name: 'Familiengruppe',
      avatar: findImage('groupAvatar'),
      participants: [currentUser, users[0], users[1], users[2]],
    },
    messages: [
        { id: 'gmsg1', senderId: 'user1', content: 'Hallo zusammen! Was machen wir dieses Wochenende?', timestamp: '09:00', status: 'read', reactions: [] },
        { id: 'gmsg2', senderId: 'user2', content: 'Ich dachte an Grillen, wenn das Wetter gut ist!', timestamp: '09:01', status: 'read', reactions: [{ emoji: '❤️', userId: 'user1', username: 'Alice' }] },
        { id: 'gmsg3', senderId: 'user0', content: 'Klingt super! Ich kann Salate mitbringen.', timestamp: '09:05', status: 'read', reactions: [] },
    ],
  },
];
