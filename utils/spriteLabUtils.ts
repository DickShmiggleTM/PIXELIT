export interface SpriteFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteSource {
  id: string;
  name: string;
  dataUrl: string;
}

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = dataUrl;
  });

export const sliceSpriteSheetToFrames = async (
  dataUrl: string,
  frameWidth: number,
  frameHeight: number,
): Promise<string[]> => {
  const image = await loadImage(dataUrl);
  const columns = Math.max(1, Math.floor(image.width / frameWidth));
  const rows = Math.max(1, Math.floor(image.height / frameHeight));
  const total = columns * rows;
  const frames: string[] = [];

  for (let i = 0; i < total; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const canvas = document.createElement('canvas');
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    ctx.drawImage(image, col * frameWidth, row * frameHeight, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    frames.push(canvas.toDataURL('image/png'));
  }

  return frames;
};

export const compileSpriteSheets = async (
  sources: SpriteSource[],
  columns: number,
  gap: number,
  backgroundColor: string,
): Promise<string> => {
  if (sources.length === 0) {
    throw new Error('No sprite sheets selected.');
  }

  const images = await Promise.all(sources.map((source) => loadImage(source.dataUrl)));
  const safeColumns = Math.max(1, columns);
  const rows = Math.ceil(images.length / safeColumns);

  const columnWidths = Array(safeColumns).fill(0);
  const rowHeights = Array(rows).fill(0);

  images.forEach((img, index) => {
    const col = index % safeColumns;
    const row = Math.floor(index / safeColumns);
    columnWidths[col] = Math.max(columnWidths[col], img.width);
    rowHeights[row] = Math.max(rowHeights[row], img.height);
  });

  const width = columnWidths.reduce((sum, current) => sum + current, 0) + gap * (safeColumns - 1);
  const height = rowHeights.reduce((sum, current) => sum + current, 0) + gap * (rows - 1);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create compiler canvas.');

  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  let currentY = 0;
  for (let row = 0; row < rows; row++) {
    let currentX = 0;
    for (let col = 0; col < safeColumns; col++) {
      const index = row * safeColumns + col;
      const img = images[index];
      if (img) ctx.drawImage(img, currentX, currentY);
      currentX += columnWidths[col] + gap;
    }
    currentY += rowHeights[row] + gap;
  }

  return canvas.toDataURL('image/png');
};

export const cropFrame = async (dataUrl: string, rect: SpriteFrameRect): Promise<string> => {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, rect.width);
  canvas.height = Math.max(1, rect.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create crop canvas.');

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

  return canvas.toDataURL('image/png');
};

export const createVoxelHeightMap = async (dataUrl: string, depth: number): Promise<string> => {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create voxel map canvas.');

  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;

  const voxelScale = 8;
  const isoX = voxelScale;
  const isoY = voxelScale / 2;
  const out = document.createElement('canvas');
  out.width = (image.width + image.height) * isoX + 40;
  out.height = (image.width + image.height) * isoY + depth * voxelScale + 40;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('Could not render voxel preview.');

  outCtx.clearRect(0, 0, out.width, out.height);

  const drawVoxel = (x: number, y: number, h: number, color: string) => {
    const originX = (x - y) * isoX + out.width / 2;
    const originY = (x + y) * isoY + 20;
    const z = h * (voxelScale / 2);

    outCtx.fillStyle = color;
    outCtx.beginPath();
    outCtx.moveTo(originX, originY - z);
    outCtx.lineTo(originX + isoX, originY + isoY - z);
    outCtx.lineTo(originX, originY + isoY * 2 - z);
    outCtx.lineTo(originX - isoX, originY + isoY - z);
    outCtx.closePath();
    outCtx.fill();

    outCtx.fillStyle = 'rgba(0,0,0,0.2)';
    outCtx.beginPath();
    outCtx.moveTo(originX - isoX, originY + isoY - z);
    outCtx.lineTo(originX, originY + isoY * 2 - z);
    outCtx.lineTo(originX, originY + isoY * 2 + voxelScale - z);
    outCtx.lineTo(originX - isoX, originY + isoY + voxelScale - z);
    outCtx.closePath();
    outCtx.fill();

    outCtx.fillStyle = 'rgba(255,255,255,0.15)';
    outCtx.beginPath();
    outCtx.moveTo(originX + isoX, originY + isoY - z);
    outCtx.lineTo(originX, originY + isoY * 2 - z);
    outCtx.lineTo(originX, originY + isoY * 2 + voxelScale - z);
    outCtx.lineTo(originX + isoX, originY + isoY + voxelScale - z);
    outCtx.closePath();
    outCtx.fill();
  };

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      const alpha = pixels[i + 3];
      if (alpha < 20) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const brightness = (r + g + b) / (3 * 255);
      const h = Math.max(1, Math.round(brightness * depth));
      drawVoxel(x, y, h, `rgb(${r},${g},${b})`);
    }
  }

  return out.toDataURL('image/png');
};
