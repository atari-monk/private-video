## Private Two-Person Video

Simple private web app for sharing webcam video and microphone audio between two people over the internet.

### Connection

* Create a private session
* Generate a unique session link
* Join using the session link
* Allow exactly two participants
* Show connection status

### Media

* Request camera and microphone access
* Send webcam video
* Send microphone audio
* Mute/unmute microphone
* Enable/disable camera

### Video Display

* Show both cameras in a split screen
* F11 turns fullscreen
* Add btns to allow full screen for each of them separatly
* Support desktop and mobile layouts

### Privacy & Security

* Use encrypted WebRTC media
* Do not record or store video or audio
* Do not require user accounts
* Use unguessable session links
* Use HTTPS
* Keep sessions private

### Signaling

* Exchange WebRTC connection information
* Use a lightweight signaling service
* Do not relay video or audio through the signaling server
* Expire inactive sessions
* Handle failed connections

### User Interface

* Create session button
* Join session button
* Session link sharing
* Camera control
* Microphone control
* Disconnect button
* Clear permission and connection errors

### Deployment

* Host frontend on GitHub Pages
* Use a separate signaling backend
* Use WebRTC for peer-to-peer media
* Provide local development setup
* Provide deployment configuration

### Reliability

* Use STUN for peer discovery
* Support common home and mobile networks
* Detect connection failures
* Detect participant disconnects
* End sessions cleanly
* Release camera and microphone resources when finished

### Stack

* Use HTML/CSS/JavaScript
* No frameworks
* No libs unles they define base tech