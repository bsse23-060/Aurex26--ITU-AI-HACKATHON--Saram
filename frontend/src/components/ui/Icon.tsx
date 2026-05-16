import type { SVGProps } from "react";

type Name =
  | "dashboard"
  | "map"
  | "book"
  | "spark"
  | "graph"
  | "career"
  | "twin"
  | "shield"
  | "logout"
  | "menu"
  | "x"
  | "check"
  | "alert"
  | "mic"
  | "speaker"
  | "send"
  | "arrow-right"
  | "arrow-left"
  | "fire"
  | "brain"
  | "rocket"
  | "trophy"
  | "clock";

const paths: Record<Name, string> = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  map: "M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3zm0 2.3 6 3v12.5l-6-3V5.3zm-2 0v12.5l-2 1V6.3l2-1zm10 1 2-1v12.5l-2 1V6.3z",
  book: "M4 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H4V5h7v14h2V5h7v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-7L4 3z",
  spark: "M12 2 14 9 21 11 14 13 12 20 10 13 3 11 10 9 12 2z",
  graph: "M3 3v18h18v-2H5V3H3zm6 12 4-4 3 3 5-5-1.4-1.4L16 11l-3-3-5 5-1.4-1.4L7 12.6 9 15z",
  career: "M21 7H17V4l-2-2H9L7 4v3H3v13h18V7zM9 4h6v3H9V4zM5 9h14v9H5V9z",
  twin: "M16 11a4 4 0 1 0-3.99-4A4 4 0 0 0 16 11zM8 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-4 0-6 2-6 5v2h12v-2c0-3-2-5-6-5zm8 0c-1 0-1.9.2-2.7.5A6.6 6.6 0 0 1 16 18v2h6v-2c0-3-2-5-6-5z",
  shield: "M12 2 4 5v6c0 5 3.4 9.5 8 11 4.6-1.5 8-6 8-11V5l-8-3z",
  logout: "M16 17v-2h-5v-2h5v-2l4 3-4 3zM5 5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7v-2H5V5z",
  menu: "M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z",
  x: "M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z",
  check: "M9 16.2 4.8 12l-1.4 1.4L9 19l12-12-1.4-1.4z",
  alert: "M12 2 1 21h22zm0 4 8.5 14h-17zM11 10v5h2v-5zm0 6v2h2v-2z",
  mic: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zm-7 11a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12h-2a5 5 0 0 1-10 0H5z",
  speaker: "M3 9v6h4l5 5V4L7 9H3zm13 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5zm-2-9v2.1A7 7 0 0 1 19 12a7 7 0 0 1-5 6.9V21A9 9 0 0 0 21 12 9 9 0 0 0 14 3z",
  send: "M2 21 23 12 2 3v7l15 2-15 2z",
  "arrow-right": "M5 12h14m0 0-5-5m5 5-5 5",
  "arrow-left": "M19 12H5m0 0 5 5m-5-5 5-5",
  fire: "M12 2c1 4 5 5 5 9a5 5 0 1 1-10 0c0-2 1-3 2-3 0 1 1 2 1 2C9 7 11 5 12 2z",
  brain: "M8 3a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zm8 0a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3 3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z",
  rocket: "M14 3 6 11 3 14l3 1 1 3 3-3 8-8a3 3 0 0 0-4-4zm-3 9-2 2-1-1 2-2 1 1z",
  trophy: "M7 4V2h10v2h4v4a4 4 0 0 1-4 4 5 5 0 0 1-4 3v2h3v2H8v-2h3v-2a5 5 0 0 1-4-3 4 4 0 0 1-4-4V4h4zm0 2H5v2a2 2 0 0 0 2 2V6zm10 0v4a2 2 0 0 0 2-2V6h-2z",
  clock: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h5v-2h-4V6h-2v7z",
};

const strokeOnly: Partial<Record<Name, boolean>> = {
  "arrow-right": true,
  "arrow-left": true,
};

type Props = SVGProps<SVGSVGElement> & { name: Name; size?: number };

export function Icon({ name, size = 18, ...rest }: Props) {
  const stroke = strokeOnly[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill={stroke ? "none" : "currentColor"}
      stroke={stroke ? "currentColor" : "none"}
      strokeWidth={stroke ? 2 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
