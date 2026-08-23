let peer;
let localStream;
let signalTimer;
let candidateTimer;
let signalIndex = 0;
let sessionToken;
let role;
let pendingCandidates = [];
let onStateChange = () => { };

const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

async function startWebRTC(token, participantRole, stateCallback) {
    sessionToken = token;
    role = participantRole;
    onStateChange = stateCallback;

    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    });

    localVideo.srcObject = localStream;

    peer = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    peer.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peer.onicecandidate = event => {
        if (!event.candidate) return;

        pendingCandidates.push(event.candidate);

        if (!candidateTimer) {
            candidateTimer = setTimeout(flushCandidates, 100);
        }
    };

    peer.onconnectionstatechange = () => {
        const state = peer.connectionState;

        onStateChange(state);

        if (["failed", "disconnected", "closed"].includes(state))
            stopWebRTC();
    };

    signalTimer = setInterval(receiveSignals, 500);

    if (role === "host") {
        const offer = await peer.createOffer();

        await peer.setLocalDescription(offer);

        await sendSignal(sessionToken, {
            from: role,
            type: "offer",
            data: peer.localDescription
        });
    }
}

async function flushCandidates() {
    candidateTimer = null;

    if (!pendingCandidates.length || !sessionToken)
        return;

    const candidates = pendingCandidates.splice(0);

    await sendSignal(sessionToken, {
        from: role,
        type: "candidates",
        data: candidates
    }).catch(() => { });
}

async function receiveSignals() {
    if (!sessionToken || !peer) return;

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
                for (const candidate of message.data) {
                    try {
                        await peer.addIceCandidate(candidate);
                    } catch (_) { }
                }
            }
        }
    } catch (_) {
        onStateChange("failed");
    }
}

function toggleMicrophone() {
    const track = localStream?.getAudioTracks()[0];

    if (track)
        track.enabled = !track.enabled;

    return track?.enabled;
}

function toggleCamera() {
    const track = localStream?.getVideoTracks()[0];

    if (track)
        track.enabled = !track.enabled;

    return track?.enabled;
}

function stopWebRTC() {
    clearInterval(signalTimer);
    clearTimeout(candidateTimer);

    signalTimer = null;
    candidateTimer = null;
    pendingCandidates = [];

    if (peer) {
        peer.close();
        peer = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
}