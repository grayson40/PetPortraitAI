export interface Photo {
  id: string;
  imageUrl: string;
  createdAt: string;
  petName?: string;
  likes: number;
  userId: string;
  photographerName: string;
}

export const mockPhotos: Photo[] = [
  {
    id: '1',
    imageUrl: 'https://picsum.photos/400/400',
    createdAt: '2024-03-15T10:00:00Z',
    petName: 'Max',
    likes: 42,
    userId: 'user1',
    photographerName: 'John Doe'
  },
  {
    id: '2',
    imageUrl: 'https://picsum.photos/401/400',
    createdAt: '2024-03-14T15:30:00Z',
    petName: 'Luna',
    likes: 38,
    userId: 'user2',
    photographerName: 'Jane Smith'
  },
  {
    id: '3',
    imageUrl: 'https://picsum.photos/400/401',
    createdAt: '2024-03-14T09:15:00Z',
    petName: 'Bella',
    likes: 65,
    userId: 'user3',
    photographerName: 'Alice Johnson'
  },
  {
    id: '4',
    imageUrl: 'https://picsum.photos/402/400',
    createdAt: '2024-03-13T20:45:00Z',
    petName: 'Charlie',
    likes: 27,
    userId: 'user4',
    photographerName: 'Bob Brown'
  },
  {
    id: '5',
    imageUrl: 'https://picsum.photos/400/402',
    createdAt: '2024-03-13T14:20:00Z',
    petName: 'Lucy',
    likes: 51,
    userId: 'user5',
    photographerName: 'Eve Wilson'
  }
]; 