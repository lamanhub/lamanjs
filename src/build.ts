import { build as viteBuild } from "vite";
import fg from "fast-glob";
import { resolve } from "path";
import edge from "./utils/edge.js";
import { cp, rename } from "fs";

export default async function build() {
  edge.boot();

  const pages = fg.sync(["./src/**/*.edge"], {
    cwd: resolve(),
  });

  const { output } = (await viteBuild({
    plugins: [
      {
        name: "@laman-cli/core",
        apply: "build",
        buildStart: async () => {
          for (const page of pages) {
            await rename(
              resolve(page),
              resolve(page.replace(".edge", ".edge.html")),
              () => {}
            );
          }
        },
        buildEnd: async () => {
          for (const page of pages) {
            await rename(
              resolve(page.replace(".edge", ".edge.html")),
              resolve(page),
              () => {}
            );
          }
        },
      },
    ],
    build: {
      rollupOptions: {
        input: pages.map((item) =>
          resolve(item.replace(".edge", ".edge.html"))
        ),
      },
      copyPublicDir: false,
    },
  })) as {
    output: { fileName: string }[];
  };

  for (const file of output) {
    await rename(
      resolve("dist", file.fileName),
      resolve("dist", file.fileName.replace(".html", "")),
      () => {}
    );
  }

  await cp(
    resolve("public"),
    resolve("dist", "public"),
    { recursive: true },
    () => {}
  );
}
