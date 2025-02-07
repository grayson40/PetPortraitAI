# PetPortrait - AI-Powered Pet Photography Assistant

## Project Overview
PetPortrait is a mobile application designed to help pet owners capture perfect photos of their pets. The app uses AI/ML to detect optimal moments for photography and includes an intelligent sound system to grab pets' attention.

## Core Value Proposition
- Solves the common problem of getting pets to look at the camera.
- Uses AI to capture and select the best moments.
- Provides a curated sound library for pet attention.
- Offers premium features for enhanced pet photography.

## Target Users
- **Primary**: Pet owners who regularly photograph their pets.
- **Secondary**: Pet Instagram account managers.
- **Tertiary**: Small pet businesses and groomers.

## Technical Requirements

### Mobile App (React Native with Typescript, Expo, and Expo Router)
- Camera access with real-time ML Kit integration.
- Background audio capabilities.
- Local storage for offline access.
- Push notifications via Supabase.
- In-app purchases.

### Backend Services
- **Supabase** for backend infrastructure:
  - Authentication.
  - PostgreSQL Database.
  - Real-time subscriptions.
  - Storage for media files.
  - Edge Functions for serverless computing.
- **ML Kit** for pet detection.

## Core Features
- AI-powered pet detection and photo timing.
- Pet-specific attention sounds.
- Photo management and organization by pet.
- Social features (likes, comments, profiles).
- Multi-pet management.
- User profiles and settings.

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/grayson40/pet-portrait.git
   cd pet-portrait
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```plaintext
   SUPABASE_URL=https://your-supabase-url.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run the application**:
   ```bash
   npm start
   ```

## Usage
- Launch the app on your mobile device or emulator.
- Grant camera permissions when prompted.
- Use the camera feature to take photos of your pets.
- Select sounds from the library to grab your pet's attention.
- Explore the gallery to view and manage your pet photos.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Thanks to the Expo team for providing a robust framework for building React Native applications.
- Special thanks to the Supabase team for their excellent backend services.

## Contact
For any inquiries, please reach out to [graysoncrozier40@gmail.com](mailto:graysoncrozier40@gmail.com).
