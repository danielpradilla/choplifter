import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f3a23a",
          color: "#101923",
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: -2,
          border: "5px solid #101923",
        }}
      >
        L82
      </div>
    ),
    size,
  );
}
