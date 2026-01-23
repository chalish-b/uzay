import { useState } from "react";
import Demo1 from "./demo1";
import Demo2 from "./demo2";
import Demo3 from "./demo3";
import Demo4 from "./demo4";
import Demo5 from "./demo5";
import Demo6 from "./demo6";
import Demo7 from "./demo7";
import Demo8 from "./demo8";
import Demo9 from "./demo9";

const demos = {
  demo1: {
    title: "Demo 1 - Helix",
    component: <Demo1 />,
  },
  demo2: {
    title: "Lorenz Attractor",
    component: <Demo2 />,
  },
  demo3: {
    title: "Harmonic Orrery",
    component: <Demo3 />,
  },
  demo4: {
    title: "Double Pendulum",
    component: <Demo4 />,
  },
  demo5: {
    title: "Lissajous Lab",
    component: <Demo5 />,
  },
  demo6: {
    title: "Bezier Workshop",
    component: <Demo6 />,
  },
  demo7: {
    title: "Superformula",
    component: <Demo7 />,
  },
  demo8: {
    title: "Triangle Centers",
    component: <Demo8 />,
  },
  demo9: {
    title: "Gravity Sculptor",
    component: <Demo9 />,
  },
};

// A tab bar with buttons to switch between demos
export default function Demos() {
  const [demo, setDemo] = useState<keyof typeof demos>("demo9");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
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
      <div style={{ flex: 1, position: "relative" }}>
        {demos[demo].component}
      </div>
    </div>
  );
}
