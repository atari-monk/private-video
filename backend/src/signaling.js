const {
    create,
    get,
    join,
    leave,
    signal,
    signals
} = require("./session");

function cors(response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function json(response, status, data) {
    cors(response);
    response.writeHead(status, {
        "Content-Type": "application/json"
    });
    response.end(status === 204 ? "" : JSON.stringify(data));
}

function body(request) {
    return new Promise((resolve, reject) => {
        let data = "";

        request.on("data", chunk => data += chunk);
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

async function handle(request, response, url) {
    cors(response);

    if (request.method === "OPTIONS") {
        response.writeHead(204);
        return response.end();
    }

    if (request.method === "POST" && url.pathname === "/api/session") {
        return json(response, 201, { token: create() });
    }

    const match = url.pathname.match(
        /^\/api\/session\/([^/]+)(?:\/([^/]+))?$/
    );

    if (!match)
        return json(response, 404, { error: "Not found" });

    const id = decodeURIComponent(match[1]);
    const action = match[2];

    if (request.method === "POST" && action === "join") {
        const result = join(id);

        if (result === null)
            return json(response, 404, { error: "Session not found" });

        if (result === false)
            return json(response, 409, { error: "Session is full" });

        return json(response, 200, { role: "guest" });
    }

    if (request.method === "POST" && action === "signal") {
        try {
            const data = await body(request);

            if (!["host", "guest"].includes(data.from))
                return json(response, 400, { error: "Invalid participant" });

            if (!signal(id, data.from, {
                type: data.type,
                data: data.data
            })) {
                return json(response, 404, { error: "Session not found" });
            }

            return json(response, 204, {});
        } catch {
            return json(response, 400, { error: "Invalid request" });
        }
    }

    if (request.method === "POST" && action === "leave") {
        try {
            const data = await body(request);

            leave(id, data.role);

            return json(response, 200, { ok: true });
        } catch {
            return json(response, 400, { error: "Invalid request" });
        }
    }

    if (request.method === "GET" && action === "signals") {
        const participantRole = url.searchParams.get("role");
        const since = url.searchParams.get("since") || "0";

        if (!["host", "guest"].includes(participantRole))
            return json(response, 400, { error: "Invalid participant" });

        const result = signals(id, participantRole, since);

        if (!result)
            return json(response, 404, { error: "Session not found" });

        return json(response, 200, result);
    }

    if (get(id))
        return json(response, 200, { ok: true });

    return json(response, 404, { error: "Session not found" });
}

module.exports = handle;