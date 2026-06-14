const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const root = path.join(__dirname, "..");
const port = Number(process.env.PORT) || 4173;
const host = "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function runStep(label, fn) {
  process.stdout.write(`${label}... `);
  fn();
  console.log("OK");
}

function openBrowser(url) {
  const platform = process.platform;
  if (platform === "win32") {
    exec(`start "" "${url}"`, { shell: true });
    return;
  }

  if (platform === "darwin") {
    exec(`open "${url}"`);
    return;
  }

  exec(`xdg-open "${url}"`);
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("404 Not Found");
      return;
    }

    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    response.end(data);
  });
}

runStep("Logic check", () => {
  require("./validate-wallpaper-logic.js");
});

runStep("Deploy info", () => {
  require("./write-deploy-info.js");
});

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("403 Forbidden");
    return;
  }

  sendFile(response, filePath);
});

server.listen(port, host, () => {
  const previewUrl = `http://${host}:${port}/index.html?debug=1`;
  console.log("");
  console.log("Preview local:");
  console.log(`  ${previewUrl}`);
  console.log("");
  console.log("Trong Console (F12):");
  console.log("  WC26_SELF_CHECK.run(true)");
  console.log("  WC26_SELF_CHECK.getHistory()");
  console.log("");
  console.log("Nhan Ctrl+C de dung server.");
  openBrowser(previewUrl);
});
