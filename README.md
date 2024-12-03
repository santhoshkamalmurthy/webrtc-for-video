1. Prerequisites:
   - Make sure you have Node.js installed on your system.

2. Clone the repository:
   ```
   git clone https://github.com/santhoshkamalmurthy/webrtc-for-video.git
   cd webrtc-for-video
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Generate SSL/TLS certificates:
   - Create a new directory named `certs` in the project root.
   - Navigate to the `certs` directory.
   - Generate a private key and self-signed certificate using OpenSSL:
     ```
     openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
     ```
   - Move the generated `key.pem` and `cert.pem` files to the project root directory.

5. Start the WebSocket server:
   ```
   node server.js
   ```
   The server will start running on `https://localhost:8080`.

6. Start the HTTPS server for the client:
   ```
   node client.js
   ```
   The client server will start running on `https://localhost:5001`.

7. Open a web browser and navigate to `https://localhost:5001`.
   - You may see a security warning due to the self-signed certificate. Click "Advanced" or "Proceed" to continue to the website.

8. Interact with the application:
   - Enter a room ID and user ID in the provided input fields.
   - Click the "Join Room" button to join the specified room.
   - Open multiple browser tabs or windows and join the same room with different user IDs to simulate multiple users.
   - The application will display the list of users in the room and allow WebRTC communication between them.

9. To leave a room:
   - Click the "Leave Room" button in the respective browser tab or window.
   - The user will be removed from the room, and other users will be notified.

Note: Since the code uses self-signed certificates for HTTPS and WSS, you may need to configure your browser to trust the certificate or temporarily ignore the security warning.