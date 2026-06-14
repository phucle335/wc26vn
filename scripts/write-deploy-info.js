const fs = require("fs");
const path = require("path");

const payload = {
  updatedAt: new Date().toISOString(),
  source: "vercel"
};

const output = `window.WC26_DEPLOY = ${JSON.stringify(payload, null, 2)};\n`;
const target = path.join(__dirname, "..", "deploy-info.js");

fs.writeFileSync(target, output, "utf8");
console.log(`Wrote ${target}`);
