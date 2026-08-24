const {
    create,
    get,
    join,
    leave,
    signal,
    signals,
    status
} = require("./session");

const ALLOWED_ORIGINS = [
    "http://localhost:8080",
    "https://atari-monk.github.io"
];

const MAX_BODY = 256 * 1024;

const requests = new Map();

const RATE_WINDOW = 60 * 1000;
const RATE_LIMIT = 120;

function cors(request, response) {
    const origin = request.headers.origin;

    if (ALLOWED_ORIGINS.includes(origin)) {
        response.setHeader(
            "Access-Control-Allow-Origin",
            origin
        );
    }

    response.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    response.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,OPTIONS"
    );

    response.setHeader(
        "Vary",
        "Origin"
    );
}

function securityHeaders(response) {
    response.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    response.setHeader(
        "Referrer-Policy",
        "no-referrer"
    );

    response.setHeader(
        "Permissions-Policy",
        "camera=(self), microphone=(self)"
    );

    response.setHeader(
        "Cache-Control",
        "no-store"
    );
}

function json(request, response, status, data) {
    cors(request, response);
    securityHeaders(response);

    response.writeHead(status, {
        "Content-Type": "application/json"
    });

    response.end(
        status === 204
            ? ""
            : JSON.stringify(data)
    );
}

function allowedOrigin(request) {
    const origin = request.headers.origin;

    return !origin || ALLOWED_ORIGINS.includes(origin);
}

function rateLimited(request) {
    const ip =
        request.headers["x-forwarded-for"]?.split(",")[0].trim() ||
        request.socket.remoteAddress ||
        "unknown";

    const now = Date.now();

    let entry = requests.get(ip);

    if (!entry || now - entry.start > RATE_WINDOW) {
        entry = {
            start: now,
            count: 0
        };

        requests.set(ip, entry);
    }

    entry.count++;

    return entry.count > RATE_LIMIT;
}

function body(request) {
    return new Promise((resolve, reject) => {
        let data = "";
        let size = 0;

        request.on("data", chunk => {
            size += chunk.length;

            if (size > MAX_BODY) {
                reject(new Error("Request too large"));
                request.destroy();
                return;
            }

            data += chunk;
        });

        request.on("end", () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            } catch {
                reject(new Error("Invalid JSON"));
            }
        });

        request.on("error", reject);
    });
}

function iceServers() {
    const servers = [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ];

    if (process.env.TURN_URL) {
        servers.push({
            urls: process.env.TURN_URL,
            username: process.env.TURN_USERNAME || "",
            credential: process.env.TURN_PASSWORD || ""
        });
    }

    return servers;
}

async function handle(request, response, url) {
    cors(request, response);
    securityHeaders(response);

    if (!allowedOrigin(request))
        return json(request, response, 403, {
            error: "Origin not allowed"
        });

    if (request.method === "OPTIONS") {
        response.writeHead(204);
        return response.end();
    }

    if (rateLimited(request))
        return json(request, response, 429, {
            error: "Too many requests"
        });

    if (
        request.method === "GET" &&
        url.pathname === "/api/ice"
    ) {
        return json(request, response, 200, {
            iceServers: iceServers()
        });
    }

    if (
        request.method === "POST" &&
        url.pathname === "/api/session"
    ) {
        return json(request, response, 201, {
            token: create()
        });
    }

    const match = url.pathname.match(
        /^\/api\/session\/([^/]+)(?:\/([^/]+))?$/
    );

    if (!match)
        return json(request, response, 404, {
            error: "Not found"
        });

    const id = decodeURIComponent(match[1]);
    const action = match[2];

    if (
        request.method === "POST" &&
        action === "join"
    ) {
        const result = join(id);

        if (result === null)
            return json(request, response, 404, {
                error: "Session not found"
            });

        if (result === false)
            return json(request, response, 409, {
                error: "Session is full"
            });

        return json(request, response, 200, {
            role: "guest"
        });
    }

    if (
        request.method === "GET" &&
        action === "status"
    ) {
        const participantRole =
            url.searchParams.get("role");

        if (
            !["host", "guest"].includes(participantRole)
        ) {
            return json(request, response, 400, {
                error: "Invalid participant"
            });
        }

        const result = status(id, participantRole);

        if (!result)
            return json(request, response, 404, {
                error: "Session not found"
            });

        return json(request, response, 200, result);
    }

    if (
        request.method === "POST" &&
        action === "signal"
    ) {
        try {
            const data = await body(request);

            if (!["host", "guest"].includes(data.from))
                return json(request, response, 400, {
                    error: "Invalid participant"
                });

            if (
                data.type !== "offer" &&
                data.type !== "answer" &&
                data.type !== "candidates"
            ) {
                return json(request, response, 400, {
                    error: "Invalid signal"
                });
            }

            if (
                data.type === "candidates" &&
                !Array.isArray(data.data)
            ) {
                return json(request, response, 400, {
                    error: "Invalid candidates"
                });
            }

            if (
                !signal(id, data.from, {
                    type: data.type,
                    data: data.data
                })
            ) {
                return json(request, response, 404, {
                    error: "Session not found"
                });
            }

            return json(request, response, 204, {});
        } catch {
            return json(request, response, 400, {
                error: "Invalid request"
            });
        }
    }

    if (
        request.method === "POST" &&
        action === "leave"
    ) {
        try {
            const data = await body(request);

            leave(id, data.role);

            return json(request, response, 200, {
                ok: true
            });
        } catch {
            return json(request, response, 400, {
                error: "Invalid request"
            });
        }
    }

    if (
        request.method === "GET" &&
        action === "signals"
    ) {
        const participantRole =
            url.searchParams.get("role");

        const since =
            url.searchParams.get("since") || "0";

        if (
            !["host", "guest"].includes(participantRole)
        ) {
            return json(request, response, 400, {
                error: "Invalid participant"
            });
        }

        const result = signals(
            id,
            participantRole,
            since
        );

        if (!result)
            return json(request, response, 404, {
                error: "Session not found"
            });

        return json(request, response, 200, result);
    }

    if (get(id))
        return json(request, response, 200, {
            ok: true
        });

    return json(request, response, 404, {
        error: "Session not found"
    });
}

module.exports = handle;