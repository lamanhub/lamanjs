import { Parser } from "acorn";
import tsPlugin from "acorn-typescript";
import * as walk from "acorn-walk";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { Script, createContext } from "vm";
import * as esbuild from "esbuild";

export default function inject(location: string, buildFirst = false) {
  const currentGlobal = global;
  if (!existsSync(resolve("./dist", "inject.js"))) return () => ({});

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

  walk.simple(ast, {
    ImportDeclaration(node) {
      if (dangerousNodeApis.includes(node.source.value as string)) {
        throw new Error(`Importing "${node.source.value}" is not allowed.`);
      }
    },
    CallExpression(node) {
      if (
        node.callee.type === "Identifier" &&
        node.callee.name === "require" &&
        node.arguments.length > 0 &&
        node.arguments[0].type === "Literal" &&
        dangerousNodeApis.includes(node.arguments[0].value as string)
      ) {
        throw new Error(
          `Requiring "${node.arguments[0].value}" is not allowed.`
        );
      }
    },
  });

  return () => {
    let userCode: string;

    if (buildFirst) {
      userCode = esbuild.buildSync({
        entryPoints: [location],
        bundle: true,
        platform: "browser",
        inject: [],
        outfile: resolve("./dist", "inject.js"),
        format: "cjs",
        write: false,
        jsx: "automatic",
      }).outputFiles[0].text;
    } else {
      userCode = readFileSync(location, "utf-8");
    }

    const sandboxes: any = {};

    for (const key of Reflect.ownKeys(global)) {
      sandboxes[key] = currentGlobal[key as keyof typeof globalThis];
    }

    sandboxes.require = undefined;
    sandboxes.module = { exports: {} };
    sandboxes.process = undefined;

    Object.freeze(sandboxes);

    const script = new Script(userCode);
    script.runInContext(createContext(sandboxes));

    return sandboxes.module.exports;
  };
}
