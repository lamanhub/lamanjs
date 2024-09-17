import { Parser } from "acorn";
import tsPlugin from "acorn-typescript";
import * as walk from "acorn-walk";
import { readFileSync } from "fs";

export default function inject(location: string) {
  const dangerousNodeApis = [
    "fs",
    "child_process",
    "net",
    "http",
    "https",
    "dns",
    "os",
    "process",
    "vm",
    "repl",
    "cluster",
    "buffer",
    "path",
    "crypto",
    "timers",
  ];

  const parser = Parser.extend(
    (tsPlugin as unknown as () => () => typeof Parser)()
  );
  const ast = parser.parse(readFileSync(location, "utf-8"), {
    sourceType: "module",
    ecmaVersion: "latest",
    locations: true,
  });

  // Traversing AST untuk memeriksa apakah ada Node.js API berbahaya
  walk.simple(ast, {
    Identifier(node) {
      if (dangerousNodeApis.includes(node.name)) {
        throw new Error(`${node.name} not allowed`);
      }
    },
  });

  return location;
}
