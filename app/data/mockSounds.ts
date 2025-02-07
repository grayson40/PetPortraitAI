export interface Sound {
  id: string;
  name: string;
  icon: keyof typeof import('@expo/vector-icons/MaterialIcons').glyphMap;
  category: 'attention' | 'reward' | 'training';
  uri: string;
  isPremium: boolean;
}

export const mockSounds: Sound[] = [
  {
    id: '1',
    name: 'Dog',
    icon: 'pets',
    category: 'attention',
    uri: require('../assets/sounds/attention.mp3'),
    isPremium: false,
  },
  {
    id: '2',
    name: 'Treat',
    icon: 'local-dining',
    category: 'attention',
    uri: require('../assets/sounds/treat.mp3'),
    isPremium: false,
  },
  {
    id: '3',
    name: 'Whistle',
    icon: 'music-note',
    category: 'training',
    uri: require('../assets/sounds/whistle.mp3'),
    isPremium: true,
  },
  {
    id: '4',
    name: 'Bell',
    icon: 'notifications',
    category: 'attention',
    uri: require('../assets/sounds/bell.mp3'),
    isPremium: true,
  },
]; 