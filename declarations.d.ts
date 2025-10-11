// declarations.d.ts
declare class GIF {
  constructor(options: {
    workers?: number;
    quality?: number;
    workerScript?: string;
    background?: string;
    width?: number;
    height?: number;
    transparent?: string | null;
    dither?: boolean | string;
  });
  addFrame(
    image: CanvasImageSource | CanvasRenderingContext2D,
    options?: { delay?: number; copy?: boolean }
  ): void;
  on(event: 'finished', callback: (blob: Blob) => void): void;
  on(event: 'progress', callback: (progress: number) => void): void;
  render(): void;
  abort(): void;
}

declare class JSZip {
  constructor();
  file(name: string, data: any, options?: any): JSZip;
  generateAsync(options?: any): Promise<Blob>;
}
