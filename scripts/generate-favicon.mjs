import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.join(root, "public", "images", "swapways-logo.png");
/** Next.js serves these from `app/` — avoid duplicate public/ favicon (confuses browsers + SW cache). */
const outIco = path.join(root, "src", "app", "favicon.ico");
const outApple = path.join(root, "src", "app", "apple-icon.png");

const APPLE_PX = 512;
/** ICO embeds these sizes so the file stays small and crisp at 16–32px in tabs. */
const ICO_SIZES = [16, 32, 48, 64];

async function squarePng(size) {
  return sharp(input)
    .resize(size, size, {
      fit: "contain",
      // Transparent letterboxing — wide logo in a square tab icon; white looked like top/bottom bars.
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  fs.mkdirSync(path.dirname(outIco), { recursive: true });

  const appleBuf = await squarePng(APPLE_PX);
  fs.writeFileSync(outApple, appleBuf);

  const icoFrames = await Promise.all(ICO_SIZES.map((s) => squarePng(s)));
  const ico = await pngToIco(icoFrames);
  fs.writeFileSync(outIco, ico);
  console.log("Wrote", outIco, outApple, `(${ico.length} bytes ico)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
