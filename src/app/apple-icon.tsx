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
          width="140"
          height="140"
          viewBox="0 0 166 162"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M84 0L113.5 55.5L166 38L128.286 89.3731L146 140L96.5 113.422L62 161.5L64.7137 89.3731L0 63.5L76.855 50.461L84 0Z"
            fill="white"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
