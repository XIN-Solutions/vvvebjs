/**
 * Barebones Express proxy:
 *  - By default proxies to http://localhost:9001
 *  - Override by setting REMOTE_BASE in the environment
 *
 * Usage:
 *   REMOTE_BASE="https://api.example.com" node proxy.js
 */

const express = require("express");
const path = require("path");
const { Readable } = require("stream");

const app = express();
const PORT = 9000;

// The base URL to which we forward requests
const REMOTE_BASE = process.env.REMOTE_BASE || "http://localhost:9001";

// Mount our proxy on /proxy (feel free to change or make it configurable)
app.use("/proxy", async (req, res) => {
    try {
        // Build the full remote URL:
        // req.url is just the path *after* /proxy
        const remoteUrl = REMOTE_BASE + req.url;

        // Forward the request via fetch
        // If you need to forward the request body for POST/PUT/PATCH:
        // 1) Include 'app.use(express.raw({ type: "*/*" }))' or other middleware as needed
        // 2) Pass the body to fetch: (method: req.method, headers: req.headers, body: req.body)
        // For a truly streaming approach, you'd use lower-level Node http modules or a library.
        const remoteResponse = await fetch(remoteUrl, {
            method: req.method,
            headers: req.headers
        });

        // Copy remote headers to our response
        for (const [header, value] of remoteResponse.headers.entries()) {
            res.setHeader(header, value);
        }

        // Set status code to match remote
        res.status(remoteResponse.status);

        // remoteResponse.body is a Web stream
        // Convert it to a Node.js stream before piping
        const webStream = remoteResponse.body;
        if (webStream) {
            const nodeStream = Readable.fromWeb(webStream);
            nodeStream.pipe(res);
        }
        else {
            res.end();
        }
    } catch (error) {
        console.error("Proxy error:", error);
        res.sendStatus(500);
    }
});

// Serve local files for all other routes not matching /proxy.
// The wildcard route will attempt to serve a matching file from the current directory
app.get("*", (req, res) => {
    if (req.path.indexOf("..") !== -1) {
        res.status(404).send("File not found");
        return;
    }

    const filePath = path.join(__dirname, req.path);
    res.sendFile(filePath, (err) => {
        if (err) {
            // If file not found or other error, respond with 404 or pass it along
            res.status(404).send("File not found");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Proxy listening on port ${PORT}`);
    console.log(`Forwarding to: ${REMOTE_BASE}`);
});
