import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 35%, #f5e9d4 0%, #d9b48a 45%, #5b3a2e 100%)",
          color: "#1a1208",
          fontSize: 110,
          fontWeight: 700,
          letterSpacing: "-0.05em",
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
