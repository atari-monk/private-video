const API = window.SIGNALING_URL.replace(/\/$/, "");

async function api(path, options = {}) {
    const response = await fetch(API + path, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok)
        throw new Error(data.error || "Signaling error");

    return data;
}

async function createSession() {
    return api("/api/session", {
        method: "POST"
    });
}

async function joinSession(token) {
    return api(
        "/api/session/" + encodeURIComponent(token) + "/join",
        { method: "POST" }
    );
}

async function sessionStatus(token, role) {
    return api(
        "/api/session/" +
        encodeURIComponent(token) +
        "/status?role=" +
        encodeURIComponent(role)
    );
}

async function sendSignal(token, message) {
    return api(
        "/api/session/" + encodeURIComponent(token) + "/signal",
        {
            method: "POST",
            body: JSON.stringify(message)
        }
    );
}

async function pollSignals(token, role, since) {
    return api(
        "/api/session/" +
        encodeURIComponent(token) +
        "/signals?role=" +
        encodeURIComponent(role) +
        "&since=" +
        encodeURIComponent(since)
    );
}

async function leaveSession(token, role) {
    return api(
        "/api/session/" + encodeURIComponent(token) + "/leave",
        {
            method: "POST",
            body: JSON.stringify({ role }),
            keepalive: true
        }
    );
}