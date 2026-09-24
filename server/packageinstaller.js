const PACKAGE_NAME = [


  
    "packageinstaller.js",


// You can add more files here, for example:
//    "myfile1.zip",
//    "myfile2.zip",

];

const PORT = 1000; // Your wish



const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");



function formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;

    while (bytes >= 1024 && i < units.length - 1) {
        bytes /= 1024;
        i++;
    }

    return `${bytes.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[c]);
}

function getFilePath(fileName) {
    return path.join(__dirname, fileName);
}

function getFileSize(fileName) {
    try {
        return formatSize(fs.statSync(getFilePath(fileName)).size);
    } catch {
        return "file not found";
    }
}

function getLocalIP() {
    const nets = os.networkInterfaces();

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }

    return null;
}

function log(method, url, status) {
    const time = new Date().toLocaleTimeString();

    console.log(
        `  ${time}  |  ${method.padEnd(6)} |  ${String(status).padEnd(4)} |  ${url}`
    );
}

// ---------- page ----------

function renderPage() {
    let fileRows = "";

    for (const fileName of PACKAGE_NAME) {
        const name = escapeHtml(fileName);
        const size = getFileSize(fileName);
        const downloadURL = `/download?file=${encodeURIComponent(fileName)}`;

        fileRows += `
            <tr>
                <td>${name}</td>
                <td>${size}</td>
                <td>
                    <a class="btn" href="${downloadURL}">
                        Download
                    </a>
                </td>
            </tr>
        `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Download</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 40px 16px;
            background: #111;
            color: #eee;
            font-family: Arial, Helvetica, sans-serif;
        }

        .container {
            max-width: 560px;
            margin: 0 auto;
            background: #1c1c1c;
            border: 2px solid #eee;
        }

        h1 {
            margin: 0;
            padding: 16px 20px;
            background: #eee;
            color: #111;
            font-size: 18px;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th,
        td {
            padding: 12px 20px;
            text-align: left;
            border-bottom: 1px solid #555;
        }

        th {
            background: #2a2a2a;
            color: #aaa;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        tr:last-child td {
            border-bottom: none;
        }

        .btn {
            display: inline-block;
            padding: 6px 14px;
            background: #eee;
            color: #111;
            text-decoration: none;
            border: 2px solid #eee;
            font-size: 14px;
        }

        .btn:hover {
            background: #1c1c1c;
            color: #eee;
        }
    </style>
</head>

<body>

    <div class="container">

        <h1>download</h1>

        <table>
            <tr>
                <th>File</th>
                <th>Size</th>
                <th>Action</th>
            </tr>

            ${fileRows}

        </table>

    </div>

</body>
</html>`;
}


// ---------- server ----------

const server = http.createServer((req, res) => {

    // Homepage
    if (req.url === "/") {

        res.writeHead(200, {
            "Content-Type": "text/html"
        });

        res.end(renderPage());

        log(req.method, req.url, 200);

        return;
    }

    // Download
    if (req.url.startsWith("/download")) {

        const url = new URL(req.url, `http://localhost:${PORT}`);
        const fileName = url.searchParams.get("file");

        // Make sure a file was specified
        if (!fileName) {
            res.writeHead(400);
            res.end("No file specified");

            log(req.method, req.url, 400);

            return;
        }

        // Only allow files listed in PACKAGE_NAME
        if (!PACKAGE_NAME.includes(fileName)) {
            res.writeHead(404);
            res.end("File not found");

            log(req.method, req.url, 404);

            return;
        }

        const filePath = getFilePath(fileName);

        // Check if file actually exists
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end("File not found");

            log(req.method, req.url, 404);

            return;
        }

        res.writeHead(200, {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${fileName}"`,
        });

        fs.createReadStream(filePath).pipe(res);

        log(req.method, req.url, 200);

        return;
    }

    // Anything else
    res.writeHead(404);
    res.end("Not Found");

    log(req.method, req.url, 404);
});

// ---------- startup ----------

server.listen(PORT, () => {

    const localIP = getLocalIP();

    const rows = [
        ["Status", "ONLINE"],
        ["Packages", String(PACKAGE_NAME.length)],
        ["Port", String(PORT)],
        ["Local", `http://localhost:${PORT}`],
    ];

    if (localIP) {
        rows.push([
            "Network",
            `http://${localIP}:${PORT}`
        ]);
    }

    const labelW = Math.max(
        ...rows.map((r) => r[0].length)
    );

    const valueW = Math.max(
        ...rows.map((r) => r[1].length),
        28
    );

    const line = (l, m, r) =>
        l +
        "─".repeat(labelW + 2) +
        m +
        "─".repeat(valueW + 2) +
        r;

    const title = " DOWNLOAD SERVER ";

    const totalW = labelW + valueW + 7;

    const pad = Math.floor(
        (totalW - 2 - title.length) / 2
    );

    console.log("");

    console.log(
        "┌" +
        "─".repeat(totalW - 2) +
        "┐"
    );

    console.log(
        "│" +
        " ".repeat(pad) +
        title +
        " ".repeat(
            totalW - 2 - pad - title.length
        ) +
        "│"
    );

    console.log(
        line("├", "┬", "┤")
    );

    rows.forEach(([k, v], i) => {

        console.log(
            `│ ${k.padEnd(labelW)} │ ${v.padEnd(valueW)} │`
        );

        if (i < rows.length - 1) {
            console.log(
                line("├", "┼", "┤")
            );
        }
    });

    console.log(
        line("└", "┴", "┘")
    );

    console.log("");

    console.log("  AVAILABLE PACKAGES");

    console.log(
        "  " + "─".repeat(totalW - 4)
    );

    PACKAGE_NAME.forEach((fileName) => {

        const exists = fs.existsSync(
            getFilePath(fileName)
        );

        console.log(
            `  ${exists ? "✓" : "✗"} ${fileName}  (${getFileSize(fileName)})`
        );
    });

    console.log("");

    console.log(
        "  TIME      |  METHOD |  CODE |  URL"
    );

    console.log(
        "  " + "─".repeat(totalW - 4)
    );
});
