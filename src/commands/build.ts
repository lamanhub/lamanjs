import fg from "fast-glob";
import { cp, createWriteStream, existsSync, rename, writeFileSync } from "fs";
import { resolve } from "path";
import { build as viteBuild } from "vite";
import edge from "../utils/edge.js";
import archive from "./archive.js";

export default async function build(archiveOutput: boolean = false) {
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

  if (existsSync(resolve("./src", "inject.ts"))) {
    await viteBuild({
      ssr: {
        noExternal: true,
        target: "webworker",
      },
      build: {
        ssr: resolve("./src", "inject.ts"),
        rollupOptions: {
          output: {
            format: "cjs",
            exports: "auto",
          },
        },
        write: false,
        copyPublicDir: false,
      },
    }).then((data: any) => {
      writeFileSync(resolve("./dist", "inject.js"), data.output[0].code);
    });
  }

  await cp(
    resolve("public"),
    resolve("dist", "public"),
    { recursive: true },
    () => {
      if (archiveOutput)
        archive(createWriteStream(resolve("dist", "output.zip")));
    }
  );
}
