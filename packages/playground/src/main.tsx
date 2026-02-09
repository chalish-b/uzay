import "./index.css";
import Demos from "./demos/demos";
import "katex/dist/katex.css";
import { createRoot } from "react-dom/client";

// React render
createRoot(document.getElementById("root")!).render(<Demos />);
