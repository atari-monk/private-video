const http = require("http");
const { URL } = require("url");
const signaling = require("./signaling");

const port = Number(process.env.PORT || 3000);

http.createServer((request, response) => {
    const url = new URL(
        request.url,
        `http://${request.headers.host || "localhost"}`
    );

    signaling(request, response, url);
}).listen(port, () => {
    console.log(`Signaling server listening on port ${port}`);
});