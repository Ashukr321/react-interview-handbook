import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 60,
          padding: "0 90px",
          background: "radial-gradient(circle at 20% 40%, #1d2a4a 0%, #121522 55%, #0e1016 100%)",
          color: "#e7e8ee",
        }}
      >
        <svg width="240" height="240" viewBox="-60 -60 120 120">
          <circle r="9" fill="#61dafb" />
          <ellipse rx="50" ry="19" fill="none" stroke="#61dafb" strokeWidth="4" />
          <ellipse rx="50" ry="19" fill="none" stroke="#61dafb" strokeWidth="4" transform="rotate(60)" />
          <ellipse rx="50" ry="19" fill="none" stroke="#61dafb" strokeWidth="4" transform="rotate(120)" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>React Interview</div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, color: "#a78bfa" }}>Handbook</div>
          <div style={{ fontSize: 30, marginTop: 24, color: "#9a9fb2" }}>
            300+ questions answered · Hooks · Fiber · Perf
          </div>
        </div>
      </div>
    ),
    size,
  );
}
