let peer = null;
let localStream = null;
let signalTimer = null;
let statusTimer = null;
let candidateTimer = null;

let signalIndex = 0;
let sessionToken = null;
let role = null;

let pendingCandidates = [];
let offerStarted = false;
let stopping = false;

let onStateChange = () => { };
let onParticipantChange = () => { };

const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

async function loadIceConfig() {
    try {
        const result = await api("/api/ice");

        if (Array.isArray(result.iceServers) && result.iceServers.length)
            rtcConfig.iceServers = result.iceServers;
    } catch (_) {
        // STUN fallback remains available.
    }
}

async function startWebRTC(token, participantRole, stateCallback, participantCallback) {
    sessionToken = token;
    role = participantRole;
    onStateChange = stateCallback || (() => { });
    onParticipantChange = participantCallback || (() => { });

    stopping = false;
    signalIndex = 0;
    offerStarted = false;
    pendingCandidates = [];

    await loadIceConfig();

    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
    } catch (error) {
        throw new Error(
            error.name === "NotAllowedError"
                ? "Camera or microphone permission was denied."
                : "Unable to access the camera or microphone."
        );
    }

    localVideo.srcObject = localStream;

    peer = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    peer.ontrack = event => {
        if (event.streams[0])
            remoteVideo.srcObject = event.streams[0];
    };

    peer.onicecandidate = event => {
        if (!event.candidate) return;

        pendingCandidates.push(event.candidate);

        if (!candidateTimer)
            candidateTimer = setTimeout(flushCandidates, 100);
    };

    peer.oniceconnectionstatechange = () => {
        const state = peer.iceConnectionState;

        if (state === "failed") {
            onStateChange("connection failed");
        } else if (state === "disconnected") {
            onStateChange("connection interrupted");
        } else if (state === "connected" || state === "completed") {
            onStateChange("connected");
        }
    };

    peer.onconnectionstatechange = () => {
        if (!peer) return;

        const state = peer.connectionState;

        if (state === "connected") {
            onStateChange("connected");
        } else if (state === "connecting") {
            onStateChange("connecting");
        } else if (state === "disconnected") {
            onStateChange("participant disconnected");
        } else if (state === "failed") {
            onStateChange("connection failed");
        } else if (state === "closed") {
            onStateChange("disconnected");
        }
    };

    signalTimer = setInterval(receiveSignals, 500);
    statusTimer = setInterval(checkSession, 2000);

    await checkSession();
}

async function checkSession() {
    if (!sessionToken || !role || stopping)
        return;

    try {
        const result = await sessionStatus(sessionToken, role);

        onParticipantChange(result);

        if (
            role === "host" &&
            result.guest &&
            !offerStarted
        ) {
            await createOffer();
        }

        if (!result.exists)
            stopWebRTC();
    } catch (_) {
        onStateChange("signaling unavailable");
    }
}

async function createOffer() {
    if (!peer || offerStarted)
        return;

    offerStarted = true;

    const offer = await peer.createOffer();

    await peer.setLocalDescription(offer);

    await sendSignal(sessionToken, {
        from: role,
        type: "offer",
        data: peer.localDescription
    });
}

async function flushCandidates() {
    candidateTimer = null;

    if (!pendingCandidates.length || !sessionToken || stopping)
        return;

    const candidates = pendingCandidates.splice(0);

    await sendSignal(sessionToken, {
        from: role,
        type: "candidates",
        data: candidates
    }).catch(() => { });
}

async function receiveSignals() {
    if (!sessionToken || !peer || stopping)
        return;

    try {
        const result = await pollSignals(
            sessionToken,
            role,
            signalIndex
        );

        signalIndex = result.next;

        for (const message of result.messages) {
            if (message.type === "offer" && role === "guest") {
                await peer.setRemoteDescription(message.data);

                const answer = await peer.createAnswer();

                await peer.setLocalDescription(answer);

                await sendSignal(sessionToken, {
                    from: role,
                    type: "answer",
                    data: peer.localDescription
                });
            }

            if (message.type === "answer" && role === "host") {
                await peer.setRemoteDescription(message.data);
            }

            if (message.type === "candidates") {
                for (const candidate of message.data || []) {
                    try {
                        await peer.addIceCandidate(candidate);
                    } catch (_) { }
                }
            }
        }
    } catch (_) {
        onStateChange("signaling unavailable");
    }
}

function toggleMicrophone() {
    const track = localStream?.getAudioTracks()[0];

    if (!track)
        return false;

    track.enabled = !track.enabled;
    return track.enabled;
}

function toggleCamera() {
    const track = localStream?.getVideoTracks()[0];

    if (!track)
        return false;

    track.enabled = !track.enabled;
    return track.enabled;
}

async function stopWebRTC(sendLeave = true) {
    if (stopping)
        return;

    stopping = true;

    clearInterval(signalTimer);
    clearInterval(statusTimer);
    clearTimeout(candidateTimer);

    signalTimer = null;
    statusTimer = null;
    candidateTimer = null;

    const token = sessionToken;
    const participantRole = role;

    if (sendLeave && token && participantRole) {
        await leaveSession(token, participantRole).catch(() => { });
    }

    if (peer) {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onconnectionstatechange = null;
        peer.oniceconnectionstatechange = null;
        peer.close();
        peer = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;

    pendingCandidates = [];
    sessionToken = null;
    role = null;
    offerStarted = false;
}