import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Generando íconos para Stock Screener Pro...\n');

// SVG content
const svgContent = `
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="256" height="256" rx="32" fill="url(#grad1)"/>
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="40" y="140" width="24" height="60" rx="4" fill="#ef5350" opacity="0.9"/>
  <rect x="72" y="120" width="24" height="80" rx="4" fill="#26a69a" opacity="0.9"/>
  <rect x="104" y="100" width="24" height="100" rx="4" fill="#26a69a" opacity="0.9"/>
  <rect x="136" y="80" width="24" height="120" rx="4" fill="#26a69a" opacity="0.9"/>
  <rect x="168" y="60" width="24" height="140" rx="4" fill="#26a69a" opacity="0.9"/>
  <rect x="200" y="90" width="24" height="110" rx="4" fill="#ef5350" opacity="0.9"/>
  <path d="M 40 160 Q 80 140, 120 120 T 200 80" stroke="#fbbf24" stroke-width="3" fill="none" stroke-linecap="round"/>
  <text x="128" y="40" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">STOCK</text>
  <text x="128" y="235" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">SCREENER</text>
</svg>
`;

async function generateIcons() {
  try {
    // Generar PNG de 256x256
    console.log('📦 Generando icon.png (256x256)...');
    await sharp(Buffer.from(svgContent))
      .resize(256, 256)
      .png()
      .toFile(path.join(__dirname, 'icon.png'));
    
    console.log('✅ icon.png generado correctamente\n');
    
    // Generar ICO con múltiples resoluciones
    console.log('📦 Generando icon.ico (multi-resolución)...');
    
    // Crear imágenes en diferentes tamaños
    const sizes = [16, 32, 48, 64, 128, 256];
    const pngBuffers = await Promise.all(
      sizes.map(size =>
        sharp(Buffer.from(svgContent))
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );
    
    // Crear archivo ICO manualmente (formato simple)
    const icoHeader = Buffer.alloc(6);
    icoHeader.writeUInt16LE(0, 0); // Reserved
    icoHeader.writeUInt16LE(1, 2); // Type: ICO
    icoHeader.writeUInt16LE(sizes.length, 4); // Number of images
    
    let offset = 6 + (16 * sizes.length);
    const entries = [];
    
    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const pngBuffer = pngBuffers[i];
      
      const entry = Buffer.alloc(16);
      entry.writeUInt8(size === 256 ? 0 : size, 0); // Width
      entry.writeUInt8(size === 256 ? 0 : size, 1); // Height
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(pngBuffer.length, 8); // Image size
      entry.writeUInt32LE(offset, 12); // Image offset
      
      entries.push(entry);
      offset += pngBuffer.length;
    }
    
    const icoBuffer = Buffer.concat([
      icoHeader,
      ...entries,
      ...pngBuffers
    ]);
    
    fs.writeFileSync(path.join(__dirname, 'icon.ico'), icoBuffer);
    console.log('✅ icon.ico generado correctamente\n');
    
    console.log('🎉 ¡Íconos generados exitosamente!\n');
    console.log('Archivos creados:');
    console.log('  ✓ icon.png (256x256px)');
    console.log('  ✓ icon.ico (16, 32, 48, 64, 128, 256px)\n');
    
  } catch (error) {
    console.error('❌ Error generando íconos:', error);
    process.exit(1);
  }
}

generateIcons();
