import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';

async function main() {
  const logoSvg = fs.readFileSync('public/logo.svg', 'utf8');
  const bannerSvg = fs.readFileSync('public/banner-220x140.svg', 'utf8');

  const renderLogo = (size) => {
    const resvg = new Resvg(logoSvg, {
      fitTo: { mode: 'width', value: size },
    });
    const pngData = resvg.render().asPng();
    fs.writeFileSync(`public/logo-${size}x${size}.png`, pngData);
  };

  [16, 32, 48, 64, 96, 128, 256].forEach(renderLogo);

  const resvgBanner = new Resvg(bannerSvg, {
    fitTo: { mode: 'width', value: 220 },
  });
  fs.writeFileSync('public/banner-220x140.png', resvgBanner.render().asPng());
  
  console.log('Images generated successfully.');
}

main().catch(console.error);
