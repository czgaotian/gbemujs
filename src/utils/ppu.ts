export const applyPalette = (colorIndex: number, palette: number) => {
  let color = 0;
  switch (colorIndex) {
    case 0: color = palette & 0b11; break;
    case 1: color = (palette >> 2) & 0b11; break;
    case 2: color = (palette >> 4) & 0b11; break;
    case 3: color = (palette >> 6) & 0b11; break;
  }
  return color;
}

export const pixelOffset = (base: number, x: number, y: number, bytes_per_pixel: number, row_pitch: number) => {
  return base + y * row_pitch + x * bytes_per_pixel;
}
