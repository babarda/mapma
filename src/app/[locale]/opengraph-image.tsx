import { ImageResponse } from "next/og";

export const alt = "MAPMA — Morocco's Photographic Memory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated social-share card. Mirrors the archival sepia palette so links to
// MAPMA preview as a framed "museum label" rather than a bare URL.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5efe4",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border: "2px solid #c0a98d",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 52,
            right: 52,
            bottom: 52,
            border: "1px solid #d9c9b4",
          }}
        />
        <div
          style={{
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: 16,
            color: "#2b231b",
            display: "flex",
          }}
        >
          MAPMA
        </div>
        <div
          style={{
            fontSize: 42,
            color: "#5d4c3b",
            marginTop: 4,
            display: "flex",
          }}
        >
          Morocco&apos;s Photographic Memory
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#75604a",
            marginTop: 30,
            display: "flex",
          }}
        >
          A community archive of pre-2000 Moroccan heritage photographs
        </div>
      </div>
    ),
    { ...size },
  );
}
