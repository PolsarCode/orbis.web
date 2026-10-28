import { ImageResponse } from "next/og";

export function appIcon({
  size,
  glyphScale = 1,
  rounded = false,
}: {
  size: number;
  glyphScale?: number;
  rounded?: boolean;
}) {
  const unit = (size / 180) * glyphScale;
  const at = (value: number) => (size - 180 * unit) / 2 + value * unit;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#c4432d",
          borderRadius: rounded ? size / 4 : 0,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: at(38),
            top: at(55),
            width: 76 * unit,
            height: 76 * unit,
            borderRadius: 38 * unit,
            border: `${19 * unit}px solid #fffefa`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: at(122),
            top: at(111),
            width: 25 * unit,
            height: 25 * unit,
            borderRadius: 4 * unit,
            background: "#fffefa",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
