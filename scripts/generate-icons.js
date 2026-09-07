import fs from 'fs';
import path from 'path';
import { renderAsync } from '@resvg/resvg-js';

async function generate() {
  const svgPath = path.join(process.cwd(), 'public', 'logo.svg');
  const svgBuffer = fs.readFileSync(svgPath);

  const tauriIconsDir = path.join(process.cwd(), 'src-tauri', 'icons');
  if (!fs.existsSync(tauriIconsDir)) {
    fs.mkdirSync(tauriIconsDir, { recursive: true });
  }

  const sizes = [512, 256, 192, 128, 64, 32, 16];

  for (const size of sizes) {
    const resvg = await renderAsync(svgBuffer, {
      fitTo: {
        mode: 'width',
        value: size,
      },
    });

    const pngBuffer = resvg.asPng();
    const publicPath = path.join(process.cwd(), 'public', `logo-${size}x${size}.png`);
    fs.writeFileSync(publicPath, pngBuffer);

    if (size === 512) {
      fs.writeFileSync(path.join(tauriIconsDir, 'icon.png'), pngBuffer);
      fs.writeFileSync(path.join(tauriIconsDir, '512x512.png'), pngBuffer);
    } else if (size === 256) {
      fs.writeFileSync(path.join(tauriIconsDir, '128x128@2x.png'), pngBuffer);
      fs.writeFileSync(path.join(tauriIconsDir, 'icon.ico'), pngBuffer);
      fs.writeFileSync(path.join(tauriIconsDir, 'icon.icns'), pngBuffer);
    } else if (size === 128) {
      fs.writeFileSync(path.join(tauriIconsDir, '128x128.png'), pngBuffer);
    } else if (size === 32) {
      fs.writeFileSync(path.join(tauriIconsDir, '32x32.png'), pngBuffer);
    }
    console.log(`Generated: ${publicPath} (${size}x${size})`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
