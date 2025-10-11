// utils/exportUtils.ts

/**
 * Converts a canvas element to a BMP data URL.
 * Reference: https://stackoverflow.com/a/50453392
 */
export const canvasToBmp = (canvas: HTMLCanvasElement): string => {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const stride = Math.floor((3 * w + 3) / 4) * 4;
  const fileSize = 54 + stride * h;
  const fileData = new Uint8Array(fileSize);

  // File Header
  fileData[0] = 66; // 'B'
  fileData[1] = 77; // 'M'
  fileData.set(new Uint32Array([fileSize]), 2);
  fileData.set(new Uint32Array([54]), 10);

  // Info Header
  fileData.set(new Uint32Array([40]), 14);
  fileData.set(new Uint32Array([w]), 18);
  fileData.set(new Int32Array([h]), 22);
  fileData.set(new Uint16Array([1]), 26);
  fileData.set(new Uint16Array([24]), 28);

  let dataIndex = 54;
  for (let y = h - 1; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      fileData[dataIndex++] = data[i + 2]; // B
      fileData[dataIndex++] = data[i + 1]; // G
      fileData[dataIndex++] = data[i];     // R
    }
    dataIndex += (stride - 3 * w);
  }

  const base64 = btoa(String.fromCharCode.apply(null, Array.from(fileData)));
  return `data:image/bmp;base64,${base64}`;
};
