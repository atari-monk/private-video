const home = document.getElementById("home");
const session = document.getElementById("session");
const joinForm = document.getElementById("joinForm");
const errorBox = document.getElementById("error");
const statusBox = document.getElementById("status");

function showError(error) {
    errorBox.textContent = error?.message || String(error);
}

function clearError() {
    errorBox.textContent = "";
}

function showSession() {
    home.hidden = true;
    session.hidden = false;
}

function showHome() {
    session.hidden = true;
    home.hidden = false;
}

function showStatus(value) {
    statusBox.textContent = "Connection: " + value;
}

function getToken(value) {
    const input = value.trim();

    if (input.includes("#"))
        return input.split("#").pop().replace(/\/$/, "");

    if (input.includes("/"))
        return input.split("/").filter(Boolean).pop();

    return input;
}

document.getElementById("joinBtn").onclick = () => {
    clearError();
    joinForm.hidden = false;
};

document.querySelectorAll(".fullscreen").forEach(button => {
    button.onclick = async () => {
        const video = document.getElementById(button.dataset.video);

        try {
            if (video.requestFullscreen)
                await video.requestFullscreen();
        } catch (_) { }
    };
});

document.getElementById("micBtn").onclick = () => {
    const enabled = toggleMicrophone();

    document.getElementById("micBtn").textContent =
        enabled
            ? "Mute microphone"
            : "Unmute microphone";
};

document.getElementById("cameraBtn").onclick = () => {
    const enabled = toggleCamera();

    document.getElementById("cameraBtn").textContent =
        enabled
            ? "Disable camera"
            : "Enable camera";
};

async function disconnect() {
    await stopWebRTC(true);
    showHome();
    showStatus("disconnected");
}

document.getElementById("disconnectBtn").onclick = disconnect;

window.addEventListener("beforeunload", () => {
    if (sessionToken && role) {
        navigator.sendBeacon(
            API + "/api/session/" +
            encodeURIComponent(sessionToken) +
            "/leave",
            new Blob(
                [JSON.stringify({ role })],
                { type: "application/json" }
            )
        );
    }

    stopWebRTC(false);
});