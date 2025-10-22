// Script to generate PWA icons from SVG
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

console.log('📱 PWA Icon Generator for LifeTrack\n');

const svgPath = path.join(__dirname, '../public/icon.svg');
const iconsPath = path.join(__dirname, '../public');

if (!fs.existsSync(svgPath)) {
  console.error('❌ icon.svg not found in public folder');
  process.exit(1);
}

console.log('✅ SVG icon found');
console.log('\n📋 To generate PNG icons, you have several options:\n');

console.log('Option 1: Using online converter (Recommended)');
console.log('  1. Go to https://cloudconvert.com/svg-to-png');
console.log('  2. Upload public/icon.svg');
console.log('  3. Convert to 192x192 PNG and save as icon-192x192.png');
console.log('  4. Convert to 512x512 PNG and save as icon-512x512.png');
console.log('  5. Place both files in the public folder\n');

console.log('Option 2: Using Inkscape (Command line)');
console.log('  inkscape -w 192 -h 192 public/icon.svg -o public/icon-192x192.png');
console.log('  inkscape -w 512 -h 512 public/icon.svg -o public/icon-512x512.png\n');

console.log('Option 3: Using ImageMagick');
console.log('  convert -background none -resize 192x192 public/icon.svg public/icon-192x192.png');
console.log('  convert -background none -resize 512x512 public/icon.svg public/icon-512x512.png\n');

console.log('Option 4: Using sharp (Node.js)');
console.log('  npm install sharp');
console.log('  Then uncomment and run the code below in this file\n');

console.log('💡 For development/testing, you can use the SVG as is.');
console.log('   Many browsers support SVG icons in PWAs.\n');

// Uncomment this section if you have sharp installed
/*
const sharp = require('sharp');

async function generateIcons() {
  try {
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(iconsPath, 'icon-192x192.png'));
    
    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsPath, 'icon-512x512.png'));
    
    console.log('✅ Icons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
  }
}

generateIcons();
*/

