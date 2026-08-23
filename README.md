# Private Two-Person Video

Minimal two-person peer-to-peer video application using:

- HTML
- CSS
- JavaScript
- Browser WebRTC
- Node.js built-in HTTP server

No accounts, database, media storage, framework, or media relay is used.

## Architecture

The browser obtains camera/microphone access with `getUserMedia()`.

Video and audio are sent directly between browsers using WebRTC.

The Node.js backend only exchanges:

- SDP offers
- SDP answers
- ICE candidates

The backend never receives WebRTC audio or video.

Sessions are held in memory and expire after 30 minutes without activity.

## Local development

Requirements:

- Node.js 18+
- Python 3

Make the development script executable:

```bash
chmod +x scripts/dev.sh
```

Start both servers:

```bash
./scripts/dev.sh
```

Open:

[http://localhost:8080](http://localhost:8080)

Create a session and send the generated link to the second participant.

For local development, browsers may allow camera/microphone access from localhost.

## Production deployment

### Frontend

The `frontend` directory can be deployed to GitHub Pages.

GitHub Pages provides HTTPS.

Change this line in `frontend/index.html`:

```javascript
window.SIGNALING_URL = "http://localhost:3000";
```

to the HTTPS URL of the deployed signaling server:

```javascript
window.SIGNALING_URL = "https://your-signaling-server.example";
```

### Backend

Run:

```bash
cd backend
npm start
```

Set:

```text
PORT=3000
```

The backend should be placed behind an HTTPS reverse proxy or hosted on a platform providing HTTPS.

The frontend must use HTTPS in production because browser camera/microphone access requires a secure context.

## Security

Session tokens contain 32 cryptographically random bytes encoded with base64url.

The token is the only credential needed to enter a session.

There are no user accounts.

The signaling server stores session metadata and WebRTC signaling messages only in memory.

No audio or video is recorded or stored.

WebRTC media is encrypted by the browser using DTLS/SRTP.

## Network connectivity

A public STUN server is configured:

```text
stun:stun.l.google.com:19302
```

STUN allows peers to discover usable network addresses.

Some restrictive networks require a TURN server. This minimal implementation intentionally does not provide TURN/media relay infrastructure.

## Session behavior

A session supports exactly:

* 1 host
* 1 guest

A third participant receives `Session is full`.

Sessions expire after 30 minutes without signaling activity.

Leaving releases local camera and microphone tracks.

Connection failures are reflected in the connection status.

## Browser permissions

The application requests:

* camera
* microphone

The browser controls the actual permission prompt.

If permission is denied, the application displays the browser error.

## Fullscreen

Each video has its own fullscreen button.

F11 is handled by the browser/operating system.

## GitHub Pages

A simple deployment structure is:

```text
repository/
└── frontend/
    ├── index.html
    ├── css/
    └── js/
```

Configure GitHub Pages to publish the `frontend` directory.

The signaling backend must be deployed separately.

## Limitations

This is intentionally a minimal implementation.

It does not include:

* TURN server support
* persistent sessions
* user accounts
* recording
* chat
* databases
* analytics
* media relay
* authentication beyond the unguessable session token

For restrictive mobile/carrier/NAT environments, adding a TURN server is the main reliability improvement.

````

### `.gitignore`

```gitignore
node_modules/
.env
*.log
.DS_Store
````

One production improvement I’d make next is adding TURN support for networks where STUN-only WebRTC cannot establish a direct peer connection.