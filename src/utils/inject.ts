import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { ViteDevServer } from "vite";
import { Script, createContext } from "vm";

export default async function inject(vite?: ViteDevServer) {
  const path = vite
    ? resolve("src", "inject.ts")
    : resolve("dist", "inject.js");
  if (!existsSync(path)) return {};

  if (!vite) {
    const currentGlobal = global;
    const sandboxes: any = {};

    for (const key of Reflect.ownKeys(global)) {
      sandboxes[key] = currentGlobal[key as keyof typeof globalThis];
    }

    sandboxes.require = undefined;
    sandboxes.exports = {};
    sandboxes.process = {
      env: process.env,
    };

    Object.freeze(sandboxes);

    const script = new Script(readFileSync(path, "utf-8"));
    script.runInContext(createContext(sandboxes));

    return sandboxes.exports;
  }

  return await vite.ssrLoadModule(path);
}
