const home = document.getElementById("home");
const session = document.getElementById("session");
const joinForm = document.getElementById("joinForm");
const errorBox = document.getElementById("error");
const statusBox = document.getElementById("status");

function showError(error) {
    errorBox.textContent = error.message || String(error);
}

function showSession() {
    home.hidden = true;
    session.hidden = false;
}

function showStatus(value) {
    statusBox.textContent = "Connection: " + value;
}

function showHome() {
    session.hidden = true;
    home.hidden = false;
}

function getToken(value) {
    const input = value.trim();

    if (input.includes("/")) {
        return input.split("/").filter(Boolean).pop();
    }

    return input;
}

document.getElementById("joinBtn").onclick = () => {
    joinForm.hidden = false;
};

document.querySelectorAll(".fullscreen").forEach(button => {
    button.onclick = () => {
        document.getElementById(button.dataset.video).requestFullscreen?.();
    };
});

document.getElementById("micBtn").onclick = () => {
    const enabled = toggleMicrophone();
    document.getElementById("micBtn").textContent =
        enabled ? "Mute microphone" : "Unmute microphone";
};

document.getElementById("cameraBtn").onclick = () => {
    const enabled = toggleCamera();
    document.getElementById("cameraBtn").textContent =
        enabled ? "Disable camera" : "Enable camera";
};

async function disconnect() {
    if (sessionToken && role) {
        await leaveSession(sessionToken, role).catch(() => { });
    }

    stopWebRTC();
    sessionToken = role = null;
    showHome();
    showStatus("Disconnected");
}

document.getElementById("disconnectBtn").onclick = disconnect;