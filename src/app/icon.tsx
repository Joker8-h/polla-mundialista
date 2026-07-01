import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff1493, #c500ff)",
          borderRadius: 6,
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        <span role="img" aria-label="balón">
          ⚽
        </span>
      </div>
    ),
    { ...size },
  );
}
