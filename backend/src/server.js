const http = require("http");
const { URL } = require("url");
const signaling = require("./signaling");

const port = Number(process.env.PORT || 3000);

const server = http.createServer(
    async (request, response) => {
        try {
            const url = new URL(
                request.url,
                `http://${request.headers.host || "localhost"}`
            );

            await signaling(
                request,
                response,
                url
            );
        } catch (error) {
            console.error(error);

            if (!response.headersSent) {
                response.writeHead(500, {
                    "Content-Type": "application/json"
                });
            }

            response.end(
                JSON.stringify({
                    error: "Internal server error"
                })
            );
        }
    }
);

server.requestTimeout = 10_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

server.listen(port, () => {
    console.log(
        `Signaling server listening on port ${port}`
    );
});