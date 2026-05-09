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
          background: "#0F1218",
        }}
      >
        <svg
          width="180"
          height="180"
          viewBox="0 0 318 318"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M89 159.344L230 234.688L188.5 159.344L230 84L89 159.344Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
