import sharp from "sharp";

export type ImageSize = { width: number; height: number };

export async function imageData(src: string | null, { width, height }: ImageSize, blur = false) {
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    let image = sharp(Buffer.from(await res.arrayBuffer())).resize(width, height, { fit: "cover" });
    if (blur) image = image.blur(24).modulate({ brightness: 0.8 });
    const jpeg = await image.jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

export function retina({ width, height }: ImageSize): ImageSize {
  return { width: width * 2, height: height * 2 };
}
