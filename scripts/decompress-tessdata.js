const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, '..', 'tessdata', 'eng.traineddata.gz');
const output = path.join(__dirname, '..', 'tessdata', 'eng.traineddata');

if (fs.existsSync(output)) {
  const size = fs.statSync(output).size;
  console.log('Already decompressed:', size, 'bytes');
  process.exit(0);
}

fs.createReadStream(input)
  .pipe(zlib.createGunzip())
  .pipe(fs.createWriteStream(output))
  .on('finish', () => {
    const size = fs.statSync(output).size;
    console.log('Done! Decompressed:', size, 'bytes');
  })
  .on('error', (err) => {
    console.error('Error:', err);
    process.exit(1);
  });
