# FindTone Mobile App (Flutter)

FindTone is the mobile marketplace application for buying and selling musical instruments.

## Setup Instructions

### Prerequisites
- Flutter SDK 3.x
- Android Studio / Android SDK

### How to Run

1. **Start the Backend:**
   Ensure the ASP.NET Core backend is running, bound to all network interfaces so it can be accessed from a real device or emulator:
   ```bash
   cd backend/MusicMarket.Api
   dotnet run --urls http://0.0.0.0:5036
   ```

2. **Network Configuration (Important for physical devices):**
   - Ensure your development machine and your physical phone are on the **same Wi-Fi network**.
   - Create a Windows Firewall inbound rule allowing TCP traffic on port `5036`.
   - Find your laptop's IPv4 address (e.g., `192.168.1.10`).

3. **Running the App:**
   
   **On Android Emulator:**
   ```bash
   flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:5036/api
   ```
   *(Note: `10.0.2.2` is a special alias to your host loopback interface).*

   **On a Physical Device (e.g., Android phone):**
   Replace `<laptop-ip>` with your actual IPv4 address:
   ```bash
   flutter run -d <device-id> --dart-define=API_BASE_URL=http://<laptop-ip>:5036/api
   ```

### Demo Data
- **Demo Card:** Use `1234 1234 1234 1234` (any expiry, any CVV) for checkout card payment demo.

### Placeholder for Screenshots
*(Add screenshots of the mobile app here later)*
- `Screenshot_Marketplace.png`
- `Screenshot_CreatePost.png`
- `Screenshot_Chat.png`
