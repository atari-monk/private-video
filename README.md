# Private Two-Person Video

A minimal private two-person video application.

It provides:

- private session creation
- unguessable session links
- exactly two participants
- webcam video
- microphone audio
- microphone mute/unmute
- camera enable/disable
- split-screen video
- individual fullscreen controls
- WebRTC peer-to-peer media
- STUN
- optional TURN
- participant disconnect detection
- session expiration
- no accounts
- no recording
- no media storage

## Architecture

The application has three parts:

```text
GitHub Pages
     |
     | HTTPS
     v
Frontend
     |
     | HTTPS / signaling
     v
Node.js signaling server
     |
     | SDP + ICE only
     |
     v
Browser A <====== WebRTC ======> Browser B
                    |
                  STUN
                    |
              optional TURN
```

The signaling server never receives WebRTC audio or video.

WebRTC media is encrypted by the browser.

## Project structure

```text
private-video/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── signaling.js
│       ├── ui.js
│       └── webrtc.js
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── signaling.js
│       └── session.js
├── config/
│   └── .env.example
├── scripts/
│   └── dev.sh
├── README.md
└── .gitignore
```

## Requirements

Local development requires:

* Node.js 18+
* Python 3

Production requires:

* HTTPS
* a publicly reachable signaling server
* a domain for the signaling server
* TURN recommended
* a TLS reverse proxy

No npm dependencies are required.

## Local development

Make the script executable:

```bash
chmod +x scripts/dev.sh
```

Start the application:

```bash
./scripts/dev.sh
```

Open:

```text
http://localhost:8080
```

Create a session.

Copy the generated session link.

Open the link in another browser.

For example:

```text
Firefox <-> Chrome
```

The local server is:

```text
Frontend:
http://localhost:8080

Signaling:
http://localhost:3000
```

## Important local development detail

Camera and microphone access are permitted by modern browsers on localhost.

For production, the frontend must be HTTPS.

The signaling endpoint must also be HTTPS.

## Configuration

Copy:

```text
config/.env.example
```

to your deployment environment.

The application uses:

```text
PORT
FRONTEND_ORIGIN
TURN_URL
TURN_USERNAME
TURN_PASSWORD
```

Do not commit production TURN credentials.

## Session security

Session IDs are generated with:

```javascript
crypto.randomBytes(32)
```

They contain 256 bits of randomness.

A session URL therefore acts as the private capability for entering the room.

There are no user accounts.

Do not expose session URLs publicly.

Anyone who obtains a session URL can attempt to join that session.

## Two participants only

Every session contains:

```text
host
guest
```

A live guest occupies the second participant slot.

A third participant receives:

```text
Session is full
```

If a participant disappears, the server detects the missing heartbeat and frees that participant slot.

## Session expiration

Sessions are kept in memory.

They expire after inactivity.

The current defaults are:

```text
Participant timeout:
15 seconds

Session maximum inactivity:
30 minutes
```

The application does not persist sessions to disk.

Restarting the signaling server destroys all active sessions.

This is intentional.

## Signaling

The signaling server transports only:

```text
SDP offer
SDP answer
ICE candidates
```

ICE candidates are batched.

The browser polls signaling every 500 ms.

For a two-person application this is lightweight enough and avoids adding a WebSocket dependency.

The server does not relay media.

## WebRTC

The application uses:

```text
RTCPeerConnection
getUserMedia
MediaStream
```

No WebRTC library is required.

The browser encrypts WebRTC media using the WebRTC security mechanisms.

## STUN

The default configuration uses:

```text
stun:stun.l.google.com:19302
```

STUN helps peers discover public network addresses.

STUN alone does not guarantee connectivity.

## TURN

TURN is strongly recommended for production.

Some networks prevent direct peer-to-peer connections.

Examples include:

* restrictive corporate networks
* carrier-grade NAT
* some mobile networks
* restrictive firewalls
* symmetric NAT

A TURN server provides a fallback media relay.

The TURN server is separate from the signaling server.

