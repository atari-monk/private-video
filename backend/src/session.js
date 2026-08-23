const crypto = require("crypto");

const sessions = new Map();

const SESSION_MAX_AGE = 30 * 60 * 1000;
const PARTICIPANT_TIMEOUT = 15 * 1000;
const MAX_MESSAGES = 100;

function token() {
    return crypto.randomBytes(32).toString("base64url");
}

function create() {
    const id = token();
    const now = Date.now();

    sessions.set(id, {
        created: now,
        active: now,
        participants: {
            host: now,
            guest: 0
        },
        messages: []
    });

    return id;
}

function get(id) {
    const session = sessions.get(id);

    if (!session)
        return null;

    const now = Date.now();

    if (now - session.active > SESSION_MAX_AGE) {
        sessions.delete(id);
        return null;
    }

    return session;
}

function touch(session, role) {
    const now = Date.now();

    session.active = now;

    if (role === "host" || role === "guest")
        session.participants[role] = now;
}

function participantAlive(session, role) {
    const lastSeen = session.participants[role];

    return (
        !!lastSeen &&
        Date.now() - lastSeen <= PARTICIPANT_TIMEOUT
    );
}

function join(id) {
    const session = get(id);

    if (!session)
        return null;

    if (participantAlive(session, "guest"))
        return false;

    session.participants.guest = Date.now();
    session.active = Date.now();

    return session;
}

function status(id, role) {
    const session = get(id);

    if (!session)
        return null;

    touch(session, role);

    const host = participantAlive(session, "host");
    const guest = participantAlive(session, "guest");

    if (!host && !guest) {
        sessions.delete(id);
        return null;
    }

    return {
        exists: true,
        host,
        guest
    };
}

function leave(id, role) {
    const session = sessions.get(id);

    if (!session)
        return;

    if (role === "host" || role === "guest")
        session.participants[role] = 0;

    if (
        !participantAlive(session, "host") &&
        !participantAlive(session, "guest")
    ) {
        sessions.delete(id);
    }
}

function signal(id, from, message) {
    const session = get(id);

    if (!session)
        return false;

    if (!["host", "guest"].includes(from))
        return false;

    if (!participantAlive(session, from))
        return false;

    if (!message || !message.type)
        return false;

    if (session.messages.length >= MAX_MESSAGES)
        session.messages.splice(
            0,
            Math.floor(MAX_MESSAGES / 2)
        );

    session.messages.push({
        to: from === "host" ? "guest" : "host",
        type: message.type,
        data: message.data
    });

    touch(session, from);

    return true;
}

function signals(id, role, since) {
    const session = get(id);

    if (!session)
        return null;

    if (!["host", "guest"].includes(role))
        return null;

    touch(session, role);

    const start = Math.max(
        0,
        Math.min(
            Number.parseInt(since, 10) || 0,
            session.messages.length
        )
    );

    return {
        messages: session.messages
            .slice(start)
            .filter(message => message.to === role),
        next: session.messages.length
    };
}

setInterval(() => {
    const now = Date.now();

    for (const [id, session] of sessions) {
        const hostAlive =
            now - session.participants.host <= PARTICIPANT_TIMEOUT;

        const guestAlive =
            now - session.participants.guest <= PARTICIPANT_TIMEOUT;

        if (
            now - session.active > SESSION_MAX_AGE ||
            (!hostAlive && !guestAlive)
        ) {
            sessions.delete(id);
        }
    }
}, 5000).unref();

module.exports = {
    create,
    get,
    join,
    leave,
    signal,
    signals,
    status
};