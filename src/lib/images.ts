// Constant White Image
export const BLANK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
export const BLANK_COMPRESSED_IMAGE = '썰 썰 썰 썰 썰';

// Process Images
export const resizeImage = async (imageDataUrl: string) => {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 500, 500);
        ctx.drawImage(img, 0, 0, 500, 500);

        // Force Black and White
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        for (let i = 0; i < pixels.length; i += 4) {
          const red = pixels[i];
          const green = pixels[i + 1];
          const blue = pixels[i + 2];
          const average = (red + green + blue) / 3;
          if (average < 128) {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
          } else {
            pixels[i] = 255;
            pixels[i + 1] = 255;
            pixels[i + 2] = 255;
          }
        }

        // Return PNG Data URI
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      }
    };
  });
};

export const compressImage = async (imageDataUrl: string) => {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 500, 500);
        ctx.drawImage(img, 0, 0, 500, 500);

        // Detect Monochrome
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let binaryString = '';
        for (let i = 0; i < pixels.length; i += 4) {
          const red = pixels[i];
          const green = pixels[i + 1];
          const blue = pixels[i + 2];
          const average = (red + green + blue) / 3;
          if (average < 128) {
            binaryString = binaryString+'0';
          } else {
            binaryString = binaryString+'1';
          }
        }

        // Compress Image with RLE
        const RLE: number[] = [];
        let currentColour = '1'; // White is '1' and Black is '0'
        let currentCount = 0;
        for (let i = 0; i < binaryString.length; i++) {
          // Break up run lengths that will cause UTF-16 character to exceed 16 bits
          if (currentCount == 65503) {
            RLE.push(65503, 0) // Add a spacer to preserve index gap
            currentCount = 0;
          }
          
          if (binaryString[i] === currentColour) {
            currentCount += 1;
          } else {
            RLE.push(currentCount); // Append prevous colour sequence
            currentCount = 1; // Reset count to 1 to include current pixel
            currentColour = currentColour === '1' ? '0' : '1'; // Switch to opposite colour
          }
        }
        RLE.push(currentCount); // Append last sequence

        // Convert to UTF-16 String for maximum density
        const RLEutf16 = RLE.map((run) => { return String.fromCharCode(run+32) }).join(''); // Start from ASCII Char 32 (space) and above, at a resolution of 500x500 it's impossible to hit the upper limit of UTF-16
        console.info(`Image Compression Ratio: ~${((JSON.stringify(imageDataUrl).length)/(1.5*JSON.stringify(RLEutf16).length)).toFixed(3)}`); // Approximate compression ratio with 1.5 byte-per char estimate
        resolve(RLEutf16)
      }
    };
  });
};

export const decompressImage = async (compressedImage: string) => {
  // Convert from UTF-16 String to Run Length Encoding
  const input = compressedImage.split('').map((char) => { return (char.charCodeAt(0) - 32) });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.src = BLANK_IMAGE; // Dummy white image to trigger the onload
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const pixels = imageData.data;
        let pixelTracker = 0;
        for (let i = 0; i < input.length; i++) {
          const colour = i & 1 ? 0 : 255 // Odd is white, Even is black
          let count = input[i];
          while (count > 0) {
            pixels[pixelTracker] = colour;
            pixels[pixelTracker + 1] = colour;
            pixels[pixelTracker + 2] = colour;
            pixels[pixelTracker + 3] = 255;
            count--;
            pixelTracker += 4;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      }
    };
  });
};
