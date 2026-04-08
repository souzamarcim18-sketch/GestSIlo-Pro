import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const inputPath = join(__dirname, '../public/imagem-hero.png');
const outputPath = join(__dirname, '../public/imagem-hero.webp');

await sharp(inputPath)
  .webp({ quality: 85 })
  .toFile(outputPath);

console.log('✅ imagem-hero.webp gerada com sucesso!');
