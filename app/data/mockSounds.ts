export interface Sound {
  id: string;
  name: string;
  icon: string;
  category: 'attention' | 'reward' | 'training';
  uri: string;
  isPremium: boolean;
  stats?: {
    rating: number;
    downloads: number;
  };
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
    name: 'Bell',
    icon: 'notifications',
    category: 'attention',
    uri: require('../assets/sounds/bell.mp3'),
    isPremium: true,
  },
  {
    id: '3',
    name: 'Whistle',
    icon: 'music-note',
    category: 'training',
    uri: require('../assets/sounds/whistle.mp3'),
    isPremium: true,
  },
]; 