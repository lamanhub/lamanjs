import degit from "degit";
import { resolve } from "path";

export default async function init(dest: string = "my-laman-app") {
  const destPath = resolve(dest);
  console.log(`Scaffolding LamanHub project in ${destPath}\n`);

  const emitter = degit("lamanhub/laman-blank-template", {});

  emitter.on("info", (info) => {
    console.log(info.message);
  });

  emitter.clone(destPath).then(() => {
    console.log(`✅ Done. Now run:\n`);
    console.log("cd " + dest);
    console.log("npm install");
    console.log("npm run dev");
  });
}
