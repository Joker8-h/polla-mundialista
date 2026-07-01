import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff1493, #c500ff)",
          borderRadius: 24,
          fontSize: 100,
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
