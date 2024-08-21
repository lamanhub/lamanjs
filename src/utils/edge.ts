import { Edge } from "edge.js";

function edge() {
  let edge: Edge | null = null;

  const boot = () => {
    if (edge) return;

    edge = Edge.create();
  };

  return { boot, get: () => edge! };
}

export default edge();
