import { useState } from "react";
import Demo1 from "./demo1";

const demos = {
  demo1: {
    title: "Demo 1",
    component: <Demo1 />,
  },
};

// A tab bar with buttons to switch between demos
export default function Demos() {
  const [demo, setDemo] = useState<keyof typeof demos>("demo1");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div>
        {Object.entries(demos).map(([key, value]) => (
          <button key={key} onClick={() => setDemo(key as keyof typeof demos)}>
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
