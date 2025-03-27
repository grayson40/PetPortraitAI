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
    id: '624f4b02-c5ae-4947-b66a-3d7d20a6d185',
    name: 'Dog',
    icon: 'pets',
    category: 'attention',
    uri: require('../assets/sounds/attention.mp3'),
    isPremium: false,
  },
  {
    id: '9b2581d4-b91e-4314-89f9-7ed7c9ef94d4',
    name: 'Bell',
    icon: 'notifications',
    category: 'attention',
    uri: require('../assets/sounds/bell.mp3'),
    isPremium: false,
  },
  {
    id: 'dafbd20c-545f-4038-8c9b-e513a93dd664',
    name: 'Whistle',
    icon: 'music-note',
    category: 'training',
    uri: require('../assets/sounds/whistle.mp3'),
    isPremium: false,
  },
  // {
  //   id: 'dafbd20c-545f-4038-8c9b-e513a93dd667',
  //   name: 'Pro Bark',
  //   icon: 'music-note',
  //   category: 'attention',
  //   uri: require('../assets/sounds/attention.mp3'),
  //   isPremium: true,
  // },
  // {
  //   id: 'dafbd20c-545f-4038-8c9b-e513a93dd668',
  //   name: 'Pro Meow',
  //   icon: 'music-note',
  //   category: 'attention',
  //   uri: require('../assets/sounds/attention.mp3'),
  //   isPremium: true,
  // },
]; 