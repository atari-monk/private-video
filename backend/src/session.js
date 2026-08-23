const crypto = require("crypto");

const sessions = new Map();
const MAX_AGE = 30 * 60 * 1000;

function token() {
    return crypto.randomBytes(32).toString("base64url");
}

function create() {
    const id = token();

    sessions.set(id, {
        created: Date.now(),
        active: Date.now(),
        participants: new Set(["host"]),
        messages: []
    });

    return id;
}

function get(id) {
    const session = sessions.get(id);

    if (!session) return null;

    if (Date.now() - session.active > MAX_AGE) {
        sessions.delete(id);
        return null;
    }

    session.active = Date.now();
    return session;
}

function join(id) {
    const session = get(id);

    if (!session) return null;
    if (session.participants.has("guest")) return false;

    session.participants.add("guest");
    return session;
}

function leave(id, role) {
    const session = sessions.get(id);

    if (!session) return;

    session.participants.delete(role);

    if (!session.participants.size)
        sessions.delete(id);
}

function signal(id, from, message) {
    const session = get(id);

    if (!session || !session.participants.has(from))
        return false;

    session.messages.push({
        to: from === "host" ? "guest" : "host",
        ...message
    });

    return true;
}

function signals(id, role, since) {
    const session = get(id);

    if (!session) return null;

    const start = Number(since) || 0;

    return {
        messages: session.messages
            .slice(start)
            .filter(message => message.to === role),
        next: session.messages.length
    };
}

setInterval(() => {
    for (const [id, session] of sessions) {
        if (Date.now() - session.active > MAX_AGE)
            sessions.delete(id);
    }
}, 60_000);

module.exports = {
    create,
    get,
    join,
    leave,
    signal,
    signals
};