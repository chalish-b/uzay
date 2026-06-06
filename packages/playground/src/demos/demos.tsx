import { useState } from "react";
import Demo1 from "./demo1";
import Demo5 from "./demo5";
import Demo6 from "./demo6";
import Demo8 from "./demo8";
import Demo11 from "./demo11";
import Demo2D from "./demo2d";

const demos = {
  demo1: {
    title: "Article Embeds",
    component: <Demo1 />,
  },
  demo5: {
    title: "Lissajous Lab",
    component: <Demo5 />,
  },
  demo6: {
    title: "Bezier Workshop",
    component: <Demo6 />,
  },
  demo8: {
    title: "Triangle Centers",
    component: <Demo8 />,
  },
  demo11: {
    title: "Sphere-Line Intersection",
    component: <Demo11 />,
  },
  demo2d: {
    title: "2D Sandbox",
    component: <Demo2D />,
  },
};

// A tab bar with buttons to switch between demos
export default function Demos() {
  const [demo, setDemo] = useState<keyof typeof demos>("demo1");
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#111",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px",
          backgroundColor: "#1a1a1a",
          borderBottom: "1px solid #2a2a2a",
          position: "sticky",
          top: 0,
          zIndex: 20,
          overflowX: "auto",
        }}
      >
        {Object.entries(demos).map(([key, value]) => (
          <button
            key={key}
            onClick={() => setDemo(key as keyof typeof demos)}
            style={{
              padding: "6px 14px",
              border: "none",
              borderRadius: 4,
              backgroundColor: demo === key ? "#333" : "transparent",
              color: demo === key ? "#fff" : "#888",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
              transition: "background-color 0.15s, color 0.15s",
            }}
          >
            {value.title}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {demos[demo].component}
      </div>
    </div>
  );
}