A common open-source TURN implementation is coturn.

Example environment:

```text
TURN_URL=turn:turn.example.com:3478
TURN_USERNAME=private-video
TURN_PASSWORD=strong-secret
```

For TLS TURN:

```text
TURN_URL=turns:turn.example.com:5349
```

The exact TURN configuration depends on the deployment.

## Production frontend

The frontend can be deployed to GitHub Pages.

For example:

```text
https://username.github.io/private-video/
```

Update:

```javascript
window.SIGNALING_URL = "http://localhost:3000";
```

in:

```text
frontend/index.html
```

to the production signaling URL:

```javascript
window.SIGNALING_URL = "https://signal.example.com";
```

Do not use HTTP in production.

Use HTTPS.

## GitHub Pages

Publish the contents of:

```text
frontend/
```

as the static site.

The frontend has no build step.

No npm installation is required for the frontend.

## Production signaling server

Run:

```bash
cd backend
node src/server.js
```

Example:

```text
PORT=3000
FRONTEND_ORIGIN=https://username.github.io
```

The Node server should not normally be exposed directly to the Internet.

Put it behind a TLS reverse proxy.

Example architecture:

```text
Internet
   |
   v
HTTPS reverse proxy
   |
   v
127.0.0.1:3000
   |
   v
Node signaling server
```

## HTTPS

Production should use:

```text
https://video.example.com
https://signal.example.com
```

The frontend uses:

```text
https://signal.example.com
```

for signaling.

Do not deploy the signaling URL as:

```text
http://signal.example.com
```

Camera and microphone access require a secure context.

## Reverse proxy

A reverse proxy such as Caddy or nginx can provide:

* TLS certificates
* HTTPS
* HTTP to HTTPS redirects
* connection limits
* access logging
* process isolation

The signaling server can listen only on localhost.

For example:

```text
127.0.0.1:3000
```

while the public proxy listens on:

```text
443
```

## CORS

The server does not use wildcard CORS in production.

Configure:

```text
FRONTEND_ORIGIN=https://username.github.io
```

The server accepts requests only from that origin.

For a custom domain:

```text
FRONTEND_ORIGIN=https://video.example.com
```

## Rate limiting

The signaling server has a simple in-memory IP rate limiter.

It limits requests per minute.

This protects the small service from basic accidental or automated abuse.

For a multi-instance deployment, use a reverse-proxy or shared rate limiter instead.

## Request limits

Signaling request bodies are limited to 256 KB.

The application accepts only:

```text
offer
answer
candidates
```

signal types.

Unknown signal types are rejected.

## Logging

Production does not log SDP or ICE data.

This is intentional.

SDP and ICE data can reveal network information.

Only server errors should normally be logged.

## Privacy

The application does not:

* record video
* record audio
* store video
* store audio
* create user accounts
* require passwords
* store sessions permanently
* store conversations

The signaling server temporarily stores signaling messages in RAM.

Those messages disappear when consumed/session expires/server restarts.

## Participant lifecycle

Host:

```text
create
  |
waiting
  |
guest joins
  |
offer
  |
connected
```

Guest:

```text
join
  |
receive offer
  |
answer
  |
connected
```

Both participants periodically contact the signaling server.

If a participant disappears, the server eventually marks that participant as disconnected.

## Disconnect behavior

When the user presses:

```text
Disconnect
```

the application:

1. tells the signaling server
2. closes RTCPeerConnection
3. stops camera tracks
4. stops microphone tracks
5. clears video streams
6. clears signaling timers
7. returns to the home screen

The application also attempts cleanup when the page is closed.

## Camera and microphone

The browser controls permission.

The application requests:

```text
camera: true
microphone: true
```

If permission is denied, the application shows an error.

The application does not attempt to bypass browser permissions.

## Mobile

The layout switches to one video per row on small screens.

Both videos use:

```text
playsinline
```

to avoid unwanted mobile fullscreen behavior.

## Fullscreen

