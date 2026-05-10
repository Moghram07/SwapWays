import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const text = fs.readFileSync(
  path.join(__dirname, "../src/utils/airportNames.ts"),
  "utf8"
);
const re = /^\s+([A-Z0-9]+):\s*\{\s*city:\s*"([^"]+)"/gm;
const missing = [];
let total = 0;
let m;
while ((m = re.exec(text)) !== null) {
  total++;
  const code = m[1];
  const city = m[2];
  if (city === code) missing.push(code);
}
const outPath = path.join(__dirname, "placeholder-airport-codes.txt");
fs.writeFileSync(outPath, missing.join("\n") + "\n", "utf8");
console.log(JSON.stringify({ totalEntries: total, withRealCity: total - missing.length, placeholderCityEqualsCode: missing.length, writtenTo: outPath }, null, 2));
