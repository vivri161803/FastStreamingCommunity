# Validation Plan — Telegram Channel Redirect

This validation plan lists specific, concrete tests and checks to verify that the implementation conforms to requirements and functions correctly.

## 1. Local Unit/Logic Tests

### 1.1 Regex URL Extraction Verification
The URL extraction logic should be tested against the following inputs:
- **Input**: `Check out this link: https://example.com/foo`
  - **Expected Output**: `https://example.com/foo`
- **Input**: `Please visit (https://example.com/bar) for info.`
  - **Expected Output**: `https://example.com/bar` (Trailing parenthesis must be excluded)
- **Input**: `Multiple links: https://first.com and https://second.org`
  - **Expected Output**: `https://first.com` (First link matches)
- **Input**: `No links here, only text.`
  - **Expected Output**: `null`
- **Input**: `Check out: http://example.com/abc`
  - **Expected Output**: `http://example.com/abc` (HTTP protocol matches)

## 2. Interactive Session Generation Test
- Run `npm run generate-session`.
- It should prompt for phone number, password, and login code.
- Upon entering correct credentials, it should output a string like: `Session generated successfully: 1AZabc...`
- The generated token must be copyable into `.env` under `TG_SESSION`.

## 3. Local Integration Verification

### 3.1 Startup Backfill Test
1. Set up `.env` with valid credentials and a target channel.
2. Delete `latest_url.txt` (if exists).
3. Start the application (`node server.js`).
4. **Validation**:
   - The console should output that the client is connected and listening to the channel.
   - It should log the backfill scan.
   - `latest_url.txt` should be created and contain the first URL from the most recent channel message containing a URL.

### 3.2 Live Event Verification
1. Keep the server running.
2. Send a new message to the target channel containing a link, e.g. `https://google.com/test-live-update`.
3. **Validation**:
   - The server console should log that a new message was received.
   - It should log the extraction of `https://google.com/test-live-update`.
   - `latest_url.txt` should be updated to contain `https://google.com/test-live-update`.

### 3.3 HTTP Server Verification
1. Run `curl -i http://localhost:3000/`.
2. **Validation**:
   - If a URL is active:
     - HTTP Status code must be `302 Found`.
     - `Location` header must exactly match the stored URL.
   - If no URL is active and `DEFAULT_FALLBACK_URL` is set:
     - HTTP Status code must be `302 Found`.
     - `Location` header must match the fallback URL.
   - If no URL is active and no fallback is set:
     - HTTP Status code must be `503 Service Unavailable`.
     - Response body must contain a clear HTML message.

## 4. Production LXC & Tailscale Verification
1. Deploy to Proxmox LXC.
2. Check that `systemd` service runs without error: `systemctl status telegram-redirect.service`.
3. Verify Tailscale Serve configuration:
   - Run `tailscale serve status`.
   - Ensure the server is serving traffic from the Tailscale domain to `http://localhost:3000`.
4. Perform an external check from another device on the Tailnet:
   - Request `https://telegram-redirect.YOUR-TAILNET.ts.net/`.
   - Verify it redirects to the latest URL stored.