Each video has an independent fullscreen button.

F11 remains browser/operating-system fullscreen behavior.

## Browser support

The target browsers are modern browsers supporting:

```text
WebRTC
getUserMedia
RTCPeerConnection
Fullscreen API
```

Test at least:

```text
Chrome
Firefox
Safari
mobile Chrome
mobile Safari
```

## Production test matrix

Before deployment test:

```text
Chrome <-> Chrome
Chrome <-> Firefox
Firefox <-> Firefox
Safari <-> Chrome

desktop <-> desktop
desktop <-> mobile
mobile <-> mobile

Wi-Fi <-> Wi-Fi
Wi-Fi <-> mobile data
different physical networks

camera permission granted
camera permission denied

microphone permission granted
microphone permission denied

participant refreshes
participant closes tab
participant presses Disconnect

third participant attempts to join
invalid session link
expired session

signaling server restart
TURN unavailable
STUN unavailable
```

## TURN testing

Do not consider the service fully production-ready until it has been tested with TURN.

A successful local:

```text
Firefox <-> Chrome
```

test only proves that the current network allows direct WebRTC connectivity.

It does not prove connectivity on restrictive networks.

## Deployment recommendation

Recommended production setup:

```text
GitHub Pages
    |
    | HTTPS
    v
Static frontend

signal.example.com
    |
    | HTTPS
    v
Caddy/nginx
    |
    | localhost
    v
Node.js signaling

turn.example.com
    |
    | TURN/TURNS
    v
coturn
```

## Scaling

The application is intentionally designed for a small deployment.

The in-memory session store means:

```text
one signaling process
```

should be used unless session storage is moved to a shared service.

Do not put multiple Node signaling instances behind a load balancer without shared session state or sticky routing.

For the intended two-person private application, a single signaling instance is sufficient.

## Security model

Security depends on several layers:

```text
unguessable session token
+
HTTPS
+
restricted CORS
+
WebRTC encryption
+
TURN credentials
+
rate limiting
+
short-lived sessions
+
no media storage
```

The session token is not a user identity.

It is a secret capability.

Anyone with the complete session link can attempt to join.

## What the signaling server can see

The signaling server can see:

* IP address
* session token
* connection timing
* SDP
* ICE candidates
* participant role
* signaling requests

It does not receive the actual WebRTC media when peers connect directly.

A TURN server is different: when TURN relay is used, encrypted WebRTC packets pass through the TURN server.

The TURN server still cannot read the WebRTC media payload.

## Production checklist

Before public deployment:

* [ ] Deploy frontend over HTTPS
* [ ] Deploy signaling over HTTPS
* [ ] Configure exact FRONTEND_ORIGIN
* [ ] Configure TURN
* [ ] Use strong TURN credentials
* [ ] Test Chrome/Firefox
* [ ] Test mobile
* [ ] Test different networks
* [ ] Test participant disconnect
* [ ] Test third participant
* [ ] Test session expiration
* [ ] Test signaling restart
* [ ] Verify camera cleanup
* [ ] Verify microphone cleanup
* [ ] Verify no media is stored
* [ ] Verify no SDP/ICE logging
* [ ] Enable reverse-proxy TLS
* [ ] Keep production credentials out of Git

## `.gitignore`

```gitignore
node_modules/
.env
*.log
.DS_Store
npm-debug.log*
````

### One important production change before deployment

There is one thing I would **not** hard-code permanently: the TURN server credentials. Put those into the backend environment, as shown above, and configure your TURN server separately.

The resulting production setup is still very small:

```text
GitHub Pages
      │
      │ HTTPS
      ▼
 frontend
      │
      │ HTTPS signaling
      ▼
 Node.js
      │
      │ ICE
      ▼
 STUN ────── direct WebRTC ────── Browser
      │
      └────── TURN fallback ───── Browser
```

The current version is suitable as the production baseline, but **TURN + HTTPS/WSS deployment and real-world network testing are the remaining infrastructure steps**, not frontend code changes.